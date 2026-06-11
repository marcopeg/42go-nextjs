from __future__ import annotations

import json
import shutil
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from fortytwogo_cli.events.books import DEFAULT_BOOK_STATS_APP_ID, book_pages_path, load_book_stats_pages
from fortytwogo_cli.events.dependencies import import_duckdb, import_pyarrow
from fortytwogo_cli.events.paths import ArchivePaths, DEFAULT_DATA_DIR, parquet_files, parquet_glob, resolve_paths
from fortytwogo_cli.events.users_growth import (
    BUCKET_TIMEZONE,
    DEFAULT_STATS_ROOT,
    SourceFileFingerprint,
    _bucket_label,
    _bucket_start,
    generate_buckets,
    parse_datetime,
    safe_app_id,
    source_fingerprints,
)


READS_SCHEMA_VERSION = 1
DEFAULT_READS_LIMIT = 20
DEFAULT_COMPLETION_THRESHOLD_BPS = 8000
PAGE_GRANULARITIES = ("all", "day", "week", "month")
READER_GRANULARITIES = ("all", "week", "month", "year")
READING_EVENTS = {"page.open", "page.scroll", "page.translate"}
BOOK_CONTEXT_EVENTS = READING_EVENTS | {"book.info", "read.settings.changed", "read.settings.opened"}

Granularity = Literal["all", "day", "week", "month", "year"]


@dataclass(frozen=True)
class BookEventNameRow:
    app_id: str
    name: str
    event_count: int
    user_count: int
    book_count: int
    page_count: int


@dataclass(frozen=True)
class ReadPageMetricRow:
    app_id: str
    book_id: str
    granularity: str
    bucket_start: str | None
    bucket_label: str
    page_open_events: int
    unique_pages_opened: int


@dataclass(frozen=True)
class ReadUserMetricRow:
    app_id: str
    book_id: str
    granularity: str
    bucket_start: str | None
    bucket_label: str
    reader_users: int
    reading_event_count: int


@dataclass(frozen=True)
class ReadSummaryRow:
    app_id: str
    book_id: str
    first_event_at: str | None
    last_event_at: str | None
    book_event_count: int
    reading_event_count: int
    page_open_events: int
    unique_pages_opened: int
    reader_users: int
    event_names: str


@dataclass(frozen=True)
class BookPageMetadata:
    book_id: str
    page_id: str
    position: int
    title: str | None


@dataclass(frozen=True)
class BookPageCatalog:
    pages: list[BookPageMetadata]
    source: str
    page_count: int
    fingerprint: str


@dataclass(frozen=True)
class ReadPageCompletionRow:
    app_id: str
    book_id: str
    page_id: str
    page_position: int | None
    page_title: str | None
    opened_readers: int
    completed_readers: int
    completion_rate: float
    avg_max_progress_bps: float
    completion_threshold_bps: int


@dataclass(frozen=True)
class ReadBookCompletionRow:
    app_id: str
    book_id: str
    user_id: str
    opened_pages: int
    completed_pages: int
    total_pages: int
    opened_book_ratio: float
    completed_book_ratio: float
    max_page_position_opened: int | None
    max_page_position_completed: int | None
    max_position_opened_ratio: float
    max_position_completed_ratio: float
    completion_threshold_bps: int


@dataclass(frozen=True)
class ReadCompletionFunnelRow:
    app_id: str
    book_id: str
    bucket: str
    min_completed_ratio: float
    max_completed_ratio: float
    users: int
    completion_threshold_bps: int


@dataclass(frozen=True)
class ReadsAppResult:
    app_id: str
    cache_dir: Path
    pages_path: Path
    users_path: Path
    summary_path: Path
    event_names_path: Path
    page_completion_path: Path
    book_completion_path: Path
    completion_funnel_path: Path
    state_path: Path
    cache_status: str
    page_rows: list[ReadPageMetricRow]
    user_rows: list[ReadUserMetricRow]
    summary_rows: list[ReadSummaryRow]
    event_name_rows: list[BookEventNameRow]
    page_completion_rows: list[ReadPageCompletionRow]
    book_completion_rows: list[ReadBookCompletionRow]
    completion_funnel_rows: list[ReadCompletionFunnelRow]
    total_books: int


@dataclass(frozen=True)
class ReadsResult:
    archive_dir: Path
    stats_root: Path
    source_files: list[SourceFileFingerprint]
    apps: list[ReadsAppResult]
    app_id_filter: str | None
    book_id_filter: str | None
    limit: int
    completion_threshold_bps: int
    book_page_source: str


def stats_cache_dir(stats_root: Path, app_id: str) -> Path:
    return stats_root / safe_app_id(app_id)


def stats_pages_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_reads_pages.parquet"


def stats_users_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_reads_users.parquet"


def stats_summary_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_reads_summary.parquet"


def stats_event_names_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_reads_event_names.parquet"


def stats_page_completion_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_reads_page_completion.parquet"


def stats_book_completion_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_reads_book_completion.parquet"


def stats_completion_funnel_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_reads_completion_funnel.parquet"


def stats_state_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_reads_state.parquet"


