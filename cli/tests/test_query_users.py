from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

from fortytwogo_cli.query.users import QueryUsersOptions, query_users


def dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def write_parquet(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(pa.Table.from_pylist(rows), path)


def read_rows(path: Path) -> list[dict[str, Any]]:
    return pq.read_table(path).to_pylist()


def user_row(user_id: str, *, app_id: str = "lingocafe", password: str = "secret") -> dict[str, Any]:
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
        "password": password,
        "created_at": dt("2026-06-01T09:00:00Z"),
        "updated_at": dt("2026-06-01T09:00:00Z"),
    }


def session_row(
    session_id: str,
    *,
    app_id: str = "lingocafe",
    user_id: str = "u1",
    ended_at: str,
    duration_seconds: int,
) -> dict[str, Any]:
    end = dt(ended_at)
    return {
        "session_id": session_id,
        "app_id": app_id,
        "user_id": user_id,
        "started_at": end,
        "ended_at": end,
        "duration_seconds": duration_seconds,
        "event_count": 1,
        "event_ids": [session_id],
    }


def test_query_users_joins_auth_users_with_sessions_and_omits_password(tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    query_dir = tmp_path / "42go-query"
    write_parquet(
        data_dir / "auth" / "users.parquet",
        [
            user_row("u1"),
            user_row("u2"),
        ],
    )
    write_parquet(
        query_dir / "sessions.parquet",
        [
            session_row("s1", user_id="u1", ended_at="2026-06-16T12:00:00Z", duration_seconds=60),
            session_row("s2", user_id="u1", ended_at="2026-06-15T12:00:00Z", duration_seconds=120),
            session_row("s3", user_id="u2", ended_at="2026-05-01T12:00:00Z", duration_seconds=30),
        ],
    )

    result = query_users(QueryUsersOptions(data_dir=data_dir, query_dir=query_dir))
    rows = read_rows(query_dir / "users.parquet")
    u1 = next(row for row in rows if row["user_id"] == "u1")
    u2 = next(row for row in rows if row["user_id"] == "u2")

    assert result == {
        "users": 2,
        "auth_users": 2,
        "sessions": 3,
        "parquet": str(query_dir / "users.parquet"),
    }
    assert "password" not in rows[0]
    assert u1["active_1d"] is True
    assert u1["active_7d"] is True
    assert u1["active_30d"] is True
    assert u1["session_count"] == 2
    assert u1["session_avg_seconds"] == 90
    assert u1["session_min_seconds"] == 60
    assert u1["session_max_seconds"] == 120
    assert u2["active_1d"] is False
    assert u2["active_7d"] is False
    assert u2["active_30d"] is False


def test_query_users_ignores_session_only_users(tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    query_dir = tmp_path / "42go-query"
    write_parquet(
        data_dir / "auth" / "users.parquet",
        [
            user_row("u1"),
        ],
    )
    write_parquet(
        query_dir / "sessions.parquet",
        [
            session_row("s0", user_id="u1", ended_at="2026-06-16T12:00:00Z", duration_seconds=90),
            session_row("s1", user_id="session-only", ended_at="2026-06-16T12:00:00Z", duration_seconds=45),
        ],
    )

    result = query_users(QueryUsersOptions(data_dir=data_dir, query_dir=query_dir))
    rows = read_rows(query_dir / "users.parquet")

    assert result["users"] == 1
    assert len(rows) == 1
    assert rows[0]["app_id"] == "lingocafe"
    assert rows[0]["user_id"] == "u1"
    assert rows[0]["session_count"] == 1


def test_query_users_requires_sessions_parquet(tmp_path: Path) -> None:
    try:
        query_users(QueryUsersOptions(data_dir=tmp_path / "42go-data", query_dir=tmp_path / "42go-query"))
    except RuntimeError as error:
        assert "run 42go query sessions first" in str(error)
    else:
        raise AssertionError("query users should require sessions.parquet.")
