from __future__ import annotations

from typing import Any


INSTALL_HINT = "Install the CLI with: pipx install ./cli"


def import_duckdb() -> Any:
    try:
        import duckdb
    except ImportError as error:
        raise RuntimeError(f"Missing DuckDB dependency. {INSTALL_HINT}") from error
    return duckdb


def import_psycopg() -> tuple[Any, Any]:
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as error:
        raise RuntimeError(f"Missing PostgreSQL dependency. {INSTALL_HINT}") from error
    return psycopg, dict_row


def import_pyarrow() -> tuple[Any, Any]:
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError as error:
        raise RuntimeError(f"Missing Parquet dependency. {INSTALL_HINT}") from error
    return pa, pq
