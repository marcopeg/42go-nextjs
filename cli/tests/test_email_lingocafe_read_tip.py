from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

from fortytwogo_cli.email.lingocafe_read_tip import (
    ReadTipOptions,
    choose_unread_book,
    read_whitelist,
    run_read_tip,
    summarize_result,
)


NOW = datetime(2026, 6, 18, 12, 0, tzinfo=UTC)


def write_parquet(path: Path, rows: list[dict], schema: pa.Schema) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    table = pa.table({field.name: [row.get(field.name) for row in rows] for field in schema}, schema=schema)
    pq.write_table(table, path)


def users_schema() -> pa.Schema:
    return pa.schema(
        [
            ("app_id", pa.string()),
            ("id", pa.string()),
            ("username", pa.string()),
            ("name", pa.string()),
            ("email", pa.string()),
            ("email_verified", pa.timestamp("us", tz="UTC")),
            ("image", pa.string()),
            ("profile", pa.string()),
            ("consent", pa.string()),
            ("feature_flags", pa.string()),
            ("created_at", pa.timestamp("us", tz="UTC")),
            ("updated_at", pa.timestamp("us", tz="UTC")),
        ]
    )


def lingocafe_users_schema() -> pa.Schema:
    return pa.schema(
        [
            ("user_id", pa.string()),
            ("email", pa.string()),
            ("own_lang", pa.string()),
            ("target_lang", pa.string()),
            ("target_level", pa.string()),
            ("is_subscriber", pa.bool_()),
            ("is_active_7d", pa.bool_()),
            ("is_active_30d", pa.bool_()),
            ("last_session_at", pa.timestamp("us", tz="UTC")),
            ("total_sessions", pa.int64()),
            ("session_length_total", pa.int64()),
            ("session_length_avg", pa.float64()),
            ("created_at", pa.timestamp("us", tz="UTC")),
        ]
    )


def books_schema() -> pa.Schema:
    return pa.schema(
        [
            ("id", pa.string()),
            ("project", pa.string()),
            ("lang", pa.string()),
            ("level", pa.string()),
            ("title", pa.string()),
            ("description", pa.string()),
            ("author", pa.string()),
            ("tags", pa.string()),
            ("info", pa.string()),
            ("published_at", pa.timestamp("us", tz="UTC")),
            ("created_at", pa.timestamp("us", tz="UTC")),
            ("updated_at", pa.timestamp("us", tz="UTC")),
        ]
    )


def pages_schema() -> pa.Schema:
    return pa.schema(
        [
            ("book_id", pa.string()),
            ("id", pa.string()),
            ("position", pa.int64()),
            ("kind", pa.string()),
            ("prefix", pa.string()),
            ("title", pa.string()),
            ("summary", pa.string()),
            ("content", pa.string()),
        ]
    )


def progress_schema() -> pa.Schema:
    return pa.schema(
        [
            ("user_id", pa.string()),
            ("book_id", pa.string()),
            ("page_id", pa.string()),
            ("progress_bps", pa.int64()),
            ("created_at", pa.timestamp("us", tz="UTC")),
            ("updated_at", pa.timestamp("us", tz="UTC")),
            ("completed_at", pa.timestamp("us", tz="UTC")),
        ]
    )


def sent_schema() -> pa.Schema:
    return pa.schema(
        [
            ("run_id", pa.string()),
            ("user_id", pa.string()),
            ("recipient_email", pa.string()),
            ("sent_at", pa.timestamp("us", tz="UTC")),
            ("recommendation_type", pa.string()),
            ("reading_tip", pa.string()),
            ("book_id", pa.string()),
            ("page_id", pa.string()),
            ("target_link", pa.string()),
            ("subject", pa.string()),
            ("body", pa.string()),
            ("sender_status", pa.string()),
            ("sender_message_id", pa.string()),
            ("error", pa.string()),
        ]
    )


def user_row(user_id: str, email: str) -> dict:
    return {
        "app_id": "lingocafe",
        "id": user_id,
        "username": email.split("@")[0],
        "name": email,
        "email": email,
        "email_verified": None,
        "image": None,
        "profile": "{}",
        "consent": "{}",
        "feature_flags": None,
        "created_at": NOW - timedelta(days=10),
        "updated_at": NOW - timedelta(days=10),
    }


def lc_user_row(user_id: str, email: str, *, level: str = "a2") -> dict:
    return {
        "user_id": user_id,
        "email": email,
        "own_lang": "en",
        "target_lang": "sv",
        "target_level": level,
        "is_subscriber": True,
        "is_active_7d": False,
        "is_active_30d": True,
        "last_session_at": None,
        "total_sessions": 0,
        "session_length_total": 0,
        "session_length_avg": None,
        "created_at": NOW - timedelta(days=10),
    }


