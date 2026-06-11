from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from typer.testing import CliRunner

from fortytwogo_cli.backup import core
from fortytwogo_cli.backup.cli import format_restore_backup_table
from fortytwogo_cli import cli as cli_module
from fortytwogo_cli.cli import app


runner = CliRunner()


def test_root_without_args_shows_help() -> None:
    result = runner.invoke(app, [])

    assert result.exit_code == 0
    assert "Local automation commands for 42Go projects." in result.output
    assert "backup" in result.output
    assert "restore" in result.output
    assert "events" in result.output
    assert "query" in result.output
    assert "update" in result.output


def test_events_help_lists_commands() -> None:
    result = runner.invoke(app, ["events", "--help"])

    assert result.exit_code == 0
    assert "pull" in result.output
    assert "query" not in result.output


def test_update_help_describes_options() -> None:
    result = runner.invoke(app, ["update", "--help"])

    assert result.exit_code == 0
    assert "--reset" in result.output
    assert "--archive-dir" in result.output
    assert "--database-url-env" in result.output


def test_query_help_lists_commands() -> None:
    result = runner.invoke(app, ["query", "--help"])

    assert result.exit_code == 0
    assert "session" in result.output
    assert "reads" in result.output
    assert "books" in result.output


def test_backup_help_lists_mode_flags() -> None:
    result = runner.invoke(app, ["backup", "--help"])

    assert result.exit_code == 0
    assert "--full" in result.output
    assert "--light" in result.output


def test_backup_rejects_conflicting_modes() -> None:
    result = runner.invoke(app, ["backup", "--full", "--light"])

    assert result.exit_code == 1
    assert "Use only one backup mode" in result.output


