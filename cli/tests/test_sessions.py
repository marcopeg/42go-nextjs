from __future__ import annotations

import json
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

from fortytwogo_cli.events.sessions import (
    event_sessions_to_dict,
    format_event_sessions,
    legacy_stats_cache_dir,
    load_event_sessions,
    stats_cache_dir,
    stats_events_path,
    stats_sessions_path,
    stats_state_path,
)


def write_events_archive(root: Path, rows: list[dict[str, object]]) -> None:
    parquet_dir = root / "events"
    parquet_dir.mkdir(parents=True, exist_ok=True)
    pq.write_table(pa.Table.from_pylist(rows), parquet_dir / "events_202606.parquet")


def base_rows() -> list[dict[str, object]]:
    return [
        {
            "created_at": "2026-06-10T08:00:00+00:00",
            "id": "ignored-no-user",
            "app_id": "lingocafe",
            "user_id": None,
            "event_at": "2026-06-10T08:00:00+00:00",
            "name": "anonymous.hit",
            "data": "{}",
            "meta": "{}",
        },
        {
            "created_at": "2026-06-10T10:00:00+00:00",
            "id": "u1-a",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-10T10:00:00+00:00",
            "name": "user.login",
            "data": json.dumps({"screen": "login"}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-10T11:00:00+00:00",
            "id": "u1-b",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-10T11:00:00+00:00",
            "name": "page.open",
            "data": json.dumps({"book_id": "b1"}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-10T12:01:00+00:00",
            "id": "u1-c",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-10T12:01:00+00:00",
            "name": "page.scroll",
            "data": "{}",
            "meta": "{}",
        },
        {
            "created_at": "2026-06-10T11:30:00+00:00",
            "id": "u2-a",
            "app_id": "lingocafe",
            "user_id": "u2",
            "event_at": "2026-06-10T11:30:00+00:00",
            "name": "user.login",
            "data": "{}",
            "meta": "{}",
        },
        {
            "created_at": "2026-06-10T10:15:00+00:00",
            "id": "default-a",
            "app_id": "default",
            "user_id": "u1",
            "event_at": "2026-06-10T10:15:00+00:00",
            "name": "user.login",
            "data": "{}",
            "meta": "{}",
        },
    ]


def test_event_sessions_cluster_and_cache(tmp_path: Path) -> None:
    archive = tmp_path / "archive"
    stats_root = tmp_path / "stats"
    write_events_archive(archive, base_rows())
    legacy_dir = legacy_stats_cache_dir(stats_root, "lingocafe")
    legacy_dir.mkdir(parents=True)
    (legacy_dir / "sessions.json").write_text("{}")
    legacy_state = stats_cache_dir(stats_root, "lingocafe") / "events_query_session_state.json"
    legacy_state.parent.mkdir(parents=True, exist_ok=True)
    legacy_state.write_text("{}")

    first = load_event_sessions(archive_dir=archive, stats_root=stats_root, reset=False)
    assert first is not None
    assert {app.app_id for app in first.apps} == {"default", "lingocafe"}

    lingocafe = next(app for app in first.apps if app.app_id == "lingocafe")
    assert lingocafe.cache_status == "rebuilt"
    assert lingocafe.total_sessions == 3
    assert stats_cache_dir(stats_root, "lingocafe") == lingocafe.cache_dir
    assert stats_sessions_path(stats_root, "lingocafe") == lingocafe.sessions_path
    assert stats_events_path(stats_root, "lingocafe") == lingocafe.events_path
    assert stats_state_path(stats_root, "lingocafe") == lingocafe.state_path
    assert lingocafe.sessions_path.name == "query_session_sessions.parquet"
    assert lingocafe.events_path.name == "query_session_events.parquet"
    assert lingocafe.state_path.name == "query_session_state.parquet"
    assert lingocafe.sessions_path.exists()
    assert lingocafe.events_path.exists()
    assert lingocafe.state_path.exists()

    u1_sessions = [session for session in lingocafe.sessions if session.user_id == "u1"]
    assert len(u1_sessions) == 2
    older_u1 = sorted(u1_sessions, key=lambda session: session.start_at)[0]
    assert older_u1.id == "u1-a"
    assert [event.id for event in older_u1.events] == ["u1-a", "u1-b"]
    assert older_u1.duration == 3600
    assert all(event.id != "ignored-no-user" for session in lingocafe.sessions for event in session.events)

    second = load_event_sessions(archive_dir=archive, stats_root=stats_root, reset=False)
    assert second is not None
    assert next(app for app in second.apps if app.app_id == "lingocafe").cache_status == "cached"

    reset = load_event_sessions(archive_dir=archive, stats_root=stats_root, reset=True)
    assert reset is not None
    assert next(app for app in reset.apps if app.app_id == "lingocafe").cache_status == "rebuilt"
    assert not legacy_dir.exists()
    assert not legacy_state.exists()


def test_event_sessions_filters_limit_and_json(tmp_path: Path) -> None:
    archive = tmp_path / "archive"
    stats_root = tmp_path / "stats"
    write_events_archive(archive, base_rows())

    result = load_event_sessions(
        archive_dir=archive,
        stats_root=stats_root,
        app_id_filter="lingocafe",
        user_id_filter="u1",
        limit=1,
        reset=False,
    )

    assert result is not None
    assert len(result.apps) == 1
    assert result.apps[0].app_id == "lingocafe"
    assert result.apps[0].total_sessions == 3
    assert len(result.apps[0].sessions) == 1
    assert result.apps[0].sessions[0].user_id == "u1"
    assert result.apps[0].sessions[0].id == "u1-c"

    output = format_event_sessions(result)
    assert "42Go Event Sessions" in output
    assert "events=1" in output
    assert "page.scroll" not in output

    payload = event_sessions_to_dict(result)
    assert payload["apps"][0]["sessions"][0]["events"][0]["name"] == "page.scroll"


def test_event_sessions_rebuild_extends_tail_session(tmp_path: Path) -> None:
    archive = tmp_path / "archive"
    stats_root = tmp_path / "stats"
    write_events_archive(archive, base_rows())

    first = load_event_sessions(archive_dir=archive, stats_root=stats_root, app_id_filter="lingocafe")
    assert first is not None
    lingocafe_first = first.apps[0]
    assert lingocafe_first.total_sessions == 3

    rows = [
        *base_rows(),
        {
            "created_at": "2026-06-10T12:30:00+00:00",
            "id": "u1-d",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-10T12:30:00+00:00",
            "name": "page.translate",
            "data": "{}",
            "meta": "{}",
        },
    ]
    write_events_archive(archive, rows)

    second = load_event_sessions(archive_dir=archive, stats_root=stats_root, app_id_filter="lingocafe")
    assert second is not None
    lingocafe_second = second.apps[0]
    assert lingocafe_second.cache_status == "rebuilt"
    assert lingocafe_second.total_sessions == 3
    latest_u1 = next(session for session in lingocafe_second.sessions if session.id == "u1-c")
    assert [event.id for event in latest_u1.events] == ["u1-c", "u1-d"]
