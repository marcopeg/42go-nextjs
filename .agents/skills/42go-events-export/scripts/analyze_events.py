#!/usr/bin/env python3

from __future__ import annotations

import argparse
import os
from pathlib import Path

ARCHIVE_DIR_ENV_VAR = "EVENTS_ANALYTICS_DIR"
DEFAULT_ARCHIVE_DIR = Path(".local/42go-events")


def import_duckdb():
    try:
        import duckdb
    except ImportError as error:
        raise SystemExit(
            "Missing DuckDB dependency. Run: "
            "pip install -r .agents/skills/42go-events-export/requirements.txt"
        ) from error
    return duckdb


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run local 42go event analytics smoke checks.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    wau = subparsers.add_parser("wau", help="Compute weekly active users from local monthly Parquet files.")
    wau.add_argument(
        "--archive-dir",
        default=os.environ.get(ARCHIVE_DIR_ENV_VAR, str(DEFAULT_ARCHIVE_DIR)),
        help=f"Local analytics archive root. Defaults to {DEFAULT_ARCHIVE_DIR}.",
    )
    return parser.parse_args()


def parquet_glob(archive_dir: Path) -> str:
    return str(archive_dir / "events" / "parquet" / "*.parquet")


def run_wau(archive_dir: Path) -> int:
    parquet_dir = archive_dir / "events" / "parquet"
    if not parquet_dir.exists() or not list(parquet_dir.glob("*.parquet")):
        print(f"No monthly Parquet files found under {parquet_dir}.")
        return 0

    duckdb = import_duckdb()
    query = """
        SELECT
          date_trunc('week', event_at) AS week_start,
          count(DISTINCT user_id) AS weekly_active_users
        FROM read_parquet(?)
        WHERE user_id IS NOT NULL
        GROUP BY 1
        ORDER BY 1
    """
    with duckdb.connect(":memory:") as connection:
        rows = connection.execute(query, [parquet_glob(archive_dir)]).fetchall()

    if not rows:
        print("No events found in local monthly Parquet files.")
        return 0

    print("week_start,weekly_active_users")
    for week_start, weekly_active_users in rows:
        print(f"{week_start},{weekly_active_users}")
    return 0


def main() -> int:
    args = parse_args()
    if args.command == "wau":
        return run_wau(Path(args.archive_dir))
    raise SystemExit(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
