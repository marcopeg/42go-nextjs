from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Any

import typer

from fortytwogo_cli.events.books import DEFAULT_LIMIT as DEFAULT_BOOK_LIMIT
from fortytwogo_cli.events.books import PullBooksOptions, pull_books
from fortytwogo_cli.events.paths import DEFAULT_DATA_DIR
from fortytwogo_cli.events.pull import DEFAULT_LIMIT as DEFAULT_EVENT_LIMIT
from fortytwogo_cli.events.pull import PullOptions, pull_events
from fortytwogo_cli.users.pull import DEFAULT_LIMIT as DEFAULT_AUTH_LIMIT
from fortytwogo_cli.users.pull import PullUsersOptions, pull_users

pull_app = typer.Typer(
    help="Pull raw source data into local Parquet files.",
    invoke_without_command=True,
    no_args_is_help=False,
)


def print_json(result: dict[str, Any]) -> None:
    typer.echo(json.dumps(result, indent=2, sort_keys=True))


def run_auth_pull(data_dir: Path | None, limit: int, database_url_env: str, reset: bool, dry_run: bool) -> dict[str, Any]:
    return pull_users(
        PullUsersOptions(
            data_dir=data_dir,
            limit=limit,
            database_url_env=database_url_env,
            reset=reset,
            dry_run=dry_run,
        )
    )


def run_events_pull(data_dir: Path | None, limit: int, reset: bool, dry_run: bool) -> dict[str, Any]:
    return pull_events(PullOptions(data_dir=data_dir, limit=limit, reset=reset, dry_run=dry_run))


def run_books_pull(data_dir: Path | None, limit: int, database_url_env: str, reset: bool, dry_run: bool) -> dict[str, Any]:
    return pull_books(
        PullBooksOptions(
            data_dir=data_dir,
            limit=limit,
            database_url_env=database_url_env,
            reset=reset,
            dry_run=dry_run,
        )
    )


def run_all_pulls(data_dir: Path | None, limit: int, database_url_env: str, reset: bool, dry_run: bool) -> dict[str, Any]:
    return {
        "auth": run_auth_pull(data_dir, limit, database_url_env, reset, dry_run),
        "events": run_events_pull(data_dir, limit, reset, dry_run),
        "books": run_books_pull(data_dir, limit, database_url_env, reset, dry_run),
    }


def handle_pull_error(label: str, error: RuntimeError) -> None:
    typer.echo(f"pull {label} failed: {error}", err=True)
    raise typer.Exit(1) from error


@pull_app.callback()
def pull_root(
    ctx: typer.Context,
    data_dir: Annotated[
        Path | None,
        typer.Option(
            "--data-dir",
            help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}.",
        ),
    ] = None,
    limit: Annotated[
        int,
        typer.Option("--limit", min=1, help=f"Maximum rows per progressive source query. Defaults to {DEFAULT_EVENT_LIMIT}."),
    ] = DEFAULT_EVENT_LIMIT,
    database_url_env: Annotated[
        str,
        typer.Option("--database-url-env", help="Environment variable or .env key for auth and book pulls. Defaults to BACKUP_DATABASE_URL."),
    ] = "BACKUP_DATABASE_URL",
    reset: Annotated[
        bool,
        typer.Option("--reset", help="Delete local raw Parquet files for the selected pull target before pulling."),
    ] = False,
    dry_run: Annotated[
        bool,
        typer.Option("--dry-run", help="Report changed rows without writing files or advancing state."),
    ] = False,
) -> None:
    """Prompt for a pull target when no subcommand is provided."""
    if ctx.invoked_subcommand is not None:
        return

    typer.echo("Choose pull target:")
    typer.echo("1. auth")
    typer.echo("2. events")
    typer.echo("3. books")
    typer.echo("4. all")
    choice = typer.prompt("Selection", type=int)
    try:
        if choice == 1:
            print_json(run_auth_pull(data_dir, limit, database_url_env, reset, dry_run))
        elif choice == 2:
            print_json(run_events_pull(data_dir, limit, reset, dry_run))
        elif choice == 3:
            print_json(run_books_pull(data_dir, limit, database_url_env, reset, dry_run))
        elif choice == 4:
            print_json(run_all_pulls(data_dir, limit, database_url_env, reset, dry_run))
        else:
            typer.echo("Selection must be 1, 2, 3, or 4.", err=True)
            raise typer.Exit(1)
    except RuntimeError as error:
        handle_pull_error("selected target", error)
    raise typer.Exit()


