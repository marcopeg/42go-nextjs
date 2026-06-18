from __future__ import annotations

from datetime import UTC, datetime
import json
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

from fortytwogo_cli.query.lingocafe_reads import QueryLingocafeReadsOptions, query_lingocafe_reads


def dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def write_parquet(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(pa.Table.from_pylist(rows), path)


def read_rows(path: Path) -> list[dict[str, Any]]:
    return pq.read_table(path).to_pylist()


def event_row(
    event_id: str,
    *,
    user_id: str = "u1",
    app_id: str = "lingocafe",
    event_at: str,
    name: str,
    book_id: str = "book-1",
    page_id: str = "page-1",
    progress_bps: int,
) -> dict[str, Any]:
    timestamp = dt(event_at)
    return {
        "created_at": timestamp,
        "id": event_id,
        "app_id": app_id,
        "user_id": user_id,
        "event_at": timestamp,
        "name": name,
        "data": json.dumps(
            {
                "book_id": book_id,
                "page_id": page_id,
                "progress_bps": progress_bps,
            }
        ),
        "meta": "{}",
    }


def row_by_day(rows: list[dict[str, Any]], day: str) -> dict[str, Any]:
    parsed_day = datetime.fromisoformat(day).date()
    return next(row for row in rows if row["day"] == parsed_day)


def test_query_lingocafe_reads_counts_first_started_and_first_completed_user_pages(tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    query_dir = tmp_path / "42go-query"
    write_parquet(
        data_dir / "events" / "events_202606.parquet",
        [
            event_row("e1", event_at="2026-06-01T08:00:00Z", name="page.open", progress_bps=0),
            event_row("e2", event_at="2026-06-02T08:00:00Z", name="page.scroll", progress_bps=7999),
            event_row("e3", event_at="2026-06-03T08:00:00Z", name="page.scroll", progress_bps=8000),
            event_row("e4", event_at="2026-06-04T08:00:00Z", name="page.scroll", progress_bps=10000),
            event_row("e5", event_at="2026-06-05T08:00:00Z", name="page.open", progress_bps=0),
            event_row(
                "e6",
                event_at="2026-06-02T09:00:00Z",
                name="page.scroll",
                page_id="page-2",
                progress_bps=9000,
            ),
            event_row(
                "e7",
                app_id="default",
                event_at="2026-06-02T09:30:00Z",
                name="page.scroll",
                page_id="page-3",
                progress_bps=9000,
            ),
        ],
    )

    result = query_lingocafe_reads(QueryLingocafeReadsOptions(data_dir=data_dir, query_dir=query_dir))
    rows = read_rows(query_dir / "lingocafe-reads.parquet")

    assert result == {
        "rows": 5,
        "events": 6,
        "bps": 8000,
        "parquet": str(query_dir / "lingocafe-reads.parquet"),
    }
    assert row_by_day(rows, "2026-06-01") == {
        "day": datetime.fromisoformat("2026-06-01").date(),
        "user_pages_started": 1,
        "user_pages_completed": 0,
    }
    assert row_by_day(rows, "2026-06-02")["user_pages_started"] == 1
    assert row_by_day(rows, "2026-06-02")["user_pages_completed"] == 1
    assert row_by_day(rows, "2026-06-03")["user_pages_started"] == 0
    assert row_by_day(rows, "2026-06-03")["user_pages_completed"] == 1
    assert row_by_day(rows, "2026-06-04")["user_pages_started"] == 0
    assert row_by_day(rows, "2026-06-04")["user_pages_completed"] == 0
    assert row_by_day(rows, "2026-06-05")["user_pages_started"] == 0
    assert row_by_day(rows, "2026-06-05")["user_pages_completed"] == 0


def test_query_lingocafe_reads_custom_bps_changes_completion_day(tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    query_dir = tmp_path / "42go-query"
    write_parquet(
        data_dir / "events" / "events_202606.parquet",
        [
            event_row("e1", event_at="2026-06-01T08:00:00Z", name="page.open", progress_bps=0),
            event_row("e2", event_at="2026-06-03T08:00:00Z", name="page.scroll", progress_bps=8000),
            event_row("e3", event_at="2026-06-04T08:00:00Z", name="page.scroll", progress_bps=10000),
        ],
    )

    result = query_lingocafe_reads(QueryLingocafeReadsOptions(data_dir=data_dir, query_dir=query_dir, bps=9001))
    rows = read_rows(query_dir / "lingocafe-reads.parquet")

    assert result["bps"] == 9001
    assert row_by_day(rows, "2026-06-03")["user_pages_completed"] == 0
    assert row_by_day(rows, "2026-06-04")["user_pages_completed"] == 1


def test_query_lingocafe_reads_writes_empty_parquet_without_read_events(tmp_path: Path) -> None:
    result = query_lingocafe_reads(
        QueryLingocafeReadsOptions(data_dir=tmp_path / "42go-data", query_dir=tmp_path / "42go-query")
    )
    rows = read_rows(tmp_path / "42go-query" / "lingocafe-reads.parquet")

    assert result["rows"] == 0
    assert rows == []
