from __future__ import annotations

from threading import Event
from pathlib import Path

from typer.testing import CliRunner

from fortytwogo_cli.backup import core
from fortytwogo_cli.backup.cli import format_restore_backup_table
from fortytwogo_cli import cli as cli_module
from fortytwogo_cli.cli import app
from fortytwogo_cli.email import cli as email_cli_module
from fortytwogo_cli.pull import cli as pull_cli_module
from fortytwogo_cli.query import cli as query_cli_module


runner = CliRunner()


def sample_pull_all_result() -> dict[str, object]:
    return {
        "auth": {
            "users_changed": 0,
            "users_total": 121,
            "users_parquet": ".local/42go-data/auth/users.parquet",
            "accounts_changed": 0,
            "accounts_total": 80,
            "accounts_parquet": ".local/42go-data/auth/accounts.parquet",
            "state": ".local/42go-data/auth/_state.json",
        },
        "events": {
            "rows": 6,
            "run_id": "run-20260616T115310Z",
            "last_created_at": "2026-06-16T11:53:04.332140Z",
            "last_id": "516569d3-3fad-400f-ace0-e94530b7ed84",
            "removed_legacy_files": [],
            "months": [
                {
                    "month": "202606",
                    "new_rows": 6,
                    "total_rows": 2702,
                    "parquet": ".local/42go-data/events/events_202606.parquet",
                },
                {
                    "month": "202605",
                    "new_rows": 0,
                    "total_rows": 42,
                    "parquet": ".local/42go-data/events/events_202605.parquet",
                }
            ],
        },
        "lingocafe": {
            "books_changed": 0,
            "books_total": 39,
            "books_parquet": ".local/42go-data/lingocafe/books.parquet",
            "pages_total": 1272,
            "pages_parquet": ".local/42go-data/lingocafe/books_pages.parquet",
            "progress_changed": 2,
            "progress_total": 109,
            "progress_parquet": ".local/42go-data/lingocafe/books_progress.parquet",
            "state": ".local/42go-data/lingocafe/_state.json",
        },
    }


def test_root_without_args_shows_help() -> None:
    result = runner.invoke(app, [])

    assert result.exit_code == 0
    assert "Local automation commands for 42Go projects." in result.output
    assert "backup" in result.output
    assert "restore" in result.output
    assert "pull" in result.output
    assert "peek" in result.output
    assert "update" in result.output
    assert "email" in result.output


def test_events_root_is_removed() -> None:
    result = runner.invoke(app, ["events", "--help"])

    assert result.exit_code != 0


def test_users_root_is_removed() -> None:
    result = runner.invoke(app, ["users", "--help"])

    assert result.exit_code != 0


def test_email_help_lists_lingocafe() -> None:
    result = runner.invoke(app, ["email", "--help"])

    assert result.exit_code == 0
    assert "lingocafe" in result.output


def test_email_lingocafe_help_lists_read_tip() -> None:
    result = runner.invoke(app, ["email", "lingocafe", "--help"])

    assert result.exit_code == 0
    assert "read-tip" in result.output


def test_email_lingocafe_read_tip_help_describes_safety_flags() -> None:
    result = runner.invoke(app, ["email", "lingocafe", "read-tip", "--help"])

    assert result.exit_code == 0
    assert "--dry" in result.output
    assert "--send" in result.output
    assert "--reset" in result.output
    assert "--max" in result.output
    assert "--skip-refresh" in result.output
    assert "--whitelist-path" in result.output


def test_email_lingocafe_read_tip_dispatches_skip_refresh(monkeypatch) -> None:
    class FakeResult:
        mode = "dry-run"
        whitelist_mode = "explicit"
        decisions = []
        sent_records = []
        sent_log_path = Path(".local/42go-data/lingocafe_daily_email/sent_emails.parquet")

    calls: list[str] = []

    def fake_run_read_tip(options):
        calls.append(f"send:{options.send}")
        return FakeResult()

    monkeypatch.setattr(email_cli_module, "run_read_tip", fake_run_read_tip)

    result = runner.invoke(app, ["email", "lingocafe", "read-tip", "--skip-refresh"])

    assert result.exit_code == 0
    assert calls == ["send:False"]
    assert "mode: dry-run" in result.output


