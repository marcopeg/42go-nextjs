from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from fortytwogo_cli.email.lingocafe_read_tip import DEFAULT_BASE_URL, DEFAULT_FROM, ReadTipOptions, run_read_tip, summarize_result
from fortytwogo_cli.events.paths import DEFAULT_DATA_DIR
from fortytwogo_cli.pull.cli import run_all_pulls
from fortytwogo_cli.query.cli import run_all_queries
from fortytwogo_cli.query.lingocafe_reads import DEFAULT_COMPLETION_BPS
from fortytwogo_cli.query.paths import DEFAULT_QUERY_DIR
from fortytwogo_cli.query.sessions import DEFAULT_SESSION_DURATION_MINUTES
from fortytwogo_cli.query.users import DEFAULT_MIN_SESSION_EVENTS, DEFAULT_MIN_SESSION_LENGTH_SECONDS

email_app = typer.Typer(
    help="Run local email automations.",
    invoke_without_command=True,
    no_args_is_help=False,
)
lingocafe_app = typer.Typer(
    help="Run LingoCafe email automations.",
    invoke_without_command=True,
    no_args_is_help=False,
)
email_app.add_typer(lingocafe_app, name="lingocafe", help="Run LingoCafe email automations.")


@email_app.callback()
def email_root(ctx: typer.Context) -> None:
    if ctx.invoked_subcommand is not None:
        return
    typer.echo(ctx.get_help())
    raise typer.Exit()


@lingocafe_app.callback()
def lingocafe_root(ctx: typer.Context) -> None:
    if ctx.invoked_subcommand is not None:
        return
    typer.echo(ctx.get_help())
    raise typer.Exit()


@lingocafe_app.command(name="read-tip", help="Send or preview LingoCafe what-to-read-next reminder emails.")
def read_tip(
    data_dir: Annotated[
        Path | None,
        typer.Option("--data-dir", help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}."),
    ] = None,
    query_dir: Annotated[
        Path | None,
        typer.Option("--query-dir", help=f"Local aggregate output root. Defaults to FORTYTWOGO_QUERY_DIR or {DEFAULT_QUERY_DIR}."),
    ] = None,
    whitelist_path: Annotated[
        Path | None,
        typer.Option("--whitelist-path", help="Recipient whitelist file. Defaults to .local/42go-data/lingocafe_daily_email/whitelist.txt."),
    ] = None,
    sent_emails_path: Annotated[
        Path | None,
        typer.Option("--sent-emails-path", help="Sent-email Parquet log. Defaults to .local/42go-data/lingocafe_daily_email/sent_emails.parquet."),
    ] = None,
    send: Annotated[
        bool,
        typer.Option("--send", help="Send real email through Resend. Dry-run is the default."),
    ] = False,
    dry: Annotated[
        bool,
        typer.Option("--dry", help="Preview planned emails without sending. This is also the default when --send is omitted."),
    ] = False,
    skip_refresh: Annotated[
        bool,
        typer.Option("--skip-refresh", help="Skip the initial 42go pull all and 42go query all refresh."),
    ] = False,
    reset: Annotated[
        bool,
        typer.Option("--reset", help="Ignore the sent-email cooldown for this run. Useful while testing with the whitelist."),
    ] = False,
    max_recipients: Annotated[
        int,
        typer.Option("--max", min=1, help="Maximum number of contacts to send or preview. Defaults to 1."),
    ] = 1,
    base_url: Annotated[
        str,
        typer.Option("--base-url", help="Base URL used for reader links."),
    ] = DEFAULT_BASE_URL,
    from_email: Annotated[
        str,
        typer.Option("--from", help="From address for Resend send mode."),
    ] = DEFAULT_FROM,
    limit: Annotated[
        int,
        typer.Option("--limit", min=1, help="Maximum rows per progressive pull query."),
    ] = 10000,
    database_url_env: Annotated[
        str,
        typer.Option("--database-url-env", help="Environment variable or .env key for auth and LingoCafe pulls."),
    ] = "BACKUP_DATABASE_URL",
    duration: Annotated[
        int,
        typer.Option("--duration", min=1, help="Session gap duration in minutes for query refresh."),
    ] = DEFAULT_SESSION_DURATION_MINUTES,
    min_session_length: Annotated[
        int,
        typer.Option("--min-session-length", min=0, help="Minimum session duration in seconds for query refresh."),
    ] = DEFAULT_MIN_SESSION_LENGTH_SECONDS,
    min_session_events: Annotated[
        int,
        typer.Option("--min-session-events", min=1, help="Minimum event count for query refresh."),
    ] = DEFAULT_MIN_SESSION_EVENTS,
    bps: Annotated[
        int,
        typer.Option("--bps", min=0, max=10000, help="LingoCafe reads completion threshold for query refresh."),
    ] = DEFAULT_COMPLETION_BPS,
) -> None:
    if send and dry:
        typer.echo("read-tip failed: use either --send or --dry, not both.", err=True)
        raise typer.Exit(1)

    if not skip_refresh:
        try:
            run_all_pulls(data_dir=data_dir, limit=limit, database_url_env=database_url_env, reset=False, dry_run=False)
            run_all_queries(
                data_dir=data_dir,
                query_dir=query_dir,
                duration=duration,
                min_session_length=min_session_length,
                min_session_events=min_session_events,
                bps=bps,
            )
        except RuntimeError as error:
            typer.echo(f"refresh failed: {error}", err=True)
            raise typer.Exit(1) from error

    try:
        result = run_read_tip(
            ReadTipOptions(
                data_dir=data_dir,
                query_dir=query_dir,
                whitelist_path=whitelist_path,
                sent_emails_path=sent_emails_path,
                dry_run=dry or not send,
                send=send,
                base_url=base_url,
                from_email=from_email,
                reset=reset,
                max_recipients=max_recipients,
            )
        )
    except RuntimeError as error:
        typer.echo(f"read-tip failed: {error}", err=True)
        raise typer.Exit(1) from error

    typer.echo(summarize_result(result))
