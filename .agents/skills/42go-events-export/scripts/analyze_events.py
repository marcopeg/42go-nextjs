#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO_ROOT / "cli" / "src"))

from fortytwogo_cli.events.paths import DEFAULT_ARCHIVE_DIR, resolve_paths  # noqa: E402
from fortytwogo_cli.events.query import format_stats, load_event_stats, no_events_message  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compatibility wrapper for local 42Go event queries."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    stats = subparsers.add_parser("stats", help="Print high-level stats from local monthly Parquet files.")
    stats.add_argument(
        "--archive-dir",
        default=None,
        help=f"Local analytics archive root. Defaults to EVENTS_ANALYTICS_DIR or {DEFAULT_ARCHIVE_DIR}.",
    )

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command != "stats":
        print("Unsupported command. Use: 42go events query stats", file=sys.stderr)
        return 1

    archive_dir = Path(args.archive_dir) if args.archive_dir else None
    try:
        stats = load_event_stats(archive_dir)
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        return 1

    if stats is None:
        print(no_events_message(resolve_paths(archive_dir)))
        return 0
    print(format_stats(stats))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
