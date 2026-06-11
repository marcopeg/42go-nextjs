from __future__ import annotations

import typer

from fortytwogo_cli import __version__
from fortytwogo_cli.backup.cli import backup, restore
from fortytwogo_cli.events.cli import events_app, query_app


app = typer.Typer(
    help="Local automation commands for 42Go projects.",
    invoke_without_command=True,
    no_args_is_help=False,
)
app.add_typer(events_app, name="events", help="Pull raw 42Go event archives.")
app.add_typer(query_app, name="query", help="Build local analytics aggregations from cached data.")
app.command(help="Create a data-only SQL backup.")(backup)
app.command(help="Restore a data-only SQL backup into a migrated database.")(restore)


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
