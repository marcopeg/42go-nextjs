from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path
from typing import Annotated, Any

import typer

from fortytwogo_cli.events.dependencies import import_pyarrow
from fortytwogo_cli.users.paths import DEFAULT_DATA_DIR


def list_data_folders(data_root: Path) -> list[Path]:
    if not data_root.exists():
        return []
    return sorted(path for path in data_root.iterdir() if path.is_dir())


def list_parquet_files(folder: Path) -> list[Path]:
    if not folder.exists():
        return []
    return sorted(path for path in folder.iterdir() if path.is_file() and path.suffix == ".parquet")


def choose_option(label: str, options: list[str]) -> str:
    if not options:
        raise RuntimeError(f"No {label} available.")

    typer.echo(f"Choose {label}:")
    for index, option in enumerate(options, start=1):
        typer.echo(f"{index}. {option}")

    choice = typer.prompt("Selection", type=int)
    if choice < 1 or choice > len(options):
        raise RuntimeError(f"Selection must be between 1 and {len(options)}.")
    return options[choice - 1]


def normalize_file_name(name: str) -> str:
    return name if name.endswith(".parquet") else f"{name}.parquet"


def resolve_peek_path(args: list[str], data_dir: Path | None = None) -> Path:
    data_root = data_dir or DEFAULT_DATA_DIR
    if not args:
        folders = list_data_folders(data_root)
        folder_name = choose_option("data folder", [folder.name for folder in folders])
        return resolve_peek_path([folder_name], data_dir=data_root)

    direct_path = Path(*args)
    if direct_path.exists() and direct_path.is_file():
        if direct_path.suffix != ".parquet":
            raise RuntimeError(f"{direct_path} is not a Parquet file.")
        return direct_path

    root_relative = data_root / direct_path
    if root_relative.exists() and root_relative.is_file():
        if root_relative.suffix != ".parquet":
            raise RuntimeError(f"{root_relative} is not a Parquet file.")
        return root_relative

    if len(args) == 1:
        folder = data_root / args[0]
        if not folder.exists() or not folder.is_dir():
            raise RuntimeError(f"No data folder found at {folder}.")
        files = list_parquet_files(folder)
        file_name = choose_option("Parquet file", [path.stem for path in files])
        return folder / normalize_file_name(file_name)

    folder = data_root / args[0]
    if not folder.exists() or not folder.is_dir():
        raise RuntimeError(f"No data folder found at {folder}.")

    path = folder / normalize_file_name(args[1])
    if not path.exists() or not path.is_file():
        raise RuntimeError(f"No Parquet file found at {path}.")
    return path


def stringify_cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return str(value)
    return str(value)


def parse_filters(filters: list[str] | None) -> list[tuple[str, str]]:
    parsed: list[tuple[str, str]] = []
    for item in filters or []:
        if "=" not in item:
            raise RuntimeError(f"Invalid filter {item!r}. Use column=value.")
        column, value = item.split("=", 1)
        column = column.strip()
        if not column:
            raise RuntimeError(f"Invalid filter {item!r}. Column name is required.")
        parsed.append((column, value))
    return parsed


def parse_removed_columns(remove_columns: str | None) -> set[str]:
    if not remove_columns:
        return set()
    return {column.strip() for column in remove_columns.split(",") if column.strip()}


def matches_filter(value: Any, pattern: str) -> bool:
    text = stringify_cell(value)
    if "%" not in pattern:
        return text == pattern
    regex = "^" + re.escape(pattern).replace("%", ".*") + "$"
    return re.match(regex, text) is not None


def row_matches_filters(row: dict[str, Any], filters: list[tuple[str, str]]) -> bool:
    return all(matches_filter(row.get(column), pattern) for column, pattern in filters)


