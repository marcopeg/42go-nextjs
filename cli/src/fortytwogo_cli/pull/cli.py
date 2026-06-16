from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
from typing import Annotated, Any, Callable

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


def format_count_line(changed: Any | None, total: Any | None) -> str:
    if changed is None and total is None:
        return "n/a"
    if changed is None:
        return f"total: {total}"
    if total is None:
        return f"changed: {changed}"
    return f"changed: {changed} | total: {total}"


def format_pull_all_result(result: dict[str, Any]) -> str:
    auth = result.get("auth", {})
    events = result.get("events", {})
    lingocafe = result.get("lingocafe", {})
    event_months = [
        month
        for month in events.get("months") or []
        if int(month.get("new_rows") or 0) > 0
    ]

    lines = ["42Go Pull All", ""]
    lines.extend(
        [
            "auth",
            "  users",
            f"    {format_count_line(auth.get('users_changed'), auth.get('users_total'))}",
            "  accounts",
            f"    {format_count_line(auth.get('accounts_changed'), auth.get('accounts_total'))}",
            "",
            "events",
            "  events",
            f"    {format_count_line(events.get('rows'), None)}",
        ]
    )
    if events.get("run_id"):
        lines.append(f"    run: {events.get('run_id')}")
    if events.get("last_created_at") or events.get("last_id"):
        lines.append(f"    last: {events.get('last_created_at', 'n/a')} | {events.get('last_id', 'n/a')}")
    for month in event_months:
        lines.extend(
            [
                f"  events_{month.get('month', 'unknown')}",
                f"    {format_count_line(month.get('new_rows'), month.get('total_rows'))}",
            ]
        )
    removed = events.get("removed_legacy_files")
    if removed is not None:
        lines.append(f"  legacy files removed: {len(removed)}")
    message = events.get("message")
    if message:
        lines.append(f"  message: {message}")
    lines.extend(
        [
            "",
            "lingocafe",
            "  books",
            f"    {format_count_line(lingocafe.get('books_changed'), lingocafe.get('books_total'))}",
            "  books_pages",
            f"    {format_count_line(None, lingocafe.get('pages_total'))}",
            "  books_progress",
            f"    {format_count_line(lingocafe.get('progress_changed'), lingocafe.get('progress_total'))}",
        ]
    )

    return "\n".join(lines)


def print_pull_all(result: dict[str, Any]) -> None:
    typer.echo(format_pull_all_result(result))


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
    pull_targets: dict[str, Callable[[], dict[str, Any]]] = {
        "auth": lambda: run_auth_pull(data_dir, limit, database_url_env, reset, dry_run),
        "events": lambda: run_events_pull(data_dir, limit, reset, dry_run),
        "lingocafe": lambda: run_books_pull(data_dir, limit, database_url_env, reset, dry_run),
    }
    results: dict[str, Any] = {}
    failures: dict[str, Exception] = {}

    with ThreadPoolExecutor(max_workers=len(pull_targets), thread_name_prefix="42go-pull") as executor:
        futures = {executor.submit(run_target): label for label, run_target in pull_targets.items()}
        for future in as_completed(futures):
            label = futures[future]
            try:
                results[label] = future.result()
            except Exception as error:
                failures[label] = error

    if failures:
        details = "; ".join(f"{label}: {error}" for label, error in sorted(failures.items()))
        raise RuntimeError(details)

    return {label: results[label] for label in pull_targets}


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
        typer.Option("--database-url-env", help="Environment variable or .env key for auth and LingoCafe pulls. Defaults to BACKUP_DATABASE_URL."),
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
    typer.echo("3. lingocafe")
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
            print_pull_all(run_all_pulls(data_dir, limit, database_url_env, reset, dry_run))
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
def lingocafe(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    limit: Annotated[int, typer.Option("--limit", min=1, help=f"Maximum rows per progressive table. Defaults to {DEFAULT_BOOK_LIMIT}.")] = DEFAULT_BOOK_LIMIT,
    database_url_env: Annotated[
        str,
        typer.Option("--database-url-env", help="Environment variable or .env key containing the PostgreSQL connection URL. Defaults to BACKUP_DATABASE_URL."),
    ] = "BACKUP_DATABASE_URL",
    reset: Annotated[bool, typer.Option("--reset", help="Delete local LingoCafe Parquet files before pulling.")] = False,
    dry_run: Annotated[bool, typer.Option("--dry-run", help="Report changed rows without writing files or advancing state.")] = False,
) -> None:
    try:
        print_json(run_books_pull(data_dir, limit, database_url_env, reset, dry_run))
    except RuntimeError as error:
        handle_pull_error("lingocafe", error)


@pull_app.command(name="all", help="Pull all raw data sources.")
def all_data(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    limit: Annotated[int, typer.Option("--limit", min=1, help=f"Maximum rows per progressive query. Defaults to {DEFAULT_EVENT_LIMIT}.")] = DEFAULT_EVENT_LIMIT,
    database_url_env: Annotated[
        str,
        typer.Option("--database-url-env", help="Environment variable or .env key for auth and LingoCafe pulls. Defaults to BACKUP_DATABASE_URL."),
    ] = "BACKUP_DATABASE_URL",
    reset: Annotated[bool, typer.Option("--reset", help="Delete local raw Parquet files before pulling.")] = False,
    dry_run: Annotated[bool, typer.Option("--dry-run", help="Report changed rows without writing files or advancing state.")] = False,
) -> None:
    try:
        print_pull_all(run_all_pulls(data_dir, limit, database_url_env, reset, dry_run))
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
        typer.Option("--database-url-env", help="Environment variable or .env key for auth and LingoCafe pulls. Defaults to BACKUP_DATABASE_URL."),
    ] = "BACKUP_DATABASE_URL",
    reset: Annotated[bool, typer.Option("--reset", help="Delete local raw Parquet files before pulling.")] = False,
    dry_run: Annotated[bool, typer.Option("--dry-run", help="Report changed rows without writing files or advancing state.")] = False,
) -> None:
    all_data(data_dir=data_dir, limit=limit, database_url_env=database_url_env, reset=reset, dry_run=dry_run)
