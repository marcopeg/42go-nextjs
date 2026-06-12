from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pyarrow.parquet as pq

from fortytwogo_cli.events import books as books_mod
from fortytwogo_cli.events.books import PullBooksOptions, load_book_stats, pull_books, resolve_book_data_paths


def dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def book_row(
    book_id: str,
    *,
    title: str,
    created_at: str = "2026-06-01T10:00:00Z",
    updated_at: str = "2026-06-01T10:00:00Z",
) -> dict[str, Any]:
    return {
        "id": book_id,
        "project": "lingocafe",
        "lang": "sv",
        "level": "a2",
        "title": title,
        "description": "Description",
        "author": "Author",
        "tags": ["classic"],
        "info": {"source": "test"},
        "published_at": None,
        "created_at": dt(created_at),
        "updated_at": dt(updated_at),
    }


def page_row(book_id: str, page_id: str, position: int) -> dict[str, Any]:
    return {
        "book_id": book_id,
        "id": page_id,
        "position": position,
        "kind": "text",
        "prefix": None,
        "title": f"Page {position}",
        "summary": None,
        "content": "Body",
    }


def progress_row(
    user_id: str,
    book_id: str,
    page_id: str,
    *,
    created_at: str = "2026-06-01T10:00:00Z",
    updated_at: str = "2026-06-01T10:00:00Z",
) -> dict[str, Any]:
    return {
        "user_id": user_id,
        "book_id": book_id,
        "page_id": page_id,
        "progress_bps": 9000,
        "created_at": dt(created_at),
        "updated_at": dt(updated_at),
        "completed_at": dt(updated_at),
    }


def read_parquet_rows(path: Path) -> list[dict[str, Any]]:
    return pq.read_table(path).to_pylist()


