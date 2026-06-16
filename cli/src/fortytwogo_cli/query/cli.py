from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Any

import typer

from fortytwogo_cli.events.paths import DEFAULT_DATA_DIR
from fortytwogo_cli.query.paths import DEFAULT_QUERY_DIR
from fortytwogo_cli.query.sessions import DEFAULT_SESSION_DURATION_MINUTES, QuerySessionsOptions, query_sessions
from fortytwogo_cli.query.users import QueryUsersOptions, query_users

query_app = typer.Typer(
    help="Run local analytical aggregations.",
    invoke_without_command=True,
    no_args_is_help=False,
)


def print_json(result: dict[str, Any]) -> None:
    typer.echo(json.dumps(result, indent=2, sort_keys=True))


def run_sessions_query(data_dir: Path | None, query_dir: Path | None, duration: int) -> dict[str, Any]:
    return query_sessions(QuerySessionsOptions(data_dir=data_dir, query_dir=query_dir, duration=duration))


def run_users_query(data_dir: Path | None, query_dir: Path | None) -> dict[str, Any]:
    return query_users(QueryUsersOptions(data_dir=data_dir, query_dir=query_dir))


def run_all_queries(data_dir: Path | None, query_dir: Path | None, duration: int) -> dict[str, Any]:
    sessions_result = run_sessions_query(data_dir, query_dir, duration)
    return {
        "sessions": sessions_result,
        "users": run_users_query(data_dir, query_dir),
    }


def handle_query_error(label: str, error: RuntimeError) -> None:
    typer.echo(f"query {label} failed: {error}", err=True)
    raise typer.Exit(1) from error


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
) -> None:
    """Prompt for a query target when no subcommand is provided."""
    if ctx.invoked_subcommand is not None:
        return

    typer.echo("Choose query target:")
    typer.echo("1. sessions")
    typer.echo("2. users")
    typer.echo("3. all")
    choice = typer.prompt("Selection", type=int)
    try:
        if choice == 1:
            print_json(run_sessions_query(data_dir, query_dir, duration))
        elif choice == 2:
            print_json(run_users_query(data_dir, query_dir))
        elif choice == 3:
            print_json(run_all_queries(data_dir, query_dir, duration))
        else:
            typer.echo("Selection must be 1, 2, or 3.", err=True)
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
) -> None:
    try:
        print_json(run_users_query(data_dir, query_dir))
    except RuntimeError as error:
        handle_query_error("users", error)


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
) -> None:
    try:
        print_json(run_all_queries(data_dir, query_dir, duration))
    except RuntimeError as error:
        handle_query_error("all", error)
