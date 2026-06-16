from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from fortytwogo_cli import __version__
from fortytwogo_cli.backup.cli import backup, restore
from fortytwogo_cli.events.books import load_book_stats
from fortytwogo_cli.events.cli import query_app
from fortytwogo_cli.events.paths import DEFAULT_DATA_DIR, resolve_paths
from fortytwogo_cli.events.pull import DEFAULT_LIMIT
from fortytwogo_cli.events.reads import load_event_reads
from fortytwogo_cli.events.sessions import load_event_sessions
from fortytwogo_cli.events.subscribers import load_lingocafe_subscribers
from fortytwogo_cli.events.users_growth import load_users_growth
from fortytwogo_cli.pull.cli import pull_app, run_all_pulls


app = typer.Typer(
    help="Local automation commands for 42Go projects.",
    invoke_without_command=True,
    no_args_is_help=False,
)
app.add_typer(pull_app, name="pull", help="Pull raw source data.")
app.add_typer(query_app, name="query", help="Build local analytics aggregations from cached data.")
app.command(help="Create a data-only SQL backup.")(backup)
app.command(help="Restore a data-only SQL backup into a migrated database.")(restore)


def _latest_lingocafe_growth_row(users_result: object | None) -> object | None:
    apps = getattr(users_result, "apps", []) if users_result is not None else []
    lingocafe_apps = [app_result for app_result in apps if getattr(app_result, "app_id", "") == "lingocafe"]
    if not lingocafe_apps:
        return None

    day_rows = [row for row in getattr(lingocafe_apps[0], "rows", []) if getattr(row, "granularity", "") == "day"]
    if not day_rows:
        return None

    return max(day_rows, key=lambda row: str(getattr(row, "bucket_start", "")))


def _format_lingocafe_totals(users_result: object | None, subscribers_result: object | None) -> str | None:
    row = _latest_lingocafe_growth_row(users_result)
    if row is None:
        return None

    subscribers = (
        getattr(subscribers_result, "total_subscribers")
        if subscribers_result is not None
        else getattr(row, "subscribed_users")
    )

    return (
        "lingocafe totals: "
        f"users={getattr(row, 'total_users')} "
        f"subscribers={subscribers} "
        f"weekly_active={getattr(row, 'weekly_active_users')} "
        f"monthly_active={getattr(row, 'monthly_active_users')}"
    )


@app.command(help="Pull raw data and refresh all local query aggregations.")
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
        typer.Option("--reset", help="Delete local raw Parquet files and aggregate caches before rebuilding."),
    ] = False,
) -> None:
    """Run the standard local analytics refresh pipeline."""
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

    try:
        book_result = load_book_stats(data_dir=data_dir, reset=reset)
    except RuntimeError as error:
        typer.echo(f"query lingocafe books failed: {error}", err=True)
        raise typer.Exit(1) from error
    typer.echo(f"query lingocafe books: books={len(book_result.books)} pages={len(book_result.pages)} progress={book_result.progress_rows}")

    try:
        session_result = load_event_sessions(archive_dir=data_dir, reset=reset)
    except RuntimeError as error:
        typer.echo(f"query session failed: {error}", err=True)
        raise typer.Exit(1) from error
    if session_result is None:
        typer.echo(f"query session: no monthly Parquet files found under {resolve_paths(data_dir).parquet_dir}")
    else:
        sessions_total = sum(app_result.total_sessions for app_result in session_result.apps)
        session_statuses = ",".join(sorted({app_result.cache_status for app_result in session_result.apps}))
        typer.echo(f"query session: {session_statuses or 'n/a'} sessions={sessions_total}")

    try:
        users_result = load_users_growth(archive_dir=data_dir, reset=reset)
    except RuntimeError as error:
        typer.echo(f"query users growth failed: {error}", err=True)
        raise typer.Exit(1) from error
    if users_result is None:
        typer.echo(f"query users growth: no monthly Parquet files found under {resolve_paths(data_dir).parquet_dir}")
    else:
        users_statuses = ",".join(sorted({app_result.cache_status for app_result in users_result.apps}))
        user_rows = sum(len(app_result.rows) for app_result in users_result.apps)
        typer.echo(f"query users growth: {users_statuses or 'n/a'} rows={user_rows}")

    try:
        reads_result = load_event_reads(archive_dir=data_dir, app_id_filter="lingocafe", reset=reset)
    except RuntimeError as error:
        typer.echo(f"query lingocafe reads failed: {error}", err=True)
        raise typer.Exit(1) from error
    if reads_result is None:
        typer.echo(f"query lingocafe reads: no monthly Parquet files found under {resolve_paths(data_dir).parquet_dir}")
    else:
        reads_statuses = ",".join(sorted({app_result.cache_status for app_result in reads_result.apps}))
        books_total = sum(app_result.total_books for app_result in reads_result.apps)
        typer.echo(f"query lingocafe reads: {reads_statuses or 'n/a'} books={books_total}")

    try:
        subscribers_result = load_lingocafe_subscribers(archive_dir=data_dir, reset=reset)
    except RuntimeError as error:
        typer.echo(f"query lingocafe subscribers failed: {error}", err=True)
        raise typer.Exit(1) from error
    if subscribers_result is None:
        typer.echo("query lingocafe subscribers: no auth users Parquet file found")
    else:
        typer.echo(
            "query lingocafe subscribers: "
            f"{subscribers_result.cache_status} subscribers={subscribers_result.total_subscribers}"
        )

    totals_line = _format_lingocafe_totals(users_result, subscribers_result)
    if totals_line:
        typer.echo(totals_line)

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
