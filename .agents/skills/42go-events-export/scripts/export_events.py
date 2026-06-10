#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(REPO_ROOT / "cli" / "src"))

from fortytwogo_cli.events.paths import DEFAULT_ARCHIVE_DIR  # noqa: E402
from fortytwogo_cli.events.pull import DEFAULT_LIMIT, PullOptions, pull_events  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compatibility wrapper for: 42go events pull"
    )
    parser.add_argument(
        "--archive-dir",
        default=None,
        help=f"Local analytics archive root. Defaults to EVENTS_ANALYTICS_DIR or {DEFAULT_ARCHIVE_DIR}.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Maximum rows to export in one run. Defaults to {DEFAULT_LIMIT}.",
    )
    parser.add_argument(
        "--run-id",
        help="Optional manifest run ID. Defaults to run-<UTC timestamp>; incomplete reruns reuse inflight run ID.",
    )
    parser.add_argument("--batch-id", dest="run_id", help=argparse.SUPPRESS)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and report the next rows without writing files or advancing state.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        result = pull_events(
            PullOptions(
                archive_dir=Path(args.archive_dir) if args.archive_dir else None,
                limit=args.limit,
                run_id=args.run_id,
                dry_run=args.dry_run,
            )
        )
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        return 1

    message = result.pop("message", None)
    if message and result.get("rows") == 0 and not result.get("removed_legacy_files"):
        print(message)
        return 0
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
