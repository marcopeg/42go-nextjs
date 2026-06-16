from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import json
import re
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from fortytwogo_cli.events.dependencies import import_duckdb, import_psycopg, import_pyarrow
from fortytwogo_cli.users.paths import DEFAULT_DATA_DIR, get_database_url

DEFAULT_BOOK_STATS_APP_ID = "lingocafe"
DEFAULT_LIMIT = 10000
DEFAULT_STATS_ROOT = Path(".local/42go-stats")

BOOK_COLUMNS = [
    "id",
    "project",
    "lang",
    "level",
    "title",
    "description",
    "author",
    "tags",
    "info",
    "published_at",
    "created_at",
    "updated_at",
]
PAGE_COLUMNS = [
    "book_id",
    "id",
    "position",
    "kind",
    "prefix",
    "title",
    "summary",
    "content",
]
PROGRESS_COLUMNS = [
    "user_id",
    "book_id",
    "page_id",
    "progress_bps",
    "created_at",
    "updated_at",
    "completed_at",
]


@dataclass(frozen=True)
class PullBooksOptions:
    data_dir: Path | None = None
    limit: int = DEFAULT_LIMIT
    database_url_env: str = "BACKUP_DATABASE_URL"
    reset: bool = False
    dry_run: bool = False


@dataclass(frozen=True)
class BookDataPaths:
    root: Path
    books_path: Path
    pages_path: Path
    progress_path: Path
    state_path: Path


@dataclass(frozen=True)
class BookStatsBookRow:
    app_id: str
    book_id: str
    project: str
    lang: str
    level: str
    title: str
    author: str
    page_count: int


@dataclass(frozen=True)
class BookStatsPageRow:
    app_id: str
    book_id: str
    page_id: str
    position: int
    kind: str
    title: str


@dataclass(frozen=True)
class BookStatsResult:
    app_id: str
    data_root: Path
    stats_root: Path
    cache_dir: Path
    books_path: Path
    pages_path: Path
    progress_path: Path
    state_path: Path
    stats_books_path: Path
    stats_pages_path: Path
    stats_progress_path: Path
    stats_state_path: Path
    books: list[BookStatsBookRow]
    pages: list[BookStatsPageRow]
    progress_rows: int
    database_url_env: str = "local parquet"


def safe_app_id(app_id: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_-]+", app_id):
        raise RuntimeError(f"Unsafe app id for stats cache path: {app_id}")
    return app_id


def stats_cache_dir(stats_root: Path, app_id: str) -> Path:
    return stats_root / safe_app_id(app_id)


def stats_books_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_books_books.parquet"


def stats_pages_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_books_pages.parquet"


def stats_progress_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_books_progress.parquet"


def stats_state_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_books_state.parquet"


def resolve_book_data_paths(
    data_dir: str | Path | None = None,
    app_id: str = DEFAULT_BOOK_STATS_APP_ID,
) -> BookDataPaths:
    root = (Path(data_dir) if data_dir else DEFAULT_DATA_DIR) / app_id
    return BookDataPaths(
        root=root,
        books_path=root / "books.parquet",
        pages_path=root / "books_pages.parquet",
        progress_path=root / "books_progress.parquet",
        state_path=root / "_state.json",
    )


def ensure_book_dirs(paths: BookDataPaths) -> None:
    paths.root.mkdir(parents=True, exist_ok=True)
    paths.state_path.parent.mkdir(parents=True, exist_ok=True)


def parse_utc(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC)
    if not isinstance(value, str):
        raise TypeError(f"Expected timestamp string or datetime, got {type(value).__name__}.")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def iso_utc(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def json_payload(value: Any) -> str:
    if value is None:
        return "{}"
    if isinstance(value, str):
        return value
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text())