def test_backup_without_mode_prompts(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_backup(mode: core.BackupMode) -> core.BackupResult:
        calls.append(mode)
        return core.BackupResult(output_path=Path(".local/42go-backups/test.dump.light.sql"), tables_dumped=3, tables_excluded=2)

    monkeypatch.setattr(core, "run_backup", fake_run_backup)

    result = runner.invoke(app, ["backup"], input="2\n")

    assert result.exit_code == 0
    assert calls == ["light"]
    assert "Choose backup mode" in result.output
    assert "Created .local/42go-backups/test.dump.light.sql" in result.output


def test_backup_full_flag_dispatches_full(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_backup(mode: core.BackupMode) -> core.BackupResult:
        calls.append(mode)
        return core.BackupResult(output_path=Path(".local/42go-backups/test.dump.full.sql"), tables_dumped=4, tables_excluded=1)

    monkeypatch.setattr(core, "run_backup", fake_run_backup)

    result = runner.invoke(app, ["backup", "--full"])

    assert result.exit_code == 0
    assert calls == ["full"]


def test_restore_help_lists_from_option() -> None:
    result = runner.invoke(app, ["restore", "--help"])

    assert result.exit_code == 0
    assert "--from" in result.output


def test_restore_with_from_dispatches_restore(monkeypatch) -> None:
    calls: list[Path] = []
    monkeypatch.setenv("RESTORE_DATABASE_URL", "postgres://user:secret@localhost:5432/app")

    def fake_run_restore(from_value: str | Path) -> core.RestoreResult:
        calls.append(Path(from_value))
        return core.RestoreResult(dump_path=Path(from_value), stripped_tables=0, stripped_data_sections=0, event_partitions=0)

    monkeypatch.setattr(core, "run_restore", fake_run_restore)

    result = runner.invoke(app, ["restore", "--from", "file.dump.light.sql"], input="y\n")

    assert result.exit_code == 0
    assert calls == [Path("file.dump.light.sql")]
    assert "Restore file: file.dump.light.sql" in result.output
    assert "Target database: postgres://user:***@localhost:5432/app" in result.output
    assert "secret" not in result.output
    assert "Restoring from file.dump.light.sql" in result.output


def test_restore_without_from_prompts_newest_first(monkeypatch) -> None:
    backups = [
        Path(".local/42go-backups/20260610T120000Z.dump.light.sql"),
        Path(".local/42go-backups/20260609T120000Z.dump.full.sql"),
    ]
    calls: list[Path] = []
    monkeypatch.setenv("RESTORE_DATABASE_URL", "postgres://user:secret@localhost:5432/app")

    def fake_run_restore(from_value: str | Path) -> core.RestoreResult:
        calls.append(Path(from_value))
        return core.RestoreResult(dump_path=Path(from_value), stripped_tables=0, stripped_data_sections=0, event_partitions=0)

    monkeypatch.setattr(core, "list_available_backups", lambda: backups)
    monkeypatch.setattr(core, "run_restore", fake_run_restore)

    result = runner.invoke(app, ["restore"], input="1\ny\n")

    assert result.exit_code == 0
    assert calls == [backups[0]]
    assert "File" in result.output
    assert "Date" in result.output
    assert "Size" in result.output
    assert ".local/42go-backups/20260610T120000Z.dump.light.sql" in result.output
    assert "2026-06-10 12:00:00Z" in result.output
    assert ".local/42go-backups/20260609T120000Z.dump.full.sql" in result.output
    assert "2026-06-09 12:00:00Z" in result.output
    assert "Target database: postgres://user:***@localhost:5432/app" in result.output


def test_restore_backup_table_formats_readable_size_and_date(tmp_path) -> None:
    backup_path = tmp_path / "20260611T095535Z.dump.full.sql"
    backup_path.write_bytes(b"x" * 2048)

    output = "\n".join(format_restore_backup_table([backup_path]))

    assert "File" in output
    assert "Date" in output
    assert "Size" in output
    assert "2026-06-11 09:55:35Z" in output
    assert "2.0 KiB" in output


def test_restore_without_from_lists_only_latest_ten(monkeypatch) -> None:
    backups = [
        Path(f".local/42go-backups/202606{day:02d}T120000Z.dump.light.sql")
        for day in range(12, 0, -1)
    ]
    calls: list[Path] = []
    monkeypatch.setenv("RESTORE_DATABASE_URL", "postgres://user:secret@localhost:5432/app")

    def fake_run_restore(from_value: str | Path) -> core.RestoreResult:
        calls.append(Path(from_value))
        return core.RestoreResult(dump_path=Path(from_value), stripped_tables=0, stripped_data_sections=0, event_partitions=0)

    monkeypatch.setattr(core, "list_available_backups", lambda: backups)
    monkeypatch.setattr(core, "run_restore", fake_run_restore)

    result = runner.invoke(app, ["restore"], input="10\ny\n")

    assert result.exit_code == 0
    assert calls == [backups[9]]
    assert "20260603T120000Z.dump.light.sql" in result.output
    assert "20260602T120000Z.dump.light.sql" not in result.output
    assert "20260601T120000Z.dump.light.sql" not in result.output


def test_restore_cancel_skips_restore(monkeypatch) -> None:
    calls: list[Path] = []
    monkeypatch.setenv("RESTORE_DATABASE_URL", "postgres://user:secret@localhost:5432/app")

    def fake_run_restore(from_value: str | Path) -> core.RestoreResult:
        calls.append(Path(from_value))
        return core.RestoreResult(dump_path=Path(from_value), stripped_tables=0, stripped_data_sections=0, event_partitions=0)

    monkeypatch.setattr(core, "run_restore", fake_run_restore)

    result = runner.invoke(app, ["restore", "--from", "file.dump.light.sql"], input="n\n")

    assert result.exit_code == 0
    assert calls == []
    assert "Restore cancelled." in result.output
    assert "secret" not in result.output


def test_restore_without_from_fails_when_no_backups(monkeypatch) -> None:
    monkeypatch.setattr(core, "list_available_backups", lambda: [])

    result = runner.invoke(app, ["restore"])

    assert result.exit_code == 1
    assert "No backups found" in result.output


def test_stats_help_describes_archive_dir() -> None:
    result = runner.invoke(app, ["query", "stats", "--help"])

    assert result.exit_code == 0
    assert "--archive-dir" in result.output


def test_users_growth_help_describes_options() -> None:
    result = runner.invoke(app, ["query", "users", "growth", "--help"])

    assert result.exit_code == 0
    assert "--reset" in result.output
    assert "--app" in result.output
    assert "--format" in result.output


def test_session_help_describes_options() -> None:
    result = runner.invoke(app, ["query", "session", "--help"])

    assert result.exit_code == 0
    assert "--reset" in result.output
    assert "--user-id" in result.output
    assert "--app-id" in result.output
    assert "--limit" in result.output
    assert "--format" in result.output


def test_reads_help_describes_options() -> None:
    result = runner.invoke(app, ["query", "reads", "--help"])

    assert result.exit_code == 0
    assert "--reset" in result.output
    assert "--book-id" in result.output
    assert "--app-id" in result.output
    assert "--limit" in result.output
    assert "--completion-threshol" in result.output
    assert "--format" in result.output


def test_books_stats_help_describes_options() -> None:
    result = runner.invoke(app, ["query", "books", "stats", "--help"])

    assert result.exit_code == 0
    assert "--app-id" in result.output
    assert "--database-url-env" in result.output
    assert "--format" in result.output


def test_events_query_alias_is_removed() -> None:
    result = runner.invoke(app, ["events", "query", "reads", "--help"])

    assert result.exit_code != 0


def test_update_runs_refresh_pipeline_and_passes_reset(monkeypatch) -> None:
    calls: list[tuple[str, object]] = []

    def fake_pull_events(options) -> dict[str, object]:
        calls.append(("pull", options.limit))
        return {"rows": 3}

    def fake_pull_book_stats(database_url_env: str):
        calls.append(("books", database_url_env))
        return SimpleNamespace(books=[object(), object()], pages=[object(), object(), object()])

    def fake_load_event_sessions(archive_dir=None, reset=False):
        calls.append(("session", reset))
        return SimpleNamespace(apps=[SimpleNamespace(total_sessions=4, cache_status="rebuilt")])

    def fake_load_users_growth(archive_dir=None, reset=False):
        calls.append(("users", reset))
        return SimpleNamespace(apps=[SimpleNamespace(rows=[object(), object()], cache_status="rebuilt")])

    def fake_load_event_reads(archive_dir=None, reset=False):
        calls.append(("reads", reset))
        return SimpleNamespace(apps=[SimpleNamespace(total_books=5, cache_status="rebuilt")])

    monkeypatch.setattr(cli_module, "pull_events", fake_pull_events)
    monkeypatch.setattr(cli_module, "pull_book_stats", fake_pull_book_stats)
    monkeypatch.setattr(cli_module, "load_event_sessions", fake_load_event_sessions)
    monkeypatch.setattr(cli_module, "load_users_growth", fake_load_users_growth)
    monkeypatch.setattr(cli_module, "load_event_reads", fake_load_event_reads)

    result = runner.invoke(app, ["update", "--reset", "--limit", "7", "--database-url-env", "BACKUP_DATABASE_URL"])

    assert result.exit_code == 0
    assert calls == [
        ("pull", 7),
        ("books", "BACKUP_DATABASE_URL"),
        ("session", True),
        ("users", True),
        ("reads", True),
    ]
    assert "events pull: 3 rows" in result.output
    assert "query books stats: books=2 pages=3" in result.output
    assert "query session: rebuilt sessions=4" in result.output
    assert "query users growth: rebuilt rows=2" in result.output
    assert "query reads: rebuilt books=5" in result.output
    assert "Reset: yes" in result.output


def test_update_does_not_reset_by_default(monkeypatch) -> None:
    calls: list[tuple[str, object]] = []

    monkeypatch.setattr(cli_module, "pull_events", lambda options: calls.append(("pull", options.limit)) or {"rows": 0, "message": "No new events to export."})
    monkeypatch.setattr(cli_module, "pull_book_stats", lambda database_url_env: calls.append(("books", database_url_env)) or SimpleNamespace(books=[], pages=[]))
    monkeypatch.setattr(
        cli_module,
        "load_event_sessions",
        lambda archive_dir=None, reset=False: calls.append(("session", reset))
        or SimpleNamespace(apps=[SimpleNamespace(total_sessions=0, cache_status="cached")]),
    )
    monkeypatch.setattr(
        cli_module,
        "load_users_growth",
        lambda archive_dir=None, reset=False: calls.append(("users", reset))
        or SimpleNamespace(apps=[SimpleNamespace(rows=[], cache_status="cached")]),
    )
    monkeypatch.setattr(
        cli_module,
        "load_event_reads",
        lambda archive_dir=None, reset=False: calls.append(("reads", reset))
        or SimpleNamespace(apps=[SimpleNamespace(total_books=0, cache_status="cached")]),
    )

    result = runner.invoke(app, ["update"])

    assert result.exit_code == 0
    assert calls == [
        ("pull", 10000),
        ("books", "DATABASE_URL"),
        ("session", False),
        ("users", False),
        ("reads", False),
    ]
    assert "events pull: No new events to export." in result.output
    assert "Reset: no" in result.output