def test_query_help_lists_commands() -> None:
    result = runner.invoke(app, ["query", "--help"])

    assert result.exit_code == 0
    assert "sessions" in result.output
    assert "users" in result.output
    assert "lingocafe" in result.output
    assert "all" in result.output


def test_query_sessions_help_describes_duration() -> None:
    result = runner.invoke(app, ["query", "sessions", "--help"])

    assert result.exit_code == 0
    assert "--duration" in result.output
    assert "--data-dir" in result.output
    assert "--query-dir" in result.output


def test_query_users_help_describes_active_session_thresholds() -> None:
    result = runner.invoke(app, ["query", "users", "--help"])

    assert result.exit_code == 0
    assert "--min-session-length" in result.output
    assert "--min-session-events" in result.output
    assert "--data-dir" in result.output
    assert "--query-dir" in result.output


def test_query_lingocafe_help_lists_subcommands() -> None:
    result = runner.invoke(app, ["query", "lingocafe", "--help"])

    assert result.exit_code == 0
    assert "users" in result.output
    assert "growth" in result.output
    assert "reads" in result.output
    assert "all" in result.output


def test_query_lingocafe_users_help_describes_output_root() -> None:
    result = runner.invoke(app, ["query", "lingocafe", "users", "--help"])

    assert result.exit_code == 0
    assert "--query-dir" in result.output


def test_query_lingocafe_growth_help_describes_data_roots() -> None:
    result = runner.invoke(app, ["query", "lingocafe", "growth", "--help"])

    assert result.exit_code == 0
    assert "--data-dir" in result.output
    assert "--query-dir" in result.output


def test_query_lingocafe_reads_help_describes_bps_and_data_roots() -> None:
    result = runner.invoke(app, ["query", "lingocafe", "reads", "--help"])

    assert result.exit_code == 0
    assert "--bps" in result.output
    assert "--data-dir" in result.output
    assert "--query-dir" in result.output


def test_query_lingocafe_all_help_describes_data_roots() -> None:
    result = runner.invoke(app, ["query", "lingocafe", "all", "--help"])

    assert result.exit_code == 0
    assert "--bps" in result.output
    assert "--data-dir" in result.output
    assert "--query-dir" in result.output


def test_query_without_target_prompts_and_runs_selection(monkeypatch) -> None:
    calls: list[tuple[str, Path | None, Path | None, int | None]] = []

    def fake_run_sessions_query(data_dir: Path | None, query_dir: Path | None, duration: int) -> dict[str, object]:
        calls.append(("sessions", data_dir, query_dir, duration))
        return {"sessions": 2}

    monkeypatch.setattr(query_cli_module, "run_sessions_query", fake_run_sessions_query)

    result = runner.invoke(app, ["query", "--duration", "9"], input="1\n")

    assert result.exit_code == 0
    assert calls == [("sessions", None, None, 9)]
    assert "Choose query target" in result.output
    assert '"sessions": 2' in result.output


