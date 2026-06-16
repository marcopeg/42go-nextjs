from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from fortytwogo_cli import __version__
from fortytwogo_cli.backup.cli import backup, restore
from fortytwogo_cli.events.paths import DEFAULT_DATA_DIR
from fortytwogo_cli.events.pull import DEFAULT_LIMIT
from fortytwogo_cli.peek import peek
from fortytwogo_cli.pull.cli import pull_app, run_all_pulls


app = typer.Typer(
    help="Local automation commands for 42Go projects.",
    invoke_without_command=True,
    no_args_is_help=False,
)
app.add_typer(pull_app, name="pull", help="Pull raw source data.")
app.command(help="Create a data-only SQL backup.")(backup)
app.command(help="Restore a data-only SQL backup into a migrated database.")(restore)
app.command(
    help="Stream local raw Parquet data through a pager.",
    context_settings={"allow_extra_args": True, "ignore_unknown_options": True},
)(peek)


@app.command(help="Pull all raw source data.")
def update(
    data_dir: Annotated[
        Path | None,
        typer.Option(
            "--data-dir",
            help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}.",
        ),
    ] = None,
    limit: Annotated[
        int,
        typer.Option("--limit", min=1, help=f"Maximum event rows to pull in one run. Defaults to {DEFAULT_LIMIT}."),
    ] = DEFAULT_LIMIT,
    database_url_env: Annotated[
        str,
        typer.Option("--database-url-env", help="Environment variable or .env key for auth and LingoCafe metadata pulls. Defaults to BACKUP_DATABASE_URL."),
    ] = "BACKUP_DATABASE_URL",
    reset: Annotated[
        bool,
        typer.Option("--reset", help="Delete local raw Parquet files before rebuilding."),
    ] = False,
) -> None:
    """Run the standard local raw-data refresh pipeline."""
    typer.echo("42Go Update")
    typer.echo("")

    try:
        pull_result = run_all_pulls(data_dir=data_dir, limit=limit, database_url_env=database_url_env, reset=reset, dry_run=False)
    except RuntimeError as error:
        typer.echo(f"pull failed: {error}", err=True)
        raise typer.Exit(1) from error
    auth_result = pull_result["auth"]
    events_result = pull_result["events"]
    lingocafe_pull_result = pull_result["lingocafe"]
    typer.echo(
        "pull auth: "
        f"users={auth_result.get('users_changed', 0)}/{auth_result.get('users_total', 0)} "
        f"accounts={auth_result.get('accounts_changed', 0)}/{auth_result.get('accounts_total', 0)}"
    )
    typer.echo(f"pull events: {events_result.get('rows', 0)} rows")
    typer.echo(
        "pull lingocafe: "
        f"books={lingocafe_pull_result.get('books_changed', 0)}/{lingocafe_pull_result.get('books_total', 0)} "
        f"pages={lingocafe_pull_result.get('pages_total', 0)} "
        f"progress={lingocafe_pull_result.get('progress_changed', 0)}/{lingocafe_pull_result.get('progress_total', 0)}"
    )

    typer.echo("")
    typer.echo(f"Reset: {'yes' if reset else 'no'}")


def version_callback(value: bool) -> None:
    if value:
        typer.echo(f"42go {__version__}")
        raise typer.Exit()


@app.callback()
def root(
    ctx: typer.Context,
    version: bool = typer.Option(
        False,
        "--version",
        callback=version_callback,
        is_eager=True,
        help="Show the installed 42Go CLI version.",
    ),
) -> None:
    """Use --help on any command or subcommand to discover its options."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit()


def main() -> None:
    app()
