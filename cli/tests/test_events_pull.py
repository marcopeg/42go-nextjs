from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from threading import Event
from typing import Any

import pyarrow.parquet as pq

from fortytwogo_cli.events import pull as events_pull
from fortytwogo_cli.events.paths import get_database_url, resolve_paths
from fortytwogo_cli.events.pull import PullOptions, pull_events


def dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def event_row(
    event_id: str,
    *,
    created_at: str = "2026-06-01T10:00:00Z",
    name: str = "page.open",
) -> dict[str, Any]:
    return {
        "created_at": dt(created_at),
        "id": event_id,
        "app_id": "lingocafe",
        "user_id": "u1",
        "event_at": dt(created_at),
        "name": name,
        "data": {"book_id": "b1"},
        "meta": {},
    }


def read_parquet_rows(path: Path) -> list[dict[str, Any]]:
    return pq.read_table(path).to_pylist()


def test_pull_events_uses_backup_database_url_by_default(monkeypatch) -> None:
    monkeypatch.setenv("BACKUP_DATABASE_URL", "postgres://backup")

    assert get_database_url() == "postgres://backup"


def test_pull_events_writes_monthly_parquet_and_uses_cursor(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / ".local" / "42go-data"
    calls: list[tuple[str | None, str | None]] = []

    monkeypatch.setattr(events_pull, "get_database_url", lambda: "postgres://events")

    def first_fetch(database_url: str, cursor: tuple[str | None, str | None], limit: int) -> list[dict[str, Any]]:
        calls.append(cursor)
        return [event_row("00000000-0000-0000-0000-000000000001")]

    monkeypatch.setattr(events_pull, "fetch_rows", first_fetch)
    result = pull_events(PullOptions(data_dir=data_dir, run_id="run-1"))
    paths = resolve_paths(data_dir)

    assert result["rows"] == 1
    assert calls == [(None, None)]
    assert paths.parquet_dir == data_dir / "events"
    assert paths.state == data_dir / "events" / "_state.json"
    assert paths.inflight == data_dir / "events" / "_inflight.json"
    assert (paths.parquet_dir / "events_202606.parquet").exists()
    assert not list(paths.parquet_dir.glob("*.csv"))
    assert read_parquet_rows(paths.parquet_dir / "events_202606.parquet")[0]["id"] == "00000000-0000-0000-0000-000000000001"

    state = json.loads(paths.state.read_text())
    assert state["last_run_id"] == "run-1"
    assert state["last_row_count"] == 1
    assert state["first_created_at"] == "2026-06-01T10:00:00Z"
    assert state["first_id"] == "00000000-0000-0000-0000-000000000001"
    assert state["last_created_at"] == "2026-06-01T10:00:00Z"
    assert state["last_id"] == "00000000-0000-0000-0000-000000000001"
    assert state["months"][0]["month"] == "202606"

    def second_fetch(database_url: str, cursor: tuple[str | None, str | None], limit: int) -> list[dict[str, Any]]:
        calls.append(cursor)
        return [event_row("00000000-0000-0000-0000-000000000002", created_at="2026-06-02T10:00:00Z")]

    monkeypatch.setattr(events_pull, "fetch_rows", second_fetch)
    pull_events(PullOptions(data_dir=data_dir, run_id="run-2"))

    assert calls[-1] == ("2026-06-01T10:00:00Z", "00000000-0000-0000-0000-000000000001")
    assert [row["id"] for row in read_parquet_rows(paths.parquet_dir / "events_202606.parquet")] == [
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000002",
    ]


def test_pull_events_merges_months_in_parallel(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / ".local" / "42go-data"
    july_started = Event()
    monkeypatch.setattr(events_pull, "get_database_url", lambda: "postgres://events")
    monkeypatch.setattr(
        events_pull,
        "fetch_rows",
        lambda database_url, cursor, limit: [
            event_row("00000000-0000-0000-0000-000000000001", created_at="2026-06-01T10:00:00Z"),
            event_row("00000000-0000-0000-0000-000000000002", created_at="2026-07-01T10:00:00Z"),
        ],
    )

    def merge_month(paths, month: str, new_rows: list[dict[str, Any]]) -> dict[str, Any]:
        if month == "202606":
            return {"month": month, "saw_parallel": july_started.wait(1)}
        july_started.set()
        return {"month": month, "saw_parallel": True}

    monkeypatch.setattr(events_pull, "merge_month", merge_month)

    result = pull_events(PullOptions(data_dir=data_dir, run_id="run-1"))

    assert result["months"] == [
        {"month": "202606", "saw_parallel": True},
        {"month": "202607", "saw_parallel": True},
    ]


def test_pull_events_reset_deletes_existing_parquet(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / ".local" / "42go-data"
    legacy_state = data_dir / "_state" / "events.json"
    legacy_manifest = data_dir / "_state" / "events_manifest.jsonl"
    legacy_inflight = data_dir / "_state" / "events_inflight.json"
    monkeypatch.setattr(events_pull, "get_database_url", lambda: "postgres://events")
    monkeypatch.setattr(events_pull, "fetch_rows", lambda database_url, cursor, limit: [event_row("00000000-0000-0000-0000-000000000001")])
    pull_events(PullOptions(data_dir=data_dir, run_id="run-1"))
    legacy_state.parent.mkdir(parents=True, exist_ok=True)
    legacy_state.write_text("{}")
    legacy_manifest.write_text("{}\n")
    legacy_inflight.write_text("{}")

    cursors: list[tuple[str | None, str | None]] = []

    def reset_fetch(database_url: str, cursor: tuple[str | None, str | None], limit: int) -> list[dict[str, Any]]:
        cursors.append(cursor)
        return [event_row("00000000-0000-0000-0000-000000000003", created_at="2026-07-01T10:00:00Z")]

    monkeypatch.setattr(events_pull, "fetch_rows", reset_fetch)
    pull_events(PullOptions(data_dir=data_dir, run_id="run-reset", reset=True))
    paths = resolve_paths(data_dir)

    assert cursors == [(None, None)]
    assert not (paths.parquet_dir / "events_202606.parquet").exists()
    assert [row["id"] for row in read_parquet_rows(paths.parquet_dir / "events_202607.parquet")] == [
        "00000000-0000-0000-0000-000000000003"
    ]
    assert not legacy_state.exists()
    assert not legacy_manifest.exists()
    assert not legacy_inflight.exists()


def test_pull_events_reads_legacy_state_once(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / ".local" / "42go-data"
    legacy_state = data_dir / "_state" / "events.json"
    legacy_state.parent.mkdir(parents=True, exist_ok=True)
    legacy_state.write_text(
        json.dumps(
            {
                "last_created_at": "2026-06-01T10:00:00Z",
                "last_id": "00000000-0000-0000-0000-000000000001",
            }
        )
    )
    cursors: list[tuple[str | None, str | None]] = []
    monkeypatch.setattr(events_pull, "get_database_url", lambda: "postgres://events")

    def fetch(database_url: str, cursor: tuple[str | None, str | None], limit: int) -> list[dict[str, Any]]:
        cursors.append(cursor)
        return [event_row("00000000-0000-0000-0000-000000000002", created_at="2026-06-02T10:00:00Z")]

    monkeypatch.setattr(events_pull, "fetch_rows", fetch)
    pull_events(PullOptions(data_dir=data_dir, run_id="run-2"))
    paths = resolve_paths(data_dir)

    assert cursors == [("2026-06-01T10:00:00Z", "00000000-0000-0000-0000-000000000001")]
    assert json.loads(paths.state.read_text())["last_id"] == "00000000-0000-0000-0000-000000000002"
