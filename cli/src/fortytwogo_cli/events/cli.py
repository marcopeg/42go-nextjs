from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated

import typer

from fortytwogo_cli.events.books import (
    DEFAULT_BOOK_STATS_APP_ID,
    book_stats_to_dict,
    format_book_stats,
    pull_book_stats,
)
from fortytwogo_cli.events.paths import DEFAULT_ARCHIVE_DIR, resolve_paths
from fortytwogo_cli.events.pull import DEFAULT_LIMIT, PullOptions, pull_events
from fortytwogo_cli.events.query import format_stats, load_event_stats, no_events_message
from fortytwogo_cli.events.reads import (
    DEFAULT_COMPLETION_THRESHOLD_BPS,
    DEFAULT_READS_LIMIT,
    event_reads_to_dict,
    format_event_reads,
    load_event_reads,
    no_event_reads_message,
)
from fortytwogo_cli.events.sessions import (
    DEFAULT_SESSION_LIMIT,
    event_sessions_to_dict,
    format_event_sessions,
    load_event_sessions,
    no_event_sessions_message,
)
from fortytwogo_cli.events.users_growth import (
    format_users_growth,
    load_users_growth,
    no_users_growth_message,
    parse_app_filter,
    users_growth_to_dict,
)


events_app = typer.Typer(
    help="Pull production events into a local archive.",
    invoke_without_command=True,
    no_args_is_help=False,
)
query_app = typer.Typer(
    help="Build local analytics aggregations from cached Parquet data.",
    invoke_without_command=True,
    no_args_is_help=False,
)
stats_app = typer.Typer(
    help="Print event archive and product statistics from local monthly Parquet files.",
    invoke_without_command=True,
    no_args_is_help=False,
)
query_users_app = typer.Typer(
    help="Print user-related statistics from local monthly Parquet files.",
    invoke_without_command=True,
    no_args_is_help=False,
)
query_books_app = typer.Typer(
    help="Pull and inspect book-related local analytics facts.",
    invoke_without_command=True,
    no_args_is_help=False,
)
query_app.add_typer(stats_app, name="stats", help="Print event archive and product statistics.")
query_app.add_typer(query_users_app, name="users", help="Print user-related statistics.")
query_app.add_typer(query_books_app, name="books", help="Pull and inspect book-related local analytics facts.")


@events_app.callback()
def events_root(ctx: typer.Context) -> None:
    """Use --help on any events subcommand to inspect options and defaults."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit()


@events_app.command(help="Download new events.events rows into monthly CSV and Parquet files.")
def pull(
    archive_dir: Annotated[
        Path | None,
        typer.Option(
            "--archive-dir",
            help=f"Local analytics archive root. Defaults to EVENTS_ANALYTICS_DIR or {DEFAULT_ARCHIVE_DIR}.",
        ),
    ] = None,
    limit: Annotated[
        int,
        typer.Option("--limit", min=1, help=f"Maximum rows to export in one run. Defaults to {DEFAULT_LIMIT}."),
    ] = DEFAULT_LIMIT,
    run_id: Annotated[
        str | None,
        typer.Option(
            "--run-id",
            help="Optional manifest run ID. Defaults to run-<UTC timestamp>; incomplete reruns reuse inflight run ID.",
        ),
    ] = None,
    dry_run: Annotated[
        bool,
        typer.Option("--dry-run", help="Fetch and report the next rows without writing files or advancing state."),
    ] = False,
) -> None:
    try:
        result = pull_events(PullOptions(archive_dir=archive_dir, limit=limit, run_id=run_id, dry_run=dry_run))
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error

    message = result.pop("message", None)
    if message and result.get("rows") == 0 and not result.get("removed_legacy_files"):
        typer.echo(message)
        return
    typer.echo(json.dumps(result, indent=2, sort_keys=True))


@query_app.callback()
def query_root(ctx: typer.Context) -> None:
    """Use --help on any query subcommand to inspect options and output."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit()


@stats_app.callback()
def stats_root(
    ctx: typer.Context,
    archive_dir: Annotated[
        Path | None,
        typer.Option(
            "--archive-dir",
            help=f"Local analytics archive root. Defaults to EVENTS_ANALYTICS_DIR or {DEFAULT_ARCHIVE_DIR}.",
        ),
    ] = None,
) -> None:
    """Print high-level archive stats when no nested stats command is invoked."""
    if ctx.invoked_subcommand is not None:
        return
    try:
        result = load_event_stats(archive_dir)
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error

    if result is None:
        typer.echo(no_events_message(resolve_paths(archive_dir)))
        return
    typer.echo(format_stats(result))


@query_users_app.callback()
def query_users_root(ctx: typer.Context) -> None:
    """Use --help on user stats subcommands to inspect options and output."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit()


@query_books_app.callback()
def query_books_root(ctx: typer.Context) -> None:
    """Use --help on book stats subcommands to inspect options and output."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit()


@query_books_app.command(help="Pull LingoCafe book and page facts into local Parquet files for analytics joins.")
def stats(
    app_id: Annotated[
        str,
        typer.Option("--app-id", help="App ID folder to store book stats under."),
    ] = DEFAULT_BOOK_STATS_APP_ID,
    database_url_env: Annotated[
        str,
        typer.Option("--database-url-env", help="Environment variable or .env key containing the PostgreSQL connection URL."),
    ] = "DATABASE_URL",
    output_format: Annotated[
        str,
        typer.Option("--format", help="Output format: text or json."),
    ] = "text",
) -> None:
    if output_format not in {"text", "json"}:
        typer.echo("--format must be one of: text, json", err=True)
        raise typer.Exit(1)
    try:
        result = pull_book_stats(app_id=app_id, database_url_env=database_url_env)
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error
    if output_format == "json":
        typer.echo(json.dumps(book_stats_to_dict(result), indent=2, sort_keys=True))
        return
    typer.echo(format_book_stats(result))


