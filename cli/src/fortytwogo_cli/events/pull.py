from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable

from fortytwogo_cli.events.dependencies import import_duckdb, import_psycopg, import_pyarrow
from fortytwogo_cli.events.paths import ArchivePaths, ensure_dirs, get_database_url, resolve_paths

DEFAULT_LIMIT = 10000
EVENT_COLUMNS = [
    "created_at",
    "id",
    "app_id",
    "user_id",
    "event_at",
    "name",
    "data",
    "meta",
]


@dataclass(frozen=True)
class PullOptions:
    data_dir: Path | None = None
    limit: int = DEFAULT_LIMIT
    run_id: str | None = None
    reset: bool = False
    dry_run: bool = False


def utc_now() -> datetime:
    return datetime.now(UTC)


def utc_stamp() -> str:
    return utc_now().strftime("%Y%m%dT%H%M%SZ")


def parse_utc(value: Any) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC)
    if not isinstance(value, str):
        raise TypeError(f"Expected timestamp string or datetime, got {type(value).__name__}.")
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def iso_utc(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text())


def write_json_atomic(path: Path, data: dict[str, Any]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")
    tmp.replace(path)


def json_payload(value: Any) -> str:
    if value is None:
        return "{}"
    if isinstance(value, str):
        return value
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "created_at": parse_utc(row["created_at"]),
        "id": str(row["id"]),
        "app_id": row["app_id"],
        "user_id": row["user_id"],
        "event_at": parse_utc(row["event_at"]),
        "name": row["name"],
        "data": json_payload(row["data"]),
        "meta": json_payload(row["meta"]),
    }


def load_cursor(paths: ArchivePaths) -> tuple[str | None, str | None]:
    state = read_json(paths.state)
    if state is None:
        for legacy_path in legacy_state_paths(paths):
            state = read_json(legacy_path)
            if state is not None:
                break
    state = state or {}
    return state.get("last_created_at"), state.get("last_id")


def legacy_state_paths(paths: ArchivePaths) -> list[Path]:
    return [paths.root / "_state" / "events.json"]


def legacy_manifest_paths(paths: ArchivePaths) -> list[Path]:
    return [paths.root / "_state" / "events_manifest.jsonl"]


def legacy_inflight_paths(paths: ArchivePaths) -> list[Path]:
    return [paths.root / "_state" / "events_inflight.json"]


