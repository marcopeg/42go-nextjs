from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Any

import typer

from fortytwogo_cli.events.paths import DEFAULT_DATA_DIR
from fortytwogo_cli.query.lingocafe_growth import QueryLingocafeGrowthOptions, query_lingocafe_growth
from fortytwogo_cli.query.lingocafe_reads import DEFAULT_COMPLETION_BPS, QueryLingocafeReadsOptions, query_lingocafe_reads
from fortytwogo_cli.query.lingocafe_users import QueryLingocafeUsersOptions, query_lingocafe_users
from fortytwogo_cli.query.paths import DEFAULT_QUERY_DIR
from fortytwogo_cli.query.sessions import DEFAULT_SESSION_DURATION_MINUTES, QuerySessionsOptions, query_sessions
from fortytwogo_cli.query.users import (
    DEFAULT_MIN_SESSION_EVENTS,
    DEFAULT_MIN_SESSION_LENGTH_SECONDS,
    QueryUsersOptions,
    query_users,
)

query_app = typer.Typer(
    help="Run local analytical aggregations.",
    invoke_without_command=True,
    no_args_is_help=False,
)

lingocafe_app = typer.Typer(
    help="Run LingoCafe-specific analytical aggregations.",
    invoke_without_command=True,
    no_args_is_help=False,
)


def print_json(result: dict[str, Any]) -> None:
    typer.echo(json.dumps(result, indent=2, sort_keys=True))


def run_sessions_query(data_dir: Path | None, query_dir: Path | None, duration: int) -> dict[str, Any]:
    return query_sessions(QuerySessionsOptions(data_dir=data_dir, query_dir=query_dir, duration=duration))


def run_users_query(
    data_dir: Path | None,
    query_dir: Path | None,
    min_session_length: int,
    min_session_events: int,
) -> dict[str, Any]:
    return query_users(
        QueryUsersOptions(
            data_dir=data_dir,
            query_dir=query_dir,
            min_session_length=min_session_length,
            min_session_events=min_session_events,
        )
    )


def run_lingocafe_users_query(query_dir: Path | None) -> dict[str, Any]:
    return query_lingocafe_users(QueryLingocafeUsersOptions(query_dir=query_dir))


def run_lingocafe_growth_query(data_dir: Path | None, query_dir: Path | None) -> dict[str, Any]:
    return query_lingocafe_growth(QueryLingocafeGrowthOptions(data_dir=data_dir, query_dir=query_dir))


def run_lingocafe_reads_query(data_dir: Path | None, query_dir: Path | None, bps: int) -> dict[str, Any]:
    return query_lingocafe_reads(QueryLingocafeReadsOptions(data_dir=data_dir, query_dir=query_dir, bps=bps))


def run_lingocafe_all_queries(data_dir: Path | None, query_dir: Path | None, bps: int) -> dict[str, Any]:
    return {
        "users": run_lingocafe_users_query(query_dir),
        "growth": run_lingocafe_growth_query(data_dir, query_dir),
        "reads": run_lingocafe_reads_query(data_dir, query_dir, bps),
    }


def run_all_queries(
    data_dir: Path | None,
    query_dir: Path | None,
    duration: int,
    min_session_length: int,
    min_session_events: int,
    bps: int,
) -> dict[str, Any]:
    sessions_result = run_sessions_query(data_dir, query_dir, duration)
    users_result = run_users_query(data_dir, query_dir, min_session_length, min_session_events)
    return {
        "sessions": sessions_result,
        "users": users_result,
        "lingocafe": run_lingocafe_all_queries(data_dir, query_dir, bps),
    }


def handle_query_error(label: str, error: RuntimeError) -> None:
    typer.echo(f"query {label} failed: {error}", err=True)
    raise typer.Exit(1) from error


def prompt_lingocafe_query(data_dir: Path | None, query_dir: Path | None, bps: int) -> None:
    typer.echo("Choose LingoCafe query target:")
    typer.echo("1. users")
    typer.echo("2. growth")
    typer.echo("3. reads")
    typer.echo("4. all")
    choice = typer.prompt("Selection", type=int)
    if choice == 1:
        print_json(run_lingocafe_users_query(query_dir))
        return
    if choice == 2:
        print_json(run_lingocafe_growth_query(data_dir, query_dir))
        return
    if choice == 3:
        print_json(run_lingocafe_reads_query(data_dir, query_dir, bps))
        return
    if choice == 4:
        print_json(run_lingocafe_all_queries(data_dir, query_dir, bps))
        return
    typer.echo("Selection must be 1, 2, 3, or 4.", err=True)
    raise typer.Exit(1)


