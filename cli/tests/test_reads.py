from __future__ import annotations

import json
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

from fortytwogo_cli.events.reads import (
    event_reads_to_dict,
    format_event_reads,
    legacy_stats_cache_dir,
    load_event_reads,
    stats_cache_dir,
    stats_event_names_path,
    stats_pages_path,
    stats_state_path,
    stats_summary_path,
    stats_users_path,
)


def write_events_archive(root: Path, rows: list[dict[str, object]]) -> None:
    parquet_dir = root / "events"
    parquet_dir.mkdir(parents=True, exist_ok=True)
    pq.write_table(pa.Table.from_pylist(rows), parquet_dir / "events_202606.parquet")


def write_book_pages_catalog(root: Path) -> None:
    book_dir = root / "lingocafe"
    book_dir.mkdir(parents=True, exist_ok=True)
    rows = [
        {
            "book_id": "b1",
            "id": "p1",
            "position": 1,
            "kind": "text",
            "prefix": None,
            "title": "Page 1",
            "summary": None,
            "content": "Body 1",
        },
        {
            "book_id": "b1",
            "id": "p2",
            "position": 2,
            "kind": "text",
            "prefix": None,
            "title": "Page 2",
            "summary": None,
            "content": "Body 2",
        },
    ]
    schema = pa.schema(
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
    pq.write_table(pa.Table.from_pylist(rows, schema=schema), book_dir / "books_pages.parquet")


def base_rows() -> list[dict[str, object]]:
    return [
        {
            "created_at": "2026-06-01T08:00:00+00:00",
            "id": "info-a",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-01T08:00:00+00:00",
            "name": "book.info",
            "data": json.dumps({"book_id": "b1"}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-01T09:00:00+00:00",
            "id": "open-a",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-01T09:00:00+00:00",
            "name": "page.open",
            "data": json.dumps({"book_id": "b1", "page_id": "p1"}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-01T09:10:00+00:00",
            "id": "scroll-a",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-01T09:10:00+00:00",
            "name": "page.scroll",
            "data": json.dumps({"book_id": "b1", "page_id": "p1"}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-02T10:00:00+00:00",
            "id": "open-b",
            "app_id": "lingocafe",
            "user_id": "u2",
            "event_at": "2026-06-02T10:00:00+00:00",
            "name": "page.open",
            "data": json.dumps({"book_id": "b1", "page_id": "p2"}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-02T10:05:00+00:00",
            "id": "translate-a",
            "app_id": "lingocafe",
            "user_id": "u2",
            "event_at": "2026-06-02T10:05:00+00:00",
            "name": "page.translate",
            "data": json.dumps({"book_id": "b1", "page_id": "p2", "sentence_id": "b1:p2:1"}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-09T10:00:00+00:00",
            "id": "open-c",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-09T10:00:00+00:00",
            "name": "page.open",
            "data": json.dumps({"book_id": "b2", "page_id": "p1"}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-09T11:00:00+00:00",
            "id": "settings-a",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-09T11:00:00+00:00",
            "name": "read.settings.opened",
            "data": json.dumps({"book_id": "b2", "page_id": "p1"}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-01T12:00:00+00:00",
            "id": "default-a",
            "app_id": "default",
            "user_id": "u3",
            "event_at": "2026-06-01T12:00:00+00:00",
            "name": "page.open",
            "data": json.dumps({"book_id": "b3", "page_id": "p1"}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-01T13:00:00+00:00",
            "id": "ignored-no-book",
            "app_id": "lingocafe",
            "user_id": "u9",
            "event_at": "2026-06-01T13:00:00+00:00",
            "name": "page.open",
            "data": json.dumps({"page_id": "p9"}),
            "meta": "{}",
        },
    ]


def test_event_reads_metrics_and_cache(tmp_path: Path) -> None:
    archive = tmp_path / "archive"
    stats_root = tmp_path / "stats"
    write_events_archive(archive, base_rows())
    legacy_dir = legacy_stats_cache_dir(stats_root, "lingocafe")
    legacy_dir.mkdir(parents=True)

    first = load_event_reads(archive_dir=archive, stats_root=stats_root, reset=False)

    assert first is not None
    assert {app.app_id for app in first.apps} == {"default", "lingocafe"}
    lingocafe = next(app for app in first.apps if app.app_id == "lingocafe")
    assert lingocafe.cache_status == "rebuilt"
    assert lingocafe.cache_dir == stats_cache_dir(stats_root, "lingocafe")
    assert lingocafe.pages_path == stats_pages_path(stats_root, "lingocafe")
    assert lingocafe.users_path == stats_users_path(stats_root, "lingocafe")
    assert lingocafe.summary_path == stats_summary_path(stats_root, "lingocafe")
    assert lingocafe.event_names_path == stats_event_names_path(stats_root, "lingocafe")
    assert lingocafe.state_path == stats_state_path(stats_root, "lingocafe")
    assert lingocafe.cache_dir == stats_root / "lingocafe"
    assert lingocafe.pages_path.name == "query_lingocafe_reads_pages.parquet"
    assert lingocafe.users_path.name == "query_lingocafe_reads_users.parquet"
    assert lingocafe.summary_path.name == "query_lingocafe_reads_summary.parquet"
    assert lingocafe.event_names_path.name == "query_lingocafe_reads_event_names.parquet"
    assert lingocafe.page_completion_path.name == "query_lingocafe_reads_page_completion.parquet"
    assert lingocafe.book_completion_path.name == "query_lingocafe_reads_book_completion.parquet"
    assert lingocafe.completion_funnel_path.name == "query_lingocafe_reads_completion_funnel.parquet"
    assert lingocafe.state_path.name == "query_lingocafe_reads_state.parquet"
    assert lingocafe.pages_path.exists()
    assert lingocafe.users_path.exists()
    assert lingocafe.summary_path.exists()
    assert lingocafe.event_names_path.exists()
    assert lingocafe.page_completion_path.exists()
    assert lingocafe.book_completion_path.exists()
    assert lingocafe.completion_funnel_path.exists()
    assert lingocafe.state_path.exists()

    b1 = next(row for row in lingocafe.summary_rows if row.book_id == "b1")
    assert b1.book_event_count == 5
    assert b1.reading_event_count == 4
    assert b1.page_open_events == 2
    assert b1.unique_pages_opened == 2
    assert b1.reader_users == 2

    b1_all_pages = next(row for row in lingocafe.page_rows if row.book_id == "b1" and row.granularity == "all")
    assert b1_all_pages.page_open_events == 2
    assert b1_all_pages.unique_pages_opened == 2
    b1_week_users = next(row for row in lingocafe.user_rows if row.book_id == "b1" and row.granularity == "week")
    assert b1_week_users.reader_users == 2
    assert b1_week_users.reading_event_count == 4

    event_names = {row.name for row in lingocafe.event_name_rows}
    assert {"book.info", "page.open", "page.scroll", "page.translate", "read.settings.opened"} <= event_names

    second = load_event_reads(archive_dir=archive, stats_root=stats_root, reset=False)
    assert second is not None
    assert next(app for app in second.apps if app.app_id == "lingocafe").cache_status == "cached"

    reset = load_event_reads(archive_dir=archive, stats_root=stats_root, reset=True)
    assert reset is not None
    assert next(app for app in reset.apps if app.app_id == "lingocafe").cache_status == "rebuilt"
    assert not legacy_dir.exists()


def test_event_reads_counts_completed_page_once_per_user_page(tmp_path: Path) -> None:
    archive = tmp_path / "archive"
    stats_root = tmp_path / "stats"
    write_book_pages_catalog(archive)
    write_events_archive(
        archive,
        [
            {
                "created_at": "2026-06-01T09:00:00+00:00",
                "id": "open-p1",
                "app_id": "lingocafe",
                "user_id": "u1",
                "event_at": "2026-06-01T09:00:00+00:00",
                "name": "page.open",
                "data": json.dumps({"book_id": "b1", "page_id": "p1", "progress_bps": 1000}),
                "meta": "{}",
            },
            {
                "created_at": "2026-06-01T09:01:00+00:00",
                "id": "scroll-p1-80",
                "app_id": "lingocafe",
                "user_id": "u1",
                "event_at": "2026-06-01T09:01:00+00:00",
                "name": "page.scroll",
                "data": json.dumps({"book_id": "b1", "page_id": "p1", "progress_bps": 8000}),
                "meta": "{}",
            },
            {
                "created_at": "2026-06-01T09:02:00+00:00",
                "id": "scroll-p1-82",
                "app_id": "lingocafe",
                "user_id": "u1",
                "event_at": "2026-06-01T09:02:00+00:00",
                "name": "page.scroll",
                "data": json.dumps({"book_id": "b1", "page_id": "p1", "progress_bps": 8200}),
                "meta": "{}",
            },
            {
                "created_at": "2026-06-01T09:03:00+00:00",
                "id": "scroll-p1-70",
                "app_id": "lingocafe",
                "user_id": "u1",
                "event_at": "2026-06-01T09:03:00+00:00",
                "name": "page.scroll",
                "data": json.dumps({"book_id": "b1", "page_id": "p1", "progress_bps": 7000}),
                "meta": "{}",
            },
            {
                "created_at": "2026-06-01T09:04:00+00:00",
                "id": "scroll-p1-80-again",
                "app_id": "lingocafe",
                "user_id": "u1",
                "event_at": "2026-06-01T09:04:00+00:00",
                "name": "page.scroll",
                "data": json.dumps({"book_id": "b1", "page_id": "p1", "progress_bps": 8000}),
                "meta": "{}",
            },
        ],
    )

    result = load_event_reads(archive_dir=archive, stats_root=stats_root, app_id_filter="lingocafe", reset=False)

    assert result is not None
    lingocafe = result.apps[0]
    assert len(lingocafe.page_completion_rows) == 1
    page_completion = lingocafe.page_completion_rows[0]
    assert page_completion.page_id == "p1"
    assert page_completion.opened_readers == 1
    assert page_completion.completed_readers == 1
    assert page_completion.avg_max_progress_bps == 8200

    assert len(lingocafe.book_completion_rows) == 1
    book_completion = lingocafe.book_completion_rows[0]
    assert book_completion.user_id == "u1"
    assert book_completion.opened_pages == 1
    assert book_completion.completed_pages == 1
    assert book_completion.total_pages == 2
    assert book_completion.completed_book_ratio == 0.5


def test_event_reads_filters_limit_and_json(tmp_path: Path) -> None:
    archive = tmp_path / "archive"
    stats_root = tmp_path / "stats"
    write_events_archive(archive, base_rows())

    result = load_event_reads(
        archive_dir=archive,
        stats_root=stats_root,
        app_id_filter="lingocafe",
        book_id_filter="b2",
        limit=1,
        reset=False,
    )

    assert result is not None
    assert len(result.apps) == 1
    assert result.apps[0].app_id == "lingocafe"
    assert result.apps[0].total_books == 2
    assert [row.book_id for row in result.apps[0].summary_rows] == ["b2"]
    assert all(row.book_id == "b2" for row in result.apps[0].page_rows)
    assert all(row.book_id == "b2" for row in result.apps[0].user_rows)

    output = format_event_reads(result)
    assert "42Go Read Engagement" in output
    assert "Book filter: b2" in output
    assert "read.settings.opened" in output

    payload = event_reads_to_dict(result)
    assert payload["apps"][0]["summary"][0]["book_id"] == "b2"
    assert payload["apps"][0]["pages"][0]["book_id"] == "b2"
