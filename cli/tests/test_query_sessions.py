from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

from fortytwogo_cli.query.sessions import QuerySessionsOptions, query_sessions


def dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def event_row(
    event_id: str,
    *,
    app_id: str = "lingocafe",
    user_id: str = "u1",
    event_at: str,
    name: str = "page.open",
) -> dict[str, Any]:
    event_time = dt(event_at)
    return {
        "created_at": event_time,
        "id": event_id,
        "app_id": app_id,
        "user_id": user_id,
        "event_at": event_time,
        "name": name,
        "data": "{}",
        "meta": "{}",
    }


def write_events(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(pa.Table.from_pylist(rows), path)


def write_auth_users(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(pa.Table.from_pylist(rows), path)


def user_row(user_id: str, *, app_id: str = "lingocafe") -> dict[str, Any]:
    event_time = dt("2026-06-01T09:00:00Z")
    return {
        "app_id": app_id,
        "id": user_id,
        "username": user_id,
        "name": user_id.title(),
        "email": f"{user_id}@example.com",
        "email_verified": None,
        "image": None,
        "profile": "{}",
        "consent": "{}",
        "feature_flags": "{}",
        "created_at": event_time,
        "updated_at": event_time,
    }


def read_rows(path: Path) -> list[dict[str, Any]]:
    return pq.read_table(path).to_pylist()


def test_query_sessions_groups_events_by_app_user_and_duration(tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    query_dir = tmp_path / "42go-query"
    write_auth_users(
        data_dir / "auth" / "users.parquet",
        [
            user_row("u1"),
            user_row("u2"),
            user_row("u1", app_id="default"),
        ],
    )
    write_events(
        data_dir / "events" / "events_202606.parquet",
        [
            event_row("e1", event_at="2026-06-01T10:00:00Z"),
            event_row("e2", event_at="2026-06-01T10:19:00Z"),
            event_row("e3", event_at="2026-06-01T10:40:00Z"),
            event_row("e4", user_id="u2", event_at="2026-06-01T10:05:00Z"),
            event_row("e5", app_id="default", user_id="u1", event_at="2026-06-01T10:06:00Z"),
        ],
    )

    result = query_sessions(QuerySessionsOptions(data_dir=data_dir, query_dir=query_dir))
    rows = read_rows(query_dir / "sessions.parquet")

    assert result == {
        "sessions": 4,
        "events": 5,
        "ignored_events": 0,
        "duration_minutes": 20,
        "parquet": str(query_dir / "sessions.parquet"),
    }
    first = rows[0]
    assert first["session_id"] == "e1"
    assert first["app_id"] == "lingocafe"
    assert first["user_id"] == "u1"
    assert first["duration_seconds"] == 1140
    assert first["event_count"] == 2
    assert first["event_ids"] == ["e1", "e2"]
    assert any(row["session_id"] == "e3" and row["event_ids"] == ["e3"] for row in rows)
    assert any(row["session_id"] == "e4" and row["user_id"] == "u2" for row in rows)
    assert any(row["session_id"] == "e5" and row["app_id"] == "default" for row in rows)


def test_query_sessions_duration_parameter_controls_gap(tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    query_dir = tmp_path / "42go-query"
    write_auth_users(data_dir / "auth" / "users.parquet", [user_row("u1")])
    write_events(
        data_dir / "events" / "events_202606.parquet",
        [
            event_row("e1", event_at="2026-06-01T10:00:00Z"),
            event_row("e2", event_at="2026-06-01T10:19:00Z"),
        ],
    )

    query_sessions(QuerySessionsOptions(data_dir=data_dir, query_dir=query_dir, duration=18))
    rows = read_rows(query_dir / "sessions.parquet")

    assert [row["session_id"] for row in rows] == ["e1", "e2"]


def test_query_sessions_rebuilds_existing_output(tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    query_dir = tmp_path / "42go-query"
    events_path = data_dir / "events" / "events_202606.parquet"
    write_auth_users(data_dir / "auth" / "users.parquet", [user_row("u1")])
    write_events(events_path, [event_row("e1", event_at="2026-06-01T10:00:00Z")])

    query_sessions(QuerySessionsOptions(data_dir=data_dir, query_dir=query_dir))
    write_events(events_path, [event_row("e2", event_at="2026-06-01T11:00:00Z")])
    query_sessions(QuerySessionsOptions(data_dir=data_dir, query_dir=query_dir))
    rows = read_rows(query_dir / "sessions.parquet")

    assert [row["session_id"] for row in rows] == ["e2"]


def test_query_sessions_writes_empty_parquet_when_no_events(tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    query_dir = tmp_path / "42go-query"
    write_auth_users(data_dir / "auth" / "users.parquet", [user_row("u1")])

    result = query_sessions(QuerySessionsOptions(data_dir=data_dir, query_dir=query_dir))
    rows = read_rows(query_dir / "sessions.parquet")

    assert result["sessions"] == 0
    assert rows == []


def test_query_sessions_ignores_events_without_matching_auth_user(tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    query_dir = tmp_path / "42go-query"
    write_auth_users(data_dir / "auth" / "users.parquet", [user_row("u1")])
    write_events(
        data_dir / "events" / "events_202606.parquet",
        [
            event_row("e1", user_id="u1", event_at="2026-06-01T10:00:00Z"),
            event_row("e2", user_id="u1@example.com", event_at="2026-06-01T10:01:00Z"),
            event_row("e3", user_id="email:u1@example.com", event_at="2026-06-01T10:02:00Z"),
        ],
    )

    result = query_sessions(QuerySessionsOptions(data_dir=data_dir, query_dir=query_dir))
    rows = read_rows(query_dir / "sessions.parquet")

    assert result["events"] == 1
    assert result["ignored_events"] == 2
    assert len(rows) == 1
    assert rows[0]["event_ids"] == ["e1"]


def test_query_sessions_requires_auth_users(tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    query_dir = tmp_path / "42go-query"
    write_events(
        data_dir / "events" / "events_202606.parquet",
        [
            event_row("e1", event_at="2026-06-01T10:00:00Z"),
        ],
    )

    try:
        query_sessions(QuerySessionsOptions(data_dir=data_dir, query_dir=query_dir))
    except RuntimeError as error:
        assert "run 42go pull auth first" in str(error)
    else:
        raise AssertionError("query sessions should require auth users.")
