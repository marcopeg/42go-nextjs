#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

SHARED = Path(__file__).resolve().parents[2] / "backlog-core" / "scripts"
sys.path.insert(0, str(SHARED))

from backlog_lib import (  # noqa: E402
    apply_task_meta_defaults,
    derive_task_id,
    draft_task_filename,
    now_iso,
    read_markdown,
    rebuild_active_index,
    refined_task_filename,
    state_dir,
    task_filename,
    write_markdown,
)

MIGRATED_STATES = ("draft", "ready", "blocked")


@dataclass
class MigrationAction:
    state: str
    folder: str
    task_id: str
    source: str | None
    target: str
    action: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migrate active backlog task files to draft/refined task filenames."
    )
    parser.add_argument("--backlog-root", default="docs/backlog")
    parser.add_argument("--migration-timestamp")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--states",
        nargs="*",
        choices=MIGRATED_STATES,
        default=list(MIGRATED_STATES),
        help="Lifecycle states to migrate. Defaults to draft, ready, and blocked.",
    )
    return parser.parse_args()


def candidate_task_files(folder: Path) -> list[Path]:
    names = [
        *sorted(folder.glob("*.task.refined.md")),
        *sorted(folder.glob("*.task.draft.md")),
        *sorted(folder.glob("*.task.md")),
    ]
    seen: set[Path] = set()
    result: list[Path] = []
    for path in names:
        if path in seen:
            continue
        seen.add(path)
        result.append(path)
    return result


def infer_task_id(folder: Path) -> str:
    candidates = candidate_task_files(folder)
    if not candidates:
        raise FileNotFoundError(f"No task file found in {folder}")
    meta, body = read_markdown(candidates[0])
    return derive_task_id(candidates[0], meta, body)


def target_task_path(folder: Path, task_id: str, state: str) -> Path:
    if state == "draft":
        refined = folder / refined_task_filename(task_id)
        if refined.exists():
            return refined
        return folder / draft_task_filename(task_id)
    return folder / refined_task_filename(task_id)


def source_task_path(folder: Path, task_id: str, state: str, target: Path) -> Path | None:
    if target.exists():
        return None

    legacy = folder / task_filename(task_id)
    if legacy.exists():
        return legacy

    draft = folder / draft_task_filename(task_id)
    if state in {"ready", "blocked"} and draft.exists():
        return draft

    refined = folder / refined_task_filename(task_id)
    if refined.exists():
        return refined

    return None


def refresh_task_frontmatter(path: Path, task_id: str, state: str, timestamp: str) -> None:
    meta, body = read_markdown(path)
    meta = apply_task_meta_defaults(meta, task_id, state, timestamp)
    if state != "blocked":
        meta.pop("reviewAfter", None)
    write_markdown(path, meta, body, "task")


def migrate_folder(
    folder: Path,
    state: str,
    timestamp: str,
    *,
    dry_run: bool,
) -> MigrationAction:
    task_id = infer_task_id(folder)
    target = target_task_path(folder, task_id, state)
    source = source_task_path(folder, task_id, state, target)

    if target.exists():
        legacy = folder / task_filename(task_id)
        if legacy.exists() and legacy != target:
            raise RuntimeError(
                f"{folder} already has {target.name} and legacy {legacy.name}; "
                "refusing to guess which task file is authoritative"
            )
        if not dry_run:
            refresh_task_frontmatter(target, task_id, state, timestamp)
        return MigrationAction(
            state=state,
            folder=str(folder),
            task_id=task_id,
            source=None,
            target=str(target),
            action="already-current",
        )

    if not source:
        raise FileNotFoundError(f"No migratable task file found in {folder}")

    if not dry_run:
        shutil.move(str(source), str(target))
        refresh_task_frontmatter(target, task_id, state, timestamp)

    return MigrationAction(
        state=state,
        folder=str(folder),
        task_id=task_id,
        source=str(source),
        target=str(target),
        action="rename",
    )


def iter_state_folders(backlog_root: Path, states: list[str]) -> list[tuple[str, Path]]:
    folders: list[tuple[str, Path]] = []
    for state in states:
        directory = state_dir(backlog_root, state)
        if not directory.exists():
            continue
        for folder in sorted(path for path in directory.iterdir() if path.is_dir()):
            folders.append((state, folder))
    return folders


def main() -> int:
    args = parse_args()
    backlog_root = Path(args.backlog_root)
    timestamp = args.migration_timestamp or now_iso()
    actions: list[MigrationAction] = []

    for state, folder in iter_state_folders(backlog_root, args.states):
        actions.append(migrate_folder(folder, state, timestamp, dry_run=args.dry_run))

    if not args.dry_run:
        rebuild_active_index(backlog_root)

    print(
        json.dumps(
            {
                "backlogRoot": str(backlog_root),
                "states": args.states,
                "migrationTimestamp": timestamp,
                "dryRun": args.dry_run,
                "actions": [action.__dict__ for action in actions],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
