from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from typer.testing import CliRunner

from fortytwogo_cli.backup import core
from fortytwogo_cli.backup.cli import format_restore_backup_table
from fortytwogo_cli import cli as cli_module
from fortytwogo_cli.cli import app
from fortytwogo_cli.events import cli as events_cli_module
from fortytwogo_cli.pull import cli as pull_cli_module


runner = CliRunner()


def test_root_without_args_shows_help() -> None:
    result = runner.invoke(app, [])

    assert result.exit_code == 0
    assert "Local automation commands for 42Go projects." in result.output
    assert "backup" in result.output
    assert "restore" in result.output
    assert "pull" in result.output
    assert "query" in result.output
    assert "update" in result.output


def test_events_root_is_removed() -> None:
    result = runner.invoke(app, ["events", "--help"])

    assert result.exit_code != 0


def test_users_root_is_removed() -> None:
    result = runner.invoke(app, ["users", "--help"])

    assert result.exit_code != 0


def test_pull_help_lists_commands() -> None:
    result = runner.invoke(app, ["pull", "--help"])

    assert result.exit_code == 0
    assert "auth" in result.output
    assert "events" in result.output
    assert "books" in result.output
    assert "all" in result.output


def test_pull_without_target_prompts_and_runs_selection(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_all_pulls(*args, **kwargs):
        calls.append("all")
        return {"auth": {}, "events": {}, "books": {}}

    monkeypatch.setattr(pull_cli_module, "run_all_pulls", fake_run_all_pulls)

    result = runner.invoke(app, ["pull"], input="4\n")

    assert result.exit_code == 0
    assert calls == ["all"]
    assert "Choose pull target" in result.output
    assert '"auth": {}' in result.output


def test_pull_star_alias_runs_all(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_all_pulls(*args, **kwargs):
        calls.append("all")
        return {"auth": {}, "events": {}, "books": {}}

    monkeypatch.setattr(pull_cli_module, "run_all_pulls", fake_run_all_pulls)

    result = runner.invoke(app, ["pull", "*"])

    assert result.exit_code == 0
    assert calls == ["all"]
    assert '"books": {}' in result.output


def test_update_help_describes_options() -> None:
    result = runner.invoke(app, ["update", "--help"])

    assert result.exit_code == 0
    assert "--reset" in result.output
    assert "--data-dir" in result.output
    assert "--database-url-env" in result.output


def test_query_help_lists_commands() -> None:
    result = runner.invoke(app, ["query", "--help"])

    assert result.exit_code == 0
    assert "session" in result.output
    assert "users" in result.output
    assert "lingocafe" in result.output


def test_query_without_target_prompts_and_enters_lingocafe_menu(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_books_query(*args, **kwargs) -> None:
        calls.append("books")

    monkeypatch.setattr(events_cli_module, "run_books_query", fake_run_books_query)

    result = runner.invoke(app, ["query"], input="4\n1\n")

    assert result.exit_code == 0
    assert calls == ["books"]
    assert "Choose query target" in result.output
    assert "1. stats" in result.output
    assert "4. lingocafe" in result.output
    assert "Choose LingoCafe query" in result.output
    assert "1. books" in result.output


def test_query_users_without_target_prompts_and_runs_selection(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_users_growth_query(*args, **kwargs) -> None:
        calls.append("growth")

    monkeypatch.setattr(events_cli_module, "run_users_growth_query", fake_run_users_growth_query)

    result = runner.invoke(app, ["query", "users"], input="1\n")

    assert result.exit_code == 0
    assert calls == ["growth"]
    assert "Choose users query" in result.output
    assert "1. growth" in result.output


def test_query_menu_enters_nested_users_menu(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_users_growth_query(*args, **kwargs) -> None:
        calls.append("growth")

    monkeypatch.setattr(events_cli_module, "run_users_growth_query", fake_run_users_growth_query)

    result = runner.invoke(app, ["query"], input="3\n1\n")

    assert result.exit_code == 0
    assert calls == ["growth"]
    assert "Choose query target" in result.output
    assert "Choose users query" in result.output


def test_query_lingocafe_without_target_prompts_and_runs_selection(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_subscribers_query(*args, **kwargs) -> None:
        calls.append("subscribers")

    monkeypatch.setattr(events_cli_module, "run_subscribers_query", fake_run_subscribers_query)

    result = runner.invoke(app, ["query", "lingocafe"], input="3\n")

    assert result.exit_code == 0
    assert calls == ["subscribers"]
    assert "Choose LingoCafe query" in result.output
    assert "2. reads" in result.output
    assert "3. subscribers" in result.output


def test_query_lingocafe_help_lists_subscribers() -> None:
    result = runner.invoke(app, ["query", "lingocafe", "--help"])

    assert result.exit_code == 0
    assert "books" in result.output
    assert "reads" in result.output
    assert "subscribers" in result.output


def test_query_lingocafe_subscribers_help_describes_options() -> None:
    result = runner.invoke(app, ["query", "lingocafe", "subscribers", "--help"])

    assert result.exit_code == 0
    assert "--data-dir" in result.output
    assert "--limit" in result.output
    assert "--format" in result.output
    assert "--reset" in result.output


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


def test_stats_help_describes_data_dir() -> None:
    result = runner.invoke(app, ["query", "stats", "--help"])

    assert result.exit_code == 0
    assert "--data-dir" in result.output


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
    result = runner.invoke(app, ["query", "lingocafe", "reads", "--help"])

    assert result.exit_code == 0
    assert "--reset" in result.output
    assert "--book-id" in result.output
    assert "--app-id" not in result.output
    assert "--limit" in result.output
    assert "--completion-threshol" in result.output
    assert "--format" in result.output


def test_update_runs_pull_all_before_aggregations(monkeypatch, tmp_path: Path) -> None:
    calls: list[str] = []

    def fake_run_all_pulls(**kwargs):
        calls.append("pull")
        return {
            "auth": {"users_changed": 1, "users_total": 2, "accounts_changed": 3, "accounts_total": 4},
            "events": {"rows": 5},
            "books": {"books_changed": 6, "books_total": 7, "pages_total": 8, "progress_changed": 9, "progress_total": 10},
        }

    def fake_load_book_stats(**kwargs):
        calls.append("books")
        return SimpleNamespace(books=[], pages=[], progress_rows=0)

    def fake_sessions(**kwargs):
        calls.append("sessions")
        return None

    def fake_users_growth(**kwargs):
        calls.append("users_growth")
        return None

    def fake_reads(**kwargs):
        calls.append("reads")
        return None

    def fake_subscribers(**kwargs):
        calls.append("subscribers")
        return None

    monkeypatch.setattr(cli_module, "run_all_pulls", fake_run_all_pulls)
    monkeypatch.setattr(cli_module, "load_book_stats", fake_load_book_stats)
    monkeypatch.setattr(cli_module, "load_event_sessions", fake_sessions)
    monkeypatch.setattr(cli_module, "load_users_growth", fake_users_growth)
    monkeypatch.setattr(cli_module, "load_event_reads", fake_reads)
    monkeypatch.setattr(cli_module, "load_lingocafe_subscribers", fake_subscribers)

    result = runner.invoke(app, ["update", "--data-dir", str(tmp_path / "data")])

    assert result.exit_code == 0
    assert calls == ["pull", "books", "sessions", "users_growth", "reads", "subscribers"]
    assert "pull auth: users=1/2 accounts=3/4" in result.output
    assert "pull events: 5 rows" in result.output
    assert "pull books: books=6/7 pages=8 progress=9/10" in result.output


def test_update_stops_when_pull_all_fails(monkeypatch, tmp_path: Path) -> None:
    calls: list[str] = []

    def fake_run_all_pulls(**kwargs):
        calls.append("pull")
        raise RuntimeError("auth export failed")

    monkeypatch.setattr(cli_module, "run_all_pulls", fake_run_all_pulls)

    result = runner.invoke(app, ["update", "--data-dir", str(tmp_path / "data")])

    assert result.exit_code == 1
    assert calls == ["pull"]
    assert "pull failed: auth export failed" in result.output


def test_lingocafe_books_query_help_describes_options() -> None:
    result = runner.invoke(app, ["query", "lingocafe", "books", "--help"])

    assert result.exit_code == 0
    assert "--app-id" not in result.output
    assert "--data-dir" in result.output
    assert "--reset" in result.output
    assert "--format" in result.output


def test_top_level_books_and_reads_commands_are_removed() -> None:
    books_result = runner.invoke(app, ["query", "books"])
    reads_result = runner.invoke(app, ["query", "reads"])

    assert books_result.exit_code != 0
    assert reads_result.exit_code != 0


def test_update_runs_refresh_pipeline_and_passes_reset(monkeypatch) -> None:
    calls: list[tuple[str, object]] = []

    def fake_run_all_pulls(**kwargs) -> dict[str, object]:
        calls.append(("pull", kwargs["reset"]))
        return {
            "auth": {"users_changed": 1, "users_total": 2, "accounts_changed": 1, "accounts_total": 1},
            "events": {"rows": 3},
            "books": {"books_changed": 2, "books_total": 2, "pages_total": 3, "progress_changed": 1, "progress_total": 1},
        }

    def fake_load_book_stats(**kwargs):
        calls.append(("books", kwargs.get("data_dir"), kwargs.get("reset")))
        return SimpleNamespace(books=[object(), object()], pages=[object(), object(), object()], progress_rows=1)

    def fake_load_event_sessions(archive_dir=None, reset=False):
        calls.append(("session", reset))
        return SimpleNamespace(apps=[SimpleNamespace(total_sessions=4, cache_status="rebuilt")])

    def fake_load_users_growth(archive_dir=None, reset=False):
        calls.append(("users", reset))
        return SimpleNamespace(
            apps=[
                SimpleNamespace(
                    app_id="lingocafe",
                    rows=[
                        SimpleNamespace(
                            granularity="day",
                            bucket_start="2026-06-13T00:00:00+02:00",
                            total_users=55,
                            subscribed_users=21,
                            weekly_active_users=36,
                            monthly_active_users=40,
                        )
                    ],
                    cache_status="rebuilt",
                )
            ]
        )

    def fake_load_event_reads(archive_dir=None, app_id_filter=None, reset=False):
        calls.append(("reads", reset, app_id_filter))
        return SimpleNamespace(apps=[SimpleNamespace(total_books=5, cache_status="rebuilt")])

    def fake_load_lingocafe_subscribers(archive_dir=None, reset=False):
        calls.append(("subscribers", reset))
        return SimpleNamespace(total_subscribers=22, cache_status="rebuilt")

    monkeypatch.setattr(cli_module, "run_all_pulls", fake_run_all_pulls)
    monkeypatch.setattr(cli_module, "load_book_stats", fake_load_book_stats)
    monkeypatch.setattr(cli_module, "load_event_sessions", fake_load_event_sessions)
    monkeypatch.setattr(cli_module, "load_users_growth", fake_load_users_growth)
    monkeypatch.setattr(cli_module, "load_event_reads", fake_load_event_reads)
    monkeypatch.setattr(cli_module, "load_lingocafe_subscribers", fake_load_lingocafe_subscribers)

    result = runner.invoke(app, ["update", "--reset", "--limit", "7", "--database-url-env", "BACKUP_DATABASE_URL"])

    assert result.exit_code == 0
    assert calls == [
        ("pull", True),
        ("books", None, True),
        ("session", True),
        ("users", True),
        ("reads", True, "lingocafe"),
        ("subscribers", True),
    ]
    assert "pull events: 3 rows" in result.output
    assert "pull auth: users=1/2 accounts=1/1" in result.output
    assert "query lingocafe books: books=2 pages=3 progress=1" in result.output
    assert "query session: rebuilt sessions=4" in result.output
    assert "query users growth: rebuilt rows=1" in result.output
    assert "query lingocafe reads: rebuilt books=5" in result.output
    assert "query lingocafe subscribers: rebuilt subscribers=22" in result.output
    assert "lingocafe totals: users=55 subscribers=22 weekly_active=36 monthly_active=40" in result.output
    assert "Reset: yes" in result.output


def test_update_does_not_reset_by_default(monkeypatch) -> None:
    calls: list[tuple[str, object]] = []

    monkeypatch.setattr(
        cli_module,
        "run_all_pulls",
        lambda **kwargs: calls.append(("pull", kwargs["reset"]))
        or {
            "auth": {"users_changed": 0, "users_total": 0, "accounts_changed": 0, "accounts_total": 0},
            "events": {"rows": 0, "message": "No new events to export."},
            "books": {"books_changed": 0, "books_total": 0, "pages_total": 0, "progress_changed": 0, "progress_total": 0},
        },
    )
    monkeypatch.setattr(
        cli_module,
        "load_book_stats",
        lambda **kwargs: calls.append(("books", kwargs.get("data_dir"), kwargs.get("reset"))) or SimpleNamespace(books=[], pages=[], progress_rows=0),
    )
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
        lambda archive_dir=None, app_id_filter=None, reset=False: calls.append(("reads", reset, app_id_filter))
        or SimpleNamespace(apps=[SimpleNamespace(total_books=0, cache_status="cached")]),
    )
    monkeypatch.setattr(
        cli_module,
        "load_lingocafe_subscribers",
        lambda archive_dir=None, reset=False: calls.append(("subscribers", reset))
        or SimpleNamespace(total_subscribers=0, cache_status="cached"),
    )

    result = runner.invoke(app, ["update"])

    assert result.exit_code == 0
    assert calls == [
        ("pull", False),
        ("books", None, False),
        ("session", False),
        ("users", False),
        ("reads", False, "lingocafe"),
        ("subscribers", False),
    ]
    assert "pull events: 0 rows" in result.output
    assert "Reset: no" in result.output
