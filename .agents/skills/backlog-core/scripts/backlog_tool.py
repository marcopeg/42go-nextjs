#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path

from backlog_lib import normalize_task_id, rebuild_indexes, resolve_task, transition_task, update_frontmatter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Shared backlog CLI helpers.")
    parser.add_argument("--backlog-root", default="docs/backlog")
    subparsers = parser.add_subparsers(dest="command", required=True)

    resolve_parser = subparsers.add_parser("resolve")
    resolve_parser.add_argument("task_id")
    resolve_parser.add_argument("--states", nargs="*")

    sync_parser = subparsers.add_parser("sync-indexes")
    sync_parser.add_argument("--quiet", action="store_true")

    update_parser = subparsers.add_parser("update-frontmatter")
    update_parser.add_argument("--path", required=True)
    update_parser.add_argument("--kind", choices=["task", "plan", "notes"])
    update_parser.add_argument("--set", dest="set_values", action="append", default=[])
    update_parser.add_argument("--clear", dest="clear_keys", action="append", default=[])
    update_parser.add_argument("--refresh-updated-at", action="store_true")

    transition_parser = subparsers.add_parser("transition")
    transition_parser.add_argument("task_id")
    transition_parser.add_argument(
        "--to-state",
        required=True,
        choices=["draft", "ready", "wip", "blocked", "completed", "archived"],
    )
    transition_parser.add_argument("--review-after")
    return parser.parse_args()


def parse_set_values(raw_values: list[str]) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for item in raw_values:
        if "=" not in item:
            raise SystemExit(f"Invalid --set value: {item}")
        key, value = item.split("=", 1)
        parsed[key] = value
    return parsed


def main() -> int:
    args = parse_args()
    backlog_root = Path(args.backlog_root)

    if args.command == "resolve":
        record = resolve_task(backlog_root, args.task_id, set(args.states or []) or None)
        print(
            json.dumps(
                {
                    "taskId": record.task_id,
                    "state": record.state,
                    "title": record.title,
                    "folder": str(record.folder),
                    "taskFile": str(record.task_file),
                    "planFile": str(record.plan_file) if record.plan_file else None,
                    "notesFile": str(record.notes_file) if record.notes_file else None,
                    "normalizedTaskId": normalize_task_id(record.task_id),
                },
                indent=2,
            )
        )
        return 0

    if args.command == "sync-indexes":
        rebuild_indexes(backlog_root)
        if not args.quiet:
            print(f"Synchronized backlog indexes under {backlog_root}")
        return 0

    if args.command == "update-frontmatter":
        meta = update_frontmatter(
            Path(args.path),
            kind=args.kind,
            set_values=parse_set_values(args.set_values),
            clear_keys=args.clear_keys,
            refresh_updated_at=args.refresh_updated_at,
        )
        print(json.dumps(meta, indent=2))
        return 0

    if args.command == "transition":
        record = transition_task(
            backlog_root,
            args.task_id,
            args.to_state,
            review_after=args.review_after,
        )
        print(
            json.dumps(
                {
                    "taskId": record.task_id,
                    "state": record.state,
                    "folder": str(record.folder),
                    "taskFile": str(record.task_file),
                },
                indent=2,
            )
        )
        return 0

    raise SystemExit(f"Unknown command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
