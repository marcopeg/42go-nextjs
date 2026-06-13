from __future__ import annotations

import json
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

from fortytwogo_cli.events.subscribers import (
    format_lingocafe_subscribers,
    lingocafe_subscribers_to_dict,
    load_lingocafe_subscribers,
    stats_cache_dir,
    stats_subscribers_state_path,
    stats_subscribers_users_path,
)


def write_auth_users(root: Path) -> None:
    auth_dir = root / "auth"
    auth_dir.mkdir(parents=True, exist_ok=True)
    rows = [
        {
            "app_id": "lingocafe",
            "id": "u1",
            "username": "reader-one",
            "name": "Reader One",
            "email": "one@example.com",
            "email_verified": None,
            "image": None,
            "profile": json.dumps({"ownLang": "en", "targetLang": "sv", "targetLevel": "a2"}),
            "consent": json.dumps(
                {
                    "mkt": [
                        {"value": False, "changedAt": "2026-06-01T09:00:00Z"},
                        {"value": True, "changedAt": "2026-06-02T09:00:00Z"},
                    ]
                }
            ),
            "feature_flags": "{}",
            "created_at": "2026-06-01T08:00:00Z",
            "updated_at": "2026-06-02T09:00:00Z",
        },
        {
            "app_id": "lingocafe",
            "id": "u2",
            "username": "reader-two",
            "name": None,
            "email": "two@example.com",
            "email_verified": None,
            "image": None,
            "profile": json.dumps({"ownLang": "it", "targetLang": "en", "targetLevel": "b1"}),
            "consent": json.dumps({"mkt": [{"value": True, "changedAt": "2026-05-01T09:00:00Z"}]}),
            "feature_flags": "{}",
            "created_at": "2026-05-01T08:00:00Z",
            "updated_at": "2026-05-01T09:00:00Z",
        },
        {
            "app_id": "lingocafe",
            "id": "u3",
            "username": "opted-out",
            "name": "Opted Out",
            "email": "out@example.com",
            "email_verified": None,
            "image": None,
            "profile": "{}",
            "consent": json.dumps(
                {
                    "mkt": [
                        {"value": True, "changedAt": "2026-05-01T09:00:00Z"},
                        {"value": False, "changedAt": "2026-06-01T09:00:00Z"},
                    ]
                }
            ),
            "feature_flags": "{}",
            "created_at": "2026-05-03T08:00:00Z",
            "updated_at": "2026-06-01T09:00:00Z",
        },
        {
            "app_id": "default",
            "id": "u4",
            "username": "default-user",
            "name": "Default User",
            "email": "default@example.com",
            "email_verified": None,
            "image": None,
            "profile": "{}",
            "consent": json.dumps({"mkt": [{"value": True, "changedAt": "2026-06-01T09:00:00Z"}]}),
            "feature_flags": "{}",
            "created_at": "2026-06-01T08:00:00Z",
            "updated_at": "2026-06-01T09:00:00Z",
        },
    ]
    pq.write_table(pa.Table.from_pylist(rows), auth_dir / "users.parquet")


def write_events_archive(root: Path) -> None:
    events_dir = root / "events"
    events_dir.mkdir(parents=True, exist_ok=True)
    rows = [
        {
            "created_at": "2026-06-12T10:00:00Z",
            "id": "u1-b1-p1",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-12T10:00:00Z",
            "name": "page.open",
            "data": json.dumps({"book_id": "b1", "page_id": "p1", "progress_bps": 10000}),
            "meta": "{}",
        },
        {
            "created_at": "2026-06-12T10:30:00Z",
            "id": "u1-b2-p1",
            "app_id": "lingocafe",
            "user_id": "u1",
            "event_at": "2026-06-12T10:30:00Z",
            "name": "page.scroll",
            "data": json.dumps({"book_id": "b2", "page_id": "p1", "progress_bps": 5000}),
            "meta": "{}",
        },
        {
            "created_at": "2026-05-10T09:00:00Z",
            "id": "u2-b1-p1",
            "app_id": "lingocafe",
            "user_id": "u2",
            "event_at": "2026-05-10T09:00:00Z",
            "name": "page.open",
            "data": json.dumps({"book_id": "b1", "page_id": "p1", "progress_bps": 10000}),
            "meta": "{}",
        },
    ]
    pq.write_table(pa.Table.from_pylist(rows), events_dir / "events_202606.parquet")


def test_lingocafe_subscribers_metrics_and_cache(tmp_path: Path) -> None:
    archive = tmp_path / "archive"
    stats_root = tmp_path / "stats"
    write_auth_users(archive)
    write_events_archive(archive)

    first = load_lingocafe_subscribers(archive_dir=archive, stats_root=stats_root)

    assert first is not None
    assert first.cache_status == "rebuilt"
    assert first.cache_dir == stats_cache_dir(stats_root, "lingocafe")
    assert first.users_path == stats_subscribers_users_path(stats_root, "lingocafe")
    assert first.state_path == stats_subscribers_state_path(stats_root, "lingocafe")
    assert first.users_path.name == "query_lingocafe_subscribers_users.parquet"
    assert first.state_path.name == "query_lingocafe_subscribers_state.parquet"
    assert first.users_path.exists()
    assert first.state_path.exists()
    assert first.total_subscribers == 2
    assert [user.id for user in first.users] == ["u1", "u2"]

    u1 = first.users[0]
    assert u1.name == "Reader One"
    assert u1.username == "reader-one"
    assert u1.mail == "one@example.com"
    assert u1.own_lang == "en"
    assert u1.target_lang == "sv"
    assert u1.target_level == "a2"
    assert u1.is_active_7 is True
    assert u1.is_active_30 is True
    assert u1.last_session_at == "2026-06-12T12:30:00+02:00"
    assert u1.last_session_duration == 1800
    assert u1.total_read_books == 2
    assert u1.total_read_pages == 2

    u2 = first.users[1]
    assert u2.is_active_7 is False
    assert u2.is_active_30 is False
    assert u2.total_read_books == 1
    assert u2.total_read_pages == 1

    output = format_lingocafe_subscribers(first)
    assert "42Go LingoCafe Subscribers" in output
    assert "one@example.com" in output
    assert "out@example.com" not in output

    payload = lingocafe_subscribers_to_dict(first)
    assert payload["users"][0]["id"] == "u1"
    assert payload["users"][0]["is_active_7"] is True

    second = load_lingocafe_subscribers(archive_dir=archive, stats_root=stats_root)
    assert second is not None
    assert second.cache_status == "cached"


def test_lingocafe_subscribers_requires_auth_users(tmp_path: Path) -> None:
    result = load_lingocafe_subscribers(archive_dir=tmp_path / "missing", stats_root=tmp_path / "stats")

    assert result is None
