from __future__ import annotations

from pathlib import Path

from fortytwogo_cli.events.query import EventStats, format_stats


def test_format_stats_includes_summary_and_months() -> None:
    stats = EventStats(
        archive_dir=Path(".local/42go-events"),
        parquet_dir=Path(".local/42go-events/events/parquet"),
        parquet_files=[Path("events_202605.parquet"), Path("events_202606.parquet")],
        covered_months=2,
        total_events=981,
        distinct_ids=981,
        app_count=1,
        user_count=20,
        event_name_count=17,
        min_created_at="2026-05-11",
        max_created_at="2026-06-09",
        min_event_at="2026-05-11",
        max_event_at="2026-06-09",
        per_month=[("202605", 545), ("202606", 436)],
    )

    output = format_stats(stats)

    assert "Total events: 981" in output
    assert "Covered months: 2" in output
    assert "202605  545" in output
    assert "202606  436" in output
