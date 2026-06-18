from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
import json
from pathlib import Path
from typing import Any, Iterable
from zoneinfo import ZoneInfo

from fortytwogo_cli.events.dependencies import import_duckdb, import_pyarrow
from fortytwogo_cli.events.paths import parquet_files, resolve_paths
from fortytwogo_cli.events.pull import parse_utc
from fortytwogo_cli.query.lingocafe_users import LINGOCAFE_APP_ID
from fortytwogo_cli.query.paths import query_output_path

DEFAULT_COMPLETION_BPS = 8000
BUCKET_TIMEZONE = ZoneInfo("Europe/Rome")
READ_EVENT_NAMES = {"page.open", "page.scroll"}

LINGOCAFE_READS_COLUMNS = [
    "day",
    "user_pages_started",
    "user_pages_completed",
]


@dataclass(frozen=True)
class QueryLingocafeReadsOptions:
    data_dir: Path | None = None
    query_dir: Path | None = None
    bps: int = DEFAULT_COMPLETION_BPS


def local_day(value: datetime) -> date:
    return value.astimezone(BUCKET_TIMEZONE).date()


def day_range(start: date, end: date) -> list[date]:
    days: list[date] = []
    cursor = start
    while cursor <= end:
        days.append(cursor)
        cursor += timedelta(days=1)
    return days


def read_json_payload(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if not isinstance(value, str) or not value.strip():
        return {}
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def int_value(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def normalize_read_event(row: dict[str, Any]) -> dict[str, Any] | None:
    if row.get("app_id") != LINGOCAFE_APP_ID or row.get("name") not in READ_EVENT_NAMES:
        return None
    if not row.get("user_id") or not row.get("event_at"):
        return None
    payload = read_json_payload(row.get("data"))
    book_id = payload.get("book_id")
    page_id = payload.get("page_id")
    progress_bps = int_value(payload.get("progress_bps"))
    if not isinstance(book_id, str) or not book_id or not isinstance(page_id, str) or not page_id:
        return None
    if progress_bps is None:
        return None
    return {
        "user_id": str(row["user_id"]),
        "book_id": book_id,
        "page_id": page_id,
        "event_at": parse_utc(row["event_at"]),
        "progress_bps": progress_bps,
    }


def read_read_events(data_dir: Path | None) -> list[dict[str, Any]]:
    paths = resolve_paths(data_dir)
    files = parquet_files(paths)
    if not files:
        return []

    _pa, pq = import_pyarrow()
    rows: list[dict[str, Any]] = []
    for path in files:
        for row in pq.read_table(path, columns=["app_id", "user_id", "event_at", "name", "data"]).to_pylist():
            normalized = normalize_read_event(row)
            if normalized is not None:
                rows.append(normalized)
    return rows


def user_page_key(event: dict[str, Any]) -> tuple[str, str, str]:
    return event["user_id"], event["book_id"], event["page_id"]


def first_started_days(events: Iterable[dict[str, Any]]) -> dict[tuple[str, str, str], date]:
    started: dict[tuple[str, str, str], datetime] = {}
    for event in events:
        key = user_page_key(event)
        previous = started.get(key)
        if previous is None or event["event_at"] < previous:
            started[key] = event["event_at"]
    return {key: local_day(value) for key, value in started.items()}


def first_completed_days(events: Iterable[dict[str, Any]], bps: int) -> dict[tuple[str, str, str], date]:
    completed: dict[tuple[str, str, str], datetime] = {}
    for event in events:
        if int(event["progress_bps"]) < bps:
            continue
        key = user_page_key(event)
        previous = completed.get(key)
        if previous is None or event["event_at"] < previous:
            completed[key] = event["event_at"]
    return {key: local_day(value) for key, value in completed.items()}


def count_by_day(days_by_key: dict[tuple[str, str, str], date]) -> dict[date, int]:
    counts: dict[date, int] = {}
    for day in days_by_key.values():
        counts[day] = counts.get(day, 0) + 1
    return counts


def build_read_rows(events: list[dict[str, Any]], bps: int) -> list[dict[str, Any]]:
    if bps < 0 or bps > 10000:
        raise RuntimeError("--bps must be between 0 and 10000.")
    if not events:
        return []

    started = count_by_day(first_started_days(events))
    completed = count_by_day(first_completed_days(events, bps))
    event_days = [local_day(event["event_at"]) for event in events]
    days = day_range(min(event_days), max(event_days))
    return [
        {
            "day": day,
            "user_pages_started": started.get(day, 0),
            "user_pages_completed": completed.get(day, 0),
        }
        for day in days
    ]


def write_reads(path: Path, rows: list[dict[str, Any]]) -> None:
    pa, pq = import_pyarrow()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    schema = pa.schema(
        [
            ("day", pa.date32()),
            ("user_pages_started", pa.int64()),
            ("user_pages_completed", pa.int64()),
        ]
    )
    table = pa.table({column: [row.get(column) for row in rows] for column in LINGOCAFE_READS_COLUMNS}, schema=schema)
    pq.write_table(table, tmp, compression="zstd")
    tmp.replace(path)


def smoke_read_reads(path: Path, expected_rows: int) -> None:
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        count = connection.execute("SELECT count(*) FROM read_parquet(?)", [str(path)]).fetchone()[0]
    if count != expected_rows:
        raise RuntimeError(f"Parquet smoke read failed: expected {expected_rows} LingoCafe reads rows, read {count}.")


def query_lingocafe_reads(options: QueryLingocafeReadsOptions) -> dict[str, Any]:
    events = read_read_events(options.data_dir)
    rows = build_read_rows(events, options.bps)
    output_path = query_output_path(["lingocafe", "reads"], options.query_dir)
    write_reads(output_path, rows)
    smoke_read_reads(output_path, len(rows))
    return {
        "rows": len(rows),
        "events": len(events),
        "bps": options.bps,
        "parquet": str(output_path),
    }