def legacy_stats_cache_dir(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "events" / "reads"


def legacy_stats_parquet_paths(stats_root: Path, app_id: str) -> list[Path]:
    cache_dir = stats_cache_dir(stats_root, app_id)
    return [
        cache_dir / "query_reads_pages.parquet",
        cache_dir / "query_reads_users.parquet",
        cache_dir / "query_reads_summary.parquet",
        cache_dir / "query_reads_event_names.parquet",
        cache_dir / "query_reads_page_completion.parquet",
        cache_dir / "query_reads_book_completion.parquet",
        cache_dir / "query_reads_completion_funnel.parquet",
        cache_dir / "query_reads_state.parquet",
        cache_dir / "events_query_reads_pages.parquet",
        cache_dir / "events_query_reads_users.parquet",
        cache_dir / "events_query_reads_summary.parquet",
        cache_dir / "events_query_reads_event_names.parquet",
        cache_dir / "events_query_reads_page_completion.parquet",
        cache_dir / "events_query_reads_book_completion.parquet",
        cache_dir / "events_query_reads_completion_funnel.parquet",
        cache_dir / "events_query_reads_state.parquet",
    ]


def _state_matches(
    state_path: Path,
    fingerprints: list[SourceFileFingerprint],
    completion_threshold_bps: int,
    book_page_catalog: BookPageCatalog,
) -> bool:
    if not state_path.exists():
        return False
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        rows = connection.execute(
            """
            SELECT reads_schema_version, completion_threshold_bps, book_pages_fingerprint, source_path, source_size, source_mtime_ns
            FROM read_parquet(?)
            ORDER BY source_path
            """,
            [str(state_path)],
        ).fetchall()
    if not rows:
        return False
    source_files = [
        {
            "path": str(row[3]),
            "size": int(row[4]),
            "mtime_ns": int(row[5]),
        }
        for row in rows
    ]
    return (
        all(
            int(row[0]) == READS_SCHEMA_VERSION
            and int(row[1]) == completion_threshold_bps
            and str(row[2]) == book_page_catalog.fingerprint
            for row in rows
        )
        and source_files == [asdict(fingerprint) for fingerprint in sorted(fingerprints, key=lambda item: item.path)]
    )


def _write_state(
    state_path: Path,
    app_id: str,
    fingerprints: list[SourceFileFingerprint],
    source_event_range: tuple[datetime | None, datetime | None],
    summary_rows: list[ReadSummaryRow],
    completion_threshold_bps: int,
    book_page_catalog: BookPageCatalog,
) -> None:
    pa, pq = import_pyarrow()
    state_path.parent.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    state_rows = [
        {
            "reads_schema_version": READS_SCHEMA_VERSION,
            "app_id": app_id,
            "generated_at": generated_at,
            "timezone": BUCKET_TIMEZONE,
            "source_path": fingerprint.path,
            "source_size": fingerprint.size,
            "source_mtime_ns": fingerprint.mtime_ns,
            "source_event_min": source_event_range[0].isoformat() if source_event_range[0] else None,
            "source_event_max": source_event_range[1].isoformat() if source_event_range[1] else None,
            "books": len(summary_rows),
            "completion_threshold_bps": completion_threshold_bps,
            "book_pages_source": book_page_catalog.source,
            "book_pages_count": book_page_catalog.page_count,
            "book_pages_fingerprint": book_page_catalog.fingerprint,
            "page_granularities": ",".join(PAGE_GRANULARITIES),
            "reader_granularities": ",".join(READER_GRANULARITIES),
            "reading_events": ",".join(sorted(READING_EVENTS)),
            "book_context_events": ",".join(sorted(BOOK_CONTEXT_EVENTS)),
        }
        for fingerprint in fingerprints
    ]
    schema = pa.schema(
        [
            ("reads_schema_version", pa.int64()),
            ("app_id", pa.string()),
            ("generated_at", pa.string()),
            ("timezone", pa.string()),
            ("source_path", pa.string()),
            ("source_size", pa.int64()),
            ("source_mtime_ns", pa.int64()),
            ("source_event_min", pa.string()),
            ("source_event_max", pa.string()),
            ("books", pa.int64()),
            ("completion_threshold_bps", pa.int64()),
            ("book_pages_source", pa.string()),
            ("book_pages_count", pa.int64()),
            ("book_pages_fingerprint", pa.string()),
            ("page_granularities", pa.string()),
            ("reader_granularities", pa.string()),
            ("reading_events", pa.string()),
            ("book_context_events", pa.string()),
        ]
    )
    pq.write_table(pa.Table.from_pylist(state_rows, schema=schema), state_path)


def _write_table(path: Path, rows: list[Any], schema: Any) -> None:
    pa, pq = import_pyarrow()
    path.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(pa.Table.from_pylist([asdict(row) for row in rows], schema=schema), path)


def _read_table(path: Path, query: str, params: list[Any] | None = None) -> list[tuple[Any, ...]]:
    if not path.exists():
        return []
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        return connection.execute(query, [str(path), *(params or [])]).fetchall()


def _load_cached_pages(path: Path) -> list[ReadPageMetricRow]:
    rows = _read_table(
        path,
        """
        SELECT app_id, book_id, granularity, bucket_start, bucket_label, page_open_events, unique_pages_opened
        FROM read_parquet(?)
        ORDER BY app_id, book_id, granularity, bucket_start NULLS FIRST
        """,
    )
    return [
        ReadPageMetricRow(str(row[0]), str(row[1]), str(row[2]), None if row[3] is None else str(row[3]), str(row[4]), int(row[5]), int(row[6]))
        for row in rows
    ]


def _load_cached_users(path: Path) -> list[ReadUserMetricRow]:
    rows = _read_table(
        path,
        """
        SELECT app_id, book_id, granularity, bucket_start, bucket_label, reader_users, reading_event_count
        FROM read_parquet(?)
        ORDER BY app_id, book_id, granularity, bucket_start NULLS FIRST
        """,
    )
    return [
        ReadUserMetricRow(str(row[0]), str(row[1]), str(row[2]), None if row[3] is None else str(row[3]), str(row[4]), int(row[5]), int(row[6]))
        for row in rows
    ]


def _load_cached_summary(path: Path) -> list[ReadSummaryRow]:
    rows = _read_table(
        path,
        """
        SELECT app_id, book_id, first_event_at, last_event_at, book_event_count, reading_event_count,
               page_open_events, unique_pages_opened, reader_users, event_names
        FROM read_parquet(?)
        ORDER BY page_open_events DESC, reader_users DESC, book_id
        """,
    )
    return [
        ReadSummaryRow(
            app_id=str(row[0]),
            book_id=str(row[1]),
            first_event_at=None if row[2] is None else str(row[2]),
            last_event_at=None if row[3] is None else str(row[3]),
            book_event_count=int(row[4]),
            reading_event_count=int(row[5]),
            page_open_events=int(row[6]),
            unique_pages_opened=int(row[7]),
            reader_users=int(row[8]),
            event_names=str(row[9]),
        )
        for row in rows
    ]


def _load_cached_event_names(path: Path) -> list[BookEventNameRow]:
    rows = _read_table(
        path,
        """
        SELECT app_id, name, event_count, user_count, book_count, page_count
        FROM read_parquet(?)
        ORDER BY event_count DESC, name
        """,
    )
    return [BookEventNameRow(str(row[0]), str(row[1]), int(row[2]), int(row[3]), int(row[4]), int(row[5])) for row in rows]


def _load_cached_page_completion(path: Path) -> list[ReadPageCompletionRow]:
    rows = _read_table(
        path,
        """
        SELECT app_id, book_id, page_id, page_position, page_title, opened_readers, completed_readers,
               completion_rate, avg_max_progress_bps, completion_threshold_bps
        FROM read_parquet(?)
        ORDER BY app_id, book_id, page_position NULLS LAST, page_id
        """,
    )
    return [
        ReadPageCompletionRow(
            app_id=str(row[0]),
            book_id=str(row[1]),
            page_id=str(row[2]),
            page_position=None if row[3] is None else int(row[3]),
            page_title=None if row[4] is None else str(row[4]),
            opened_readers=int(row[5]),
            completed_readers=int(row[6]),
            completion_rate=float(row[7]),
            avg_max_progress_bps=float(row[8]),
            completion_threshold_bps=int(row[9]),
        )
        for row in rows
    ]


def _load_cached_book_completion(path: Path) -> list[ReadBookCompletionRow]:
    rows = _read_table(
        path,
        """
        SELECT app_id, book_id, user_id, opened_pages, completed_pages, total_pages, opened_book_ratio,
               completed_book_ratio, max_page_position_opened, max_page_position_completed,
               max_position_opened_ratio, max_position_completed_ratio, completion_threshold_bps
        FROM read_parquet(?)
        ORDER BY app_id, book_id, completed_book_ratio DESC, user_id
        """,
    )
    return [
        ReadBookCompletionRow(
            app_id=str(row[0]),
            book_id=str(row[1]),
            user_id=str(row[2]),
            opened_pages=int(row[3]),
            completed_pages=int(row[4]),
            total_pages=int(row[5]),
            opened_book_ratio=float(row[6]),
            completed_book_ratio=float(row[7]),
            max_page_position_opened=None if row[8] is None else int(row[8]),
            max_page_position_completed=None if row[9] is None else int(row[9]),
            max_position_opened_ratio=float(row[10]),
            max_position_completed_ratio=float(row[11]),
            completion_threshold_bps=int(row[12]),
        )
        for row in rows
    ]


def _load_cached_completion_funnel(path: Path) -> list[ReadCompletionFunnelRow]:
    rows = _read_table(
        path,
        """
        SELECT app_id, book_id, bucket, min_completed_ratio, max_completed_ratio, users, completion_threshold_bps
        FROM read_parquet(?)
        ORDER BY app_id, book_id, min_completed_ratio
        """,
    )
    return [
        ReadCompletionFunnelRow(
            app_id=str(row[0]),
            book_id=str(row[1]),
            bucket=str(row[2]),
            min_completed_ratio=float(row[3]),
            max_completed_ratio=float(row[4]),
            users=int(row[5]),
            completion_threshold_bps=int(row[6]),
        )
        for row in rows
    ]


def _payload_value(data: str | None, key: str) -> str | None:
    if not data:
        return None
    try:
        payload = json.loads(data)
    except json.JSONDecodeError:
        return None
    value = payload.get(key)
    if value is None:
        return None
    return str(value)


def _empty_book_page_catalog(source: str = "unavailable") -> BookPageCatalog:
    return BookPageCatalog(pages=[], source=source, page_count=0, fingerprint=f"{source}:0")


def load_book_page_catalog(data_dir: Path | None = None, app_id: str = DEFAULT_BOOK_STATS_APP_ID) -> BookPageCatalog:
    page_rows = load_book_stats_pages(data_dir=data_dir, app_id=app_id)
    if not page_rows:
        source_path = book_pages_path(data_dir or DEFAULT_DATA_DIR, app_id=app_id)
        return _empty_book_page_catalog(f"missing:{source_path}")
    pages = [
        BookPageMetadata(
            book_id=row.book_id,
            page_id=row.page_id,
            position=row.position,
            title=row.title,
        )
        for row in page_rows
    ]
    max_key = max((page.book_id, page.page_id) for page in pages)
    fingerprint = f"parquet:{len(pages)}:{sum(page.position for page in pages)}:{max_key[0]}:{max_key[1]}"
    return BookPageCatalog(
        pages=pages,
        source=str(book_pages_path(data_dir or DEFAULT_DATA_DIR, app_id=app_id)),
        page_count=len(pages),
        fingerprint=fingerprint,
    )


def _fetch_rows(parquet_pattern: str) -> list[dict[str, Any]]:
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        result = connection.execute(
            """
            SELECT app_id, user_id, event_at, name, data
            FROM read_parquet(?)
            WHERE event_at IS NOT NULL
              AND (
                name IN ('page.open', 'page.scroll', 'page.translate', 'book.info', 'read.settings.changed', 'read.settings.opened')
                OR json_extract_string(data, '$.book_id') IS NOT NULL
                OR json_extract_string(data, '$.page_id') IS NOT NULL
                OR lower(name) LIKE '%book%'
              )
            ORDER BY app_id, event_at, user_id, name
            """,
            [parquet_pattern],
        ).fetchall()

    rows: list[dict[str, Any]] = []
    for app_id, user_id, event_at, name, data in result:
        parsed_event_at = parse_datetime(event_at)
        if parsed_event_at is None:
            continue
        data_string = None if data is None else str(data)
        book_id = _payload_value(data_string, "book_id")
        page_id = _payload_value(data_string, "page_id")
        if not book_id:
            continue
        rows.append(
            {
                "app_id": str(app_id),
                "user_id": None if user_id is None else str(user_id),
                "event_at": parsed_event_at,
                "name": str(name),
                "data": data_string,
                "book_id": book_id,
                "page_id": page_id,
            }
        )
    return rows


def _safe_ratio(numerator: int | float, denominator: int | float) -> float:
    if denominator <= 0:
        return 0.0
    return round(float(numerator) / float(denominator), 6)


def _funnel_bucket(ratio: float) -> tuple[str, float, float]:
    if ratio < 0.2:
        return "0-20%", 0.0, 0.2
    if ratio < 0.4:
        return "20-40%", 0.2, 0.4
    if ratio < 0.6:
        return "40-60%", 0.4, 0.6
    if ratio < 0.8:
        return "60-80%", 0.6, 0.8
    return "80-100%", 0.8, 1.0


def _compute_completion_rows(
    app_id: str,
    app_rows: list[dict[str, Any]],
    book_page_catalog: BookPageCatalog,
    completion_threshold_bps: int,
) -> tuple[list[ReadPageCompletionRow], list[ReadBookCompletionRow], list[ReadCompletionFunnelRow]]:
    metadata_by_book_page = {(page.book_id, page.page_id): page for page in book_page_catalog.pages}
    pages_by_book: dict[str, list[BookPageMetadata]] = {}
    for page in book_page_catalog.pages:
        pages_by_book.setdefault(page.book_id, []).append(page)
    for pages in pages_by_book.values():
        pages.sort(key=lambda item: (item.position, item.page_id))

    progress_by_user_page: dict[tuple[str, str, str], int] = {}
    progress_rows = [
        row
        for row in app_rows
        if row["name"] in {"page.open", "page.scroll"} and row["user_id"] and row["page_id"] and _payload_value(row["data"], "progress_bps")
    ]
    for row in progress_rows:
        progress_value = _payload_value(row["data"], "progress_bps")
        try:
            progress_bps = int(progress_value or 0)
        except ValueError:
            continue
        key = (row["book_id"], row["page_id"], row["user_id"])
        progress_by_user_page[key] = max(progress_by_user_page.get(key, 0), progress_bps)

    page_completion_rows: list[ReadPageCompletionRow] = []
    by_book_page: dict[tuple[str, str], list[tuple[str, int]]] = {}
    for (book_id, page_id, user_id), progress_bps in progress_by_user_page.items():
        by_book_page.setdefault((book_id, page_id), []).append((user_id, progress_bps))

    for (book_id, page_id), user_progress in sorted(by_book_page.items()):
        metadata = metadata_by_book_page.get((book_id, page_id))
        opened_readers = len({user_id for user_id, _progress_bps in user_progress})
        completed_readers = len({user_id for user_id, progress_bps in user_progress if progress_bps >= completion_threshold_bps})
        avg_progress = round(sum(progress_bps for _user_id, progress_bps in user_progress) / len(user_progress), 2) if user_progress else 0.0
        page_completion_rows.append(
            ReadPageCompletionRow(
                app_id=app_id,
                book_id=book_id,
                page_id=page_id,
                page_position=metadata.position if metadata else None,
                page_title=metadata.title if metadata else None,
                opened_readers=opened_readers,
                completed_readers=completed_readers,
                completion_rate=_safe_ratio(completed_readers, opened_readers),
                avg_max_progress_bps=avg_progress,
                completion_threshold_bps=completion_threshold_bps,
            )
        )

    user_book_progress: dict[tuple[str, str], list[tuple[str, int]]] = {}
    for (book_id, page_id, user_id), progress_bps in progress_by_user_page.items():
        user_book_progress.setdefault((book_id, user_id), []).append((page_id, progress_bps))

    book_completion_rows: list[ReadBookCompletionRow] = []
    for (book_id, user_id), page_progress in sorted(user_book_progress.items()):
        book_pages = pages_by_book.get(book_id, [])
        total_pages = len(book_pages)
        opened_page_ids = {page_id for page_id, _progress_bps in page_progress}
        completed_page_ids = {page_id for page_id, progress_bps in page_progress if progress_bps >= completion_threshold_bps}
        opened_positions = [
            metadata_by_book_page[(book_id, page_id)].position
            for page_id in opened_page_ids
            if (book_id, page_id) in metadata_by_book_page
        ]
        completed_positions = [
            metadata_by_book_page[(book_id, page_id)].position
            for page_id in completed_page_ids
            if (book_id, page_id) in metadata_by_book_page
        ]
        max_opened = max(opened_positions) if opened_positions else None
        max_completed = max(completed_positions) if completed_positions else None
        book_completion_rows.append(
            ReadBookCompletionRow(
                app_id=app_id,
                book_id=book_id,
                user_id=user_id,
                opened_pages=len(opened_page_ids),
                completed_pages=len(completed_page_ids),
                total_pages=total_pages,
                opened_book_ratio=_safe_ratio(len(opened_page_ids), total_pages),
                completed_book_ratio=_safe_ratio(len(completed_page_ids), total_pages),
                max_page_position_opened=max_opened,
                max_page_position_completed=max_completed,
                max_position_opened_ratio=_safe_ratio(max_opened or 0, total_pages),
                max_position_completed_ratio=_safe_ratio(max_completed or 0, total_pages),
                completion_threshold_bps=completion_threshold_bps,
            )
        )

    funnel_counts: dict[tuple[str, str, float, float], int] = {}
    for row in book_completion_rows:
        bucket, bucket_min, bucket_max = _funnel_bucket(row.completed_book_ratio)
        key = (row.book_id, bucket, bucket_min, bucket_max)
        funnel_counts[key] = funnel_counts.get(key, 0) + 1
    funnel_rows = [
        ReadCompletionFunnelRow(
            app_id=app_id,
            book_id=book_id,
            bucket=bucket,
            min_completed_ratio=bucket_min,
            max_completed_ratio=bucket_max,
            users=users,
            completion_threshold_bps=completion_threshold_bps,
        )
        for (book_id, bucket, bucket_min, bucket_max), users in sorted(funnel_counts.items())
    ]

    return page_completion_rows, book_completion_rows, funnel_rows


def _bucket_key(event_at: datetime, granularity: Granularity) -> tuple[str | None, str]:
    if granularity == "all":
        return None, "all"
    start = _bucket_start(event_at, granularity)  # type: ignore[arg-type]
    return start.isoformat(), _bucket_label(start, granularity)  # type: ignore[arg-type]


def _time_granularity_rows(events: list[dict[str, Any]], granularities: tuple[str, ...]) -> list[tuple[str, str | None, str, list[dict[str, Any]]]]:
    if not events:
        return []
    rows: list[tuple[str, str | None, str, list[dict[str, Any]]]] = []
    for granularity in granularities:
        if granularity == "all":
            rows.append(("all", None, "all", events))
            continue
        event_times = [event["event_at"] for event in events]
        for bucket_start, bucket_end in generate_buckets(min(event_times), max(event_times), granularity):  # type: ignore[arg-type]
            bucket_events = [event for event in events if bucket_start <= event["event_at"] < bucket_end]
            if not bucket_events:
                continue
            rows.append((granularity, bucket_start.isoformat(), _bucket_label(bucket_start, granularity), bucket_events))  # type: ignore[arg-type]
    return rows


def _compute_app_rows(
    app_id: str,
    rows: list[dict[str, Any]],
    book_page_catalog: BookPageCatalog,
    completion_threshold_bps: int,
) -> tuple[
    list[ReadPageMetricRow],
    list[ReadUserMetricRow],
    list[ReadSummaryRow],
    list[BookEventNameRow],
    list[ReadPageCompletionRow],
    list[ReadBookCompletionRow],
    list[ReadCompletionFunnelRow],
    tuple[datetime | None, datetime | None],
]:
    app_rows = [row for row in rows if row["app_id"] == app_id]
    if not app_rows:
        return [], [], [], [], [], [], [], (None, None)

    page_rows: list[ReadPageMetricRow] = []
    user_rows: list[ReadUserMetricRow] = []
    summary_rows: list[ReadSummaryRow] = []
    event_name_rows: list[BookEventNameRow] = []

    for name in sorted({row["name"] for row in app_rows}):
        name_rows = [row for row in app_rows if row["name"] == name]
        event_name_rows.append(
            BookEventNameRow(
                app_id=app_id,
                name=name,
                event_count=len(name_rows),
                user_count=len({row["user_id"] for row in name_rows if row["user_id"]}),
                book_count=len({row["book_id"] for row in name_rows}),
                page_count=len({row["page_id"] for row in name_rows if row["page_id"]}),
            )
        )

    for book_id in sorted({row["book_id"] for row in app_rows}):
        book_rows = [row for row in app_rows if row["book_id"] == book_id]
        reading_rows = [row for row in book_rows if row["name"] in READING_EVENTS and row["user_id"]]
        page_open_rows = [row for row in book_rows if row["name"] == "page.open" and row["page_id"]]

        for granularity, bucket_start, bucket_label, bucket_events in _time_granularity_rows(page_open_rows, PAGE_GRANULARITIES):
            page_rows.append(
                ReadPageMetricRow(
                    app_id=app_id,
                    book_id=book_id,
                    granularity=granularity,
                    bucket_start=bucket_start,
                    bucket_label=bucket_label,
                    page_open_events=len(bucket_events),
                    unique_pages_opened=len({event["page_id"] for event in bucket_events if event["page_id"]}),
                )
            )

        for granularity, bucket_start, bucket_label, bucket_events in _time_granularity_rows(reading_rows, READER_GRANULARITIES):
            user_rows.append(
                ReadUserMetricRow(
                    app_id=app_id,
                    book_id=book_id,
                    granularity=granularity,
                    bucket_start=bucket_start,
                    bucket_label=bucket_label,
                    reader_users=len({event["user_id"] for event in bucket_events if event["user_id"]}),
                    reading_event_count=len(bucket_events),
                )
            )

        event_times = [row["event_at"] for row in book_rows]
        summary_rows.append(
            ReadSummaryRow(
                app_id=app_id,
                book_id=book_id,
                first_event_at=min(event_times).isoformat() if event_times else None,
                last_event_at=max(event_times).isoformat() if event_times else None,
                book_event_count=len(book_rows),
                reading_event_count=len(reading_rows),
                page_open_events=len(page_open_rows),
                unique_pages_opened=len({row["page_id"] for row in page_open_rows if row["page_id"]}),
                reader_users=len({row["user_id"] for row in reading_rows if row["user_id"]}),
                event_names=",".join(sorted({row["name"] for row in book_rows})),
            )
        )

    page_completion_rows, book_completion_rows, completion_funnel_rows = _compute_completion_rows(
        app_id=app_id,
        app_rows=app_rows,
        book_page_catalog=book_page_catalog,
        completion_threshold_bps=completion_threshold_bps,
    )
    event_times = [row["event_at"] for row in app_rows]
    return (
        page_rows,
        user_rows,
        sorted(summary_rows, key=lambda row: (row.page_open_events, row.reader_users, row.book_id), reverse=True),
        sorted(event_name_rows, key=lambda row: (row.event_count, row.name), reverse=True),
        page_completion_rows,
        book_completion_rows,
        completion_funnel_rows,
        (min(event_times), max(event_times)),
    )


def _write_reads(
    pages_path: Path,
    users_path: Path,
    summary_path: Path,
    event_names_path: Path,
    page_completion_path: Path,
    book_completion_path: Path,
    completion_funnel_path: Path,
    page_rows: list[ReadPageMetricRow],
    user_rows: list[ReadUserMetricRow],
    summary_rows: list[ReadSummaryRow],
    event_name_rows: list[BookEventNameRow],
    page_completion_rows: list[ReadPageCompletionRow],
    book_completion_rows: list[ReadBookCompletionRow],
    completion_funnel_rows: list[ReadCompletionFunnelRow],
) -> None:
    pa = import_pyarrow()[0]
    _write_table(
        pages_path,
        page_rows,
        pa.schema(
            [
                ("app_id", pa.string()),
                ("book_id", pa.string()),
                ("granularity", pa.string()),
                ("bucket_start", pa.string()),
                ("bucket_label", pa.string()),
                ("page_open_events", pa.int64()),
                ("unique_pages_opened", pa.int64()),
            ]
        ),
    )
    _write_table(
        users_path,
        user_rows,
        pa.schema(
            [
                ("app_id", pa.string()),
                ("book_id", pa.string()),
                ("granularity", pa.string()),
                ("bucket_start", pa.string()),
                ("bucket_label", pa.string()),
                ("reader_users", pa.int64()),
                ("reading_event_count", pa.int64()),
            ]
        ),
    )
    _write_table(
        summary_path,
        summary_rows,
        pa.schema(
            [
                ("app_id", pa.string()),
                ("book_id", pa.string()),
                ("first_event_at", pa.string()),
                ("last_event_at", pa.string()),
                ("book_event_count", pa.int64()),
                ("reading_event_count", pa.int64()),
                ("page_open_events", pa.int64()),
                ("unique_pages_opened", pa.int64()),
                ("reader_users", pa.int64()),
                ("event_names", pa.string()),
            ]
        ),
    )
    _write_table(
        event_names_path,
        event_name_rows,
        pa.schema(
            [
                ("app_id", pa.string()),
                ("name", pa.string()),
                ("event_count", pa.int64()),
                ("user_count", pa.int64()),
                ("book_count", pa.int64()),
                ("page_count", pa.int64()),
            ]
        ),
    )
    _write_table(
        page_completion_path,
        page_completion_rows,
        pa.schema(
            [
                ("app_id", pa.string()),
                ("book_id", pa.string()),
                ("page_id", pa.string()),
                ("page_position", pa.int64()),
                ("page_title", pa.string()),
                ("opened_readers", pa.int64()),
                ("completed_readers", pa.int64()),
                ("completion_rate", pa.float64()),
                ("avg_max_progress_bps", pa.float64()),
                ("completion_threshold_bps", pa.int64()),
            ]
        ),
    )
    _write_table(
        book_completion_path,
        book_completion_rows,
        pa.schema(
            [
                ("app_id", pa.string()),
                ("book_id", pa.string()),
                ("user_id", pa.string()),
                ("opened_pages", pa.int64()),
                ("completed_pages", pa.int64()),
                ("total_pages", pa.int64()),
                ("opened_book_ratio", pa.float64()),
                ("completed_book_ratio", pa.float64()),
                ("max_page_position_opened", pa.int64()),
                ("max_page_position_completed", pa.int64()),
                ("max_position_opened_ratio", pa.float64()),
                ("max_position_completed_ratio", pa.float64()),
                ("completion_threshold_bps", pa.int64()),
            ]
        ),
    )
    _write_table(
        completion_funnel_path,
        completion_funnel_rows,
        pa.schema(
            [
                ("app_id", pa.string()),
                ("book_id", pa.string()),
                ("bucket", pa.string()),
                ("min_completed_ratio", pa.float64()),
                ("max_completed_ratio", pa.float64()),
                ("users", pa.int64()),
                ("completion_threshold_bps", pa.int64()),
            ]
        ),
    )


def _visible_summaries(rows: list[ReadSummaryRow], book_id_filter: str | None, limit: int) -> list[ReadSummaryRow]:
    filtered = [row for row in rows if book_id_filter is None or row.book_id == book_id_filter]
    return sorted(filtered, key=lambda row: (row.page_open_events, row.reader_users, row.book_id), reverse=True)[:limit]


def _filter_book_rows(rows: list[Any], book_id_filter: str | None) -> list[Any]:
    if book_id_filter is None:
        return rows
    return [row for row in rows if row.book_id == book_id_filter]


def load_event_reads(
    archive_dir: Path | None = None,
    stats_root: Path | None = None,
    app_id_filter: str | None = None,
    book_id_filter: str | None = None,
    limit: int = DEFAULT_READS_LIMIT,
    completion_threshold_bps: int = DEFAULT_COMPLETION_THRESHOLD_BPS,
    reset: bool = False,
) -> ReadsResult | None:
    paths = resolve_paths(archive_dir)
    files = parquet_files(paths)
    if not files:
        return None
    if limit < 1:
        raise RuntimeError("--limit must be greater than 0")
    if completion_threshold_bps < 0 or completion_threshold_bps > 10000:
        raise RuntimeError("--completion-threshold-bps must be between 0 and 10000")

    root = stats_root or DEFAULT_STATS_ROOT
    fingerprints = source_fingerprints(files)
    all_events = _fetch_rows(parquet_glob(paths))
    app_ids = sorted({event["app_id"] for event in all_events})
    book_page_catalog = load_book_page_catalog(data_dir=paths.root, app_id=DEFAULT_BOOK_STATS_APP_ID)
    results: list[ReadsAppResult] = []

    for app_id in app_ids:
        cache_dir = stats_cache_dir(root, app_id)
        pages_path = stats_pages_path(root, app_id)
        users_path = stats_users_path(root, app_id)
        summary_path = stats_summary_path(root, app_id)
        event_names_path = stats_event_names_path(root, app_id)
        page_completion_path = stats_page_completion_path(root, app_id)
        book_completion_path = stats_book_completion_path(root, app_id)
        completion_funnel_path = stats_completion_funnel_path(root, app_id)
        state_path = stats_state_path(root, app_id)
        if reset:
            pages_path.unlink(missing_ok=True)
            users_path.unlink(missing_ok=True)
            summary_path.unlink(missing_ok=True)
            event_names_path.unlink(missing_ok=True)
            page_completion_path.unlink(missing_ok=True)
            book_completion_path.unlink(missing_ok=True)
            completion_funnel_path.unlink(missing_ok=True)
            state_path.unlink(missing_ok=True)
            for legacy_path in legacy_stats_parquet_paths(root, app_id):
                legacy_path.unlink(missing_ok=True)
            shutil.rmtree(legacy_stats_cache_dir(root, app_id), ignore_errors=True)

        cache_status = "rebuilt"
        if (
            not reset
            and _state_matches(state_path, fingerprints, completion_threshold_bps, book_page_catalog)
            and pages_path.exists()
            and users_path.exists()
            and summary_path.exists()
            and event_names_path.exists()
            and page_completion_path.exists()
            and book_completion_path.exists()
            and completion_funnel_path.exists()
        ):
            page_rows = _load_cached_pages(pages_path)
            user_rows = _load_cached_users(users_path)
            summary_rows = _load_cached_summary(summary_path)
            event_name_rows = _load_cached_event_names(event_names_path)
            page_completion_rows = _load_cached_page_completion(page_completion_path)
            book_completion_rows = _load_cached_book_completion(book_completion_path)
            completion_funnel_rows = _load_cached_completion_funnel(completion_funnel_path)
            cache_status = "cached"
        else:
            (
                page_rows,
                user_rows,
                summary_rows,
                event_name_rows,
                page_completion_rows,
                book_completion_rows,
                completion_funnel_rows,
                event_range,
            ) = _compute_app_rows(app_id, all_events, book_page_catalog, completion_threshold_bps)
            _write_reads(
                pages_path,
                users_path,
                summary_path,
                event_names_path,
                page_completion_path,
                book_completion_path,
                completion_funnel_path,
                page_rows,
                user_rows,
                summary_rows,
                event_name_rows,
                page_completion_rows,
                book_completion_rows,
                completion_funnel_rows,
            )
            _write_state(state_path, app_id, fingerprints, event_range, summary_rows, completion_threshold_bps, book_page_catalog)

        if app_id_filter is None or app_id == app_id_filter:
            visible_summary_rows = _visible_summaries(summary_rows, book_id_filter, limit)
            visible_book_ids = {row.book_id for row in visible_summary_rows}
            if book_id_filter:
                visible_book_ids.add(book_id_filter)
            results.append(
                ReadsAppResult(
                    app_id=app_id,
                    cache_dir=cache_dir,
                    pages_path=pages_path,
                    users_path=users_path,
                    summary_path=summary_path,
                    event_names_path=event_names_path,
                    page_completion_path=page_completion_path,
                    book_completion_path=book_completion_path,
                    completion_funnel_path=completion_funnel_path,
                    state_path=state_path,
                    cache_status=cache_status,
                    page_rows=[row for row in _filter_book_rows(page_rows, book_id_filter) if row.book_id in visible_book_ids],
                    user_rows=[row for row in _filter_book_rows(user_rows, book_id_filter) if row.book_id in visible_book_ids],
                    summary_rows=visible_summary_rows,
                    event_name_rows=event_name_rows,
                    page_completion_rows=[row for row in _filter_book_rows(page_completion_rows, book_id_filter) if row.book_id in visible_book_ids],
                    book_completion_rows=[row for row in _filter_book_rows(book_completion_rows, book_id_filter) if row.book_id in visible_book_ids],
                    completion_funnel_rows=[row for row in _filter_book_rows(completion_funnel_rows, book_id_filter) if row.book_id in visible_book_ids],
                    total_books=len(summary_rows),
                )
            )

    return ReadsResult(
        archive_dir=paths.root,
        stats_root=root,
        source_files=fingerprints,
        apps=results,
        app_id_filter=app_id_filter,
        book_id_filter=book_id_filter,
        limit=limit,
        completion_threshold_bps=completion_threshold_bps,
        book_page_source=book_page_catalog.source,
    )


def event_reads_to_dict(result: ReadsResult) -> dict[str, Any]:
    return {
        "archive_dir": str(result.archive_dir),
        "stats_root": str(result.stats_root),
        "source_files": [asdict(fingerprint) for fingerprint in result.source_files],
        "app_id_filter": result.app_id_filter,
        "book_id_filter": result.book_id_filter,
        "limit": result.limit,
        "completion_threshold_bps": result.completion_threshold_bps,
        "book_page_source": result.book_page_source,
        "apps": [
            {
                "app_id": app.app_id,
                "cache_dir": str(app.cache_dir),
                "cache_status": app.cache_status,
                "pages_path": str(app.pages_path),
                "users_path": str(app.users_path),
                "summary_path": str(app.summary_path),
                "event_names_path": str(app.event_names_path),
                "page_completion_path": str(app.page_completion_path),
                "book_completion_path": str(app.book_completion_path),
                "completion_funnel_path": str(app.completion_funnel_path),
                "state_path": str(app.state_path),
                "total_books": app.total_books,
                "event_names": [asdict(row) for row in app.event_name_rows],
                "summary": [asdict(row) for row in app.summary_rows],
                "pages": [asdict(row) for row in app.page_rows],
                "users": [asdict(row) for row in app.user_rows],
                "page_completion": [asdict(row) for row in app.page_completion_rows],
                "book_completion": [asdict(row) for row in app.book_completion_rows],
                "completion_funnel": [asdict(row) for row in app.completion_funnel_rows],
            }
            for app in result.apps
        ],
    }


def format_event_reads(result: ReadsResult) -> str:
    lines = [
        "42Go Read Engagement",
        "",
        f"Data root: {result.archive_dir}",
        f"Stats root: {result.stats_root}",
        f"Source Parquet files: {len(result.source_files)}",
        f"Visible book limit: {result.limit}",
        f"Completion threshold: {result.completion_threshold_bps} bps",
        f"Book page source: {result.book_page_source}",
        "Page metrics: page.open events with book_id and page_id; granularities all/day/week/month.",
        "Reader metrics: distinct users from page.open/page.scroll/page.translate; granularities all/week/month/year.",
    ]
    if result.app_id_filter:
        lines.append(f"App filter: {result.app_id_filter}")
    if result.book_id_filter:
        lines.append(f"Book filter: {result.book_id_filter}")
    if not result.apps:
        lines.extend(["", "No matching app IDs."])
        return "\n".join(lines)

    for app in result.apps:
        lines.extend(
            [
                "",
                f"App: {app.app_id} ({app.cache_status})",
                f"Cache: {app.cache_dir}",
                f"Cached books: {app.total_books}",
                "",
                "Book-related event names:",
            ]
        )
        for row in app.event_name_rows:
            lines.append(
                f"  {row.name}: events={row.event_count} users={row.user_count} books={row.book_count} pages={row.page_count}"
            )
        if not app.summary_rows:
            lines.append("")
            lines.append("No matching books.")
            continue

        lines.extend(["", "Books:"])
        for row in app.summary_rows:
            lines.append(
                f"  {row.book_id}: page_open_events={row.page_open_events} "
                f"unique_pages={row.unique_pages_opened} readers={row.reader_users} "
                f"reading_events={row.reading_event_count} last={row.last_event_at}"
            )

        lines.extend(["", "All-time pages/readers:"])
        for row in app.summary_rows:
            page_all = next((item for item in app.page_rows if item.book_id == row.book_id and item.granularity == "all"), None)
            user_all = next((item for item in app.user_rows if item.book_id == row.book_id and item.granularity == "all"), None)
            lines.append(
                f"  {row.book_id}: pages={page_all.unique_pages_opened if page_all else 0} "
                f"page_opens={page_all.page_open_events if page_all else 0} "
                f"readers={user_all.reader_users if user_all else 0}"
            )

        daily = [row for row in app.page_rows if row.granularity == "day"]
        if daily:
            lines.extend(["", "Recent daily page opens:"])
            for row in sorted(daily, key=lambda item: (item.bucket_start or "", item.book_id), reverse=True)[: app.total_books if app.total_books < 10 else 10]:
                lines.append(
                    f"  {row.bucket_label} {row.book_id}: page_opens={row.page_open_events} unique_pages={row.unique_pages_opened}"
                )

        weekly_users = [row for row in app.user_rows if row.granularity == "week"]
        if weekly_users:
            lines.extend(["", "Recent weekly readers:"])
            for row in sorted(weekly_users, key=lambda item: (item.bucket_start or "", item.book_id), reverse=True)[: app.total_books if app.total_books < 10 else 10]:
                lines.append(
                    f"  {row.bucket_label} {row.book_id}: readers={row.reader_users} reading_events={row.reading_event_count}"
                )

        completion_rows = app.book_completion_rows
        if completion_rows:
            lines.extend(["", "Book completion by user:"])
            for row in sorted(completion_rows, key=lambda item: (item.completed_book_ratio, item.max_position_opened_ratio, item.book_id), reverse=True)[:10]:
                lines.append(
                    f"  {row.book_id} user={row.user_id}: completed_pages={row.completed_pages}/{row.total_pages} "
                    f"completed={row.completed_book_ratio:.1%} furthest_opened={row.max_position_opened_ratio:.1%}"
                )

        funnel_rows = app.completion_funnel_rows
        if funnel_rows:
            lines.extend(["", "Completion funnel:"])
            for row in sorted(funnel_rows, key=lambda item: (item.book_id, item.min_completed_ratio))[:20]:
                lines.append(f"  {row.book_id} {row.bucket}: users={row.users}")
    return "\n".join(lines)


def no_event_reads_message(paths: ArchivePaths) -> str:
    return f"No monthly Parquet files found under {paths.parquet_dir}."