def write_json_atomic(path: Path, data: dict[str, Any]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")
    tmp.replace(path)


def legacy_book_state_paths(paths: BookDataPaths) -> list[Path]:
    return [paths.root / "_state" / "books.json"]


def read_book_state(paths: BookDataPaths, reset: bool) -> dict[str, Any]:
    if reset:
        return {}
    state = read_json(paths.state_path)
    if state is not None:
        return state
    for legacy_path in legacy_book_state_paths(paths):
        state = read_json(legacy_path)
        if state is not None:
            return state
    return {}


def cursor_from_row(row: dict[str, Any], keys: list[str]) -> list[str]:
    cursor: list[str] = []
    for key in keys:
        value = row[key]
        cursor.append(iso_utc(value) if isinstance(value, datetime) else str(value))
    return cursor


def normalize_book(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "project": row["project"],
        "lang": row["lang"],
        "level": row["level"],
        "title": row["title"],
        "description": row["description"],
        "author": row["author"],
        "tags": json_payload(row.get("tags")),
        "info": json_payload(row.get("info")),
        "published_at": parse_utc(row.get("published_at")),
        "created_at": parse_utc(row["created_at"]),
        "updated_at": parse_utc(row["updated_at"]),
    }


def normalize_page(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "book_id": str(row["book_id"]),
        "id": str(row["id"]),
        "position": int(row["position"]),
        "kind": row["kind"],
        "prefix": row.get("prefix"),
        "title": row["title"],
        "summary": row.get("summary"),
        "content": row.get("content"),
    }


def normalize_progress(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "user_id": str(row["user_id"]),
        "book_id": str(row["book_id"]),
        "page_id": str(row["page_id"]),
        "progress_bps": int(row["progress_bps"]),
        "created_at": parse_utc(row["created_at"]),
        "updated_at": parse_utc(row["updated_at"]),
        "completed_at": parse_utc(row.get("completed_at")),
    }


def fetch_books(database_url: str, cursor: list[str] | None, limit: int) -> list[dict[str, Any]]:
    psycopg, dict_row = import_psycopg()
    sql = """
        SELECT id, project, lang, level, title, description, author, tags, info, published_at, created_at, updated_at
        FROM lingocafe.books
    """
    params: list[Any] = []
    if cursor:
        sql += " WHERE (updated_at, created_at, id) > (%s::timestamptz, %s::timestamptz, %s)"
        params.extend(cursor)
    sql += " ORDER BY updated_at ASC, created_at ASC, id ASC LIMIT %s"
    params.append(limit)
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor_obj:
            cursor_obj.execute(sql, params)
            return list(cursor_obj.fetchall())


def fetch_pages(database_url: str) -> list[dict[str, Any]]:
    psycopg, dict_row = import_psycopg()
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor_obj:
            cursor_obj.execute(
                """
                SELECT book_id, id, position, kind, prefix, title, summary, content
                FROM lingocafe.books_pages
                ORDER BY book_id ASC, position ASC, id ASC
                """
            )
            return list(cursor_obj.fetchall())


def fetch_progress(database_url: str, cursor: list[str] | None, limit: int) -> list[dict[str, Any]]:
    psycopg, dict_row = import_psycopg()
    sql = """
        SELECT user_id, book_id, page_id, progress_bps, created_at, updated_at, completed_at
        FROM lingocafe.books_progress
    """
    params: list[Any] = []
    if cursor:
        sql += " WHERE (updated_at, created_at, user_id, book_id) > (%s::timestamptz, %s::timestamptz, %s, %s)"
        params.extend(cursor)
    sql += " ORDER BY updated_at ASC, created_at ASC, user_id ASC, book_id ASC LIMIT %s"
    params.append(limit)
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor_obj:
            cursor_obj.execute(sql, params)
            return list(cursor_obj.fetchall())


def read_parquet_rows(path: Path, normalizer: Any) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    _pa, pq = import_pyarrow()
    return [normalizer(row) for row in pq.read_table(path).to_pylist()]


def book_schema(pa: Any) -> Any:
    return pa.schema(
        [
            ("id", pa.string()),
            ("project", pa.string()),
            ("lang", pa.string()),
            ("level", pa.string()),
            ("title", pa.string()),
            ("description", pa.string()),
            ("author", pa.string()),
            ("tags", pa.string()),
            ("info", pa.string()),
            ("published_at", pa.timestamp("us", tz="UTC")),
            ("created_at", pa.timestamp("us", tz="UTC")),
            ("updated_at", pa.timestamp("us", tz="UTC")),
        ]
    )


def page_schema(pa: Any) -> Any:
    return pa.schema(
        [
            ("book_id", pa.string()),
            ("id", pa.string()),
            ("position", pa.int64()),
            ("kind", pa.string()),
            ("prefix", pa.string()),
            ("title", pa.string()),
            ("summary", pa.string()),
            ("content", pa.string()),
        ]
    )


def progress_schema(pa: Any) -> Any:
    return pa.schema(
        [
            ("user_id", pa.string()),
            ("book_id", pa.string()),
            ("page_id", pa.string()),
            ("progress_bps", pa.int64()),
            ("created_at", pa.timestamp("us", tz="UTC")),
            ("updated_at", pa.timestamp("us", tz="UTC")),
            ("completed_at", pa.timestamp("us", tz="UTC")),
        ]
    )


def write_parquet_file(path: Path, rows: list[dict[str, Any]], columns: list[str], schema_factory: Any) -> None:
    pa, pq = import_pyarrow()
    tmp = path.with_suffix(path.suffix + ".tmp")
    table = pa.table({column: [row.get(column) for row in rows] for column in columns}, schema=schema_factory(pa))
    pq.write_table(table, tmp, compression="zstd")
    tmp.replace(path)


def smoke_read_parquet(path: Path, expected_rows: int) -> None:
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        count = connection.execute("SELECT count(*) FROM read_parquet(?)", [str(path)]).fetchone()[0]
    if count != expected_rows:
        raise RuntimeError(f"Parquet smoke read failed for {path}: expected {expected_rows} rows, read {count}.")


def merge_rows(existing_rows: Iterable[dict[str, Any]], changed_rows: Iterable[dict[str, Any]], key_fn: Any, sort_fn: Any) -> list[dict[str, Any]]:
    rows_by_key = {key_fn(row): row for row in existing_rows}
    for row in changed_rows:
        rows_by_key[key_fn(row)] = row
    return sort_fn(rows_by_key.values())


def sort_books(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(rows, key=lambda row: (row["updated_at"], row["created_at"], row["id"]))


def sort_pages(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(rows, key=lambda row: (row["book_id"], row["position"], row["id"]))


def sort_progress(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(rows, key=lambda row: (row["updated_at"], row["created_at"], row["user_id"], row["book_id"]))


def build_state(books: list[dict[str, Any]], pages: list[dict[str, Any]], progress: list[dict[str, Any]]) -> dict[str, Any]:
    state: dict[str, Any] = {
        "version": 1,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "books": {"row_count": len(books)},
        "pages": {"row_count": len(pages), "mode": "full-refresh"},
        "progress": {"row_count": len(progress)},
    }
    if books:
        state["books"]["cursor"] = cursor_from_row(books[-1], ["updated_at", "created_at", "id"])
    if progress:
        state["progress"]["cursor"] = cursor_from_row(progress[-1], ["updated_at", "created_at", "user_id", "book_id"])
    return state


def pull_books(options: PullBooksOptions) -> dict[str, Any]:
    if options.limit <= 0:
        raise RuntimeError("--limit must be greater than zero.")
    database_url = get_database_url(options.database_url_env)
    paths = resolve_book_data_paths(options.data_dir)
    ensure_book_dirs(paths)
    state = read_book_state(paths, options.reset)

    if options.reset and not options.dry_run:
        for path in [paths.books_path, paths.pages_path, paths.progress_path, paths.state_path, *legacy_book_state_paths(paths)]:
            path.unlink(missing_ok=True)

    books_cursor = None if options.reset else state.get("books", {}).get("cursor")
    progress_cursor = None if options.reset else state.get("progress", {}).get("cursor")
    try:
        with ThreadPoolExecutor(max_workers=3, thread_name_prefix="42go-pull-lingocafe") as executor:
            books_future = executor.submit(fetch_books, database_url, books_cursor, options.limit)
            pages_future = executor.submit(fetch_pages, database_url)
            progress_future = executor.submit(fetch_progress, database_url, progress_cursor, options.limit)
            changed_books = [normalize_book(row) for row in books_future.result()]
            pages = [normalize_page(row) for row in pages_future.result()]
            changed_progress = [normalize_progress(row) for row in progress_future.result()]
    except Exception as error:
        raise RuntimeError(f"Failed to pull LingoCafe book data from configured database: {error}") from error

    existing_books = [] if options.reset else read_parquet_rows(paths.books_path, normalize_book)
    existing_progress = [] if options.reset else read_parquet_rows(paths.progress_path, normalize_progress)
    merged_books = merge_rows(existing_books, changed_books, lambda row: row["id"], sort_books)
    merged_progress = merge_rows(
        existing_progress,
        changed_progress,
        lambda row: (row["user_id"], row["book_id"]),
        sort_progress,
    )
    sorted_pages = sort_pages(pages)

    if options.dry_run:
        return {
            "books_changed": len(changed_books),
            "pages_total": len(sorted_pages),
            "progress_changed": len(changed_progress),
            "books_total": len(merged_books),
            "progress_total": len(merged_progress),
            "would_write": bool(options.reset or changed_books or changed_progress or not paths.pages_path.exists()),
        }

    if options.reset or changed_books or not paths.books_path.exists():
        write_parquet_file(paths.books_path, merged_books, BOOK_COLUMNS, book_schema)
        smoke_read_parquet(paths.books_path, len(merged_books))
    if options.reset or not paths.pages_path.exists() or pages:
        write_parquet_file(paths.pages_path, sorted_pages, PAGE_COLUMNS, page_schema)
        smoke_read_parquet(paths.pages_path, len(sorted_pages))
    if options.reset or changed_progress or not paths.progress_path.exists():
        write_parquet_file(paths.progress_path, merged_progress, PROGRESS_COLUMNS, progress_schema)
        smoke_read_parquet(paths.progress_path, len(merged_progress))
    write_json_atomic(paths.state_path, build_state(merged_books, sorted_pages, merged_progress))

    return {
        "books_changed": len(changed_books),
        "pages_total": len(sorted_pages),
        "progress_changed": len(changed_progress),
        "books_total": len(merged_books),
        "progress_total": len(merged_progress),
        "books_parquet": str(paths.books_path),
        "pages_parquet": str(paths.pages_path),
        "progress_parquet": str(paths.progress_path),
        "state": str(paths.state_path),
        "reset": options.reset,
    }


def book_pages_path(data_dir: Path | None = None, app_id: str = DEFAULT_BOOK_STATS_APP_ID) -> Path:
    return resolve_book_data_paths(data_dir, app_id=app_id).pages_path


def load_book_stats_pages(data_dir: Path | None = None, app_id: str = DEFAULT_BOOK_STATS_APP_ID) -> list[BookStatsPageRow]:
    paths = resolve_book_data_paths(data_dir, app_id=app_id)
    if not paths.pages_path.exists():
        return []
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        rows = connection.execute(
            """
            SELECT book_id, id, position, kind, title
            FROM read_parquet(?)
            ORDER BY book_id, position, id
            """,
            [str(paths.pages_path)],
        ).fetchall()
    return [BookStatsPageRow(app_id, str(row[0]), str(row[1]), int(row[2]), str(row[3]), str(row[4])) for row in rows]


def write_book_stats_outputs(result: BookStatsResult, reset: bool = False) -> None:
    pa, pq = import_pyarrow()
    result.cache_dir.mkdir(parents=True, exist_ok=True)
    if reset:
        for path in [result.stats_books_path, result.stats_pages_path, result.stats_progress_path, result.stats_state_path]:
            path.unlink(missing_ok=True)
    pq.write_table(pa.Table.from_pylist([asdict(row) for row in result.books]), result.stats_books_path)
    pq.write_table(pa.Table.from_pylist([asdict(row) for row in result.pages]), result.stats_pages_path)
    pq.write_table(
        pa.Table.from_pylist(
            [
                {
                    "app_id": result.app_id,
                    "progress_rows": result.progress_rows,
                    "source_path": str(result.progress_path),
                }
            ]
        ),
        result.stats_progress_path,
    )
    pq.write_table(
        pa.Table.from_pylist(
            [
                {
                    "app_id": result.app_id,
                    "books": len(result.books),
                    "pages": len(result.pages),
                    "progress_rows": result.progress_rows,
                    "source_books_path": str(result.books_path),
                    "source_pages_path": str(result.pages_path),
                    "source_progress_path": str(result.progress_path),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ]
        ),
        result.stats_state_path,
    )


def load_book_stats(
    data_dir: Path | None = None,
    app_id: str = DEFAULT_BOOK_STATS_APP_ID,
    stats_root: Path | None = None,
    reset: bool = False,
) -> BookStatsResult:
    paths = resolve_book_data_paths(data_dir, app_id=app_id)
    if not paths.books_path.exists() or not paths.pages_path.exists():
        raise RuntimeError(f"Book Parquet files are missing under {paths.root}. Run `42go pull lingocafe` first.")
    root = stats_root or DEFAULT_STATS_ROOT
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        book_rows = connection.execute(
            """
            SELECT
              b.id,
              b.project,
              b.lang,
              b.level,
              b.title,
              b.author,
              count(p.id)::int AS page_count
            FROM read_parquet(?) b
            LEFT JOIN read_parquet(?) p ON p.book_id = b.id
            GROUP BY b.id, b.project, b.lang, b.level, b.title, b.author
            ORDER BY b.level, b.title, b.id
            """,
            [str(paths.books_path), str(paths.pages_path)],
        ).fetchall()
        progress_rows = 0
        if paths.progress_path.exists():
            progress_rows = int(connection.execute("SELECT count(*) FROM read_parquet(?)", [str(paths.progress_path)]).fetchone()[0])
    books = [
        BookStatsBookRow(app_id, str(book_id), str(project), str(lang), str(level), str(title), str(author), int(page_count))
        for book_id, project, lang, level, title, author, page_count in book_rows
    ]
    pages = load_book_stats_pages(data_dir=data_dir, app_id=app_id)
    result = BookStatsResult(
        app_id=app_id,
        data_root=paths.root,
        stats_root=root,
        cache_dir=stats_cache_dir(root, app_id),
        books_path=paths.books_path,
        pages_path=paths.pages_path,
        progress_path=paths.progress_path,
        state_path=paths.state_path,
        stats_books_path=stats_books_path(root, app_id),
        stats_pages_path=stats_pages_path(root, app_id),
        stats_progress_path=stats_progress_path(root, app_id),
        stats_state_path=stats_state_path(root, app_id),
        books=books,
        pages=pages,
        progress_rows=progress_rows,
    )
    write_book_stats_outputs(result, reset=reset)
    return result


def book_stats_to_dict(result: BookStatsResult) -> dict[str, Any]:
    return {
        "app_id": result.app_id,
        "data_root": str(result.data_root),
        "stats_root": str(result.stats_root),
        "cache_dir": str(result.cache_dir),
        "books_path": str(result.books_path),
        "pages_path": str(result.pages_path),
        "progress_path": str(result.progress_path),
        "state_path": str(result.state_path),
        "stats_books_path": str(result.stats_books_path),
        "stats_pages_path": str(result.stats_pages_path),
        "stats_progress_path": str(result.stats_progress_path),
        "stats_state_path": str(result.stats_state_path),
        "books": len(result.books),
        "pages": len(result.pages),
        "progress": result.progress_rows,
    }


def format_book_stats(result: BookStatsResult) -> str:
    return "\n".join(
        [
            "42Go Books",
            "",
            f"Data root: {result.data_root}",
            f"Stats root: {result.stats_root}",
            f"Cache: {result.cache_dir}",
            f"Books: {len(result.books)}",
            f"Pages: {len(result.pages)}",
            f"Progress rows: {result.progress_rows}",
            f"Books Parquet: {result.books_path}",
            f"Pages Parquet: {result.pages_path}",
            f"Progress Parquet: {result.progress_path}",
            f"State: {result.state_path}",
            f"Stats Books Parquet: {result.stats_books_path}",
            f"Stats Pages Parquet: {result.stats_pages_path}",
            f"Stats Progress Parquet: {result.stats_progress_path}",
            f"Stats State Parquet: {result.stats_state_path}",
        ]
    )
