from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from fortytwogo_cli import __version__
from fortytwogo_cli.backup.cli import backup, restore
from fortytwogo_cli.events.cli import events_app, query_app
from fortytwogo_cli.events.books import pull_book_stats
from fortytwogo_cli.events.paths import DEFAULT_ARCHIVE_DIR, resolve_paths
from fortytwogo_cli.events.pull import DEFAULT_LIMIT, PullOptions, pull_events
from fortytwogo_cli.events.reads import load_event_reads
from fortytwogo_cli.events.sessions import load_event_sessions
from fortytwogo_cli.events.users_growth import load_users_growth


app = typer.Typer(
    help="Local automation commands for 42Go projects.",
    invoke_without_command=True,
    no_args_is_help=False,
)
app.add_typer(events_app, name="events", help="Pull raw 42Go event archives.")
app.add_typer(query_app, name="query", help="Build local analytics aggregations from cached data.")
app.command(help="Create a data-only SQL backup.")(backup)
app.command(help="Restore a data-only SQL backup into a migrated database.")(restore)


@app.command(help="Pull new events and refresh all local query aggregations.")
def update(
    archive_dir: Annotated[
        Path | None,
        typer.Option(
            "--archive-dir",
            help=f"Local analytics archive root. Defaults to EVENTS_ANALYTICS_DIR or {DEFAULT_ARCHIVE_DIR}.",
        ),
    ] = None,
    limit: Annotated[
        int,
        typer.Option("--limit", min=1, help=f"Maximum event rows to pull in one run. Defaults to {DEFAULT_LIMIT}."),
    ] = DEFAULT_LIMIT,
    database_url_env: Annotated[
        str,
        typer.Option("--database-url-env", help="Environment variable or .env key for book/page metadata pull."),
    ] = "DATABASE_URL",
    reset: Annotated[
        bool,
        typer.Option("--reset", help="Force query aggregations to rebuild from local source data."),
    ] = False,
) -> None:
    """Run the standard local analytics refresh pipeline."""
    typer.echo("42Go Update")
    typer.echo("")

    try:
        pull_result = pull_events(PullOptions(archive_dir=archive_dir, limit=limit))
    except RuntimeError as error:
        typer.echo(f"events pull failed: {error}", err=True)
        raise typer.Exit(1) from error

    pull_message = pull_result.get("message")
    pull_rows = int(pull_result.get("rows", 0))
    if pull_message and pull_rows == 0:
        typer.echo(f"events pull: {pull_message}")
    else:
        typer.echo(f"events pull: {pull_rows} rows")

    try:
        book_result = pull_book_stats(database_url_env=database_url_env)
    except RuntimeError as error:
        typer.echo(f"query books stats failed: {error}", err=True)
        raise typer.Exit(1) from error
    typer.echo(f"query books stats: books={len(book_result.books)} pages={len(book_result.pages)}")

    try:
        session_result = load_event_sessions(archive_dir=archive_dir, reset=reset)
    except RuntimeError as error:
        typer.echo(f"query session failed: {error}", err=True)
        raise typer.Exit(1) from error
    if session_result is None:
        typer.echo(f"query session: no monthly Parquet files found under {resolve_paths(archive_dir).parquet_dir}")
    else:
        sessions_total = sum(app_result.total_sessions for app_result in session_result.apps)
        session_statuses = ",".join(sorted({app_result.cache_status for app_result in session_result.apps}))
        typer.echo(f"query session: {session_statuses or 'n/a'} sessions={sessions_total}")

    try:
        users_result = load_users_growth(archive_dir=archive_dir, reset=reset)
    except RuntimeError as error:
        typer.echo(f"query users growth failed: {error}", err=True)
        raise typer.Exit(1) from error
    if users_result is None:
        typer.echo(f"query users growth: no monthly Parquet files found under {resolve_paths(archive_dir).parquet_dir}")
    else:
        users_statuses = ",".join(sorted({app_result.cache_status for app_result in users_result.apps}))
        user_rows = sum(len(app_result.rows) for app_result in users_result.apps)
        typer.echo(f"query users growth: {users_statuses or 'n/a'} rows={user_rows}")

    try:
        reads_result = load_event_reads(archive_dir=archive_dir, reset=reset)
    except RuntimeError as error:
        typer.echo(f"query reads failed: {error}", err=True)
        raise typer.Exit(1) from error
    if reads_result is None:
        typer.echo(f"query reads: no monthly Parquet files found under {resolve_paths(archive_dir).parquet_dir}")
    else:
        reads_statuses = ",".join(sorted({app_result.cache_status for app_result in reads_result.apps}))
        books_total = sum(app_result.total_books for app_result in reads_result.apps)
        typer.echo(f"query reads: {reads_statuses or 'n/a'} books={books_total}")

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
