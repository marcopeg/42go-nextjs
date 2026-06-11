from __future__ import annotations

import shutil
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fortytwogo_cli.events.dependencies import import_duckdb, import_pyarrow
from fortytwogo_cli.events.paths import ArchivePaths, parquet_files, parquet_glob, resolve_paths
from fortytwogo_cli.events.users_growth import (
    DEFAULT_STATS_ROOT,
    SourceFileFingerprint,
    parse_datetime,
    safe_app_id,
    source_fingerprints,
)


SESSION_SCHEMA_VERSION = 1
SESSION_GAP_SECONDS = 60 * 60
DEFAULT_SESSION_LIMIT = 20


@dataclass(frozen=True)
class SessionEvent:
    id: str
    created_at: str | None
    app_id: str
    user_id: str
    event_at: str
    name: str
    data: str | None
    meta: str | None


@dataclass(frozen=True)
class EventSession:
    id: str
    app_id: str
    user_id: str
    start_at: str
    end_at: str
    duration: int
    events: list[SessionEvent]


@dataclass(frozen=True)
class SessionAppResult:
    app_id: str
    cache_dir: Path
    sessions_path: Path
    events_path: Path
    state_path: Path
    cache_status: str
    sessions: list[EventSession]
    total_sessions: int


@dataclass(frozen=True)
class SessionResult:
    archive_dir: Path
    stats_root: Path
    apps: list[SessionAppResult]
    source_files: list[SourceFileFingerprint]
    limit: int
    app_id_filter: str | None
    user_id_filter: str | None


def stats_cache_dir(stats_root: Path, app_id: str) -> Path:
    return stats_root / safe_app_id(app_id)


def stats_sessions_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_session_sessions.parquet"


def stats_events_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_session_events.parquet"


def stats_state_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_session_state.parquet"


def legacy_stats_state_json_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "events_query_session_state.json"


def legacy_stats_parquet_paths(stats_root: Path, app_id: str) -> list[Path]:
    cache_dir = stats_cache_dir(stats_root, app_id)
    return [
        cache_dir / "events_query_session_sessions.parquet",
        cache_dir / "events_query_session_events.parquet",
        cache_dir / "events_query_session_state.parquet",
    ]