def test_pull_books_uses_backup_database_url_by_default(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / ".local" / "42go-data"
    monkeypatch.setenv("BACKUP_DATABASE_URL", "postgres://backup")
    calls: list[str] = []
    monkeypatch.setattr(books_mod, "fetch_books", lambda database_url, cursor, limit: calls.append(database_url) or [])
    monkeypatch.setattr(books_mod, "fetch_pages", lambda database_url: calls.append(database_url) or [])
    monkeypatch.setattr(books_mod, "fetch_progress", lambda database_url, cursor, limit: calls.append(database_url) or [])

    pull_books(PullBooksOptions(data_dir=data_dir))

    assert calls == ["postgres://backup", "postgres://backup", "postgres://backup"]


def test_pull_books_writes_raw_parquet_and_query_reads_local_files(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / ".local" / "42go-data"
    monkeypatch.setenv("BACKUP_DATABASE_URL", "postgres://example")
    monkeypatch.setattr(books_mod, "fetch_books", lambda database_url, cursor, limit: [book_row("b1", title="Dracula")])
    monkeypatch.setattr(
        books_mod,
        "fetch_pages",
        lambda database_url: [page_row("b1", "p1", 1), page_row("b1", "p2", 2)],
    )
    monkeypatch.setattr(books_mod, "fetch_progress", lambda database_url, cursor, limit: [progress_row("u1", "b1", "p1")])

    result = pull_books(PullBooksOptions(data_dir=data_dir))
    paths = resolve_book_data_paths(data_dir)

    assert result["books_changed"] == 1
    assert result["pages_total"] == 2
    assert result["progress_changed"] == 1
    assert paths.books_path == data_dir / "lingocafe" / "books.parquet"
    assert paths.pages_path == data_dir / "lingocafe" / "books_pages.parquet"
    assert paths.progress_path == data_dir / "lingocafe" / "books_progress.parquet"
    assert paths.state_path == data_dir / "lingocafe" / "_state.json"
    assert read_parquet_rows(paths.books_path)[0]["id"] == "b1"
    assert [row["id"] for row in read_parquet_rows(paths.pages_path)] == ["p1", "p2"]
    assert read_parquet_rows(paths.progress_path)[0]["user_id"] == "u1"

    state = json.loads(paths.state_path.read_text())
    assert state["books"]["cursor"] == ["2026-06-01T10:00:00Z", "2026-06-01T10:00:00Z", "b1"]
    assert state["pages"]["mode"] == "full-refresh"
    assert state["progress"]["cursor"] == ["2026-06-01T10:00:00Z", "2026-06-01T10:00:00Z", "u1", "b1"]

    stats_root = tmp_path / ".local" / "42go-stats"
    stats = load_book_stats(data_dir=data_dir, stats_root=stats_root)
    assert len(stats.books) == 1
    assert stats.books[0].book_id == "b1"
    assert stats.books[0].page_count == 2
    assert stats.progress_rows == 1
    assert stats.cache_dir == stats_root / "lingocafe"
    assert stats.stats_books_path.name == "query_lingocafe_books_books.parquet"
    assert stats.stats_pages_path.name == "query_lingocafe_books_pages.parquet"
    assert stats.stats_progress_path.name == "query_lingocafe_books_progress.parquet"
    assert stats.stats_state_path.name == "query_lingocafe_books_state.parquet"
    assert stats.stats_books_path.exists()
    assert stats.stats_pages_path.exists()
    assert stats.stats_progress_path.exists()
    assert stats.stats_state_path.exists()


def test_pull_books_uses_cursors_and_reset(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / ".local" / "42go-data"
    legacy_state = data_dir / "lingocafe" / "_state" / "books.json"
    monkeypatch.setenv("BACKUP_DATABASE_URL", "postgres://example")
    calls: list[tuple[str, list[str] | None]] = []

    def first_books(database_url: str, cursor: list[str] | None, limit: int) -> list[dict[str, Any]]:
        calls.append(("books", cursor))
        return [book_row("b1", title="Dracula")]

    def first_progress(database_url: str, cursor: list[str] | None, limit: int) -> list[dict[str, Any]]:
        calls.append(("progress", cursor))
        return [progress_row("u1", "b1", "p1")]

    monkeypatch.setattr(books_mod, "fetch_books", first_books)
    monkeypatch.setattr(books_mod, "fetch_pages", lambda database_url: [page_row("b1", "p1", 1)])
    monkeypatch.setattr(books_mod, "fetch_progress", first_progress)
    pull_books(PullBooksOptions(data_dir=data_dir))
    legacy_state.parent.mkdir(parents=True, exist_ok=True)
    legacy_state.write_text("{}")

    def second_books(database_url: str, cursor: list[str] | None, limit: int) -> list[dict[str, Any]]:
        calls.append(("books", cursor))
        return [book_row("b2", title="Frankenstein", created_at="2026-06-02T10:00:00Z", updated_at="2026-06-02T10:00:00Z")]

    def second_progress(database_url: str, cursor: list[str] | None, limit: int) -> list[dict[str, Any]]:
        calls.append(("progress", cursor))
        return [progress_row("u2", "b2", "p9", created_at="2026-06-02T10:00:00Z", updated_at="2026-06-02T10:00:00Z")]

    monkeypatch.setattr(books_mod, "fetch_books", second_books)
    monkeypatch.setattr(books_mod, "fetch_pages", lambda database_url: [page_row("b1", "p1", 1), page_row("b2", "p9", 1)])
    monkeypatch.setattr(books_mod, "fetch_progress", second_progress)
    pull_books(PullBooksOptions(data_dir=data_dir))

    assert calls[0] == ("books", None)
    assert calls[1] == ("progress", None)
    assert calls[2] == ("books", ["2026-06-01T10:00:00Z", "2026-06-01T10:00:00Z", "b1"])
    assert calls[3] == ("progress", ["2026-06-01T10:00:00Z", "2026-06-01T10:00:00Z", "u1", "b1"])

    paths = resolve_book_data_paths(data_dir)
    assert [row["id"] for row in read_parquet_rows(paths.books_path)] == ["b1", "b2"]

    monkeypatch.setattr(books_mod, "fetch_books", lambda database_url, cursor, limit: calls.append(("books", cursor)) or [book_row("b3", title="Jane Eyre")])
    monkeypatch.setattr(books_mod, "fetch_pages", lambda database_url: [page_row("b3", "p1", 1)])
    monkeypatch.setattr(books_mod, "fetch_progress", lambda database_url, cursor, limit: calls.append(("progress", cursor)) or [])
    pull_books(PullBooksOptions(data_dir=data_dir, reset=True))

    assert calls[-2] == ("books", None)
    assert calls[-1] == ("progress", None)
    assert [row["id"] for row in read_parquet_rows(paths.books_path)] == ["b3"]
    assert not legacy_state.exists()
