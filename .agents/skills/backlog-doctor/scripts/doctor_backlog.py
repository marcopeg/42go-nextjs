#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path

SHARED = Path(__file__).resolve().parents[2] / "backlog-core" / "scripts"
sys.path.insert(0, str(SHARED))

from backlog_lib import ACTIVE_STATES, discover_tasks, read_markdown, rebuild_active_index, state_dir  # noqa: E402


@dataclass
class DoctorIssue:
    task_id: str
    status: str
    folder_state: str
    folder: str
    action: str
    details: list[str] = field(default_factory=list)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify and repair backlog status folders and indexes.")
    parser.add_argument("--backlog-root", default="docs/backlog")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def strip_frontmatter(path: Path) -> bool:
    meta, body = read_markdown(path)
    if not meta:
        return False
    path.write_text(body.lstrip("\n"))
    return True


def sidecar_markdown_files(folder: Path, canonical_task_file: Path) -> list[Path]:
    return sorted(
        path
        for path in folder.glob("*.md")
        if path.is_file() and path.resolve() != canonical_task_file.resolve()
    )


def main() -> int:
    args = parse_args()
    backlog_root = Path(args.backlog_root)
    issues: list[DoctorIssue] = []

    for record in discover_tasks(backlog_root):
        task_folder = record.folder
        if record.state not in ACTIVE_STATES:
            expected_folder = None
        else:
            expected_folder = state_dir(backlog_root, record.state) / record.folder.name

        if expected_folder is not None and expected_folder != record.folder:
            issue = DoctorIssue(
                task_id=record.task_id,
                status=record.state,
                folder_state=record.folder_state,
                folder=str(record.folder),
                action="move-folder",
                details=[f"{record.folder}->{expected_folder}"],
            )
            issues.append(issue)
            if not args.dry_run:
                if expected_folder.exists():
                    raise FileExistsError(f"Destination task folder already exists: {expected_folder}")
                expected_folder.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(record.folder), str(expected_folder))
                task_folder = expected_folder

        canonical_task_file = task_folder / record.task_file.name
        for path in sidecar_markdown_files(task_folder, canonical_task_file):
            meta, _ = read_markdown(path)
            if not meta:
                continue
            issues.append(
                DoctorIssue(
                    task_id=record.task_id,
                    status=record.state,
                    folder_state=record.folder_state,
                    folder=str(task_folder),
                    action="strip-frontmatter",
                    details=[str(path)],
                )
            )
            if not args.dry_run:
                strip_frontmatter(path)

    if not args.dry_run:
        rebuild_active_index(backlog_root)

    print(
        json.dumps(
            {
                "backlogRoot": str(backlog_root),
                "dryRun": args.dry_run,
                "issueCount": len(issues),
                "issues": [issue.__dict__ for issue in issues],
                "indexes": "checked" if args.dry_run else "rebuilt",
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
