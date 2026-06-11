from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated

import typer

from fortytwogo_cli.events.books import (
    DEFAULT_BOOK_STATS_APP_ID,
    book_stats_to_dict,
    format_book_stats,
    load_book_stats,
)
from fortytwogo_cli.events.paths import DEFAULT_DATA_DIR, resolve_paths
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
query_app.add_typer(stats_app, name="stats", help="Print event archive and product statistics.")
query_app.add_typer(query_users_app, name="users", help="Print user-related statistics.")


def prompt_menu(title: str, options: list[tuple[int, str]]) -> int:
    typer.echo(title)
    for number, label in options:
        typer.echo(f"{number}. {label}")
    choice = typer.prompt("Selection", type=int)
    valid_choices = {number for number, _label in options}
    if choice not in valid_choices:
        choices = ", ".join(str(number) for number, _label in options)
        typer.echo(f"Selection must be one of: {choices}.", err=True)
        raise typer.Exit(1)
    return choice


def validate_output_format(output_format: str) -> None:
    if output_format not in {"text", "json"}:
        typer.echo("--format must be one of: text, json", err=True)
        raise typer.Exit(1)


def run_stats_query(data_dir: Path | None = None) -> None:
    try:
        result = load_event_stats(data_dir)
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error

    if result is None:
        typer.echo(no_events_message(resolve_paths(data_dir)))
        return
    typer.echo(format_stats(result))


def run_books_query(
    data_dir: Path | None = None,
    app_id: str = DEFAULT_BOOK_STATS_APP_ID,
    output_format: str = "text",
) -> None:
    validate_output_format(output_format)
    try:
        result = load_book_stats(data_dir=data_dir, app_id=app_id)
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error
    if output_format == "json":
        typer.echo(json.dumps(book_stats_to_dict(result), indent=2, sort_keys=True))
        return
    typer.echo(format_book_stats(result))


def run_users_growth_query(
    data_dir: Path | None = None,
    app: str | None = None,
    reset: bool = False,
    output_format: str = "text",
) -> None:
    validate_output_format(output_format)
    try:
        result = load_users_growth(
            archive_dir=data_dir,
            app_filter=parse_app_filter(app),
            reset=reset,
        )
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error

    if result is None:
        typer.echo(no_users_growth_message(data_dir))
        return

    if output_format == "json":
        typer.echo(json.dumps(users_growth_to_dict(result), indent=2, sort_keys=True))
        return
    typer.echo(format_users_growth(result))


def run_session_query(
    data_dir: Path | None = None,
    app_id: str | None = None,
    user_id: str | None = None,
    limit: int = DEFAULT_SESSION_LIMIT,
    reset: bool = False,
    output_format: str = "text",
) -> None:
    validate_output_format(output_format)
    try:
        result = load_event_sessions(
            archive_dir=data_dir,
            app_id_filter=app_id,
            user_id_filter=user_id,
            limit=limit,
            reset=reset,
        )
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error

    if result is None:
        typer.echo(no_event_sessions_message(resolve_paths(data_dir)))
        return

    if output_format == "json":
        typer.echo(json.dumps(event_sessions_to_dict(result), indent=2, sort_keys=True))
        return
    typer.echo(format_event_sessions(result))


def run_reads_query(
    data_dir: Path | None = None,
    app_id: str | None = None,
    book_id: str | None = None,
    limit: int = DEFAULT_READS_LIMIT,
    completion_threshold_bps: int = DEFAULT_COMPLETION_THRESHOLD_BPS,
    reset: bool = False,
    output_format: str = "text",
) -> None:
    validate_output_format(output_format)
    try:
        result = load_event_reads(
            archive_dir=data_dir,
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
        typer.echo(no_event_reads_message(resolve_paths(data_dir)))
        return

    if output_format == "json":
        typer.echo(json.dumps(event_reads_to_dict(result), indent=2, sort_keys=True))
        return
    typer.echo(format_event_reads(result))


def run_users_query_menu() -> None:
    choice = prompt_menu(
        "Choose users query:",
        [
            (1, "growth"),
        ],
    )
    if choice == 1:
        run_users_growth_query()


def run_query_menu() -> None:
    choice = prompt_menu(
        "Choose query target:",
        [
            (1, "stats"),
            (2, "session"),
            (3, "users"),
            (4, "books"),
            (5, "reads"),
        ],
    )
    if choice == 1:
        run_stats_query()
    elif choice == 2:
        run_session_query()
    elif choice == 3:
        run_users_query_menu()
    elif choice == 4:
        run_books_query()
    elif choice == 5:
        run_reads_query()


@query_app.callback()
def query_root(ctx: typer.Context) -> None:
    """Prompt for a query target when no subcommand is provided."""
    if ctx.invoked_subcommand is None:
        run_query_menu()
        raise typer.Exit()


@stats_app.callback()
def stats_root(
    ctx: typer.Context,
    data_dir: Annotated[
        Path | None,
        typer.Option(
            "--data-dir",
            help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}.",
        ),
    ] = None,
) -> None:
    """Print high-level archive stats when no nested stats command is invoked."""
    if ctx.invoked_subcommand is not None:
        return
    run_stats_query(data_dir=data_dir)


@query_users_app.callback()
def query_users_root(ctx: typer.Context) -> None:
    """Prompt for a user query when no subcommand is provided."""
    if ctx.invoked_subcommand is None:
        run_users_query_menu()
        raise typer.Exit()


@query_app.command(name="books", help="Inspect book-related local analytics facts.")
def books(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    app_id: Annotated[
        str,
        typer.Option("--app-id", help="App ID label to use when joining book facts into app-scoped read analytics."),
    ] = DEFAULT_BOOK_STATS_APP_ID,
    output_format: Annotated[
        str,
        typer.Option("--format", help="Output format: text or json."),
    ] = "text",
) -> None:
    run_books_query(data_dir=data_dir, app_id=app_id, output_format=output_format)


@query_users_app.command(help="Compute user growth, subscriptions, active users, and inactive users over time.")
def growth(
    data_dir: Annotated[
        Path | None,
        typer.Option(
            "--data-dir",
            help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}.",
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
    run_users_growth_query(data_dir=data_dir, app=app, reset=reset, output_format=output_format)


@query_app.command(help="Cluster local event rows into app-scoped user sessions.")
def session(
    data_dir: Annotated[
        Path | None,
        typer.Option(
            "--data-dir",
            help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}.",
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
    run_session_query(
        data_dir=data_dir,
        app_id=app_id,
        user_id=user_id,
        limit=limit,
        reset=reset,
        output_format=output_format,
    )


@query_app.command(help="Compute app-scoped book reading engagement from local event rows.")
def reads(
    data_dir: Annotated[
        Path | None,
        typer.Option(
            "--data-dir",
            help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}.",
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
    run_reads_query(
        data_dir=data_dir,
        app_id=app_id,
        book_id=book_id,
        limit=limit,
        completion_threshold_bps=completion_threshold_bps,
        reset=reset,
        output_format=output_format,
    )