def test_query_all_dispatches_sessions_then_users(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_sessions_query(data_dir: Path | None, query_dir: Path | None, duration: int) -> dict[str, object]:
        calls.append(f"sessions:{duration}")
        return {"sessions": 3}

    def fake_run_users_query(
        data_dir: Path | None,
        query_dir: Path | None,
        min_session_length: int,
        min_session_events: int,
    ) -> dict[str, object]:
        calls.append(f"users:{min_session_length}:{min_session_events}")
        return {"users": 2}

    def fake_run_lingocafe_users_query(query_dir: Path | None) -> dict[str, object]:
        calls.append("lingocafe-users")
        return {"users": 1}

    def fake_run_lingocafe_growth_query(data_dir: Path | None, query_dir: Path | None) -> dict[str, object]:
        calls.append("lingocafe-growth")
        return {"rows": 4}

    def fake_run_lingocafe_reads_query(data_dir: Path | None, query_dir: Path | None, bps: int) -> dict[str, object]:
        calls.append(f"lingocafe-reads:{bps}")
        return {"rows": 6}

    monkeypatch.setattr(query_cli_module, "run_sessions_query", fake_run_sessions_query)
    monkeypatch.setattr(query_cli_module, "run_users_query", fake_run_users_query)
    monkeypatch.setattr(query_cli_module, "run_lingocafe_users_query", fake_run_lingocafe_users_query)
    monkeypatch.setattr(query_cli_module, "run_lingocafe_growth_query", fake_run_lingocafe_growth_query)
    monkeypatch.setattr(query_cli_module, "run_lingocafe_reads_query", fake_run_lingocafe_reads_query)

    result = runner.invoke(
        app,
        [
            "query",
            "all",
            "--duration",
            "12",
            "--min-session-length",
            "75",
            "--min-session-events",
            "5",
            "--bps",
            "9000",
        ],
    )

    assert result.exit_code == 0
    assert calls == ["sessions:12", "users:75:5", "lingocafe-users", "lingocafe-growth", "lingocafe-reads:9000"]
    assert '"sessions": 3' in result.output
    assert '"users": 2' in result.output
    assert '"lingocafe"' in result.output


def test_query_lingocafe_without_target_prompts_and_runs_selection(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_lingocafe_users_query(query_dir: Path | None) -> dict[str, object]:
        calls.append("users")
        return {"users": 1}

    monkeypatch.setattr(query_cli_module, "run_lingocafe_users_query", fake_run_lingocafe_users_query)

    result = runner.invoke(app, ["query", "lingocafe"], input="1\n")

    assert result.exit_code == 0
    assert calls == ["users"]
    assert "Choose LingoCafe query target" in result.output
    assert '"users": 1' in result.output


def test_query_lingocafe_prompt_runs_growth_selection(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_lingocafe_growth_query(data_dir: Path | None, query_dir: Path | None) -> dict[str, object]:
        calls.append("growth")
        return {"rows": 5}

    monkeypatch.setattr(query_cli_module, "run_lingocafe_growth_query", fake_run_lingocafe_growth_query)

    result = runner.invoke(app, ["query", "lingocafe"], input="2\n")

    assert result.exit_code == 0
    assert calls == ["growth"]
    assert "Choose LingoCafe query target" in result.output
    assert '"rows": 5' in result.output


def test_query_lingocafe_prompt_runs_reads_selection(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_lingocafe_reads_query(data_dir: Path | None, query_dir: Path | None, bps: int) -> dict[str, object]:
        calls.append(f"reads:{bps}")
        return {"rows": 6}

    monkeypatch.setattr(query_cli_module, "run_lingocafe_reads_query", fake_run_lingocafe_reads_query)

    result = runner.invoke(app, ["query", "lingocafe", "--bps", "9001"], input="3\n")

    assert result.exit_code == 0
    assert calls == ["reads:9001"]
    assert "Choose LingoCafe query target" in result.output
    assert '"rows": 6' in result.output


def test_query_lingocafe_all_dispatches_users_then_growth_then_reads(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_lingocafe_users_query(query_dir: Path | None) -> dict[str, object]:
        calls.append("users")
        return {"users": 1}

    def fake_run_lingocafe_growth_query(data_dir: Path | None, query_dir: Path | None) -> dict[str, object]:
        calls.append("growth")
        return {"rows": 5}

    def fake_run_lingocafe_reads_query(data_dir: Path | None, query_dir: Path | None, bps: int) -> dict[str, object]:
        calls.append(f"reads:{bps}")
        return {"rows": 6}

    monkeypatch.setattr(query_cli_module, "run_lingocafe_users_query", fake_run_lingocafe_users_query)
    monkeypatch.setattr(query_cli_module, "run_lingocafe_growth_query", fake_run_lingocafe_growth_query)
    monkeypatch.setattr(query_cli_module, "run_lingocafe_reads_query", fake_run_lingocafe_reads_query)

    result = runner.invoke(app, ["query", "lingocafe", "all", "--bps", "9002"])

    assert result.exit_code == 0
    assert calls == ["users", "growth", "reads:9002"]
    assert '"users": 1' in result.output
    assert '"rows": 5' in result.output


def test_query_lingocafe_prompt_runs_all_selection(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_lingocafe_all_queries(data_dir: Path | None, query_dir: Path | None, bps: int) -> dict[str, object]:
        calls.append(f"all:{bps}")
        return {"users": {"users": 1}, "growth": {"rows": 5}, "reads": {"rows": 6}}

    monkeypatch.setattr(query_cli_module, "run_lingocafe_all_queries", fake_run_lingocafe_all_queries)

    result = runner.invoke(app, ["query", "lingocafe", "--bps", "9003"], input="4\n")

    assert result.exit_code == 0
    assert calls == ["all:9003"]
    assert "Choose LingoCafe query target" in result.output
    assert '"growth"' in result.output


def test_pull_help_lists_commands() -> None:
    result = runner.invoke(app, ["pull", "--help"])

    assert result.exit_code == 0
    assert "auth" in result.output
    assert "events" in result.output
    assert "lingocafe" in result.output
    assert "all" in result.output


def test_pull_books_command_is_removed() -> None:
    result = runner.invoke(app, ["pull", "books", "--help"])

    assert result.exit_code != 0


def test_pull_lingocafe_dispatches_book_pull(monkeypatch) -> None:
    calls: list[tuple[Path | None, int, str, bool, bool]] = []

    def fake_run_books_pull(
        data_dir: Path | None,
        limit: int,
        database_url_env: str,
        reset: bool,
        dry_run: bool,
    ) -> dict[str, int]:
        calls.append((data_dir, limit, database_url_env, reset, dry_run))
        return {"books_changed": 1, "books_total": 2}

    monkeypatch.setattr(pull_cli_module, "run_books_pull", fake_run_books_pull)

    result = runner.invoke(app, ["pull", "lingocafe", "--limit", "9", "--database-url-env", "DB_URL", "--reset", "--dry-run"])

    assert result.exit_code == 0
    assert calls == [(None, 9, "DB_URL", True, True)]
    assert '"books_changed": 1' in result.output


def test_pull_without_target_prompts_and_runs_selection(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_all_pulls(*args, **kwargs):
        calls.append("all")
        return sample_pull_all_result()

    monkeypatch.setattr(pull_cli_module, "run_all_pulls", fake_run_all_pulls)

    result = runner.invoke(app, ["pull"], input="4\n")

    assert result.exit_code == 0
    assert calls == ["all"]
    assert "Choose pull target" in result.output
    assert "42Go Pull All" in result.output
    assert "  users" in result.output


def test_pull_star_alias_runs_all(monkeypatch) -> None:
    calls: list[str] = []

    def fake_run_all_pulls(*args, **kwargs):
        calls.append("all")
        return sample_pull_all_result()

    monkeypatch.setattr(pull_cli_module, "run_all_pulls", fake_run_all_pulls)

    result = runner.invoke(app, ["pull", "*"])

    assert result.exit_code == 0
    assert calls == ["all"]
    assert "books_progress" in result.output


def test_pull_all_formats_source_table_blocks(monkeypatch) -> None:
    monkeypatch.setattr(pull_cli_module, "run_all_pulls", lambda *args, **kwargs: sample_pull_all_result())

    result = runner.invoke(app, ["pull", "all"])

    assert result.exit_code == 0
    assert "42Go Pull All" in result.output
    assert "auth" in result.output
    assert "  users" in result.output
    assert "changed: 0 | total: 121" in result.output
    assert "  accounts" in result.output
    assert "events" in result.output
    assert "  events" in result.output
    assert "events_202606" in result.output
    assert "events_202605" not in result.output
    assert "lingocafe" in result.output
    assert "  books" in result.output
    assert "books_pages" in result.output
    assert "total: 1272" in result.output
    assert "books_progress" in result.output
    assert "changed: 2 | total: 109" in result.output
    assert "_state" not in result.output
    assert "parquet:" not in result.output
    assert ".local/42go-data" not in result.output
    assert '"auth"' not in result.output


def test_run_all_pulls_runs_auth_before_parallel_dependent_targets(monkeypatch) -> None:
    auth_completed = Event()
    events_started = Event()
    lingocafe_started = Event()

    def fake_auth_pull(*args, **kwargs):
        auth_completed.set()
        return {"users_changed": 1}

    def fake_events_pull(*args, **kwargs):
        assert auth_completed.is_set()
        events_started.set()
        return {"saw_parallel": lingocafe_started.wait(1)}

    def fake_books_pull(*args, **kwargs):
        assert auth_completed.is_set()
        lingocafe_started.set()
        return {"saw_parallel": events_started.wait(1)}

    monkeypatch.setattr(pull_cli_module, "run_auth_pull", fake_auth_pull)
    monkeypatch.setattr(pull_cli_module, "run_events_pull", fake_events_pull)
    monkeypatch.setattr(pull_cli_module, "run_books_pull", fake_books_pull)

    result = pull_cli_module.run_all_pulls(data_dir=None, limit=10, database_url_env="DB_URL", reset=False, dry_run=False)

    assert result == {
        "auth": {"users_changed": 1},
        "events": {"saw_parallel": True},
        "lingocafe": {"saw_parallel": True},
    }


def test_run_all_pulls_reports_target_failures(monkeypatch) -> None:
    monkeypatch.setattr(pull_cli_module, "run_auth_pull", lambda *args, **kwargs: {"users_changed": 0})
    monkeypatch.setattr(pull_cli_module, "run_events_pull", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("database down")))
    monkeypatch.setattr(pull_cli_module, "run_books_pull", lambda *args, **kwargs: {"books_changed": 0})

    try:
        pull_cli_module.run_all_pulls(data_dir=None, limit=10, database_url_env="DB_URL", reset=False, dry_run=False)
    except RuntimeError as error:
        assert "events: database down" in str(error)
    else:
        raise AssertionError("run_all_pulls should raise when a target fails.")


def test_update_help_describes_options() -> None:
    result = runner.invoke(app, ["update", "--help"])

    assert result.exit_code == 0
    assert "--reset" in result.output
    assert "--data-dir" in result.output
    assert "--query-dir" in result.output
    assert "--database-url-env" in result.output
    assert "--duration" in result.output
    assert "--min-session-length" in result.output
    assert "--min-session-events" in result.output
    assert "--bps" in result.output


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


def sample_query_all_result() -> dict[str, object]:
    return {
        "sessions": {"sessions": 11, "events": 22},
        "users": {"users": 33, "sessions": 11},
        "lingocafe": {
            "users": {"users": 44},
            "growth": {"rows": 55},
            "reads": {"rows": 66},
        },
    }


def test_update_runs_pull_all_then_query_all(monkeypatch, tmp_path: Path) -> None:
    calls: list[str] = []

    def fake_run_all_pulls(**kwargs):
        calls.append("pull")
        return {
            "auth": {"users_changed": 1, "users_total": 2, "accounts_changed": 3, "accounts_total": 4},
            "events": {"rows": 5},
            "lingocafe": {"books_changed": 6, "books_total": 7, "pages_total": 8, "progress_changed": 9, "progress_total": 10},
        }

    def fake_run_all_queries(**kwargs):
        calls.append("query")
        assert kwargs["data_dir"] == tmp_path / "data"
        assert kwargs["query_dir"] == tmp_path / "query"
        return sample_query_all_result()

    monkeypatch.setattr(cli_module, "run_all_pulls", fake_run_all_pulls)
    monkeypatch.setattr(cli_module, "run_all_queries", fake_run_all_queries)

    result = runner.invoke(app, ["update", "--data-dir", str(tmp_path / "data"), "--query-dir", str(tmp_path / "query")])

    assert result.exit_code == 0
    assert calls == ["pull", "query"]
    assert "pull auth: users=1/2 accounts=3/4" in result.output
    assert "pull events: 5 rows" in result.output
    assert "pull lingocafe: books=6/7 pages=8 progress=9/10" in result.output
    assert "query sessions: 11 sessions from 22 events" in result.output
    assert "query users: 33 users from 11 sessions" in result.output
    assert "query lingocafe: users=44 growth_rows=55 reads_rows=66" in result.output


def test_update_stops_when_pull_all_fails(monkeypatch, tmp_path: Path) -> None:
    calls: list[str] = []

    def fake_run_all_pulls(**kwargs):
        calls.append("pull")
        raise RuntimeError("auth export failed")

    monkeypatch.setattr(cli_module, "run_all_pulls", fake_run_all_pulls)
    monkeypatch.setattr(cli_module, "run_all_queries", lambda **kwargs: calls.append("query") or sample_query_all_result())

    result = runner.invoke(app, ["update", "--data-dir", str(tmp_path / "data")])

    assert result.exit_code == 1
    assert calls == ["pull"]
    assert "pull failed: auth export failed" in result.output


def test_update_stops_when_query_all_fails_after_pull(monkeypatch, tmp_path: Path) -> None:
    calls: list[str] = []

    def fake_run_all_pulls(**kwargs):
        calls.append("pull")
        return sample_pull_all_result()

    def fake_run_all_queries(**kwargs):
        calls.append("query")
        raise RuntimeError("sessions missing")

    monkeypatch.setattr(cli_module, "run_all_pulls", fake_run_all_pulls)
    monkeypatch.setattr(cli_module, "run_all_queries", fake_run_all_queries)

    result = runner.invoke(app, ["update", "--data-dir", str(tmp_path / "data")])

    assert result.exit_code == 1
    assert calls == ["pull", "query"]
    assert "pull events: 6 rows" in result.output
    assert "query failed: sessions missing" in result.output


def test_update_passes_reset_to_pull_all(monkeypatch) -> None:
    calls: list[tuple[str, object]] = []

    def fake_run_all_pulls(**kwargs) -> dict[str, object]:
        calls.append(("pull", kwargs["reset"]))
        return {
            "auth": {"users_changed": 1, "users_total": 2, "accounts_changed": 1, "accounts_total": 1},
            "events": {"rows": 3},
            "lingocafe": {"books_changed": 2, "books_total": 2, "pages_total": 3, "progress_changed": 1, "progress_total": 1},
        }

    monkeypatch.setattr(cli_module, "run_all_pulls", fake_run_all_pulls)
    monkeypatch.setattr(cli_module, "run_all_queries", lambda **kwargs: sample_query_all_result())

    result = runner.invoke(app, ["update", "--reset", "--limit", "7", "--database-url-env", "BACKUP_DATABASE_URL"])

    assert result.exit_code == 0
    assert calls == [("pull", True)]
    assert "pull events: 3 rows" in result.output
    assert "pull auth: users=1/2 accounts=1/1" in result.output
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
            "lingocafe": {"books_changed": 0, "books_total": 0, "pages_total": 0, "progress_changed": 0, "progress_total": 0},
        },
    )
    monkeypatch.setattr(cli_module, "run_all_queries", lambda **kwargs: sample_query_all_result())

    result = runner.invoke(app, ["update"])

    assert result.exit_code == 0
    assert calls == [("pull", False)]
    assert "pull events: 0 rows" in result.output
    assert "Reset: no" in result.output


def test_update_passes_query_options_to_query_all(monkeypatch, tmp_path: Path) -> None:
    calls: list[dict[str, object]] = []

    monkeypatch.setattr(cli_module, "run_all_pulls", lambda **kwargs: sample_pull_all_result())

    def fake_run_all_queries(**kwargs):
        calls.append(kwargs)
        return sample_query_all_result()

    monkeypatch.setattr(cli_module, "run_all_queries", fake_run_all_queries)

    result = runner.invoke(
        app,
        [
            "update",
            "--data-dir",
            str(tmp_path / "data"),
            "--query-dir",
            str(tmp_path / "query"),
            "--duration",
            "12",
            "--min-session-length",
            "75",
            "--min-session-events",
            "5",
            "--bps",
            "9000",
        ],
    )

    assert result.exit_code == 0
    assert calls == [
        {
            "data_dir": tmp_path / "data",
            "query_dir": tmp_path / "query",
            "duration": 12,
            "min_session_length": 75,
            "min_session_events": 5,
            "bps": 9000,
        }
    ]