def fetch_rows(
    database_url: str,
    cursor: tuple[str | None, str | None],
    limit: int,
) -> list[dict[str, Any]]:
    if limit <= 0:
        raise RuntimeError("--limit must be greater than zero.")

    psycopg, dict_row = import_psycopg()
    last_created_at, last_id = cursor
    base_sql = """
        SELECT
          created_at,
          id::text AS id,
          app_id,
          user_id,
          event_at,
          name,
          data,
          meta
        FROM events.events
    """
    params: list[Any] = []
    where: list[str] = []
    if last_created_at and last_id:
        where.append("(created_at, id) > (%s::timestamptz, %s::uuid)")
        params.extend([last_created_at, last_id])
    if where:
        base_sql += " WHERE " + " AND ".join(where)
    base_sql += " ORDER BY created_at ASC, id ASC LIMIT %s"
    params.append(limit)

    try:
        with psycopg.connect(database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor_obj:
                cursor_obj.execute(base_sql, params)
                return list(cursor_obj.fetchall())
    except Exception as error:
        raise RuntimeError(f"Failed to fetch events from BACKUP_DATABASE_URL: {error}") from error


def resolve_run_id(paths: ArchivePaths, cursor: tuple[str | None, str | None], requested: str | None) -> str:
    if requested:
        return requested

    inflight = read_json(paths.inflight)
    if inflight is None:
        for legacy_path in legacy_inflight_paths(paths):
            inflight = read_json(legacy_path)
            if inflight is not None:
                break
    if inflight and [*cursor] == inflight.get("cursor"):
        run_id = inflight.get("run_id") or inflight.get("batch_id")
        if run_id:
            return run_id

    return f"run-{utc_stamp()}"


def write_inflight(paths: ArchivePaths, run_id: str, cursor: tuple[str | None, str | None]) -> None:
    write_json_atomic(
        paths.inflight,
        {
            "run_id": run_id,
            "cursor": [*cursor],
            "created_at": iso_utc(utc_now()),
        },
    )


def month_key(row: dict[str, Any]) -> str:
    return row["created_at"].strftime("%Y%m")


def month_name(month: str) -> str:
    return f"events_{month}"


def monthly_paths(paths: ArchivePaths, month: str) -> Path:
    name = month_name(month)
    return paths.parquet_dir / f"{name}.parquet"


def group_rows_by_month(rows: Iterable[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(month_key(row), []).append(row)
    return grouped


def sort_rows(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(rows, key=lambda row: (row["created_at"], row["id"]))


def dedupe_rows(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    for row in rows:
        by_id[row["id"]] = row
    return sort_rows(by_id.values())


def read_parquet_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    _pa, pq = import_pyarrow()
    table = pq.read_table(path)
    return [normalize_row(row) for row in table.to_pylist()]


def write_parquet_file(path: Path, rows: list[dict[str, Any]]) -> None:
    pa, pq = import_pyarrow()
    tmp = path.with_suffix(path.suffix + ".tmp")
    schema = pa.schema(
        [
            ("created_at", pa.timestamp("us", tz="UTC")),
            ("id", pa.string()),
            ("app_id", pa.string()),
            ("user_id", pa.string()),
            ("event_at", pa.timestamp("us", tz="UTC")),
            ("name", pa.string()),
            ("data", pa.string()),
            ("meta", pa.string()),
        ]
    )
    columns = {column: [row[column] for row in rows] for column in EVENT_COLUMNS}
    table = pa.table(columns, schema=schema)
    pq.write_table(table, tmp, compression="zstd")
    tmp.replace(path)


def smoke_read_parquet(path: Path, expected_rows: int) -> None:
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        count = connection.execute("SELECT count(*) FROM read_parquet(?)", [str(path)]).fetchone()[0]
    if count != expected_rows:
        raise RuntimeError(f"Parquet smoke read failed: expected {expected_rows} rows, read {count}.")


def write_state(paths: ArchivePaths, run_id: str, rows: list[dict[str, Any]], updates: list[dict[str, Any]]) -> None:
    first = rows[0]
    last = rows[-1]
    write_json_atomic(
        paths.state,
        {
            "version": 1,
            "last_run_id": run_id,
            "last_row_count": len(rows),
            "first_created_at": iso_utc(first["created_at"]),
            "first_id": first["id"],
            "last_created_at": iso_utc(last["created_at"]),
            "last_id": last["id"],
            "months": updates,
            "updated_at": iso_utc(utc_now()),
        },
    )


def merge_month(paths: ArchivePaths, month: str, new_rows: list[dict[str, Any]]) -> dict[str, Any]:
    parquet_path = monthly_paths(paths, month)
    existing_parquet_rows = read_parquet_rows(parquet_path)

    merged_rows = dedupe_rows([*existing_parquet_rows, *new_rows])
    write_parquet_file(parquet_path, merged_rows)
    smoke_read_parquet(parquet_path, len(merged_rows))
    return {
        "month": month,
        "parquet": str(parquet_path),
        "new_rows": len(new_rows),
        "total_rows": len(merged_rows),
    }


def remove_legacy_batches(paths: ArchivePaths) -> list[str]:
    removed: list[str] = []
    for path in paths.parquet_dir.glob("batch-*.parquet"):
        path.unlink()
        removed.append(str(path))
    return removed


def reset_archive(paths: ArchivePaths) -> None:
    if paths.parquet_dir.exists():
        for path in paths.parquet_dir.glob("*.parquet"):
            path.unlink()
    for path in [
        paths.state,
        paths.inflight,
        *legacy_state_paths(paths),
        *legacy_manifest_paths(paths),
        *legacy_inflight_paths(paths),
    ]:
        path.unlink(missing_ok=True)


def pull_events(options: PullOptions) -> dict[str, Any]:
    database_url = get_database_url()
    paths = resolve_paths(options.data_dir)
    ensure_dirs(paths)
    if options.reset and not options.dry_run:
        reset_archive(paths)
    cursor = (None, None) if options.reset else load_cursor(paths)
    raw_rows = fetch_rows(database_url, cursor, options.limit)

    if not raw_rows:
        return {
            "rows": 0,
            "removed_legacy_files": remove_legacy_batches(paths),
            "message": "No new events to export.",
        }

    rows = [normalize_row(row) for row in raw_rows]
    last = rows[-1]

    if options.dry_run:
        return {
            "rows": len(rows),
            "months": sorted(group_rows_by_month(rows).keys()),
            "last_created_at": iso_utc(last["created_at"]),
            "last_id": last["id"],
            "would_advance_cursor": True,
        }

    run_id = resolve_run_id(paths, cursor, options.run_id)
    write_inflight(paths, run_id, cursor)

    updates = []
    for month, month_rows in sorted(group_rows_by_month(rows).items()):
        updates.append(merge_month(paths, month, month_rows))

    removed_legacy_files = remove_legacy_batches(paths)
    write_state(paths, run_id, rows, updates)
    paths.inflight.unlink(missing_ok=True)

    return {
        "run_id": run_id,
        "rows": len(rows),
        "months": updates,
        "removed_legacy_files": removed_legacy_files,
        "last_created_at": iso_utc(last["created_at"]),
        "last_id": last["id"],
    }
