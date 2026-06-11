from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated

import typer

from fortytwogo_cli.users.paths import DEFAULT_STATS_DIR
from fortytwogo_cli.users.pull import DEFAULT_LIMIT, PullUsersOptions, pull_users

users_app = typer.Typer(
    help="Pull auth users and linked accounts into local Parquet files.",
    invoke_without_command=True,
    no_args_is_help=False,
)


@users_app.callback()
def users_root(ctx: typer.Context) -> None:
    """Use --help on any users subcommand to inspect options and defaults."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit()


@users_app.command(help="Refresh auth.users and auth.accounts local Parquet files.")
def pull(
    stats_dir: Annotated[
        Path | None,
        typer.Option(
            "--stats-dir",
            help=f"Local stats root. Defaults to FORTYTWOGO_STATS_DIR or {DEFAULT_STATS_DIR}.",
        ),
    ] = None,
    limit: Annotated[
        int,
        typer.Option("--limit", min=1, help=f"Maximum rows per table to fetch in one run. Defaults to {DEFAULT_LIMIT}."),
    ] = DEFAULT_LIMIT,
    database_url_env: Annotated[
        str,
        typer.Option("--database-url-env", help="Environment variable or .env key containing the PostgreSQL connection URL."),
    ] = "DATABASE_URL",
    reset: Annotated[
        bool,
        typer.Option("--reset", help="Rebuild auth user/account Parquet files from source tables."),
    ] = False,
    dry_run: Annotated[
        bool,
        typer.Option("--dry-run", help="Fetch and report changed rows without writing files or advancing state."),
    ] = False,
) -> None:
    try:
        result = pull_users(
            PullUsersOptions(
                stats_dir=stats_dir,
                limit=limit,
                database_url_env=database_url_env,
                reset=reset,
                dry_run=dry_run,
            )
        )
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error

    typer.echo(json.dumps(result, indent=2, sort_keys=True))
