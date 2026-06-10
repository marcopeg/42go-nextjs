from __future__ import annotations

import json
import re
import shutil
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

import pytz

from fortytwogo_cli.events.dependencies import import_duckdb, import_pyarrow
from fortytwogo_cli.events.paths import parquet_files, parquet_glob, resolve_paths


METRIC_SCHEMA_VERSION = 1
DEFAULT_STATS_ROOT = Path(".local/42go-stats")
BUCKET_TIMEZONE = "Europe/Rome"
GRANULARITIES = ("day", "week", "month", "year")
READING_EVENTS = {"page.open", "page.scroll", "page.translate"}
CONSENT_EVENTS = {"user.consent.created", "user.consent.updated"}

Granularity = Literal["day", "week", "month", "year"]
OutputFormat = Literal["text", "json"]


@dataclass(frozen=True)
class SourceFileFingerprint:
    path: str
    size: int
    mtime_ns: int


@dataclass(frozen=True)
class GrowthMetricRow:
    app_id: str
    granularity: str
    bucket_start: str
    bucket_label: str
    total_users: int
    subscribed_users: int
    weekly_active_users: int
    monthly_active_users: int
    inactive_users: int


@dataclass(frozen=True)
class GrowthAppResult:
    app_id: str
    cache_dir: Path
    metrics_path: Path
    state_path: Path
    cache_status: str
    rows: list[GrowthMetricRow]


@dataclass(frozen=True)
class GrowthResult:
    archive_dir: Path
    stats_root: Path
    apps: list[GrowthAppResult]
    source_files: list[SourceFileFingerprint]


def parse_app_filter(value: str | None) -> set[str] | None:
    if not value:
        return None
    app_ids = {item.strip() for item in value.split(",") if item.strip()}
    return app_ids or None


def safe_app_id(app_id: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_-]+", app_id):
        raise RuntimeError(f"Unsafe app id for stats cache path: {app_id}")
    return app_id


def source_fingerprints(files: list[Path]) -> list[SourceFileFingerprint]:
    fingerprints: list[SourceFileFingerprint] = []
    for file_path in files:
        stat = file_path.stat()
        fingerprints.append(
            SourceFileFingerprint(
                path=str(file_path),
                size=stat.st_size,
                mtime_ns=stat.st_mtime_ns,
            )
        )
    return fingerprints


def stats_cache_dir(stats_root: Path, app_id: str) -> Path:
    return stats_root / safe_app_id(app_id) / "users" / "growth"


def _state_matches(state_path: Path, fingerprints: list[SourceFileFingerprint]) -> bool:
    if not state_path.exists():
        return False
    try:
        state = json.loads(state_path.read_text())
    except json.JSONDecodeError:
        return False
    return (
        state.get("metric_schema_version") == METRIC_SCHEMA_VERSION
        and state.get("source_files") == [asdict(fingerprint) for fingerprint in fingerprints]
    )


def _load_cached_rows(metrics_path: Path) -> list[GrowthMetricRow]:
    if not metrics_path.exists():
        return []
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        items = connection.execute(
            """
            SELECT
              app_id,
              granularity,
              bucket_start,
              bucket_label,
              total_users,
              subscribed_users,
              weekly_active_users,
              monthly_active_users,
              inactive_users
            FROM read_parquet(?)
            ORDER BY app_id, granularity, bucket_start
            """,
            [str(metrics_path)],
        ).fetchall()
    rows: list[GrowthMetricRow] = []
    for item in items:
        rows.append(
            GrowthMetricRow(
                app_id=str(item[0]),
                granularity=str(item[1]),
                bucket_start=str(item[2]),
                bucket_label=str(item[3]),
                total_users=int(item[4]),
                subscribed_users=int(item[5]),
                weekly_active_users=int(item[6]),
                monthly_active_users=int(item[7]),
                inactive_users=int(item[8]),
            )
        )
    return rows


def _write_rows(metrics_path: Path, rows: list[GrowthMetricRow]) -> None:
    pa, pq = import_pyarrow()
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    table = pa.Table.from_pylist([asdict(row) for row in rows])
    pq.write_table(table, metrics_path)


def _write_state(
    state_path: Path,
    app_id: str,
    fingerprints: list[SourceFileFingerprint],
    rows: list[GrowthMetricRow],
    source_event_range: tuple[datetime | None, datetime | None],
) -> None:
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state = {
        "metric_schema_version": METRIC_SCHEMA_VERSION,
        "app_id": app_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "timezone": BUCKET_TIMEZONE,
        "source_files": [asdict(fingerprint) for fingerprint in fingerprints],
        "source_event_min": source_event_range[0].isoformat() if source_event_range[0] else None,
        "source_event_max": source_event_range[1].isoformat() if source_event_range[1] else None,
        "rows": len(rows),
        "granularities": list(GRANULARITIES),
        "reading_events": sorted(READING_EVENTS),
        "consent_events": sorted(CONSENT_EVENTS),
    }
    state_path.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n")


def parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        raw = value.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(raw)
        except ValueError:
            return None
    else:
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(pytz.timezone(BUCKET_TIMEZONE))


def _bucket_start(value: datetime, granularity: Granularity) -> datetime:
    local_value = value.astimezone(pytz.timezone(BUCKET_TIMEZONE))
    if granularity == "day":
        return local_value.replace(hour=0, minute=0, second=0, microsecond=0)
    if granularity == "week":
        day_start = local_value.replace(hour=0, minute=0, second=0, microsecond=0)
        return day_start - timedelta(days=day_start.isoweekday() - 1)
    if granularity == "month":
        return local_value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if granularity == "year":
        return local_value.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    raise ValueError(f"Unsupported granularity: {granularity}")


def _next_bucket_start(value: datetime, granularity: Granularity) -> datetime:
    if granularity == "day":
        return value + timedelta(days=1)
    if granularity == "week":
        return value + timedelta(days=7)
    if granularity == "month":
        year = value.year + (1 if value.month == 12 else 0)
        month = 1 if value.month == 12 else value.month + 1
        return value.replace(year=year, month=month)
    if granularity == "year":
        return value.replace(year=value.year + 1)
    raise ValueError(f"Unsupported granularity: {granularity}")


def _bucket_label(value: datetime, granularity: Granularity) -> str:
    if granularity in {"day", "week", "month"}:
        return value.date().isoformat() if granularity != "month" else value.strftime("%Y-%m")
    return value.strftime("%Y")


def generate_buckets(min_event_at: datetime, max_event_at: datetime, granularity: Granularity) -> list[tuple[datetime, datetime]]:
    cursor = _bucket_start(min_event_at, granularity)
    last = _bucket_start(max_event_at, granularity)
    buckets: list[tuple[datetime, datetime]] = []
    while cursor <= last:
        next_cursor = _next_bucket_start(cursor, granularity)
        buckets.append((cursor, next_cursor))
        cursor = next_cursor
    return buckets


def _latest_mkt_choice(data: str | None, event_at: datetime) -> tuple[datetime, bool] | None:
    if not data:
        return None
    try:
        payload = json.loads(data)
    except json.JSONDecodeError:
        return None
    entries = payload.get("next", {}).get("mkt")
    if not isinstance(entries, list):
        return None

    choices: list[tuple[datetime, bool]] = []
    for entry in entries:
        if not isinstance(entry, dict) or "value" not in entry:
            continue
        changed_at = parse_datetime(entry.get("changedAt")) or event_at
        choices.append((changed_at, bool(entry.get("value"))))
    if not choices:
        return None
    return max(choices, key=lambda item: item[0])


def _fetch_rows(parquet_pattern: str) -> list[dict[str, Any]]:
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        result = connection.execute(
            """
            SELECT app_id, user_id, event_at, name, data
            FROM read_parquet(?)
            WHERE user_id IS NOT NULL
              AND event_at IS NOT NULL
            ORDER BY app_id, event_at, user_id, name
            """,
            [parquet_pattern],
        ).fetchall()

    rows: list[dict[str, Any]] = []
    for app_id, user_id, event_at, name, data in result:
        parsed_event_at = parse_datetime(event_at)
        if parsed_event_at is None:
            continue
        rows.append(
            {
                "app_id": str(app_id),
                "user_id": str(user_id),
                "event_at": parsed_event_at,
                "name": str(name),
                "data": data if data is None else str(data),
            }
        )
    return rows


def _compute_app_rows(app_id: str, events: list[dict[str, Any]]) -> tuple[list[GrowthMetricRow], tuple[datetime | None, datetime | None]]:
    event_times = [event["event_at"] for event in events]
    if not event_times:
        return [], (None, None)

    first_seen: dict[str, datetime] = {}
    reading_events: dict[str, list[datetime]] = {}
    consent_choices: dict[str, list[tuple[datetime, bool]]] = {}

    for event in events:
        user_id = event["user_id"]
        event_at = event["event_at"]
        first_seen[user_id] = min(first_seen.get(user_id, event_at), event_at)

        if event["name"] in READING_EVENTS:
            reading_events.setdefault(user_id, []).append(event_at)

        if event["name"] in CONSENT_EVENTS:
            choice = _latest_mkt_choice(event["data"], event_at)
            if choice:
                consent_choices.setdefault(user_id, []).append(choice)

    for choices in consent_choices.values():
        choices.sort(key=lambda item: item[0])
    for timestamps in reading_events.values():
        timestamps.sort()

    rows: list[GrowthMetricRow] = []
    min_event_at = min(event_times)
    max_event_at = max(event_times)
    all_users = set(first_seen.keys())

    for granularity in GRANULARITIES:
        for bucket_start, bucket_end in generate_buckets(min_event_at, max_event_at, granularity):  # type: ignore[arg-type]
            effective_end = min(bucket_end, max_event_at + timedelta(microseconds=1))
            known_users = {user_id for user_id, seen_at in first_seen.items() if seen_at < effective_end}
            subscribed = 0
            weekly_active = 0
            monthly_active = 0

            for user_id in all_users:
                choices = [choice for choice in consent_choices.get(user_id, []) if choice[0] < effective_end]
                if choices and choices[-1][1] and user_id in known_users:
                    subscribed += 1

                reads = reading_events.get(user_id, [])
                if user_id in known_users and any(effective_end - timedelta(days=7) <= item < effective_end for item in reads):
                    weekly_active += 1
                if user_id in known_users and any(effective_end - timedelta(days=30) <= item < effective_end for item in reads):
                    monthly_active += 1

            total_users = len(known_users)
            rows.append(
                GrowthMetricRow(
                    app_id=app_id,
                    granularity=granularity,
                    bucket_start=bucket_start.isoformat(),
                    bucket_label=_bucket_label(bucket_start, granularity),  # type: ignore[arg-type]
                    total_users=total_users,
                    subscribed_users=subscribed,
                    weekly_active_users=weekly_active,
                    monthly_active_users=monthly_active,
                    inactive_users=max(total_users - monthly_active, 0),
                )
            )

    return rows, (min_event_at, max_event_at)


