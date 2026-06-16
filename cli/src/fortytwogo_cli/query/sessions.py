from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable

from fortytwogo_cli.events.dependencies import import_duckdb, import_pyarrow
from fortytwogo_cli.events.paths import parquet_files, resolve_paths
from fortytwogo_cli.events.pull import parse_utc
from fortytwogo_cli.query.paths import query_output_path
from fortytwogo_cli.users.paths import resolve_paths as resolve_auth_paths

DEFAULT_SESSION_DURATION_MINUTES = 20


@dataclass(frozen=True)
class QuerySessionsOptions:
    data_dir: Path | None = None
    query_dir: Path | None = None
    duration: int = DEFAULT_SESSION_DURATION_MINUTES


def normalize_event(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "app_id": str(row["app_id"]),
        "user_id": str(row["user_id"]),
        "event_at": parse_utc(row["event_at"]),
    }


def read_event_rows(data_dir: Path | None) -> list[dict[str, Any]]:
    paths = resolve_paths(data_dir)
    files = parquet_files(paths)
    if not files:
        return []

    _pa, pq = import_pyarrow()
    rows: list[dict[str, Any]] = []
    for path in files:
        for row in pq.read_table(path).to_pylist():
            if not row.get("id") or not row.get("app_id") or not row.get("user_id") or not row.get("event_at"):
                continue
            rows.append(normalize_event(row))
    return rows


def read_auth_user_keys(data_dir: Path | None) -> set[tuple[str, str]]:
    users_path = resolve_auth_paths(data_dir).users_parquet
    if not users_path.exists():
        raise RuntimeError(f"Missing auth users: run 42go pull auth first ({users_path}).")
    _pa, pq = import_pyarrow()
    keys: set[tuple[str, str]] = set()
    for row in pq.read_table(users_path, columns=["app_id", "id"]).to_pylist():
        if not row.get("app_id") or not row.get("id"):
            continue
        keys.add((str(row["app_id"]), str(row["id"])))
    return keys


def filter_events_for_auth_users(events: Iterable[dict[str, Any]], auth_user_keys: set[tuple[str, str]]) -> list[dict[str, Any]]:
    return [event for event in events if (event["app_id"], event["user_id"]) in auth_user_keys]


def group_events(events: Iterable[dict[str, Any]]) -> dict[tuple[str, str], list[dict[str, Any]]]:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for event in events:
        grouped.setdefault((event["app_id"], event["user_id"]), []).append(event)
    for rows in grouped.values():
        rows.sort(key=lambda row: (row["event_at"], row["id"]))
    return grouped


def build_session(events: list[dict[str, Any]]) -> dict[str, Any]:
    first = events[0]
    last = events[-1]
    started_at = first["event_at"]
    ended_at = last["event_at"]
    return {
        "session_id": first["id"],
        "app_id": first["app_id"],
        "user_id": first["user_id"],
        "started_at": started_at,
        "ended_at": ended_at,
        "duration_seconds": int((ended_at - started_at).total_seconds()),
        "event_count": len(events),
        "event_ids": [event["id"] for event in events],
    }


def compute_sessions(events: Iterable[dict[str, Any]], duration_minutes: int) -> list[dict[str, Any]]:
    if duration_minutes <= 0:
        raise RuntimeError("--duration must be greater than zero.")

    gap_seconds = duration_minutes * 60
    sessions: list[dict[str, Any]] = []
    for group in group_events(events).values():
        current: list[dict[str, Any]] = []
        previous_event_at: datetime | None = None
        for event in group:
            if previous_event_at is None:
                current = [event]
            else:
                gap = (event["event_at"] - previous_event_at).total_seconds()
                if gap > gap_seconds:
                    sessions.append(build_session(current))
                    current = [event]
                else:
                    current.append(event)
            previous_event_at = event["event_at"]
        if current:
            sessions.append(build_session(current))

    sessions.sort(key=lambda row: (row["started_at"], row["app_id"], row["user_id"], row["session_id"]))
    return sessions


def write_sessions(path: Path, sessions: list[dict[str, Any]]) -> None:
    pa, pq = import_pyarrow()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    schema = pa.schema(
        [
            ("session_id", pa.string()),
            ("app_id", pa.string()),
            ("user_id", pa.string()),
            ("started_at", pa.timestamp("us", tz="UTC")),
            ("ended_at", pa.timestamp("us", tz="UTC")),
            ("duration_seconds", pa.int64()),
            ("event_count", pa.int64()),
            ("event_ids", pa.list_(pa.string())),
        ]
    )
    columns = {
        "session_id": [row["session_id"] for row in sessions],
        "app_id": [row["app_id"] for row in sessions],
        "user_id": [row["user_id"] for row in sessions],
        "started_at": [row["started_at"].astimezone(UTC) for row in sessions],
        "ended_at": [row["ended_at"].astimezone(UTC) for row in sessions],
        "duration_seconds": [row["duration_seconds"] for row in sessions],
        "event_count": [row["event_count"] for row in sessions],
        "event_ids": [row["event_ids"] for row in sessions],
    }
    table = pa.table(columns, schema=schema)
    pq.write_table(table, tmp, compression="zstd")
    tmp.replace(path)


def smoke_read_sessions(path: Path, expected_rows: int) -> None:
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        count = connection.execute("SELECT count(*) FROM read_parquet(?)", [str(path)]).fetchone()[0]
    if count != expected_rows:
        raise RuntimeError(f"Parquet smoke read failed: expected {expected_rows} sessions, read {count}.")


def query_sessions(options: QuerySessionsOptions) -> dict[str, Any]:
    raw_events = read_event_rows(options.data_dir)
    auth_user_keys = read_auth_user_keys(options.data_dir)
    events = filter_events_for_auth_users(raw_events, auth_user_keys)
    sessions = compute_sessions(events, options.duration)
    output_path = query_output_path(["sessions"], options.query_dir)
    write_sessions(output_path, sessions)
    smoke_read_sessions(output_path, len(sessions))
    return {
        "sessions": len(sessions),
        "events": len(events),
        "ignored_events": len(raw_events) - len(events),
        "duration_minutes": options.duration,
        "parquet": str(output_path),
    }