def legacy_stats_cache_dir(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "events" / "session"


def _state_matches(state_path: Path, fingerprints: list[SourceFileFingerprint]) -> bool:
    if not state_path.exists():
        return False
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        rows = connection.execute(
            """
            SELECT session_schema_version, session_gap_seconds, source_path, source_size, source_mtime_ns
            FROM read_parquet(?)
            ORDER BY source_path
            """,
            [str(state_path)],
        ).fetchall()
    if not rows:
        return False
    source_files = [
        {
            "path": str(row[2]),
            "size": int(row[3]),
            "mtime_ns": int(row[4]),
        }
        for row in rows
    ]
    return (
        all(int(row[0]) == SESSION_SCHEMA_VERSION and int(row[1]) == SESSION_GAP_SECONDS for row in rows)
        and source_files == [asdict(fingerprint) for fingerprint in sorted(fingerprints, key=lambda item: item.path)]
    )


def _write_state(
    state_path: Path,
    app_id: str,
    fingerprints: list[SourceFileFingerprint],
    sessions: list[EventSession],
    source_event_range: tuple[datetime | None, datetime | None],
) -> None:
    pa, pq = import_pyarrow()
    state_path.parent.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    state_rows = [
        {
            "session_schema_version": SESSION_SCHEMA_VERSION,
            "app_id": app_id,
            "generated_at": generated_at,
            "source_path": fingerprint.path,
            "source_size": fingerprint.size,
            "source_mtime_ns": fingerprint.mtime_ns,
            "source_event_min": source_event_range[0].isoformat() if source_event_range[0] else None,
            "source_event_max": source_event_range[1].isoformat() if source_event_range[1] else None,
            "session_gap_seconds": SESSION_GAP_SECONDS,
            "sessions": len(sessions),
            "grouping": "app_id,user_id",
            "includes_event_names": "all",
        }
        for fingerprint in fingerprints
    ]
    schema = pa.schema(
        [
            ("session_schema_version", pa.int64()),
            ("app_id", pa.string()),
            ("generated_at", pa.string()),
            ("source_path", pa.string()),
            ("source_size", pa.int64()),
            ("source_mtime_ns", pa.int64()),
            ("source_event_min", pa.string()),
            ("source_event_max", pa.string()),
            ("session_gap_seconds", pa.int64()),
            ("sessions", pa.int64()),
            ("grouping", pa.string()),
            ("includes_event_names", pa.string()),
        ]
    )
    pq.write_table(pa.Table.from_pylist(state_rows, schema=schema), state_path)


def _session_to_dict(session: EventSession) -> dict[str, Any]:
    payload = asdict(session)
    payload["events"] = [asdict(event) for event in session.events]
    return payload


def _load_cached_sessions(sessions_path: Path, events_path: Path) -> list[EventSession]:
    if not sessions_path.exists() or not events_path.exists():
        return []
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        session_items = connection.execute(
            """
            SELECT id, app_id, user_id, start_at, end_at, duration
            FROM read_parquet(?)
            ORDER BY app_id, user_id, start_at, id
            """,
            [str(sessions_path)],
        ).fetchall()
        event_items = connection.execute(
            """
            SELECT session_id, event_index, id, created_at, app_id, user_id, event_at, name, data, meta
            FROM read_parquet(?)
            ORDER BY session_id, event_index
            """,
            [str(events_path)],
        ).fetchall()

    events_by_session: dict[str, list[SessionEvent]] = {}
    for session_id, _event_index, event_id, created_at, app_id, user_id, event_at, name, data, meta in event_items:
        events_by_session.setdefault(str(session_id), []).append(
            SessionEvent(
                id=str(event_id),
                created_at=None if created_at is None else str(created_at),
                app_id=str(app_id),
                user_id=str(user_id),
                event_at=str(event_at),
                name=str(name),
                data=None if data is None else str(data),
                meta=None if meta is None else str(meta),
            )
        )

    return [
        EventSession(
            id=str(session_id),
            app_id=str(app_id),
            user_id=str(user_id),
            start_at=str(start_at),
            end_at=str(end_at),
            duration=int(duration),
            events=events_by_session.get(str(session_id), []),
        )
        for session_id, app_id, user_id, start_at, end_at, duration in session_items
    ]


def _write_sessions(sessions_path: Path, events_path: Path, sessions: list[EventSession]) -> None:
    pa, pq = import_pyarrow()
    sessions_path.parent.mkdir(parents=True, exist_ok=True)
    session_rows = [
        {
            "id": session.id,
            "app_id": session.app_id,
            "user_id": session.user_id,
            "start_at": session.start_at,
            "end_at": session.end_at,
            "duration": session.duration,
            "event_count": len(session.events),
        }
        for session in sessions
    ]
    event_rows: list[dict[str, Any]] = []
    for session in sessions:
        for index, event in enumerate(session.events):
            event_rows.append(
                {
                    "session_id": session.id,
                    "event_index": index,
                    "id": event.id,
                    "created_at": event.created_at,
                    "app_id": event.app_id,
                    "user_id": event.user_id,
                    "event_at": event.event_at,
                    "name": event.name,
                    "data": event.data,
                    "meta": event.meta,
                }
            )
    session_schema = pa.schema(
        [
            ("id", pa.string()),
            ("app_id", pa.string()),
            ("user_id", pa.string()),
            ("start_at", pa.string()),
            ("end_at", pa.string()),
            ("duration", pa.int64()),
            ("event_count", pa.int64()),
        ]
    )
    event_schema = pa.schema(
        [
            ("session_id", pa.string()),
            ("event_index", pa.int64()),
            ("id", pa.string()),
            ("created_at", pa.string()),
            ("app_id", pa.string()),
            ("user_id", pa.string()),
            ("event_at", pa.string()),
            ("name", pa.string()),
            ("data", pa.string()),
            ("meta", pa.string()),
        ]
    )
    pq.write_table(pa.Table.from_pylist(session_rows, schema=session_schema), sessions_path)
    pq.write_table(pa.Table.from_pylist(event_rows, schema=event_schema), events_path)


def _string_or_none(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _fetch_rows(parquet_pattern: str) -> list[dict[str, Any]]:
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        result = connection.execute(
            """
            SELECT id, created_at, app_id, user_id, event_at, name, data, meta
            FROM read_parquet(?)
            WHERE user_id IS NOT NULL
              AND event_at IS NOT NULL
            ORDER BY app_id, user_id, event_at, created_at, id
            """,
            [parquet_pattern],
        ).fetchall()

    rows: list[dict[str, Any]] = []
    for event_id, created_at, app_id, user_id, event_at, name, data, meta in result:
        parsed_event_at = parse_datetime(event_at)
        if parsed_event_at is None:
            continue
        parsed_created_at = parse_datetime(created_at)
        rows.append(
            {
                "id": str(event_id),
                "created_at": parsed_created_at,
                "app_id": str(app_id),
                "user_id": str(user_id),
                "event_at": parsed_event_at,
                "name": str(name),
                "data": _string_or_none(data),
                "meta": _string_or_none(meta),
            }
        )
    return rows


def _row_to_event(row: dict[str, Any]) -> SessionEvent:
    created_at = row["created_at"].isoformat() if row.get("created_at") else None
    return SessionEvent(
        id=row["id"],
        created_at=created_at,
        app_id=row["app_id"],
        user_id=row["user_id"],
        event_at=row["event_at"].isoformat(),
        name=row["name"],
        data=row["data"],
        meta=row["meta"],
    )


def _build_session(events: list[SessionEvent]) -> EventSession:
    start_at = parse_datetime(events[0].event_at)
    end_at = parse_datetime(events[-1].event_at)
    if start_at is None or end_at is None:
        duration = 0
    else:
        duration = max(int((end_at - start_at).total_seconds()), 0)
    return EventSession(
        id=events[0].id,
        app_id=events[0].app_id,
        user_id=events[0].user_id,
        start_at=events[0].event_at,
        end_at=events[-1].event_at,
        duration=duration,
        events=events,
    )


def _compute_app_sessions(app_id: str, rows: list[dict[str, Any]]) -> tuple[list[EventSession], tuple[datetime | None, datetime | None]]:
    app_rows = [row for row in rows if row["app_id"] == app_id]
    if not app_rows:
        return [], (None, None)

    sessions: list[EventSession] = []
    current_events: list[SessionEvent] = []
    previous_event_at: datetime | None = None
    previous_user_id: str | None = None

    for row in app_rows:
        event_at = row["event_at"]
        user_id = row["user_id"]
        should_start = (
            not current_events
            or previous_user_id != user_id
            or previous_event_at is None
            or (event_at - previous_event_at).total_seconds() > SESSION_GAP_SECONDS
        )
        if should_start and current_events:
            sessions.append(_build_session(current_events))
            current_events = []
        current_events.append(_row_to_event(row))
        previous_event_at = event_at
        previous_user_id = user_id

    if current_events:
        sessions.append(_build_session(current_events))

    event_times = [row["event_at"] for row in app_rows]
    return sessions, (min(event_times), max(event_times))


def _visible_sessions(
    sessions: list[EventSession],
    user_id_filter: str | None,
    limit: int,
) -> list[EventSession]:
    filtered = [session for session in sessions if user_id_filter is None or session.user_id == user_id_filter]
    newest_first = sorted(filtered, key=lambda session: (session.end_at, session.id), reverse=True)
    return newest_first[:limit]


def load_event_sessions(
    archive_dir: Path | None = None,
    stats_root: Path | None = None,
    app_id_filter: str | None = None,
    user_id_filter: str | None = None,
    limit: int = DEFAULT_SESSION_LIMIT,
    reset: bool = False,
) -> SessionResult | None:
    paths = resolve_paths(archive_dir)
    files = parquet_files(paths)
    if not files:
        return None
    if limit < 1:
        raise RuntimeError("--limit must be greater than 0")

    root = stats_root or DEFAULT_STATS_ROOT
    fingerprints = source_fingerprints(files)
    all_events = _fetch_rows(parquet_glob(paths))
    app_ids = sorted({event["app_id"] for event in all_events})
    results: list[SessionAppResult] = []

    for app_id in app_ids:
        cache_dir = stats_cache_dir(root, app_id)
        sessions_path = stats_sessions_path(root, app_id)
        events_path = stats_events_path(root, app_id)
        state_path = stats_state_path(root, app_id)
        if reset:
            sessions_path.unlink(missing_ok=True)
            events_path.unlink(missing_ok=True)
            state_path.unlink(missing_ok=True)
            legacy_stats_state_json_path(root, app_id).unlink(missing_ok=True)
            for legacy_path in legacy_stats_parquet_paths(root, app_id):
                legacy_path.unlink(missing_ok=True)
            shutil.rmtree(legacy_stats_cache_dir(root, app_id), ignore_errors=True)

        cache_status = "rebuilt"
        if not reset and _state_matches(state_path, fingerprints) and sessions_path.exists() and events_path.exists():
            sessions = _load_cached_sessions(sessions_path, events_path)
            cache_status = "cached"
        else:
            sessions, event_range = _compute_app_sessions(app_id, all_events)
            _write_sessions(sessions_path, events_path, sessions)
            _write_state(state_path, app_id, fingerprints, sessions, event_range)

        if app_id_filter is None or app_id == app_id_filter:
            visible_sessions = _visible_sessions(sessions, user_id_filter, limit)
            results.append(
                SessionAppResult(
                    app_id=app_id,
                    cache_dir=cache_dir,
                    sessions_path=sessions_path,
                    events_path=events_path,
                    state_path=state_path,
                    cache_status=cache_status,
                    sessions=visible_sessions,
                    total_sessions=len(sessions),
                )
            )

    return SessionResult(
        archive_dir=paths.root,
        stats_root=root,
        apps=results,
        source_files=fingerprints,
        limit=limit,
        app_id_filter=app_id_filter,
        user_id_filter=user_id_filter,
    )


def event_sessions_to_dict(result: SessionResult) -> dict[str, Any]:
    return {
        "archive_dir": str(result.archive_dir),
        "stats_root": str(result.stats_root),
        "limit": result.limit,
        "app_id_filter": result.app_id_filter,
        "user_id_filter": result.user_id_filter,
        "source_files": [asdict(fingerprint) for fingerprint in result.source_files],
        "apps": [
            {
                "app_id": app.app_id,
                "cache_dir": str(app.cache_dir),
                "events_path": str(app.events_path),
                "cache_status": app.cache_status,
                "sessions_path": str(app.sessions_path),
                "total_sessions": app.total_sessions,
                "sessions": [_session_to_dict(session) for session in app.sessions],
            }
            for app in result.apps
        ],
    }


def _format_duration(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds}s"
    minutes, remaining_seconds = divmod(seconds, 60)
    if minutes < 60:
        return f"{minutes}m {remaining_seconds}s" if remaining_seconds else f"{minutes}m"
    hours, remaining_minutes = divmod(minutes, 60)
    if hours < 24:
        return f"{hours}h {remaining_minutes}m" if remaining_minutes else f"{hours}h"
    days, remaining_hours = divmod(hours, 24)
    return f"{days}d {remaining_hours}h" if remaining_hours else f"{days}d"


def format_event_sessions(result: SessionResult) -> str:
    lines = [
        "42Go Event Sessions",
        "",
        f"Data root: {result.archive_dir}",
        f"Stats root: {result.stats_root}",
        f"Source Parquet files: {len(result.source_files)}",
        f"Visible session limit: {result.limit}",
    ]
    if result.app_id_filter:
        lines.append(f"App filter: {result.app_id_filter}")
    if result.user_id_filter:
        lines.append(f"User filter: {result.user_id_filter}")
    if not result.apps:
        lines.extend(["", "No matching app IDs."])
        return "\n".join(lines)

    for app in result.apps:
        lines.extend(
            [
                "",
                f"App: {app.app_id} ({app.cache_status})",
                f"Cache: {app.cache_dir}",
                f"Cached sessions: {app.total_sessions}",
            ]
        )
        if not app.sessions:
            lines.append("  no matching sessions")
            continue
        for session in app.sessions:
            lines.append(
                "  "
                f"{session.start_at} -> {session.end_at}  "
                f"{_format_duration(session.duration)}  "
                f"user={session.user_id}  "
                f"id={session.id}  "
                f"events={len(session.events)}"
            )
    return "\n".join(lines)


def no_event_sessions_message(paths: ArchivePaths) -> str:
    return f"No monthly Parquet files found under {paths.parquet_dir}."