@query_app.callback()
def query_root(
    ctx: typer.Context,
    data_dir: Annotated[
        Path | None,
        typer.Option(
            "--data-dir",
            help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}.",
        ),
    ] = None,
    query_dir: Annotated[
        Path | None,
        typer.Option(
            "--query-dir",
            help=f"Local aggregate output root. Defaults to FORTYTWOGO_QUERY_DIR or {DEFAULT_QUERY_DIR}.",
        ),
    ] = None,
    duration: Annotated[
        int,
        typer.Option("--duration", min=1, help=f"Session gap duration in minutes. Defaults to {DEFAULT_SESSION_DURATION_MINUTES}."),
    ] = DEFAULT_SESSION_DURATION_MINUTES,
    min_session_length: Annotated[
        int,
        typer.Option(
            "--min-session-length",
            min=0,
            help=f"Minimum session duration in seconds for active user flags. Defaults to {DEFAULT_MIN_SESSION_LENGTH_SECONDS}.",
        ),
    ] = DEFAULT_MIN_SESSION_LENGTH_SECONDS,
    min_session_events: Annotated[
        int,
        typer.Option(
            "--min-session-events",
            min=1,
            help=f"Minimum event count for active user flags. Defaults to {DEFAULT_MIN_SESSION_EVENTS}.",
        ),
    ] = DEFAULT_MIN_SESSION_EVENTS,
    bps: Annotated[
        int,
        typer.Option("--bps", min=0, max=10000, help=f"LingoCafe reads completion threshold. Defaults to {DEFAULT_COMPLETION_BPS}."),
    ] = DEFAULT_COMPLETION_BPS,
) -> None:
    """Prompt for a query target when no subcommand is provided."""
    if ctx.invoked_subcommand is not None:
        return

    typer.echo("Choose query target:")
    typer.echo("1. sessions")
    typer.echo("2. users")
    typer.echo("3. lingocafe")
    typer.echo("4. all")
    choice = typer.prompt("Selection", type=int)
    try:
        if choice == 1:
            print_json(run_sessions_query(data_dir, query_dir, duration))
        elif choice == 2:
            print_json(run_users_query(data_dir, query_dir, min_session_length, min_session_events))
        elif choice == 3:
            prompt_lingocafe_query(data_dir, query_dir, bps)
        elif choice == 4:
            print_json(run_all_queries(data_dir, query_dir, duration, min_session_length, min_session_events, bps))
        else:
            typer.echo("Selection must be 1, 2, 3, or 4.", err=True)
            raise typer.Exit(1)
    except RuntimeError as error:
        handle_query_error("selected target", error)
    raise typer.Exit()


@query_app.command(help="Build user sessions from raw events.")
def sessions(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    query_dir: Annotated[
        Path | None,
        typer.Option("--query-dir", help=f"Local aggregate output root. Defaults to FORTYTWOGO_QUERY_DIR or {DEFAULT_QUERY_DIR}."),
    ] = None,
    duration: Annotated[
        int,
        typer.Option("--duration", min=1, help=f"Session gap duration in minutes. Defaults to {DEFAULT_SESSION_DURATION_MINUTES}."),
    ] = DEFAULT_SESSION_DURATION_MINUTES,
) -> None:
    try:
        print_json(run_sessions_query(data_dir, query_dir, duration))
    except RuntimeError as error:
        handle_query_error("sessions", error)


@query_app.command(help="Build users aggregate from auth users and sessions.")
def users(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    query_dir: Annotated[
        Path | None,
        typer.Option("--query-dir", help=f"Local aggregate output root. Defaults to FORTYTWOGO_QUERY_DIR or {DEFAULT_QUERY_DIR}."),
    ] = None,
    min_session_length: Annotated[
        int,
        typer.Option(
            "--min-session-length",
            min=0,
            help=f"Minimum session duration in seconds for active user flags. Defaults to {DEFAULT_MIN_SESSION_LENGTH_SECONDS}.",
        ),
    ] = DEFAULT_MIN_SESSION_LENGTH_SECONDS,
    min_session_events: Annotated[
        int,
        typer.Option(
            "--min-session-events",
            min=1,
            help=f"Minimum event count for active user flags. Defaults to {DEFAULT_MIN_SESSION_EVENTS}.",
        ),
    ] = DEFAULT_MIN_SESSION_EVENTS,
) -> None:
    try:
        print_json(run_users_query(data_dir, query_dir, min_session_length, min_session_events))
    except RuntimeError as error:
        handle_query_error("users", error)


@lingocafe_app.callback()
def lingocafe_root(
    ctx: typer.Context,
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    query_dir: Annotated[
        Path | None,
        typer.Option("--query-dir", help=f"Local aggregate output root. Defaults to FORTYTWOGO_QUERY_DIR or {DEFAULT_QUERY_DIR}."),
    ] = None,
    bps: Annotated[
        int,
        typer.Option("--bps", min=0, max=10000, help=f"Reads completion threshold. Defaults to {DEFAULT_COMPLETION_BPS}."),
    ] = DEFAULT_COMPLETION_BPS,
) -> None:
    """Prompt for a LingoCafe query target when no subcommand is provided."""
    if ctx.invoked_subcommand is not None:
        return

    try:
        prompt_lingocafe_query(data_dir, query_dir, bps)
    except RuntimeError as error:
        handle_query_error("lingocafe selected target", error)
    raise typer.Exit()