@query_users_app.command(help="Compute user growth, subscriptions, active users, and inactive users over time.")
def growth(
    archive_dir: Annotated[
        Path | None,
        typer.Option(
            "--archive-dir",
            help=f"Local analytics archive root. Defaults to EVENTS_ANALYTICS_DIR or {DEFAULT_ARCHIVE_DIR}.",
        ),
    ] = None,
    app: Annotated[
        str | None,
        typer.Option(
            "--app",
            help="Comma-separated app IDs to show in terminal output, for example: --app lingocafe,default.",
        ),
    ] = None,
    reset: Annotated[
        bool,
        typer.Option("--reset", help="Remove users-growth aggregate caches and recompute from all local Parquet data."),
    ] = False,
    output_format: Annotated[
        str,
        typer.Option("--format", help="Output format: text or json."),
    ] = "text",
) -> None:
    if output_format not in {"text", "json"}:
        typer.echo("--format must be one of: text, json", err=True)
        raise typer.Exit(1)

    try:
        result = load_users_growth(
            archive_dir=archive_dir,
            app_filter=parse_app_filter(app),
            reset=reset,
        )
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error

    if result is None:
        typer.echo(no_users_growth_message(archive_dir))
        return

    if output_format == "json":
        typer.echo(json.dumps(users_growth_to_dict(result), indent=2, sort_keys=True))
        return
    typer.echo(format_users_growth(result))


@query_app.command(help="Cluster local event rows into app-scoped user sessions.")
def session(
    archive_dir: Annotated[
        Path | None,
        typer.Option(
            "--archive-dir",
            help=f"Local analytics archive root. Defaults to EVENTS_ANALYTICS_DIR or {DEFAULT_ARCHIVE_DIR}.",
        ),
    ] = None,
    app_id: Annotated[
        str | None,
        typer.Option("--app-id", help="App ID to show in output. Cache processing still covers all available apps."),
    ] = None,
    user_id: Annotated[
        str | None,
        typer.Option("--user-id", help="User ID to show in output. Cache processing still covers all available users."),
    ] = None,
    limit: Annotated[
        int,
        typer.Option("--limit", min=1, help=f"Maximum visible sessions to show per app. Defaults to {DEFAULT_SESSION_LIMIT}."),
    ] = DEFAULT_SESSION_LIMIT,
    reset: Annotated[
        bool,
        typer.Option("--reset", help="Remove session aggregate caches and recompute from all local Parquet data."),
    ] = False,
    output_format: Annotated[
        str,
        typer.Option("--format", help="Output format: text or json."),
    ] = "text",
) -> None:
    if output_format not in {"text", "json"}:
        typer.echo("--format must be one of: text, json", err=True)
        raise typer.Exit(1)

    try:
        result = load_event_sessions(
            archive_dir=archive_dir,
            app_id_filter=app_id,
            user_id_filter=user_id,
            limit=limit,
            reset=reset,
        )
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error

    if result is None:
        typer.echo(no_event_sessions_message(resolve_paths(archive_dir)))
        return

    if output_format == "json":
        typer.echo(json.dumps(event_sessions_to_dict(result), indent=2, sort_keys=True))
        return
    typer.echo(format_event_sessions(result))


@query_app.command(help="Compute app-scoped book reading engagement from local event rows.")
def reads(
    archive_dir: Annotated[
        Path | None,
        typer.Option(
            "--archive-dir",
            help=f"Local analytics archive root. Defaults to EVENTS_ANALYTICS_DIR or {DEFAULT_ARCHIVE_DIR}.",
        ),
    ] = None,
    app_id: Annotated[
        str | None,
        typer.Option("--app-id", help="App ID to show in output. Cache processing still covers all available apps."),
    ] = None,
    book_id: Annotated[
        str | None,
        typer.Option("--book-id", help="Book ID to show in output. Cache processing still covers all books."),
    ] = None,
    limit: Annotated[
        int,
        typer.Option("--limit", min=1, help=f"Maximum visible books to show per app. Defaults to {DEFAULT_READS_LIMIT}."),
    ] = DEFAULT_READS_LIMIT,
    completion_threshold_bps: Annotated[
        int,
        typer.Option(
            "--completion-threshold-bps",
            min=0,
            max=10000,
            help=f"Progress BPS at or above which a page counts as completed. Defaults to {DEFAULT_COMPLETION_THRESHOLD_BPS}.",
        ),
    ] = DEFAULT_COMPLETION_THRESHOLD_BPS,
    reset: Annotated[
        bool,
        typer.Option("--reset", help="Remove read aggregate caches and recompute from all local Parquet data."),
    ] = False,
    output_format: Annotated[
        str,
        typer.Option("--format", help="Output format: text or json."),
    ] = "text",
) -> None:
    if output_format not in {"text", "json"}:
        typer.echo("--format must be one of: text, json", err=True)
        raise typer.Exit(1)

    try:
        result = load_event_reads(
            archive_dir=archive_dir,
            app_id_filter=app_id,
            book_id_filter=book_id,
            limit=limit,
            completion_threshold_bps=completion_threshold_bps,
            reset=reset,
        )
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error

    if result is None:
        typer.echo(no_event_reads_message(resolve_paths(archive_dir)))
        return

    if output_format == "json":
        typer.echo(json.dumps(event_reads_to_dict(result), indent=2, sort_keys=True))
        return
    typer.echo(format_event_reads(result))
