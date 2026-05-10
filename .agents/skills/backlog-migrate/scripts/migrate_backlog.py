#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

SHARED = Path(__file__).resolve().parents[2] / "backlog-core" / "scripts"
sys.path.insert(0, str(SHARED))

from backlog_lib import (  # noqa: E402
    ACTIVE_STATES,
    LEGACY_STATE_DIRS,
    derive_task_id,
    draft_task_filename,
    now_iso,
    read_markdown,
    refined_task_filename,
    state_dir,
    task_filename,
    write_markdown,
)

MIGRATED_STATES = tuple(sorted(ACTIVE_STATES))


@dataclass
class MigrationAction:
    task_id: str
    source_folder: str
    target_folder: str
    status: str
    action: str
    details: list[str] = field(default_factory=list)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migrate active backlog tasks to canonical <taskid>.task.md files."
    )
    parser.add_argument("--backlog-root", default="docs/backlog")
    parser.add_argument("--migration-timestamp")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--states",
        nargs="*",
        choices=[*MIGRATED_STATES, "ready"],
        default=list(MIGRATED_STATES),
        help="Lifecycle statuses to migrate. Defaults to all active statuses.",
    )
    return parser.parse_args()


def doctor_script_candidates() -> list[Path]:
    skill_root = Path(__file__).resolve().parents[2]
    return [
        skill_root / "backlog-doctor" / "scripts" / "doctor_backlog.py",
        Path.home() / ".agents" / "skills" / "backlog-doctor" / "scripts" / "doctor_backlog.py",
    ]


def resolve_doctor_script() -> Path:
    for path in doctor_script_candidates():
        if path.is_file():
            return path
    raise FileNotFoundError("No backlog doctor script found in local or home skills")


