from __future__ import annotations

import os
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fortytwogo_cli.events.dependencies import import_duckdb, import_pyarrow
from fortytwogo_cli.events.users_growth import DEFAULT_STATS_ROOT, safe_app_id


BOOK_STATS_SCHEMA_VERSION = 1
DEFAULT_BOOK_STATS_APP_ID = "lingocafe"


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
    stats_root: Path
    cache_dir: Path
    books_path: Path
    pages_path: Path
    state_path: Path
    books: list[BookStatsBookRow]
    pages: list[BookStatsPageRow]
    database_url_env: str


def stats_cache_dir(stats_root: Path, app_id: str) -> Path:
    return stats_root / safe_app_id(app_id)


def stats_books_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_books_stats_books.parquet"


def stats_pages_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_books_stats_pages.parquet"


def stats_state_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_books_stats_state.parquet"


def legacy_stats_parquet_paths(stats_root: Path, app_id: str) -> list[Path]:
    cache_dir = stats_cache_dir(stats_root, app_id)
    return [
        cache_dir / "events_query_books_stats_books.parquet",
        cache_dir / "events_query_books_stats_pages.parquet",
        cache_dir / "events_query_books_stats_state.parquet",
    ]


def read_env_url(env_name: str, env_path: Path = Path(".env")) -> str | None:
    if os.environ.get(env_name):
        return os.environ[env_name]
    if not env_path.exists():
        return None
    match = re.search(rf"^{re.escape(env_name)}=(.*)$", env_path.read_text(), re.MULTILINE)
    if not match:
        return None
    return match.group(1).strip().strip('"').strip("'") or None


def _fetch_book_stats(database_url: str, app_id: str) -> tuple[list[BookStatsBookRow], list[BookStatsPageRow]]:
    try:
        import psycopg
    except ImportError as error:  # pragma: no cover - dependency is declared for the CLI package.
        raise RuntimeError("psycopg is required to pull book stats from PostgreSQL.") from error

    try:
        with psycopg.connect(database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      b.id,
                      b.project,
                      b.lang,
                      b.level,
                      b.title,
                      b.author,
                      COUNT(bp.id)::int AS page_count
                    FROM lingocafe.books b
                    LEFT JOIN lingocafe.books_pages bp ON bp.book_id = b.id
                    GROUP BY b.id, b.project, b.lang, b.level, b.title, b.author
                    ORDER BY b.level, b.title, b.id
                    """
                )
                book_rows = [
                    BookStatsBookRow(
                        app_id=app_id,
                        book_id=str(book_id),
                        project=str(project),
                        lang=str(lang),
                        level=str(level),
                        title=str(title),
                        author=str(author),
                        page_count=int(page_count),
                    )
                    for book_id, project, lang, level, title, author, page_count in cursor.fetchall()
                ]
                cursor.execute(
                    """
                    SELECT book_id, id, position, kind, title
                    FROM lingocafe.books_pages
                    ORDER BY book_id, position, id
                    """
                )
                page_rows = [
                    BookStatsPageRow(
                        app_id=app_id,
                        book_id=str(book_id),
                        page_id=str(page_id),
                        position=int(position),
                        kind=str(kind),
                        title=str(title),
                    )
                    for book_id, page_id, position, kind, title in cursor.fetchall()
                ]
    except Exception as error:
        raise RuntimeError(f"Failed to pull LingoCafe book stats from PostgreSQL: {error}") from error
    return book_rows, page_rows


def _write_book_stats(result: BookStatsResult) -> None:
    pa, pq = import_pyarrow()
    result.cache_dir.mkdir(parents=True, exist_ok=True)
    pq.write_table(
        pa.Table.from_pylist(
            [asdict(row) for row in result.books],
            schema=pa.schema(
                [
                    ("app_id", pa.string()),
                    ("book_id", pa.string()),
                    ("project", pa.string()),
                    ("lang", pa.string()),
                    ("level", pa.string()),
                    ("title", pa.string()),
                    ("author", pa.string()),
                    ("page_count", pa.int64()),
                ]
            ),
        ),
        result.books_path,
    )
    pq.write_table(
        pa.Table.from_pylist(
            [asdict(row) for row in result.pages],
            schema=pa.schema(
                [
                    ("app_id", pa.string()),
                    ("book_id", pa.string()),
                    ("page_id", pa.string()),
                    ("position", pa.int64()),
                    ("kind", pa.string()),
                    ("title", pa.string()),
                ]
            ),
        ),
        result.pages_path,
    )
    state_rows = [
        {
            "book_stats_schema_version": BOOK_STATS_SCHEMA_VERSION,
            "app_id": result.app_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "database_url_env": result.database_url_env,
            "books": len(result.books),
            "pages": len(result.pages),
            "pages_position_sum": sum(row.position for row in result.pages),
        }
    ]
    pq.write_table(pa.Table.from_pylist(state_rows), result.state_path)


def pull_book_stats(
    stats_root: Path | None = None,
    app_id: str = DEFAULT_BOOK_STATS_APP_ID,
    database_url_env: str = "DATABASE_URL",
    database_url: str | None = None,
) -> BookStatsResult:
    url = database_url or read_env_url(database_url_env)
    if not url:
        raise RuntimeError(f"{database_url_env} is not set.")
    root = stats_root or DEFAULT_STATS_ROOT
    books, pages = _fetch_book_stats(url, app_id)
    result = BookStatsResult(
        app_id=app_id,
        stats_root=root,
        cache_dir=stats_cache_dir(root, app_id),
        books_path=stats_books_path(root, app_id),
        pages_path=stats_pages_path(root, app_id),
        state_path=stats_state_path(root, app_id),
        books=books,
        pages=pages,
        database_url_env=database_url_env,
    )
    for legacy_path in legacy_stats_parquet_paths(root, app_id):
        legacy_path.unlink(missing_ok=True)
    _write_book_stats(result)
    return result


def load_book_stats_pages(stats_root: Path | None = None, app_id: str = DEFAULT_BOOK_STATS_APP_ID) -> list[BookStatsPageRow]:
    root = stats_root or DEFAULT_STATS_ROOT
    path = stats_pages_path(root, app_id)
    if not path.exists():
        return []
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        rows = connection.execute(
            """
            SELECT app_id, book_id, page_id, position, kind, title
            FROM read_parquet(?)
            ORDER BY book_id, position, page_id
            """,
            [str(path)],
        ).fetchall()
    return [BookStatsPageRow(str(row[0]), str(row[1]), str(row[2]), int(row[3]), str(row[4]), str(row[5])) for row in rows]


def book_stats_to_dict(result: BookStatsResult) -> dict[str, Any]:
    return {
        "app_id": result.app_id,
        "stats_root": str(result.stats_root),
        "cache_dir": str(result.cache_dir),
        "books_path": str(result.books_path),
        "pages_path": str(result.pages_path),
        "state_path": str(result.state_path),
        "database_url_env": result.database_url_env,
        "books": len(result.books),
        "pages": len(result.pages),
    }


def format_book_stats(result: BookStatsResult) -> str:
    return "\n".join(
        [
            "42Go Book Stats",
            "",
            f"App: {result.app_id}",
            f"Stats root: {result.stats_root}",
            f"Cache: {result.cache_dir}",
            f"Database URL env: {result.database_url_env}",
            f"Books: {len(result.books)}",
            f"Pages: {len(result.pages)}",
            f"Books Parquet: {result.books_path}",
            f"Pages Parquet: {result.pages_path}",
            f"State Parquet: {result.state_path}",
        ]
    )
