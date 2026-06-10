from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated

import typer

from fortytwogo_cli.events.paths import DEFAULT_ARCHIVE_DIR, resolve_paths
from fortytwogo_cli.events.pull import DEFAULT_LIMIT, PullOptions, pull_events
from fortytwogo_cli.events.query import format_stats, load_event_stats, no_events_message
from fortytwogo_cli.events.users_growth import (
    format_users_growth,
    load_users_growth,
    no_users_growth_message,
    parse_app_filter,
    users_growth_to_dict,
)


events_app = typer.Typer(
    help="Pull production events into a local archive and query local Parquet files.",
    invoke_without_command=True,
    no_args_is_help=False,
)
query_app = typer.Typer(
    help="Run read-only queries against local event Parquet files.",
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
events_app.add_typer(query_app, name="query", help="Query local event archive data.")
query_app.add_typer(stats_app, name="stats", help="Print event archive and product statistics.")
query_app.add_typer(query_users_app, name="users", help="Print user-related statistics.")


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
