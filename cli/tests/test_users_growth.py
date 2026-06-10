from __future__ import annotations

import json
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

from fortytwogo_cli.events.users_growth import (
    format_users_growth,
    load_users_growth,
    parse_app_filter,
    safe_app_id,
)


def write_events_archive(root: Path) -> None:
    parquet_dir = root / "events" / "parquet"
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

    first = load_users_growth(archive_dir=archive, stats_root=stats_root, reset=False)
    assert first is not None
    assert len(first.apps) == 1
    assert first.apps[0].cache_status == "rebuilt"

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