@lingocafe_app.command(name="users", help="Build LingoCafe users aggregate from general users and sessions.")
def lingocafe_users(
    query_dir: Annotated[
        Path | None,
        typer.Option("--query-dir", help=f"Local aggregate output root. Defaults to FORTYTWOGO_QUERY_DIR or {DEFAULT_QUERY_DIR}."),
    ] = None,
) -> None:
    try:
        print_json(run_lingocafe_users_query(query_dir))
    except RuntimeError as error:
        handle_query_error("lingocafe users", error)


@lingocafe_app.command(name="growth", help="Build LingoCafe daily growth chart aggregate.")
def lingocafe_growth(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    query_dir: Annotated[
        Path | None,
        typer.Option("--query-dir", help=f"Local aggregate output root. Defaults to FORTYTWOGO_QUERY_DIR or {DEFAULT_QUERY_DIR}."),
    ] = None,
) -> None:
    try:
        print_json(run_lingocafe_growth_query(data_dir, query_dir))
    except RuntimeError as error:
        handle_query_error("lingocafe growth", error)


@lingocafe_app.command(name="reads", help="Build LingoCafe daily page read aggregate.")
def lingocafe_reads(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    query_dir: Annotated[
        Path | None,
        typer.Option("--query-dir", help=f"Local aggregate output root. Defaults to FORTYTWOGO_QUERY_DIR or {DEFAULT_QUERY_DIR}."),
    ] = None,
    bps: Annotated[
        int,
        typer.Option("--bps", min=0, max=10000, help=f"Reads completion threshold. Defaults to {DEFAULT_COMPLETION_BPS}."),
    ] = DEFAULT_COMPLETION_BPS,
) -> None:
    try:
        print_json(run_lingocafe_reads_query(data_dir, query_dir, bps))
    except RuntimeError as error:
        handle_query_error("lingocafe reads", error)


@lingocafe_app.command(name="all", help="Run all LingoCafe analytical aggregations in dependency order.")
def lingocafe_all(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    query_dir: Annotated[
        Path | None,
        typer.Option("--query-dir", help=f"Local aggregate output root. Defaults to FORTYTWOGO_QUERY_DIR or {DEFAULT_QUERY_DIR}."),
    ] = None,
    bps: Annotated[
        int,
        typer.Option("--bps", min=0, max=10000, help=f"Reads completion threshold. Defaults to {DEFAULT_COMPLETION_BPS}."),
    ] = DEFAULT_COMPLETION_BPS,
) -> None:
    try:
        print_json(run_lingocafe_all_queries(data_dir, query_dir, bps))
    except RuntimeError as error:
        handle_query_error("lingocafe all", error)


@query_app.command(name="all", help="Run all local analytical aggregations in dependency order.")
def all_queries(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    query_dir: Annotated[
        Path | None,
        typer.Option("--query-dir", help=f"Local aggregate output root. Defaults to FORTYTWOGO_QUERY_DIR or {DEFAULT_QUERY_DIR}."),
    ] = None,
    duration: Annotated[
        int,
        typer.Option("--duration", min=1, help=f"Session gap duration in minutes. Defaults to {DEFAULT_SESSION_DURATION_MINUTES}."),
    ] = DEFAULT_SESSION_DURATION_MINUTES,
    min_session_length: Annotated[
        int,
        typer.Option(
            "--min-session-length",
            min=0,
            help=f"Minimum session duration in seconds for active user flags. Defaults to {DEFAULT_MIN_SESSION_LENGTH_SECONDS}.",
        ),
    ] = DEFAULT_MIN_SESSION_LENGTH_SECONDS,
    min_session_events: Annotated[
        int,
        typer.Option(
            "--min-session-events",
            min=1,
            help=f"Minimum event count for active user flags. Defaults to {DEFAULT_MIN_SESSION_EVENTS}.",
        ),
    ] = DEFAULT_MIN_SESSION_EVENTS,
    bps: Annotated[
        int,
        typer.Option("--bps", min=0, max=10000, help=f"LingoCafe reads completion threshold. Defaults to {DEFAULT_COMPLETION_BPS}."),
    ] = DEFAULT_COMPLETION_BPS,
) -> None:
    try:
        print_json(run_all_queries(data_dir, query_dir, duration, min_session_length, min_session_events, bps))
    except RuntimeError as error:
        handle_query_error("all", error)


query_app.add_typer(lingocafe_app, name="lingocafe")