def book_row(book_id: str, *, lang: str = "sv", level: str = "a2", title: str = "Book", days: int = 1) -> dict:
    return {
        "id": book_id,
        "project": "demo",
        "lang": lang,
        "level": level,
        "title": title,
        "description": "",
        "author": "LingoCafe",
        "tags": "[]",
        "info": "{}",
        "published_at": NOW - timedelta(days=days),
        "created_at": NOW - timedelta(days=days),
        "updated_at": NOW - timedelta(days=days),
    }


def page_row(book_id: str, page_id: str, position: int) -> dict:
    return {
        "book_id": book_id,
        "id": page_id,
        "position": position,
        "kind": "chapter",
        "prefix": None,
        "title": page_id,
        "summary": None,
        "content": "content",
    }


def progress_row(user_id: str, book_id: str, page_id: str, *, bps: int, updated_hours_ago: int, complete: bool = False) -> dict:
    return {
        "user_id": user_id,
        "book_id": book_id,
        "page_id": page_id,
        "progress_bps": bps,
        "created_at": NOW - timedelta(days=3),
        "updated_at": NOW - timedelta(hours=updated_hours_ago),
        "completed_at": NOW - timedelta(hours=updated_hours_ago) if complete else None,
    }


def write_dataset(
    tmp_path: Path,
    *,
    whitelist: str = "john@example.com\n",
    progress: list[dict] | None = None,
    sent: list[dict] | None = None,
    extra_users: list[tuple[str, str]] | None = None,
) -> tuple[Path, Path, Path]:
    data_dir = tmp_path / "data"
    query_dir = tmp_path / "query"
    users = [user_row("u1", "john@example.com")]
    lc_users = [lc_user_row("u1", "john@example.com")]
    for user_id, email in extra_users or []:
        users.append(user_row(user_id, email))
        lc_users.append(lc_user_row(user_id, email))
    write_parquet(data_dir / "auth" / "users.parquet", users, users_schema())
    write_parquet(query_dir / "lingocafe-users.parquet", lc_users, lingocafe_users_schema())
    write_parquet(
        data_dir / "lingocafe" / "books.parquet",
        [
            book_row("active", level="a2", title="Active Book", days=5),
            book_row("same", level="a2", title="Same Level", days=1),
            book_row("higher", level="b1", title="Higher Level", days=2),
        ],
        books_schema(),
    )
    write_parquet(
        data_dir / "lingocafe" / "books_pages.parquet",
        [page_row("active", "p1", 1), page_row("active", "p2", 2), page_row("same", "s1", 1), page_row("higher", "h1", 1)],
        pages_schema(),
    )
    write_parquet(data_dir / "lingocafe" / "books_progress.parquet", progress or [], progress_schema())
    if sent is not None:
        write_parquet(data_dir / "lingocafe_daily_email" / "sent_emails.parquet", sent, sent_schema())
    whitelist_path = data_dir / "lingocafe_daily_email" / "whitelist.txt"
    whitelist_path.parent.mkdir(parents=True, exist_ok=True)
    whitelist_path.write_text(whitelist)
    return data_dir, query_dir, whitelist_path


def run_with_dataset(tmp_path: Path, **kwargs):
    data_dir, query_dir, whitelist_path = write_dataset(tmp_path, **kwargs)
    return run_read_tip(
        ReadTipOptions(
            data_dir=data_dir,
            query_dir=query_dir,
            whitelist_path=whitelist_path,
            now=NOW,
            base_url="https://example.test",
        )
    )


def test_whitelist_send_to_all_is_exact(tmp_path: Path) -> None:
    whitelist = tmp_path / "whitelist.txt"
    whitelist.write_text("send to all\n")

    assert read_whitelist(whitelist) == ("send_to_all", set())

    whitelist.write_text(" send to all \nextra@example.com\n")
    assert read_whitelist(whitelist) == ("explicit", {"send to all", "extra@example.com"})


def test_recent_read_is_skipped(tmp_path: Path) -> None:
    result = run_with_dataset(
        tmp_path,
        progress=[progress_row("u1", "active", "p1", bps=100, updated_hours_ago=2)],
    )

    assert result.decisions[0].reason == "read_in_last_24h"


def test_recent_email_is_skipped(tmp_path: Path) -> None:
    result = run_with_dataset(
        tmp_path,
        progress=[progress_row("u1", "active", "p1", bps=100, updated_hours_ago=30)],
        sent=[
            {
                "run_id": "old",
                "user_id": "u1",
                "recipient_email": "john@example.com",
                "sent_at": NOW - timedelta(hours=10),
                "recommendation_type": "continue",
                "reading_tip": "tip",
                "book_id": "active",
                "page_id": "p1",
                "target_link": "https://example.test/books/active/p1",
                "subject": "subject",
                "body": "body",
                "sender_status": "sent",
                "sender_message_id": "msg",
                "error": None,
            }
        ],
    )

    assert result.decisions[0].reason == "emailed_in_last_72h"


