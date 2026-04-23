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
    STATE_DIRS,
    apply_task_meta_defaults,
    derive_task_id,
    derive_task_slug,
    extract_title,
    infer_oldest_timestamp,
    infer_semantic_completion_timestamp,
    migrate_markdown_links,
    now_iso,
    notes_filename,
    plan_filename,
    read_markdown,
    rebuild_indexes,
    state_dir,
    strip_inline_metadata,
    task_filename,
    write_markdown,
)

SOURCE_STATE_DIRS = {
    "wip": "",
    "blocked": "blocked",
    "draft": "drafts",
    "ready": "ready",
    "completed": "completed",
    "archived": "archived",
}

INDEX_FILE_NAMES = {"BACKLOG.md", "COMPLETED.md", "ARCHIVED.md"}


@dataclass
class FlatTask:
    state: str
    task_source: Path
    plan_source: Path | None
    notes_source: Path | None
    task_id: str
    slug: str
    title: str
    task_meta: dict[str, str]
    task_body: str
    plan_meta: dict[str, str] | None
    plan_body: str | None
    notes_meta: dict[str, str] | None
    notes_body: str | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate flat backlog files to docs/backlog.")
    parser.add_argument("--source-root")
    parser.add_argument("--target-root", default="docs/backlog")
    parser.add_argument("--migration-timestamp")
    parser.add_argument("--remove-source-root", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def detect_source_root(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit)
    agents_backlog = Path(".agents/backlog")
    docs_backlog = Path("docs/backlog")
    if agents_backlog.exists():
        return agents_backlog
    return docs_backlog


def sibling_artifact(task_path: Path, suffix: str) -> Path:
    name = task_path.name
    if name.endswith(".task.md"):
        return task_path.with_name(name[: -len(".task.md")] + suffix)
    if name.endswith(".md"):
        return task_path.with_name(name[: -len(".md")] + suffix)
    return task_path.with_name(name + suffix)


def inventory_flat_tasks(source_root: Path) -> list[FlatTask]:
    tasks: list[FlatTask] = []
    for state, dirname in SOURCE_STATE_DIRS.items():
        directory = source_root / dirname if dirname else source_root
        if not directory.exists():
            continue
        for path in sorted(directory.glob("*.md")):
            if path.name in INDEX_FILE_NAMES:
                continue
            if path.name.endswith(".plan.md") or path.name.endswith(".notes.md"):
                continue
            task_meta, task_body = read_markdown(path)
            cleaned_body, _, _ = strip_inline_metadata(task_body)
            task_id = derive_task_id(path, task_meta, task_body)
            title = extract_title(cleaned_body, path.stem)
            slug = derive_task_slug(path, task_id, title)

            plan_source = sibling_artifact(path, ".plan.md")
            notes_source = sibling_artifact(path, ".notes.md")
            plan_meta, plan_body = ({}, None)
            notes_meta, notes_body = ({}, None)
            if plan_source.exists():
                plan_meta, plan_body = read_markdown(plan_source)
            else:
                plan_source = None
            if notes_source.exists():
                notes_meta, notes_body = read_markdown(notes_source)
            else:
                notes_source = None

            tasks.append(
                FlatTask(
                    state=state,
                    task_source=path,
                    plan_source=plan_source,
                    notes_source=notes_source,
                    task_id=task_id,
                    slug=slug,
                    title=title,
                    task_meta=task_meta,
                    task_body=cleaned_body,
                    plan_meta=plan_meta if plan_source else None,
                    plan_body=plan_body,
                    notes_meta=notes_meta if notes_source else None,
                    notes_body=notes_body,
                )
            )
    return tasks


def build_task_frontmatter(task: FlatTask, migration_timestamp: str) -> dict[str, str]:
    meta = dict(task.task_meta)
    meta = apply_task_meta_defaults(meta, task.task_id, task.state, migration_timestamp)
    meta["taskId"] = task.task_id

    if task.state != "blocked":
        meta.pop("reviewAfter", None)

    created_at = meta.get("createdAt") or infer_oldest_timestamp(task.task_source)
    if created_at:
        meta["createdAt"] = created_at

    if not meta.get("plannedAt") and task.plan_source:
        planned_at = infer_oldest_timestamp(task.plan_source)
        if planned_at:
            meta["plannedAt"] = planned_at
    if not meta.get("reviewedAt") and meta.get("plannedAt"):
        meta["reviewedAt"] = meta["plannedAt"]
    if not meta.get("startedAt"):
        started_at = infer_oldest_timestamp(task.notes_source) if task.notes_source else None
        if not started_at and task.state in {"wip", "completed"}:
            started_at = meta.get("plannedAt")
        if started_at:
            meta["startedAt"] = started_at
    if task.state == "completed" and not meta.get("completedAt"):
        completed_at = infer_semantic_completion_timestamp(
            task.task_source,
            *(p for p in [task.plan_source, task.notes_source] if p),
        )
        if completed_at:
            meta["completedAt"] = completed_at
    return meta


def build_artifact_frontmatter(
    meta: dict[str, str] | None,
    task_id: str,
    source_path: Path | None,
    migration_timestamp: str,
    fallback_created_at: str | None,
) -> dict[str, str]:
    result = dict(meta or {})
    result["taskId"] = task_id
    result["createdAt"] = result.get("createdAt") or (
        infer_oldest_timestamp(source_path) if source_path else None
    ) or fallback_created_at or migration_timestamp
    result["updatedAt"] = migration_timestamp
    return result


def write_migrated_task(task: FlatTask, target_root: Path, migration_timestamp: str, *, dry_run: bool) -> dict[Path, Path]:
    folder = state_dir(target_root, task.state) / f"{task.task_id}-{task.slug}"
    task_target = folder / task_filename(task.task_id)
    plan_target = folder / plan_filename(task.task_id) if task.plan_source else None
    notes_target = folder / notes_filename(task.task_id) if task.notes_source else None
    mapping: dict[Path, Path] = {task.task_source.resolve(): task_target.resolve()}
    if task.plan_source and plan_target:
        mapping[task.plan_source.resolve()] = plan_target.resolve()
    if task.notes_source and notes_target:
        mapping[task.notes_source.resolve()] = notes_target.resolve()

    if dry_run:
        return mapping

    folder.mkdir(parents=True, exist_ok=True)
    task_meta = build_task_frontmatter(task, migration_timestamp)
    write_markdown(task_target, task_meta, task.task_body, "task")

    if task.plan_source and plan_target and task.plan_body is not None:
        plan_meta = build_artifact_frontmatter(
            task.plan_meta,
            task.task_id,
            task.plan_source,
            migration_timestamp,
            task_meta.get("createdAt"),
        )
        write_markdown(plan_target, plan_meta, task.plan_body, "plan")

    if task.notes_source and notes_target and task.notes_body is not None:
        notes_meta = build_artifact_frontmatter(
            task.notes_meta,
            task.task_id,
            task.notes_source,
            migration_timestamp,
            task_meta.get("createdAt"),
        )
        write_markdown(notes_target, notes_meta, task.notes_body, "notes")
    return mapping


def rewrite_links(tasks: list[FlatTask], target_root: Path, mapping: dict[Path, Path], *, dry_run: bool) -> None:
    if dry_run:
        return
    for task in tasks:
        folder = state_dir(target_root, task.state) / f"{task.task_id}-{task.slug}"
        pairs = [(task.task_source, folder / task_filename(task.task_id))]
        if task.plan_source:
            pairs.append((task.plan_source, folder / plan_filename(task.task_id)))
        if task.notes_source:
            pairs.append((task.notes_source, folder / notes_filename(task.task_id)))
        for old_path, new_path in pairs:
            meta, body = read_markdown(new_path)
            updated = migrate_markdown_links(body, old_path, new_path, mapping)
            kind = "task" if new_path.name.endswith(".task.md") else "plan" if new_path.name.endswith(".plan.md") else "notes"
            write_markdown(new_path, meta, updated, kind)


def remove_flat_sources(tasks: list[FlatTask], source_root: Path, *, remove_source_root: bool, dry_run: bool) -> None:
    if dry_run:
        return
    for task in tasks:
        task.task_source.unlink(missing_ok=True)
        if task.plan_source:
            task.plan_source.unlink(missing_ok=True)
        if task.notes_source:
            task.notes_source.unlink(missing_ok=True)
    if remove_source_root and source_root != Path("docs/backlog") and source_root.exists():
        shutil.rmtree(source_root)


def main() -> int:
    args = parse_args()
    source_root = detect_source_root(args.source_root)
    target_root = Path(args.target_root)
    migration_timestamp = args.migration_timestamp or now_iso()

    flat_tasks = inventory_flat_tasks(source_root)
    if not flat_tasks:
        if not args.dry_run:
            rebuild_indexes(target_root)
        print(
            json.dumps(
                {
                    "sourceRoot": str(source_root),
                    "targetRoot": str(target_root),
                    "flatTasks": 0,
                    "action": "sync-indexes",
                },
                indent=2,
            )
        )
        return 0

    target_root.mkdir(parents=True, exist_ok=True)
    mapping: dict[Path, Path] = {}
    for task in flat_tasks:
        mapping.update(write_migrated_task(task, target_root, migration_timestamp, dry_run=args.dry_run))
    rewrite_links(flat_tasks, target_root, mapping, dry_run=args.dry_run)
    if not args.dry_run:
        rebuild_indexes(target_root)
    remove_flat_sources(
        flat_tasks,
        source_root,
        remove_source_root=args.remove_source_root,
        dry_run=args.dry_run,
    )
    print(
        json.dumps(
            {
                "sourceRoot": str(source_root),
                "targetRoot": str(target_root),
                "flatTasks": len(flat_tasks),
                "migrationTimestamp": migration_timestamp,
                "dryRun": args.dry_run,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
