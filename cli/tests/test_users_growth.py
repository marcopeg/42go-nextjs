from __future__ import annotations

import json
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

from fortytwogo_cli.events.users_growth import (
    format_users_growth,
    legacy_stats_cache_dir,
    load_users_growth,
    parse_app_filter,
    safe_app_id,
    stats_metrics_path,
    stats_state_path,
)


def write_events_archive(root: Path) -> None:
    parquet_dir = root / "events"
    parquet_dir.mkdir(parents=True)
    rows = [
        {
            "created_at": "2026-05-20T10:00:00+00:00",
            "id": "event-1",
            "app_id": "lingocafe",
            "user_id": "u2",
            "event_at": "2026-05-20T10:00:00+00:00",
            "name": "page.scroll",
            "data": "{}",
            "meta": "{}",
        },
        {
            "created_at": "2026-06-01T10:00:00+00:00",
            "id": "event-2",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-01T10:00:00+00:00",
            "name": "user.signup",
            "data": "{}",
            "meta": "{}",
        },
        {
            "created_at": "2026-06-02T10:00:00+00:00",
            "id": "event-3",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-02T10:00:00+00:00",
            "name": "user.consent.created",
            "data": json.dumps({"next": {"mkt": [{"changedAt": "2026-06-02T10:00:00Z", "value": True}]}}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-05T10:00:00+00:00",
            "id": "event-4",
            "app_id": "lingocafe",
            "user_id": "u2",
            "event_at": "2026-06-05T10:00:00+00:00",
            "name": "user.consent.created",
            "data": json.dumps({"next": {"mkt": [{"changedAt": "2026-06-05T10:00:00Z", "value": True}]}}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-08T10:00:00+00:00",
            "id": "event-5",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-08T10:00:00+00:00",
            "name": "user.consent.updated",
            "data": json.dumps(
                {
                    "next": {
                        "mkt": [
                            {"changedAt": "2026-06-02T10:00:00Z", "value": True},
                            {"changedAt": "2026-06-08T10:00:00Z", "value": False},
                        ]
                    }
                }
            ),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-10T10:00:00+00:00",
            "id": "event-6",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-10T10:00:00+00:00",
            "name": "page.open",
            "data": "{}",
            "meta": "{}",
        },
        {
            "created_at": "2026-06-10T11:00:00+00:00",
            "id": "event-7",
            "app_id": "lingocafe",
            "user_id": "u3",
            "event_at": "2026-06-10T11:00:00+00:00",
            "name": "user.login",
            "data": "{}",
            "meta": "{}",
        },
    ]
    pq.write_table(pa.Table.from_pylist(rows), parquet_dir / "events_202606.parquet")


def write_auth_users(root: Path) -> None:
    auth_dir = root / "auth"
    auth_dir.mkdir(parents=True)
    rows = [
        {
            "app_id": "lingocafe",
            "id": "u2",
            "username": None,
            "name": None,
            "email": "u2@example.com",
            "email_verified": None,
            "image": None,
            "profile": None,
            "consent": None,
            "feature_flags": None,
            "created_at": "2026-05-20T10:00:00+00:00",
            "updated_at": "2026-05-20T10:00:00+00:00",
        },
        {
            "app_id": "lingocafe",
            "id": "u1",
            "username": None,
            "name": None,
            "email": "u1@example.com",
            "email_verified": None,
            "image": None,
            "profile": None,
            "consent": None,
            "feature_flags": None,
            "created_at": "2026-06-01T10:00:00+00:00",
            "updated_at": "2026-06-01T10:00:00+00:00",
        },
        {
            "app_id": "lingocafe",
            "id": "u3",
            "username": None,
            "name": None,
            "email": "u3@example.com",
            "email_verified": None,
            "image": None,
            "profile": None,
            "consent": None,
            "feature_flags": None,
            "created_at": "2026-06-10T11:00:00+00:00",
            "updated_at": "2026-06-10T11:00:00+00:00",
        },
        {
            "app_id": "lingocafe",
            "id": "u4",
            "username": None,
            "name": None,
            "email": "u4@example.com",
            "email_verified": None,
            "image": None,
            "profile": None,
            "consent": json.dumps(
                {
                    "mkt": [
                        {
                            "changedAt": "2026-06-11T09:00:00Z",
                            "value": True,
                        }
                    ]
                }
            ),
            "feature_flags": None,
            "created_at": "2026-06-11T09:00:00+00:00",
            "updated_at": "2026-06-11T09:00:00+00:00",
        }
    ]
    pq.write_table(pa.Table.from_pylist(rows), auth_dir / "users.parquet")


def test_parse_app_filter() -> None:
    assert parse_app_filter("lingocafe, default ,,") == {"lingocafe", "default"}
    assert parse_app_filter(None) is None


def test_safe_app_id_rejects_path_tricks() -> None:
    assert safe_app_id("lingocafe") == "lingocafe"
    try:
        safe_app_id("../bad")
    except RuntimeError as error:
        assert "Unsafe app id" in str(error)
    else:
        raise AssertionError("unsafe app id was accepted")


def test_users_growth_metrics_and_cache(tmp_path: Path) -> None:
    archive = tmp_path / "archive"
    stats_root = tmp_path / "stats"
    write_events_archive(archive)
    legacy_dir = legacy_stats_cache_dir(stats_root, "lingocafe")
    legacy_dir.mkdir(parents=True)
    (legacy_dir / "metrics.parquet").write_text("legacy")
    legacy_state = stats_root / "lingocafe" / "events_query_users_growth_state.json"
    legacy_state.parent.mkdir(parents=True, exist_ok=True)
    legacy_state.write_text("{}")

    first = load_users_growth(archive_dir=archive, stats_root=stats_root, reset=False)
    assert first is not None
    assert len(first.apps) == 1
    assert first.apps[0].cache_status == "rebuilt"
    assert first.apps[0].metrics_path == stats_metrics_path(stats_root, "lingocafe")
    assert first.apps[0].state_path == stats_state_path(stats_root, "lingocafe")
    assert first.apps[0].metrics_path.name == "query_users_growth_metrics.parquet"
    assert first.apps[0].state_path.name == "query_users_growth_state.parquet"
    assert first.apps[0].metrics_path.exists()
    assert first.apps[0].state_path.exists()

    daily_rows = [row for row in first.apps[0].rows if row.granularity == "day"]
    last_day = daily_rows[-1]
    assert last_day.bucket_label == "2026-06-10"
    assert last_day.total_users == 3
    assert last_day.subscribed_users == 1
    assert last_day.weekly_active_users == 1
    assert last_day.monthly_active_users == 2
    assert last_day.inactive_users == 1

    second = load_users_growth(archive_dir=archive, stats_root=stats_root, reset=False)
    assert second is not None
    assert second.apps[0].cache_status == "cached"

    reset = load_users_growth(archive_dir=archive, stats_root=stats_root, reset=True)
    assert reset is not None
    assert reset.apps[0].cache_status == "rebuilt"
    assert not legacy_dir.exists()
    assert not legacy_state.exists()


def test_users_growth_output_can_filter_apps(tmp_path: Path) -> None:
    archive = tmp_path / "archive"
    stats_root = tmp_path / "stats"
    write_events_archive(archive)

    result = load_users_growth(
        archive_dir=archive,
        stats_root=stats_root,
        app_filter={"missing"},
        reset=False,
    )

    assert result is not None
    assert result.apps == []
    assert "No matching app IDs." in format_users_growth(result)


def test_users_growth_counts_auth_users_without_events(tmp_path: Path) -> None:
    archive = tmp_path / "archive"
    stats_root = tmp_path / "stats"
    write_events_archive(archive)
    write_auth_users(archive)

    result = load_users_growth(archive_dir=archive, stats_root=stats_root, reset=False)

    assert result is not None
    daily_rows = [row for row in result.apps[0].rows if row.granularity == "day"]
    last_day = daily_rows[-1]
    assert last_day.bucket_label == "2026-06-11"
    assert last_day.total_users == 4
    assert last_day.subscribed_users == 2


def test_users_growth_ignores_event_only_users_when_auth_users_exist(tmp_path: Path) -> None:
    archive = tmp_path / "archive"
    stats_root = tmp_path / "stats"
    write_events_archive(archive)
    write_auth_users(archive)

    parquet_dir = archive / "events"
    extra_rows = [
        {
            "created_at": "2026-06-11T10:00:00+00:00",
            "id": "event-extra",
            "app_id": "lingocafe",
            "user_id": "event-only",
            "event_at": "2026-06-11T10:00:00+00:00",
            "name": "page.open",
            "data": "{}",
            "meta": "{}",
        }
    ]
    pq.write_table(pa.Table.from_pylist(extra_rows), parquet_dir / "events_202607.parquet")

    result = load_users_growth(archive_dir=archive, stats_root=stats_root, reset=False)

    assert result is not None
    daily_rows = [row for row in result.apps[0].rows if row.granularity == "day"]
    assert daily_rows[-1].total_users == 4
