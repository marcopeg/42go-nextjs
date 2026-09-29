from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

from fortytwogo_cli.events.dependencies import import_pyarrow
from fortytwogo_cli.events.paths import parquet_files, resolve_paths as resolve_event_paths


def deleted_user_keys(data_dir: Path | None) -> set[tuple[str, str]]:
    paths = resolve_event_paths(data_dir)
    deleted: set[tuple[str, str]] = set()
    _pa, pq = import_pyarrow()

    for path in parquet_files(paths):
        for row in pq.read_table(path, columns=["app_id", "name", "data"]).to_pylist():
            if row.get("name") != "user.deleted" or not row.get("app_id"):
                continue
            raw_data = row.get("data")
            try:
                data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
            except json.JSONDecodeError:
                continue
            target_user_id = data.get("targetUserId") if isinstance(data, dict) else None
            if target_user_id:
                deleted.add((str(row["app_id"]), str(target_user_id)))

    return deleted


def purge_deleted_user_rows(
    rows: Iterable[dict[str, Any]], deleted_keys: set[tuple[str, str]]
) -> list[dict[str, Any]]:
    return [
        row
        for row in rows
        if (str(row.get("app_id")), str(row.get("id") or row.get("user_id"))) not in deleted_keys
    ]