def test_active_book_uses_next_page_when_near_end(tmp_path: Path) -> None:
    result = run_with_dataset(
        tmp_path,
        progress=[progress_row("u1", "active", "p1", bps=9500, updated_hours_ago=30)],
    )

    decision = result.decisions[0]
    assert decision.status == "selected"
    assert decision.recommendation is not None
    assert decision.recommendation.recommendation_type == "continue"
    assert decision.recommendation.page_id == "p2"
    assert decision.recommendation.target_link == "https://example.test/books/active/p2"
    assert "john@example.com | last_read_at:" in summarize_result(result)
    assert "subject: Your next page in Active Book" in summarize_result(result)
    assert "No pressure" in decision.recommendation.body
    assert "going:\n\nhttps://example.test/books/active/p2" in decision.recommendation.body


def test_unread_fallback_prefers_same_level(tmp_path: Path) -> None:
    result = run_with_dataset(tmp_path)

    decision = result.decisions[0]
    assert decision.status == "selected"
    assert decision.recommendation is not None
    assert decision.recommendation.recommendation_type == "pick_unread"
    assert decision.recommendation.book_id == "same"


def test_unread_fallback_uses_higher_level_before_random(tmp_path: Path) -> None:
    books = [
        book_row("read", level="a2", title="Read", days=1),
        book_row("higher", level="b1", title="Higher", days=2),
        book_row("other", level="sv-c9", title="Other", days=3),
    ]
    chosen = choose_unread_book(
        user_profile={"target_lang": "sv", "target_level": "a2"},
        books=books,
        progress_rows=[progress_row("u1", "read", "p1", bps=10000, updated_hours_ago=80, complete=True)],
        rng=__import__("random").Random(1),
    )

    assert chosen is not None
    assert chosen["id"] == "higher"


def test_send_mode_writes_sent_email_log(tmp_path: Path) -> None:
    data_dir, query_dir, whitelist_path = write_dataset(
        tmp_path,
        progress=[progress_row("u1", "active", "p1", bps=100, updated_hours_ago=30)],
    )

    result = run_read_tip(
        ReadTipOptions(
            data_dir=data_dir,
            query_dir=query_dir,
            whitelist_path=whitelist_path,
            now=NOW,
            base_url="https://example.test",
            dry_run=False,
            send=True,
            resend_api_key="secret",
        ),
        send_email=lambda to, subject, body: "msg_123",
    )

    assert result.sent_records[0]["sender_status"] == "sent"
    rows = pq.read_table(data_dir / "lingocafe_daily_email" / "sent_emails.parquet").to_pylist()
    assert rows[0]["sender_message_id"] == "msg_123"
    assert "https://example.test/books/active/p1" in rows[0]["body"]


def test_reset_ignores_recent_email_cooldown(tmp_path: Path) -> None:
    data_dir, query_dir, whitelist_path = write_dataset(
        tmp_path,
        progress=[progress_row("u1", "active", "p1", bps=100, updated_hours_ago=30)],
        sent=[
            {
                "run_id": "old",
                "user_id": "u1",
                "recipient_email": "john@example.com",
                "sent_at": NOW - timedelta(hours=10),
                "recommendation_type": "continue",
                "reading_tip": "tip",
                "book_id": "active",
                "page_id": "p1",
                "target_link": "https://example.test/books/active/p1",
                "subject": "subject",
                "body": "body",
                "sender_status": "sent",
                "sender_message_id": "msg",
                "error": None,
            }
        ],
    )

    result = run_read_tip(
        ReadTipOptions(
            data_dir=data_dir,
            query_dir=query_dir,
            whitelist_path=whitelist_path,
            now=NOW,
            base_url="https://example.test",
            reset=True,
        )
    )

    assert result.decisions[0].status == "selected"


def test_max_recipients_caps_selected_users(tmp_path: Path) -> None:
    data_dir, query_dir, whitelist_path = write_dataset(
        tmp_path,
        whitelist="send to all\n",
        extra_users=[("u2", "jane@example.com")],
    )

    result = run_read_tip(
        ReadTipOptions(
            data_dir=data_dir,
            query_dir=query_dir,
            whitelist_path=whitelist_path,
            now=NOW,
            base_url="https://example.test",
            max_recipients=1,
        )
    )

    selected = [decision for decision in result.decisions if decision.status == "selected"]
    skipped = [decision for decision in result.decisions if decision.reason == "max_recipients_reached"]
    assert len(selected) == 1
    assert len(skipped) == 1
