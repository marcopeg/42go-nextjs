from __future__ import annotations

import os
from pathlib import Path

QUERY_DIR_ENV_VAR = "FORTYTWOGO_QUERY_DIR"
DEFAULT_QUERY_DIR = Path(".local/42go-query")


def resolve_query_dir(query_dir: str | Path | None = None) -> Path:
    if query_dir:
        return Path(query_dir)
    return Path(os.environ.get(QUERY_DIR_ENV_VAR, str(DEFAULT_QUERY_DIR)))


def query_output_path(command_chain: list[str], query_dir: str | Path | None = None, suffix: str | None = None) -> Path:
    if not command_chain:
        raise RuntimeError("Query command chain cannot be empty.")
    stem = "-".join(command_chain)
    if suffix:
        stem = f"{stem}--{suffix}"
    return resolve_query_dir(query_dir) / f"{stem}.parquet"