@pull_app.command(help="Pull auth.users and auth.accounts into local Parquet files.")
def auth(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    limit: Annotated[int, typer.Option("--limit", min=1, help=f"Maximum rows per table. Defaults to {DEFAULT_AUTH_LIMIT}.")] = DEFAULT_AUTH_LIMIT,
    database_url_env: Annotated[
        str,
        typer.Option("--database-url-env", help="Environment variable or .env key containing the PostgreSQL connection URL. Defaults to BACKUP_DATABASE_URL."),
    ] = "BACKUP_DATABASE_URL",
    reset: Annotated[bool, typer.Option("--reset", help="Delete local auth Parquet files before pulling.")] = False,
    dry_run: Annotated[bool, typer.Option("--dry-run", help="Report changed rows without writing files or advancing state.")] = False,
) -> None:
    try:
        print_json(run_auth_pull(data_dir, limit, database_url_env, reset, dry_run))
    except RuntimeError as error:
        handle_pull_error("auth", error)


@pull_app.command(help="Pull events.events into local monthly Parquet files.")
def events(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    limit: Annotated[int, typer.Option("--limit", min=1, help=f"Maximum event rows. Defaults to {DEFAULT_EVENT_LIMIT}.")] = DEFAULT_EVENT_LIMIT,
    reset: Annotated[bool, typer.Option("--reset", help="Delete local event Parquet files before pulling.")] = False,
    dry_run: Annotated[bool, typer.Option("--dry-run", help="Report changed rows without writing files or advancing state.")] = False,
) -> None:
    try:
        result = run_events_pull(data_dir, limit, reset, dry_run)
    except RuntimeError as error:
        handle_pull_error("events", error)
    message = result.get("message")
    if message and result.get("rows") == 0:
        typer.echo(message)
        return
    print_json(result)


@pull_app.command(help="Pull LingoCafe books, pages, and progress into local Parquet files.")
def books(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    limit: Annotated[int, typer.Option("--limit", min=1, help=f"Maximum rows per progressive table. Defaults to {DEFAULT_BOOK_LIMIT}.")] = DEFAULT_BOOK_LIMIT,
    database_url_env: Annotated[
        str,
        typer.Option("--database-url-env", help="Environment variable or .env key containing the PostgreSQL connection URL. Defaults to BACKUP_DATABASE_URL."),
    ] = "BACKUP_DATABASE_URL",
    reset: Annotated[bool, typer.Option("--reset", help="Delete local book Parquet files before pulling.")] = False,
    dry_run: Annotated[bool, typer.Option("--dry-run", help="Report changed rows without writing files or advancing state.")] = False,
) -> None:
    try:
        print_json(run_books_pull(data_dir, limit, database_url_env, reset, dry_run))
    except RuntimeError as error:
        handle_pull_error("books", error)


@pull_app.command(name="all", help="Pull all raw data sources.")
def all_data(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    limit: Annotated[int, typer.Option("--limit", min=1, help=f"Maximum rows per progressive query. Defaults to {DEFAULT_EVENT_LIMIT}.")] = DEFAULT_EVENT_LIMIT,
    database_url_env: Annotated[
        str,
        typer.Option("--database-url-env", help="Environment variable or .env key for auth and book pulls. Defaults to BACKUP_DATABASE_URL."),
    ] = "BACKUP_DATABASE_URL",
    reset: Annotated[bool, typer.Option("--reset", help="Delete local raw Parquet files before pulling.")] = False,
    dry_run: Annotated[bool, typer.Option("--dry-run", help="Report changed rows without writing files or advancing state.")] = False,
) -> None:
    try:
        print_json(run_all_pulls(data_dir, limit, database_url_env, reset, dry_run))
    except RuntimeError as error:
        handle_pull_error("all", error)


@pull_app.command(name="*", hidden=True)
def star(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    limit: Annotated[int, typer.Option("--limit", min=1, help=f"Maximum rows per progressive query. Defaults to {DEFAULT_EVENT_LIMIT}.")] = DEFAULT_EVENT_LIMIT,
    database_url_env: Annotated[
        str,
        typer.Option("--database-url-env", help="Environment variable or .env key for auth and book pulls. Defaults to BACKUP_DATABASE_URL."),
    ] = "BACKUP_DATABASE_URL",
    reset: Annotated[bool, typer.Option("--reset", help="Delete local raw Parquet files before pulling.")] = False,
    dry_run: Annotated[bool, typer.Option("--dry-run", help="Report changed rows without writing files or advancing state.")] = False,
) -> None:
    all_data(data_dir=data_dir, limit=limit, database_url_env=database_url_env, reset=reset, dry_run=dry_run)
