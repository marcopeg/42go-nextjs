from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fortytwogo_cli.events.dependencies import import_duckdb
from fortytwogo_cli.events.paths import ArchivePaths, parquet_files, parquet_glob, resolve_paths


@dataclass(frozen=True)
class EventStats:
    archive_dir: Path
    parquet_dir: Path
    parquet_files: list[Path]
    covered_months: int
    total_events: int
    distinct_ids: int
    app_count: int
    user_count: int
    event_name_count: int
    min_created_at: Any
    max_created_at: Any
    min_event_at: Any
    max_event_at: Any
    per_month: list[tuple[str, int]]


def load_event_stats(archive_dir: Path | None = None) -> EventStats | None:
    paths = resolve_paths(archive_dir)
    files = parquet_files(paths)
    if not files:
        return None

    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        summary = connection.execute(
            """
            SELECT
              count(*) AS total_events,
              count(DISTINCT id) AS distinct_ids,
              count(DISTINCT app_id) AS app_count,
              count(DISTINCT user_id) AS user_count,
              count(DISTINCT name) AS event_name_count,
              min(created_at) AS min_created_at,
              max(created_at) AS max_created_at,
              min(event_at) AS min_event_at,
              max(event_at) AS max_event_at
            FROM read_parquet(?)
            """,
            [parquet_glob(paths)],
        ).fetchone()
        per_month = connection.execute(
            """
            SELECT
              strftime(created_at, '%Y%m') AS month,
              count(*) AS event_count
            FROM read_parquet(?)
            GROUP BY 1
            ORDER BY 1
            """,
            [parquet_glob(paths)],
        ).fetchall()

    return EventStats(
        archive_dir=paths.root,
        parquet_dir=paths.parquet_dir,
        parquet_files=files,
        covered_months=len(per_month),
        total_events=summary[0],
        distinct_ids=summary[1],
        app_count=summary[2],
        user_count=summary[3],
        event_name_count=summary[4],
        min_created_at=summary[5],
        max_created_at=summary[6],
        min_event_at=summary[7],
        max_event_at=summary[8],
        per_month=[(str(month), int(event_count)) for month, event_count in per_month],
    )


def format_stats(stats: EventStats) -> str:
    lines = [
        "42Go Events Data Stats",
        "",
        f"Data root: {stats.archive_dir}",
        f"Parquet directory: {stats.parquet_dir}",
        f"Parquet files: {len(stats.parquet_files)}",
        f"Covered months: {stats.covered_months}",
        f"Total events: {stats.total_events}",
        f"Distinct event ids: {stats.distinct_ids}",
        f"Apps: {stats.app_count}",
        f"Users: {stats.user_count}",
        f"Event names: {stats.event_name_count}",
        f"Created range: {stats.min_created_at} -> {stats.max_created_at}",
        f"Event range: {stats.min_event_at} -> {stats.max_event_at}",
        "",
        "Per-month counts:",
    ]
    if not stats.per_month:
        lines.append("  none")
    else:
        width = max(len(month) for month, _count in stats.per_month)
        for month, count in stats.per_month:
            lines.append(f"  {month.rjust(width)}  {count}")
    return "\n".join(lines)


def no_events_message(paths: ArchivePaths) -> str:
    return f"No monthly Parquet files found under {paths.parquet_dir}."
