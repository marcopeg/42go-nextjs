from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pyarrow.parquet as pq

from fortytwogo_cli.users import pull as users_pull
from fortytwogo_cli.users.paths import resolve_paths
from fortytwogo_cli.users.pull import PullUsersOptions, pull_users


def dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def user_row(
    user_id: str,
    *,
    name: str,
    created_at: str = "2026-06-01T10:00:00Z",
    updated_at: str = "2026-06-01T10:00:00Z",
    password: str = "secret-hash",
) -> dict[str, Any]:
    return {
        "app_id": "lingocafe",
        "id": user_id,
        "username": user_id,
        "name": name,
        "email": f"{user_id}@example.com",
        "email_verified": None,
        "image": None,
        "password": password,
        "profile": {"level": "a1"},
        "consent": {"mkt": True},
        "feature_flags": None,
        "created_at": dt(created_at),
        "updated_at": dt(updated_at),
    }


def account_row(
    account_id: str,
    *,
    user_id: str,
    provider: str = "github",
    created_at: str = "2026-06-01T10:00:00Z",
    updated_at: str = "2026-06-01T10:00:00Z",
) -> dict[str, Any]:
    return {
        "app_id": "lingocafe",
        "account_id": account_id,
        "user_id": user_id,
        "type": "oauth",
        "provider": provider,
        "scope": "read:user",
        "token_type": "bearer",
        "expires_at": 123,
        "refresh_token": "refresh-secret",
        "access_token": "access-secret",
        "id_token": "id-secret",
        "session_state": "session-secret",
        "created_at": dt(created_at),
        "updated_at": dt(updated_at),
    }


def read_parquet_rows(path: Path) -> list[dict[str, Any]]:
    return pq.read_table(path).to_pylist()


def test_default_paths_use_local_stats_root() -> None:
    paths = resolve_paths()

    assert paths.users_parquet == Path(".local/42go-stats/_data/auth_users.parquet")
    assert paths.accounts_parquet == Path(".local/42go-stats/_data/auth_accounts.parquet")


def test_pull_users_writes_allowlisted_parquet_and_state(monkeypatch, tmp_path: Path) -> None:
    stats_dir = tmp_path / ".local" / "42go-stats"
    monkeypatch.setenv("DATABASE_URL", "postgres://example")
    monkeypatch.setattr(users_pull, "fetch_users", lambda database_url, cursor, limit: [user_row("u1", name="John")])
    monkeypatch.setattr(users_pull, "fetch_accounts", lambda database_url, cursor, limit: [account_row("acc1", user_id="u1")])

    result = pull_users(PullUsersOptions(stats_dir=stats_dir))
    paths = resolve_paths(stats_dir)

    assert result["users_changed"] == 1
    assert result["accounts_changed"] == 1
    assert paths.users_parquet == stats_dir / "_data" / "auth_users.parquet"
    assert paths.accounts_parquet == stats_dir / "_data" / "auth_accounts.parquet"

    user_rows = read_parquet_rows(paths.users_parquet)
    account_rows = read_parquet_rows(paths.accounts_parquet)
    assert user_rows[0]["id"] == "u1"
    assert "password" not in user_rows[0]
    assert json.loads(user_rows[0]["profile"]) == {"level": "a1"}
    assert account_rows[0]["account_id"] == "acc1"
    assert set(account_rows[0]) == {
        "app_id",
        "account_id",
        "user_id",
        "type",
        "provider",
        "scope",
        "token_type",
        "expires_at",
        "created_at",
        "updated_at",
    }
    assert "access_token" not in account_rows[0]
    assert "refresh_token" not in account_rows[0]

    state = json.loads(paths.state.read_text())
    assert state["users"]["cursor"] == ["2026-06-01T10:00:00Z", "2026-06-01T10:00:00Z", "u1"]
    assert state["accounts"]["cursor"] == [
        "2026-06-01T10:00:00Z",
        "2026-06-01T10:00:00Z",
        "lingocafe",
        "acc1",
        "github",
    ]