def load_users_growth(
    archive_dir: Path | None = None,
    stats_root: Path | None = None,
    app_filter: set[str] | None = None,
    reset: bool = False,
) -> GrowthResult | None:
    paths = resolve_paths(archive_dir)
    files = parquet_files(paths)
    if not files:
        return None

    root = stats_root or DEFAULT_STATS_ROOT
    fingerprints = source_fingerprints(files)
    all_events = _fetch_rows(parquet_glob(paths))
    app_ids = sorted({event["app_id"] for event in all_events})
    results: list[GrowthAppResult] = []

    for app_id in app_ids:
        cache_dir = stats_cache_dir(root, app_id)
        metrics_path = cache_dir / "metrics.parquet"
        state_path = cache_dir / "state.json"
        if reset and cache_dir.exists():
            shutil.rmtree(cache_dir)

        cache_status = "rebuilt"
        if not reset and _state_matches(state_path, fingerprints) and metrics_path.exists():
            rows = _load_cached_rows(metrics_path)
            cache_status = "cached"
        else:
            rows, event_range = _compute_app_rows(app_id, [event for event in all_events if event["app_id"] == app_id])
            _write_rows(metrics_path, rows)
            _write_state(state_path, app_id, fingerprints, rows, event_range)

        if app_filter is None or app_id in app_filter:
            results.append(
                GrowthAppResult(
                    app_id=app_id,
                    cache_dir=cache_dir,
                    metrics_path=metrics_path,
                    state_path=state_path,
                    cache_status=cache_status,
                    rows=rows,
                )
            )

    return GrowthResult(archive_dir=paths.root, stats_root=root, apps=results, source_files=fingerprints)


def users_growth_to_dict(result: GrowthResult) -> dict[str, Any]:
    return {
        "archive_dir": str(result.archive_dir),
        "stats_root": str(result.stats_root),
        "source_files": [asdict(fingerprint) for fingerprint in result.source_files],
        "apps": [
            {
                "app_id": app.app_id,
                "cache_dir": str(app.cache_dir),
                "cache_status": app.cache_status,
                "rows": [asdict(row) for row in app.rows],
            }
            for app in result.apps
        ],
    }


def format_users_growth(result: GrowthResult) -> str:
    lines = [
        "42Go Users Growth Stats",
        "",
        f"Archive: {result.archive_dir}",
        f"Stats root: {result.stats_root}",
        f"Source Parquet files: {len(result.source_files)}",
    ]
    if not result.apps:
        lines.extend(["", "No matching app IDs."])
        return "\n".join(lines)

    metric_names = [
        ("total_users", "users"),
        ("subscribed_users", "subscribed"),
        ("weekly_active_users", "wau"),
        ("monthly_active_users", "mau"),
        ("inactive_users", "inactive"),
    ]
    for app in result.apps:
        lines.extend(
            [
                "",
                f"App: {app.app_id} ({app.cache_status})",
                f"Cache: {app.cache_dir}",
            ]
        )
        for granularity in GRANULARITIES:
            rows = [row for row in app.rows if row.granularity == granularity]
            if not rows:
                continue
            lines.append("")
            lines.append(f"{granularity.capitalize()}:")
            header = "  bucket      " + "  ".join(label.rjust(10) for _name, label in metric_names)
            lines.append(header)
            for row in rows:
                values = [str(getattr(row, name)).rjust(10) for name, _label in metric_names]
                lines.append(f"  {row.bucket_label.ljust(10)}  " + "  ".join(values))
    return "\n".join(lines)


def no_users_growth_message(archive_dir: Path | None = None) -> str:
    paths = resolve_paths(archive_dir)
    return f"No monthly Parquet files found under {paths.parquet_dir}."
