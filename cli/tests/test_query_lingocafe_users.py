from __future__ import annotations

from datetime import UTC, datetime
import json
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

from fortytwogo_cli.query.lingocafe_users import QueryLingocafeUsersOptions, query_lingocafe_users


def dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def write_parquet(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(pa.Table.from_pylist(rows), path)


def read_rows(path: Path) -> list[dict[str, Any]]:
    return pq.read_table(path).to_pylist()


def general_user_row(
    user_id: str,
    *,
    app_id: str = "lingocafe",
    profile: dict[str, Any] | None = None,
    consent: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "app_id": app_id,
        "user_id": user_id,
        "username": user_id,
        "name": user_id.title(),
        "email": f"{user_id}@example.com",
        "email_verified": None,
        "image": None,
        "profile": json.dumps(profile or {}),
        "consent": json.dumps(consent or {}),
        "feature_flags": "{}",
        "created_at": dt("2026-05-01T08:00:00Z"),
        "updated_at": dt("2026-06-01T09:00:00Z"),
        "active_1d": False,
        "active_7d": False,
        "active_30d": False,
        "session_count": 0,
        "session_avg_seconds": None,
        "session_min_seconds": None,
        "session_max_seconds": None,
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
        "event_count": 4,
        "event_ids": [session_id],
    }


def test_query_lingocafe_users_builds_profile_consent_and_session_rollup(tmp_path: Path) -> None:
    query_dir = tmp_path / "42go-query"
    write_parquet(
        query_dir / "users.parquet",
        [
            general_user_row(
                "u1",
                profile={"ownLang": "en", "targetLang": "sv", "targetLevel": "a2"},
                consent={
                    "mkt": [
                        {"value": False, "changedAt": "2026-05-01T10:00:00Z"},
                        {"value": True, "changedAt": "2026-06-01T10:00:00Z"},
                    ],
                },
            ),
            general_user_row("u2", profile={"ownLang": "it", "targetLang": "en"}),
            general_user_row("other", app_id="default"),
        ],
    )
    write_parquet(
        query_dir / "sessions.parquet",
        [
            session_row("s1", user_id="u1", ended_at="2026-06-16T12:00:00Z", duration_seconds=100),
            session_row("s2", user_id="u1", ended_at="2026-06-10T12:00:00Z", duration_seconds=200),
            session_row("s3", user_id="u1", ended_at="2026-05-01T12:00:00Z", duration_seconds=300),
            session_row("s4", app_id="default", user_id="other", ended_at="2026-06-16T12:00:00Z", duration_seconds=400),
        ],
    )

    result = query_lingocafe_users(QueryLingocafeUsersOptions(query_dir=query_dir))
    rows = read_rows(query_dir / "lingocafe-users.parquet")
    u1 = next(row for row in rows if row["user_id"] == "u1")
    u2 = next(row for row in rows if row["user_id"] == "u2")

    assert result == {
        "users": 2,
        "general_users": 2,
        "sessions": 3,
        "parquet": str(query_dir / "lingocafe-users.parquet"),
    }
    assert [row["user_id"] for row in rows] == ["u1", "u2"]
    assert u1["email"] == "u1@example.com"
    assert u1["own_lang"] == "en"
    assert u1["target_lang"] == "sv"
    assert u1["target_level"] == "a2"
    assert u1["is_subscriber"] is True
    assert u1["is_active_7d"] is True
    assert u1["is_active_30d"] is True
    assert u1["last_session_at"] == dt("2026-06-16T12:00:00Z")
    assert u1["total_sessions"] == 3
    assert u1["session_length_total"] == 600
    assert u1["session_length_avg"] == 150
    assert u1["created_at"] == dt("2026-05-01T08:00:00Z")
    assert u2["target_level"] is None
    assert u2["is_subscriber"] is False
    assert u2["is_active_7d"] is False
    assert u2["is_active_30d"] is False
    assert u2["last_session_at"] is None
    assert u2["total_sessions"] == 0
    assert u2["session_length_total"] == 0
    assert u2["session_length_avg"] is None


def test_query_lingocafe_users_requires_general_users_parquet(tmp_path: Path) -> None:
    try:
        query_lingocafe_users(QueryLingocafeUsersOptions(query_dir=tmp_path / "42go-query"))
    except RuntimeError as error:
        assert "run 42go query users first" in str(error)
    else:
        raise AssertionError("query lingocafe users should require users.parquet.")