def validate_columns(columns: list[str], filters: list[tuple[str, str]], removed_columns: set[str]) -> None:
    known = set(columns)
    unknown_filters = sorted({column for column, _pattern in filters if column not in known})
    if unknown_filters:
        raise RuntimeError(f"Unknown filter column(s): {', '.join(unknown_filters)}.")
    unknown_removed = sorted(removed_columns - known)
    if unknown_removed:
        raise RuntimeError(f"Unknown column(s) for -rmc: {', '.join(unknown_removed)}.")


def truncate_cell(value: str, width: int) -> str:
    if len(value) <= width:
        return value.ljust(width)
    if width <= 3:
        return value[:width]
    return f"{value[: width - 3]}..."


def table_column_widths(columns: list[str], terminal_width: int) -> list[int]:
    if not columns:
        return []
    separator_width = 3 * (len(columns) - 1)
    available = max(len(columns) * 4, terminal_width - separator_width)
    base_width = max(4, available // len(columns))
    widths = [base_width] * len(columns)
    for index in range(available - (base_width * len(columns))):
        widths[index % len(widths)] += 1
    return widths


def format_table_row(values: list[str], widths: list[int]) -> str:
    return " | ".join(truncate_cell(value, width) for value, width in zip(values, widths))


def iter_parquet_table_lines(
    path: Path,
    batch_size: int = 1000,
    terminal_width: int | None = None,
    filters: list[str] | None = None,
    remove_columns: str | None = None,
) -> Any:
    _pa, pq = import_pyarrow()
    parquet_file = pq.ParquetFile(path)
    source_columns = list(parquet_file.schema_arrow.names)
    parsed_filters = parse_filters(filters)
    removed_columns = parse_removed_columns(remove_columns)
    validate_columns(source_columns, parsed_filters, removed_columns)
    columns = [column for column in source_columns if column not in removed_columns]
    if not columns:
        raise RuntimeError("All columns were removed.")
    width = terminal_width or shutil.get_terminal_size((120, 24)).columns
    column_widths = table_column_widths(columns, width)

    yield format_table_row(columns, column_widths) + "\n"
    yield format_table_row(["-" * column_width for column_width in column_widths], column_widths) + "\n"

    for batch in parquet_file.iter_batches(batch_size=batch_size):
        for row in batch.to_pylist():
            if not row_matches_filters(row, parsed_filters):
                continue
            yield format_table_row([stringify_cell(row.get(column)) for column in columns], column_widths) + "\n"


def stream_parquet_to_pager(
    path: Path,
    pager: str = "more",
    filters: list[str] | None = None,
    remove_columns: str | None = None,
) -> None:
    with subprocess.Popen([pager], stdin=subprocess.PIPE, text=True) as process:
        if process.stdin is None:
            raise RuntimeError(f"Could not open stdin for pager {pager}.")
        try:
            for line in iter_parquet_table_lines(path, filters=filters, remove_columns=remove_columns):
                process.stdin.write(line)
            process.stdin.close()
        except BrokenPipeError:
            pass
        process.wait()


def peek(
    ctx: typer.Context,
    data_dir: Annotated[
        Path | None,
        typer.Option(
            "--data-dir",
            help=f"Local raw data root. Defaults to FORTYTWOGO_DATA_DIR or {DEFAULT_DATA_DIR}.",
        ),
    ] = None,
    pager: Annotated[str, typer.Option("--pager", help="Pager command. Defaults to more.")] = "more",
    filters: Annotated[
        list[str] | None,
        typer.Option("-f", "--filter", help="Filter rows by column=value. Use % as a wildcard. Repeatable."),
    ] = None,
    remove_columns: Annotated[
        str | None,
        typer.Option("-rmc", "--remove-columns", help="Comma-separated columns to hide from the result table."),
    ] = None,
) -> None:
    """Stream a local Parquet file through a pager."""
    try:
        path = resolve_peek_path(list(ctx.args), data_dir=data_dir)
        stream_parquet_to_pager(path, pager=pager, filters=filters, remove_columns=remove_columns)
    except RuntimeError as error:
        typer.echo(f"peek failed: {error}", err=True)
        raise typer.Exit(1) from error
