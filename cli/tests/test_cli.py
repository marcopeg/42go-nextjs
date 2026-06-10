from __future__ import annotations

from typer.testing import CliRunner

from fortytwogo_cli.cli import app


runner = CliRunner()


def test_root_without_args_shows_help() -> None:
    result = runner.invoke(app, [])

    assert result.exit_code == 0
    assert "Local automation commands for 42Go projects." in result.output
    assert "events" in result.output


def test_events_help_lists_commands() -> None:
    result = runner.invoke(app, ["events", "--help"])

    assert result.exit_code == 0
    assert "pull" in result.output
    assert "query" in result.output


def test_stats_help_describes_archive_dir() -> None:
    result = runner.invoke(app, ["events", "query", "stats", "--help"])

    assert result.exit_code == 0
    assert "--archive-dir" in result.output


def test_users_growth_help_describes_options() -> None:
    result = runner.invoke(app, ["events", "query", "users", "growth", "--help"])

    assert result.exit_code == 0
    assert "--reset" in result.output
    assert "--app" in result.output
    assert "--format" in result.output
