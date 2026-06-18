from __future__ import annotations

from datetime import UTC, datetime
import json
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

from fortytwogo_cli.query.lingocafe_growth import QueryLingocafeGrowthOptions, query_lingocafe_growth


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
    created_at: str,
    target_lang: str | None = None,
    consent: dict[str, Any] | None = None,
) -> dict[str, Any]:
    profile = {"targetLang": target_lang} if target_lang else {}
    return {
        "app_id": "lingocafe",
        "user_id": user_id,
        "username": user_id,
        "name": user_id.title(),
        "email": f"{user_id}@example.com",
        "email_verified": None,
        "image": None,
        "profile": json.dumps(profile),
        "consent": json.dumps(consent or {}),
        "feature_flags": "{}",
        "created_at": dt(created_at),
        "updated_at": dt(created_at),
        "active_1d": False,
        "active_7d": False,
        "active_30d": False,
        "session_count": 0,
        "session_avg_seconds": None,
        "session_min_seconds": None,
        "session_max_seconds": None,
    }


def session_row(session_id: str, *, user_id: str, ended_at: str) -> dict[str, Any]:
    end = dt(ended_at)
    return {
        "session_id": session_id,
        "app_id": "lingocafe",
        "user_id": user_id,
        "started_at": end,
        "ended_at": end,
        "duration_seconds": 120,
        "event_count": 4,
        "event_ids": [session_id],
    }


def event_row(event_id: str, *, user_id: str, event_at: str, name: str, data: dict[str, Any]) -> dict[str, Any]:
    timestamp = dt(event_at)
    return {
        "created_at": timestamp,
        "id": event_id,
        "app_id": "lingocafe",
        "user_id": user_id,
        "event_at": timestamp,
        "name": name,
        "data": json.dumps(data),
        "meta": "{}",
    }


def row_by_day_and_lang(rows: list[dict[str, Any]], day: str, target_lang: str) -> dict[str, Any]:
    parsed_day = datetime.fromisoformat(day).date()
    return next(row for row in rows if row["day"] == parsed_day and row["target_lang"] == target_lang)


def test_query_lingocafe_growth_rebuilds_daily_subscriber_and_language_history(tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    query_dir = tmp_path / "42go-query"
    write_parquet(
        query_dir / "users.parquet",
        [
            general_user_row("u1", created_at="2026-06-01T08:00:00Z", target_lang="sv"),
            general_user_row(
                "u2",
                created_at="2026-06-02T08:00:00Z",
                target_lang="de",
                consent={
                    "mkt": [
                        {
                            "value": True,
                            "changedAt": "2026-06-03T10:00:00Z",
                        }
                    ]
                },
            ),
        ],
    )
    write_parquet(
        query_dir / "sessions.parquet",
        [
            session_row("s1", user_id="u1", ended_at="2026-06-02T10:00:00Z"),
            session_row("s2", user_id="u1", ended_at="2026-06-05T10:00:00Z"),
        ],
    )
    write_parquet(
        data_dir / "events" / "events_202606.parquet",
        [
            event_row(
                "e1",
                user_id="u1",
                event_at="2026-06-01T09:00:00Z",
                name="user.profile.created",
                data={"prev": None, "next": {"targetLang": "sv"}},
            ),
            event_row(
                "e2",
                user_id="u1",
                event_at="2026-06-01T09:05:00Z",
                name="user.consent.created",
                data={"prev": None, "next": {"mkt": [{"value": True, "changedAt": "2026-06-01T09:05:00Z"}]}},
            ),
            event_row(
                "e3",
                user_id="u1",
                event_at="2026-06-03T09:00:00Z",
                name="user.profile.updated",
                data={"prev": {"targetLang": "sv"}, "next": {"targetLang": "es"}},
            ),
            event_row(
                "e4",
                user_id="u1",
                event_at="2026-06-04T09:00:00Z",
                name="user.consent.updated",
                data={
                    "prev": {},
                    "next": {
                        "mkt": [
                            {"value": True, "changedAt": "2026-06-01T09:05:00Z"},
                            {"value": False, "changedAt": "2026-06-04T09:00:00Z"},
                        ]
                    },
                },
            ),
        ],
    )

    result = query_lingocafe_growth(QueryLingocafeGrowthOptions(data_dir=data_dir, query_dir=query_dir))
    rows = read_rows(query_dir / "lingocafe-growth.parquet")

    assert result["users"] == 2
    assert result["sessions"] == 2
    assert result["events"] == 4
    assert result["parquet"] == str(query_dir / "lingocafe-growth.parquet")

    june_1_all = row_by_day_and_lang(rows, "2026-06-01", "all")
    assert june_1_all["total_users"] == 1
    assert june_1_all["total_subscribers"] == 1

    june_2_all = row_by_day_and_lang(rows, "2026-06-02", "all")
    june_2_sv = row_by_day_and_lang(rows, "2026-06-02", "sv")
    june_2_de = row_by_day_and_lang(rows, "2026-06-02", "de")
    assert june_2_all["total_users"] == 2
    assert june_2_all["total_subscribers"] == 1
    assert june_2_all["active_users_1d"] == 1
    assert june_2_sv["active_users_1d"] == 1
    assert june_2_de["active_users_1d"] == 0

    june_3_all = row_by_day_and_lang(rows, "2026-06-03", "all")
    june_3_es = row_by_day_and_lang(rows, "2026-06-03", "es")
    june_3_de = row_by_day_and_lang(rows, "2026-06-03", "de")
    assert june_3_all["total_subscribers"] == 2
    assert june_3_es["total_users"] == 1
    assert june_3_es["total_subscribers"] == 1
    assert june_3_de["total_subscribers"] == 1

    june_4_all = row_by_day_and_lang(rows, "2026-06-04", "all")
    june_4_es = row_by_day_and_lang(rows, "2026-06-04", "es")
    assert june_4_all["total_subscribers"] == 1
    assert june_4_es["total_subscribers"] == 0

    june_5_all = row_by_day_and_lang(rows, "2026-06-05", "all")
    june_5_es = row_by_day_and_lang(rows, "2026-06-05", "es")
    assert june_5_all["active_users_1d"] == 1
    assert june_5_all["active_users_7d"] == 1
    assert june_5_es["active_users_1d"] == 1


def test_query_lingocafe_growth_requires_general_users_parquet(tmp_path: Path) -> None:
    try:
        query_lingocafe_growth(QueryLingocafeGrowthOptions(data_dir=tmp_path / "42go-data", query_dir=tmp_path / "42go-query"))
    except RuntimeError as error:
        assert "run 42go query users first" in str(error)
    else:
        raise AssertionError("query lingocafe growth should require users.parquet.")
