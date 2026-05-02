#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SHARED = Path(__file__).resolve().parents[2] / "backlog-core" / "scripts"
sys.path.insert(0, str(SHARED))

from backlog_lib import completed_log_path, resolve_task, transition_task  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Complete a backlog task.")
    parser.add_argument("task_id")
    parser.add_argument("--backlog-root", default="docs/backlog")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    backlog_root = Path(args.backlog_root)
    resolve_task(backlog_root, args.task_id, {"wip"})

    completed_path = completed_log_path(backlog_root)
    before_completed = completed_path.read_text() if completed_path.exists() else None
    record = transition_task(backlog_root, args.task_id, "completed")
    after_completed = completed_path.read_text()

    if before_completed is not None:
        if not after_completed.startswith(before_completed):
            raise RuntimeError(
                f"{completed_path} was rewritten during completion; expected append-only update"
            )
        appended = after_completed[len(before_completed) :]
        appended_lines = [line for line in appended.splitlines() if line.strip()]
        if len(appended_lines) != 1 or f"[{record.task_id}:" not in appended_lines[0]:
            raise RuntimeError(
                f"{completed_path} must append exactly one entry for {record.task_id}"
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


if __name__ == "__main__":
    raise SystemExit(main())
