#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

DATABASE_URL_ENV_VAR = "EVENTS_DATABASE_URL"
ARCHIVE_DIR_ENV_VAR = "EVENTS_ANALYTICS_DIR"
DEFAULT_ARCHIVE_DIR = Path(".local/42go-events-analytics")
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
class Paths:
    root: Path
    events: Path
    csv_dir: Path
    parquet_dir: Path
    state: Path
    manifest: Path
    inflight: Path


def utc_now() -> datetime:
    return datetime.now(UTC)


def utc_stamp() -> str:
    return utc_now().strftime("%Y%m%dT%H%M%SZ")


def iso_utc(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download new events.events rows into paired CSV and Parquet batches."
    )
    parser.add_argument(
        "--archive-dir",
        default=os.environ.get(ARCHIVE_DIR_ENV_VAR, str(DEFAULT_ARCHIVE_DIR)),
        help=f"Local analytics archive root. Defaults to {DEFAULT_ARCHIVE_DIR}.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Maximum rows to export in one batch. Defaults to {DEFAULT_LIMIT}.",
    )
    parser.add_argument(
        "--batch-id",
        help="Optional batch ID. Defaults to batch-<UTC timestamp>; incomplete reruns reuse inflight batch ID.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and report the next batch without writing files or advancing state.",
    )
    parser.add_argument(
        "--app-id",
        help="Optional app_id filter. Use a separate archive directory when exporting one app at a time.",
    )
    return parser.parse_args()


def load_dotenv_value(path: Path, key: str) -> str | None:
    if not path.exists():
        return None
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip() != key:
            continue
        value = value.strip().strip('"').strip("'")
        return value or None
    return None


def get_database_url() -> str:
    value = os.environ.get(DATABASE_URL_ENV_VAR) or load_dotenv_value(Path(".env"), DATABASE_URL_ENV_VAR)
    if not value:
        raise SystemExit(f"{DATABASE_URL_ENV_VAR} is required.")
    return value


def resolve_paths(root: Path) -> Paths:
    events = root / "events"
    return Paths(
        root=root,
        events=events,
        csv_dir=events / "csv",
        parquet_dir=events / "parquet",
        state=events / "state.json",
        manifest=events / "manifest.jsonl",
        inflight=events / "inflight.json",
    )


def ensure_dirs(paths: Paths) -> None:
    paths.csv_dir.mkdir(parents=True, exist_ok=True)
    paths.parquet_dir.mkdir(parents=True, exist_ok=True)


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
        "created_at": row["created_at"].astimezone(UTC),
        "id": str(row["id"]),
        "app_id": row["app_id"],
        "user_id": row["user_id"],
        "event_at": row["event_at"].astimezone(UTC),
        "name": row["name"],
        "data": json_payload(row["data"]),
        "meta": json_payload(row["meta"]),
    }


def csv_row(row: dict[str, Any]) -> dict[str, Any]:
    result = dict(row)
    result["created_at"] = iso_utc(result["created_at"])
    result["event_at"] = iso_utc(result["event_at"])
    return result


def import_psycopg():
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as error:
        raise SystemExit(
            "Missing PostgreSQL dependency. Run: "
            "pip install -r .agents/skills/42go-events-export/requirements.txt"
        ) from error
    return psycopg, dict_row


def import_pyarrow():
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError as error:
        raise SystemExit(
            "Missing Parquet dependency. Run: "
            "pip install -r .agents/skills/42go-events-export/requirements.txt"
        ) from error
    return pa, pq


def import_duckdb():
    try:
        import duckdb
    except ImportError as error:
        raise SystemExit(
            "Missing DuckDB dependency. Run: "
            "pip install -r .agents/skills/42go-events-export/requirements.txt"
        ) from error
    return duckdb


def load_cursor(paths: Paths) -> tuple[str | None, str | None]:
    state = read_json(paths.state) or {}
    return state.get("last_created_at"), state.get("last_id")


def fetch_rows(
    database_url: str,
    cursor: tuple[str | None, str | None],
    limit: int,
    app_id: str | None = None,
) -> list[dict[str, Any]]:
    if limit <= 0:
        raise SystemExit("--limit must be greater than zero.")

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
    if app_id:
        where.append("app_id = %s")
        params.append(app_id)
    if last_created_at and last_id:
        where.append("(created_at, id) > (%s::timestamptz, %s::uuid)")
        params.extend([last_created_at, last_id])
    if where:
        base_sql += " WHERE " + " AND ".join(where)
    base_sql += " ORDER BY created_at ASC, id ASC LIMIT %s"
    params.append(limit)

    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor_obj:
            cursor_obj.execute(base_sql, params)
            return list(cursor_obj.fetchall())