def test_pull_users_uses_cursors_and_merges_updates(monkeypatch, tmp_path: Path) -> None:
    stats_dir = tmp_path / ".local" / "42go-stats"
    monkeypatch.setenv("DATABASE_URL", "postgres://example")
    calls: list[tuple[str, list[str] | None]] = []

    def first_users(database_url: str, cursor: list[str] | None, limit: int) -> list[dict[str, Any]]:
        calls.append(("users", cursor))
        return [user_row("u1", name="John")]

    def first_accounts(database_url: str, cursor: list[str] | None, limit: int) -> list[dict[str, Any]]:
        calls.append(("accounts", cursor))
        return [account_row("acc1", user_id="u1")]

    monkeypatch.setattr(users_pull, "fetch_users", first_users)
    monkeypatch.setattr(users_pull, "fetch_accounts", first_accounts)
    pull_users(PullUsersOptions(stats_dir=stats_dir))

    def second_users(database_url: str, cursor: list[str] | None, limit: int) -> list[dict[str, Any]]:
        calls.append(("users", cursor))
        return [user_row("u1", name="Johnny", updated_at="2026-06-02T10:00:00Z")]

    def second_accounts(database_url: str, cursor: list[str] | None, limit: int) -> list[dict[str, Any]]:
        calls.append(("accounts", cursor))
        return [account_row("acc1", user_id="u1", updated_at="2026-06-02T10:00:00Z")]

    monkeypatch.setattr(users_pull, "fetch_users", second_users)
    monkeypatch.setattr(users_pull, "fetch_accounts", second_accounts)
    pull_users(PullUsersOptions(stats_dir=stats_dir))

    assert calls[0] == ("users", None)
    assert calls[1] == ("accounts", None)
    assert calls[2] == ("users", ["2026-06-01T10:00:00Z", "2026-06-01T10:00:00Z", "u1"])
    assert calls[3] == (
        "accounts",
        ["2026-06-01T10:00:00Z", "2026-06-01T10:00:00Z", "lingocafe", "acc1", "github"],
    )

    paths = resolve_paths(stats_dir)
    user_rows = read_parquet_rows(paths.users_parquet)
    account_rows = read_parquet_rows(paths.accounts_parquet)
    assert len(user_rows) == 1
    assert user_rows[0]["name"] == "Johnny"
    assert len(account_rows) == 1
    assert account_rows[0]["account_id"] == "acc1"


def test_pull_users_reset_rebuilds_without_existing_rows(monkeypatch, tmp_path: Path) -> None:
    stats_dir = tmp_path / ".local" / "42go-stats"
    monkeypatch.setenv("DATABASE_URL", "postgres://example")
    monkeypatch.setattr(users_pull, "fetch_users", lambda database_url, cursor, limit: [user_row("u1", name="John")])
    monkeypatch.setattr(users_pull, "fetch_accounts", lambda database_url, cursor, limit: [account_row("acc1", user_id="u1")])
    pull_users(PullUsersOptions(stats_dir=stats_dir))

    cursors: list[list[str] | None] = []

    def reset_users(database_url: str, cursor: list[str] | None, limit: int) -> list[dict[str, Any]]:
        cursors.append(cursor)
        return [user_row("u2", name="Jane", updated_at="2026-06-03T10:00:00Z")]

    def reset_accounts(database_url: str, cursor: list[str] | None, limit: int) -> list[dict[str, Any]]:
        cursors.append(cursor)
        return [account_row("acc2", user_id="u2", updated_at="2026-06-03T10:00:00Z")]

    monkeypatch.setattr(users_pull, "fetch_users", reset_users)
    monkeypatch.setattr(users_pull, "fetch_accounts", reset_accounts)
    pull_users(PullUsersOptions(stats_dir=stats_dir, reset=True))

    paths = resolve_paths(stats_dir)
    assert cursors == [None, None]
    assert [row["id"] for row in read_parquet_rows(paths.users_parquet)] == ["u2"]
    assert [row["account_id"] for row in read_parquet_rows(paths.accounts_parquet)] == ["acc2"]


def test_write_failure_does_not_advance_state(monkeypatch, tmp_path: Path) -> None:
    stats_dir = tmp_path / ".local" / "42go-stats"
    monkeypatch.setenv("DATABASE_URL", "postgres://example")
    monkeypatch.setattr(users_pull, "fetch_users", lambda database_url, cursor, limit: [user_row("u1", name="John")])
    monkeypatch.setattr(users_pull, "fetch_accounts", lambda database_url, cursor, limit: [account_row("acc1", user_id="u1")])
    pull_users(PullUsersOptions(stats_dir=stats_dir))
    paths = resolve_paths(stats_dir)
    original_state = paths.state.read_text()

    monkeypatch.setattr(
        users_pull,
        "fetch_users",
        lambda database_url, cursor, limit: [user_row("u2", name="Jane", updated_at="2026-06-03T10:00:00Z")],
    )
    monkeypatch.setattr(users_pull, "fetch_accounts", lambda database_url, cursor, limit: [])
    monkeypatch.setattr(users_pull, "smoke_read_parquet", lambda path, expected_rows: (_ for _ in ()).throw(RuntimeError("boom")))

    try:
        pull_users(PullUsersOptions(stats_dir=stats_dir))
    except RuntimeError as error:
        assert "boom" in str(error)
    else:
        raise AssertionError("expected smoke read failure")

    assert paths.state.read_text() == original_state
