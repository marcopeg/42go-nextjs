from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Annotated

import typer

from fortytwogo_cli.backup import core

RESTORE_BACKUP_LIST_LIMIT = 10
BACKUP_FILENAME_RE = re.compile(r"^(\d{8}T\d{6}Z)\.dump\.(?:full|light)\.sql$")


def choose_backup_mode() -> core.BackupMode:
    typer.echo("Choose backup mode:")
    typer.echo("1. full")
    typer.echo("2. light")
    value = typer.prompt("Mode", default="light")
    normalized = value.strip().lower()
    if normalized in {"1", "full"}:
        return "full"
    if normalized in {"2", "light"}:
        return "light"
    typer.echo("Mode must be full or light.", err=True)
    raise typer.Exit(1)


def format_backup_date(backup_path: Path) -> str:
    match = BACKUP_FILENAME_RE.match(backup_path.name)
    if not match:
        return "-"
    value = datetime.strptime(match.group(1), "%Y%m%dT%H%M%SZ")
    return value.strftime("%Y-%m-%d %H:%M:%SZ")


def format_backup_size(backup_path: Path) -> str:
    try:
        size = backup_path.stat().st_size
    except OSError:
        return "-"

    units = ("B", "KiB", "MiB", "GiB")
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            if unit == "B":
                return f"{int(value)} B"
            return f"{value:.1f} {unit}"
        value /= 1024
    return f"{size} B"


def format_restore_backup_table(backups: list[Path]) -> list[str]:
    rows = [
        (str(index), str(backup_path), format_backup_date(backup_path), format_backup_size(backup_path))
        for index, backup_path in enumerate(backups, start=1)
    ]
    headers = ("#", "File", "Date", "Size")
    widths = [
        max([len(headers[column]), *(len(row[column]) for row in rows)])
        for column in range(len(headers))
    ]
    output = [
        "  ".join(header.ljust(widths[index]) for index, header in enumerate(headers)),
        "  ".join("-" * width for width in widths),
    ]
    output.extend("  ".join(value.ljust(widths[index]) for index, value in enumerate(row)) for row in rows)
    return output


def choose_restore_backup() -> Path:
    backups = core.list_available_backups()[:RESTORE_BACKUP_LIST_LIMIT]
    if not backups:
        typer.echo(f"No backups found in {core.DUMPS_DIR}.", err=True)
        raise typer.Exit(1)

    typer.echo("Choose backup to restore:")
    for line in format_restore_backup_table(backups):
        typer.echo(line)

    value = typer.prompt("Backup", default="1")
    try:
        selected_index = int(value)
    except ValueError as error:
        typer.echo("Backup selection must be a number.", err=True)
        raise typer.Exit(1) from error

    if selected_index < 1 or selected_index > len(backups):
        typer.echo(f"Backup selection must be between 1 and {len(backups)}.", err=True)
        raise typer.Exit(1)
    return backups[selected_index - 1]


def backup(
    full: Annotated[
        bool,
        typer.Option("--full", help="Create a full data-only SQL backup."),
    ] = False,
    light: Annotated[
        bool,
        typer.Option("--light", help="Create a light data-only SQL backup that skips heavy tables."),
    ] = False,
) -> None:
    """Create a data-only SQL backup."""
    if full and light:
        typer.echo("Use only one backup mode: --full or --light.", err=True)
        raise typer.Exit(1)

    mode: core.BackupMode
    if full:
        mode = "full"
    elif light:
        mode = "light"
    else:
        mode = choose_backup_mode()

    try:
        result = core.run_backup(mode)
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error

    typer.echo(f"Created {result.output_path}")
    typer.echo(f"Tables dumped: {result.tables_dumped}")
    if result.tables_excluded > 0:
        typer.echo(f"Tables excluded: {result.tables_excluded}")


def restore(
    from_: Annotated[
        Path | None,
        typer.Option("--from", help="Dump path or bare dump filename to restore."),
    ] = None,
) -> None:
    """Restore a data-only SQL backup into a migrated database."""
    selected_dump = from_ or choose_restore_backup()
    try:
        restore_database_url = core.get_restore_database_url()
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error

    typer.echo(f"Restore file: {selected_dump}")
    typer.echo(f"Target database: {core.anonymize_connection_string(restore_database_url)}")
    if not typer.confirm("Proceed with restore?", default=False):
        typer.echo("Restore cancelled.")
        raise typer.Exit()

    typer.echo(f"Restoring from {selected_dump}")

    try:
        result = core.run_restore(selected_dump)
    except RuntimeError as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from error

    if result.stripped_tables > 0 or result.stripped_data_sections > 0:
        typer.echo(
            "Skipping temporary notes tables: "
            f"{result.stripped_tables} truncate entries, {result.stripped_data_sections} data sections"
        )
    if result.event_partitions > 0:
        typer.echo(f"Ensuring event partitions: {result.event_partitions}")