def resolve_batch_id(paths: Paths, cursor: tuple[str | None, str | None], requested: str | None) -> str:
    if requested:
        return requested

    inflight = read_json(paths.inflight)
    if inflight and [*cursor] == inflight.get("cursor"):
        batch_id = inflight.get("batch_id")
        if batch_id:
            return batch_id

    return f"batch-{utc_stamp()}"


def write_inflight(paths: Paths, batch_id: str, cursor: tuple[str | None, str | None]) -> None:
    write_json_atomic(
        paths.inflight,
        {
            "batch_id": batch_id,
            "cursor": [*cursor],
            "created_at": iso_utc(utc_now()),
        },
    )


def write_csv_batch(path: Path, rows: list[dict[str, Any]]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", newline="") as file_obj:
        writer = csv.DictWriter(file_obj, fieldnames=EVENT_COLUMNS)
        writer.writeheader()
        for row in rows:
            writer.writerow(csv_row(row))
    tmp.replace(path)


def write_parquet_batch(path: Path, rows: list[dict[str, Any]]) -> None:
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
        raise SystemExit(f"Parquet smoke read failed: expected {expected_rows} rows, read {count}.")


def manifest_has_batch(path: Path, batch_id: str) -> bool:
    if not path.exists():
        return False
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue
        if item.get("batch_id") == batch_id:
            return True
    return False


def append_manifest(paths: Paths, batch_id: str, csv_path: Path, parquet_path: Path, rows: list[dict[str, Any]]) -> None:
    if manifest_has_batch(paths.manifest, batch_id):
        return
    first = rows[0]
    last = rows[-1]
    entry = {
        "batch_id": batch_id,
        "row_count": len(rows),
        "first_created_at": iso_utc(first["created_at"]),
        "first_id": first["id"],
        "last_created_at": iso_utc(last["created_at"]),
        "last_id": last["id"],
        "csv": str(csv_path),
        "parquet": str(parquet_path),
        "completed_at": iso_utc(utc_now()),
    }
    with paths.manifest.open("a") as file_obj:
        file_obj.write(json.dumps(entry, sort_keys=True) + "\n")


def write_state(paths: Paths, batch_id: str, rows: list[dict[str, Any]]) -> None:
    last = rows[-1]
    write_json_atomic(
        paths.state,
        {
            "version": 1,
            "last_batch_id": batch_id,
            "last_created_at": iso_utc(last["created_at"]),
            "last_id": last["id"],
            "row_count": len(rows),
            "updated_at": iso_utc(utc_now()),
        },
    )


def export_events(args: argparse.Namespace) -> int:
    paths = resolve_paths(Path(args.archive_dir))
    ensure_dirs(paths)
    database_url = get_database_url()
    cursor = load_cursor(paths)
    raw_rows = fetch_rows(database_url, cursor, args.limit, args.app_id)

    if not raw_rows:
        print("No new events to export.")
        return 0

    rows = [normalize_row(row) for row in raw_rows]
    last = rows[-1]

    if args.dry_run:
        print(
            json.dumps(
                {
                    "rows": len(rows),
                    "app_id": args.app_id,
                    "last_created_at": iso_utc(last["created_at"]),
                    "last_id": last["id"],
                    "would_advance_cursor": True,
                },
                indent=2,
            )
        )
        return 0

    batch_id = resolve_batch_id(paths, cursor, args.batch_id)
    write_inflight(paths, batch_id, cursor)

    csv_path = paths.csv_dir / f"{batch_id}.csv"
    parquet_path = paths.parquet_dir / f"{batch_id}.parquet"

    write_csv_batch(csv_path, rows)
    write_parquet_batch(parquet_path, rows)
    smoke_read_parquet(parquet_path, len(rows))
    append_manifest(paths, batch_id, csv_path, parquet_path, rows)
    write_state(paths, batch_id, rows)
    paths.inflight.unlink(missing_ok=True)

    print(
        json.dumps(
            {
                "batch_id": batch_id,
                "rows": len(rows),
                "app_id": args.app_id,
                "csv": str(csv_path),
                "parquet": str(parquet_path),
                "last_created_at": iso_utc(last["created_at"]),
                "last_id": last["id"],
            },
            indent=2,
        )
    )
    return 0


def main() -> int:
    return export_events(parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