def run_doctor(backlog_root: Path) -> dict[str, object]:
    script = resolve_doctor_script()
    result = subprocess.run(
        [sys.executable, str(script), "--backlog-root", str(backlog_root.resolve())],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def normalize_state(raw: str) -> str:
    if raw == "ready":
        return "planned"
    return raw


def candidate_task_files(folder: Path, task_id: str | None = None) -> list[Path]:
    patterns = ["*.task.md", "*.task.refined.md", "*.task.draft.md"]
    names: list[Path] = []
    for pattern in patterns:
        names.extend(sorted(folder.glob(pattern)))
    if task_id:
        preferred = [
            folder / task_filename(task_id),
            folder / refined_task_filename(task_id),
            folder / draft_task_filename(task_id),
        ]
        names = preferred + names
    seen: set[Path] = set()
    result: list[Path] = []
    for path in names:
        if path in seen or not path.is_file():
            continue
        seen.add(path)
        result.append(path)
    return result


def infer_task_id(folder: Path) -> str:
    candidates = candidate_task_files(folder)
    if not candidates:
        raise FileNotFoundError(f"No task file found in {folder}")
    for path in candidates:
        meta, body = read_markdown(path)
        try:
            return derive_task_id(path, meta, body)
        except ValueError:
            continue
    raise ValueError(f"Could not derive task ID for {folder}")


def markdown_without_frontmatter(path: Path) -> str:
    _, body = read_markdown(path)
    return body.lstrip("\n")


def merge_meta(*sources: dict[str, str]) -> dict[str, str]:
    merged: dict[str, str] = {}
    for source in sources:
        for key, value in source.items():
            if value in (None, ""):
                continue
            merged[key] = str(value)
    return merged


def has_pending_round(folder: Path, task_id: str) -> bool:
    for pattern in (f"{task_id}.question.v*.md", f"{task_id}.clarify.v*.md"):
        for path in sorted(folder.glob(pattern)):
            meta, body = read_markdown(path)
            if meta.get("answeredAt"):
                continue
            if "Answer:" in body or "pending" in body.lower():
                return True
    return False


def infer_status(
    folder_state: str,
    folder: Path,
    task_id: str,
    merged_meta: dict[str, str],
    refined_file: Path | None,
) -> str:
    raw_status = str(merged_meta.get("status") or "").strip()
    if folder_state in {"wip", "blocked", "completed", "archived"}:
        return folder_state
    if folder_state == "planned":
        return "planned"
    if raw_status in {"refining", "refined", "planned", "wip", "blocked"}:
        return raw_status
    if has_pending_round(folder, task_id) and not refined_file:
        return "refining"
    if refined_file:
        return "refined"
    return "draft"


def canonical_body(
    canonical_file: Path | None,
    draft_file: Path | None,
    refined_file: Path | None,
) -> str:
    if refined_file:
        body = markdown_without_frontmatter(refined_file)
        if draft_file:
            draft_body = markdown_without_frontmatter(draft_file).strip()
            if draft_body and draft_body not in body:
                body = body.rstrip() + "\n\n## Original Draft Source\n\n" + draft_body + "\n"
        return body
    if canonical_file:
        return markdown_without_frontmatter(canonical_file)
    if draft_file:
        return markdown_without_frontmatter(draft_file)
    raise FileNotFoundError("Cannot render canonical task body without a task source")


def strip_frontmatter(path: Path) -> bool:
    meta, body = read_markdown(path)
    if not meta:
        return False
    path.write_text(body.lstrip("\n"))
    return True


def iter_state_folders(backlog_root: Path, states: set[str]) -> list[tuple[str, Path]]:
    folders: list[tuple[str, Path]] = []
    seen: set[Path] = set()
    for state in states:
        directory = state_dir(backlog_root, state)
        if directory.exists():
            for folder in sorted(path for path in directory.iterdir() if path.is_dir()):
                folders.append((state, folder))
                seen.add(folder.resolve())
        legacy_dirname = LEGACY_STATE_DIRS.get(state)
        if legacy_dirname:
            legacy_directory = backlog_root / legacy_dirname
            if legacy_directory.exists():
                for folder in sorted(path for path in legacy_directory.iterdir() if path.is_dir()):
                    if folder.resolve() in seen:
                        continue
                    folders.append((state, folder))
                    seen.add(folder.resolve())
    return folders


def sidecar_files(folder: Path, task_id: str, canonical: Path) -> list[Path]:
    ignored = {canonical.name, draft_task_filename(task_id)}
    return sorted(path for path in folder.glob("*.md") if path.name not in ignored)


def migrate_folder(
    backlog_root: Path,
    folder_state: str,
    folder: Path,
    timestamp: str,
    *,
    dry_run: bool,
) -> MigrationAction:
    task_id = infer_task_id(folder)
    canonical_file = folder / task_filename(task_id)
    draft_file = folder / draft_task_filename(task_id)
    refined_file = folder / refined_task_filename(task_id)

    canonical_meta = read_markdown(canonical_file)[0] if canonical_file.exists() else {}
    draft_meta = read_markdown(draft_file)[0] if draft_file.exists() else {}
    refined_meta = read_markdown(refined_file)[0] if refined_file.exists() else {}

    merged_meta = merge_meta(draft_meta, canonical_meta, refined_meta)
    status = infer_status(
        folder_state,
        folder,
        task_id,
        merged_meta,
        refined_file if refined_file.exists() else None,
    )
    merged_meta["taskId"] = merged_meta.get("taskId") or task_id
    merged_meta["status"] = status
    merged_meta["updatedAt"] = timestamp
    if "createdAt" not in merged_meta:
        merged_meta["createdAt"] = timestamp
    if status == "refined":
        merged_meta["reviewedAt"] = merged_meta.get("reviewedAt") or timestamp
    elif status == "planned":
        merged_meta["plannedAt"] = merged_meta.get("plannedAt") or timestamp
    elif status == "wip":
        merged_meta["startedAt"] = merged_meta.get("startedAt") or timestamp
    if status != "blocked":
        merged_meta.pop("reviewAfter", None)

    target_folder = state_dir(backlog_root, status) / folder.name
    action = MigrationAction(
        task_id=task_id,
        source_folder=str(folder),
        target_folder=str(target_folder),
        status=status,
        action="migrate",
    )
    if target_folder != folder:
        action.details.append(f"move-folder:{folder}->{target_folder}")

    body = canonical_body(
        canonical_file if canonical_file.exists() else None,
        draft_file if draft_file.exists() else None,
        refined_file if refined_file.exists() else None,
    )

    if dry_run:
        action.details.append(f"write:{target_folder / task_filename(task_id)}")
        if draft_file.exists():
            action.details.append(f"remove:{draft_file.name}")
        for path in sidecar_files(folder, task_id, canonical_file):
            meta, _ = read_markdown(path)
            if meta:
                action.details.append(f"strip-frontmatter:{path.name}")
        return action

    if target_folder != folder:
        if target_folder.exists():
            raise FileExistsError(f"Destination task folder already exists: {target_folder}")
        target_folder.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(folder), str(target_folder))
        folder = target_folder
        canonical_file = folder / task_filename(task_id)
        draft_file = folder / draft_task_filename(task_id)
        refined_file = folder / refined_task_filename(task_id)

    write_markdown(canonical_file, merged_meta, body, "task")
    if draft_file.exists() and draft_file != canonical_file:
        draft_file.unlink()
    for path in sidecar_files(folder, task_id, canonical_file):
        strip_frontmatter(path)
    return action


def main() -> int:
    args = parse_args()
    backlog_root = Path(args.backlog_root)
    timestamp = args.migration_timestamp or now_iso()
    states = {normalize_state(state) for state in args.states}
    actions: list[MigrationAction] = []
    doctor_report: dict[str, object] | None = None

    for state, folder in iter_state_folders(backlog_root, states):
        actions.append(migrate_folder(backlog_root, state, folder, timestamp, dry_run=args.dry_run))

    if not args.dry_run:
        doctor_report = run_doctor(backlog_root)

    print(
        json.dumps(
            {
                "backlogRoot": str(backlog_root),
                "states": sorted(states),
                "migrationTimestamp": timestamp,
                "dryRun": args.dry_run,
                "actions": [action.__dict__ for action in actions],
                "doctor": doctor_report,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
