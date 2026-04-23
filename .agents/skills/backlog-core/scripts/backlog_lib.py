#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

TASK_ID_RE = re.compile(r"\b([a-z]{2})(\d{1,2})\b", re.IGNORECASE)
PLAIN_YAML_RE = re.compile(r"^[A-Za-z0-9_.:+/@-]+$")
MARKDOWN_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
INLINE_TASK_ID_RE = re.compile(r"^\*\*TaskID\*\*:\s*(.+?)\s*$", re.IGNORECASE)
INLINE_STATUS_RE = re.compile(r"^\*\*Status\*\*:\s*(.+?)\s*$", re.IGNORECASE)

STATE_DIRS = OrderedDict(
    [
        ("wip", "wip"),
        ("blocked", "blocked"),
        ("ready", "ready"),
        ("draft", "drafts"),
        ("completed", "completed"),
        ("archived", "archived"),
    ]
)

ACTIVE_SECTION_ORDER = [
    ("WIP", "wip"),
    ("Blocked", "blocked"),
    ("Ready Tasks", "ready"),
    ("Drafts", "draft"),
]

TASK_FRONTMATTER_ORDER = [
    "taskId",
    "status",
    "createdAt",
    "updatedAt",
    "group",
    "reviewedAt",
    "plannedAt",
    "startedAt",
    "completedAt",
    "reviewAfter",
]
ARTIFACT_FRONTMATTER_ORDER = ["taskId", "createdAt", "updatedAt"]

STRUCTURAL_COMMIT_HINTS = (
    "move backlog",
    "refactor tasks in folders",
    "frontmatter",
    "folderize",
    "folderise",
    "backlog",
    "backlog-migrate",
)


@dataclass
class TaskRecord:
    state: str
    folder: Path
    task_file: Path
    plan_file: Path | None
    notes_file: Path | None
    task_id: str
    title: str
    meta: dict[str, str]


def now_iso() -> str:
    return datetime.now().astimezone().replace(microsecond=0).isoformat()


def normalize_task_id(raw: str) -> str:
    match = TASK_ID_RE.search(raw.strip())
    if not match:
        raise ValueError(f"Could not parse task ID from: {raw}")
    return f"{match.group(1).upper()}{int(match.group(2)):02d}"


def repo_root(cwd: Path | None = None) -> Path:
    target = cwd or Path.cwd()
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        cwd=target,
        check=True,
        capture_output=True,
        text=True,
    )
    return Path(result.stdout.strip())


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned or "task"


def render_yaml_value(value: str) -> str:
    if value == "":
        return '""'
    if PLAIN_YAML_RE.fullmatch(value):
        return value
    return json.dumps(value)


def parse_yaml_scalar(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
        if value[0] == '"':
            return json.loads(value)
        return value[1:-1]
    return value


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        return {}, text
    end_marker = text.find("\n---\n", 4)
    if end_marker == -1:
        return {}, text
    frontmatter = text[4:end_marker]
    body = text[end_marker + 5 :]
    data: dict[str, str] = {}
    for line in frontmatter.splitlines():
        if ": " not in line:
            continue
        key, value = line.split(": ", 1)
        data[key.strip()] = parse_yaml_scalar(value)
    return data, body


def dump_frontmatter(meta: dict[str, str], order: list[str]) -> str:
    lines = ["---"]
    seen: set[str] = set()
    for key in order:
        value = meta.get(key)
        if value in (None, ""):
            continue
        lines.append(f"{key}: {render_yaml_value(str(value))}")
        seen.add(key)
    for key in sorted(meta):
        if key in seen:
            continue
        value = meta[key]
        if value in (None, ""):
            continue
        lines.append(f"{key}: {render_yaml_value(str(value))}")
    lines.append("---")
    return "\n".join(lines) + "\n\n"


def read_markdown(path: Path) -> tuple[dict[str, str], str]:
    return parse_frontmatter(path.read_text())


def write_markdown(path: Path, meta: dict[str, str], body: str, kind: str) -> None:
    order = TASK_FRONTMATTER_ORDER if kind == "task" else ARTIFACT_FRONTMATTER_ORDER
    body = body.lstrip("\n")
    path.write_text(dump_frontmatter(meta, order) + body)


def extract_title(body: str, fallback: str) -> str:
    for line in body.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def detect_task_kind(path: Path) -> str:
    suffixes = path.suffixes
    if suffixes[-2:] == [".task", ".md"]:
        return "task"
    if suffixes[-2:] == [".plan", ".md"]:
        return "plan"
    if suffixes[-2:] == [".notes", ".md"]:
        return "notes"
    if suffixes[-1:] == [".md"]:
        return "task"
    raise ValueError(f"Unsupported markdown artifact kind for {path}")


def task_filename(task_id: str) -> str:
    return f"{task_id}.task.md"


def plan_filename(task_id: str) -> str:
    return f"{task_id}.plan.md"


def notes_filename(task_id: str) -> str:
    return f"{task_id}.notes.md"


def active_backlog_path(backlog_root: Path) -> Path:
    return backlog_root / "BACKLOG.md"


def completed_log_path(backlog_root: Path) -> Path:
    return backlog_root / "completed" / "COMPLETED.md"


def archived_log_path(backlog_root: Path) -> Path:
    return backlog_root / "archived" / "ARCHIVED.md"


def state_dir(backlog_root: Path, state: str) -> Path:
    if state not in STATE_DIRS:
        raise ValueError(f"Unsupported state: {state}")
    return backlog_root / STATE_DIRS[state]


def task_label(record: TaskRecord) -> str:
    return f"{record.task_id}: {record.title}"


def relative_link(from_dir: Path, target: Path) -> str:
    rel = os.path.relpath(target, from_dir)
    if not rel.startswith("."):
        rel = f"./{rel}"
    return rel.replace(os.sep, "/")


def discover_tasks(backlog_root: Path) -> list[TaskRecord]:
    tasks: list[TaskRecord] = []
    for state, dirname in STATE_DIRS.items():
        directory = backlog_root / dirname
        if not directory.exists():
            continue
        for task_file in sorted(directory.glob("*/*.task.md")):
            folder = task_file.parent
            meta, body = read_markdown(task_file)
            task_id = str(meta.get("taskId") or task_file.stem.replace(".task", ""))
            title = extract_title(body, folder.name)
            plan_path = folder / plan_filename(task_id)
            notes_path = folder / notes_filename(task_id)
            tasks.append(
                TaskRecord(
                    state=state,
                    folder=folder,
                    task_file=task_file,
                    plan_file=plan_path if plan_path.exists() else None,
                    notes_file=notes_path if notes_path.exists() else None,
                    task_id=task_id,
                    title=title,
                    meta=meta,
                )
            )
    return tasks


def resolve_task(backlog_root: Path, task_ref: str, states: set[str] | None = None) -> TaskRecord:
    normalized = normalize_task_id(task_ref)
    matches = []
    for record in discover_tasks(backlog_root):
        if normalize_task_id(record.task_id) != normalized:
            continue
        if states and record.state not in states:
            continue
        matches.append(record)
    if not matches:
        raise FileNotFoundError(f"Task {task_ref} not found in {backlog_root}")
    if len(matches) > 1:
        raise RuntimeError(f"Task {task_ref} resolved to multiple states")
    return matches[0]


def ensure_task_indexes(backlog_root: Path) -> None:
    (backlog_root / "completed").mkdir(parents=True, exist_ok=True)
    (backlog_root / "archived").mkdir(parents=True, exist_ok=True)


def parse_index_order(path: Path) -> list[Path]:
    if not path.exists():
        return []
    order: list[Path] = []
    for match in MARKDOWN_LINK_RE.finditer(path.read_text()):
        target = match.group(2)
        if target.endswith(".task.md"):
            order.append((path.parent / target).resolve())
    return order


def parse_active_section_order(path: Path) -> dict[str, list[Path]]:
    orders = {state: [] for _, state in ACTIVE_SECTION_ORDER}
    if not path.exists():
        return orders
    current: str | None = None
    for line in path.read_text().splitlines():
        if line.startswith("## "):
            current = None
            heading = line[3:].strip()
            for expected, state in ACTIVE_SECTION_ORDER:
                if heading == expected:
                    current = state
                    break
            continue
        if current is None:
            continue
        match = MARKDOWN_LINK_RE.search(line)
        if not match:
            continue
        target = match.group(2)
        if target.endswith(".task.md"):
            orders[current].append((path.parent / target).resolve())
    return orders


def order_records(records: list[TaskRecord], preferred: list[Path]) -> list[TaskRecord]:
    by_path = {record.task_file.resolve(): record for record in records}
    ordered: list[TaskRecord] = []
    seen: set[Path] = set()
    for path in preferred:
        record = by_path.get(path)
        if not record:
            continue
        ordered.append(record)
        seen.add(path)
    extras = [record for record in records if record.task_file.resolve() not in seen]
    extras.sort(key=lambda item: (item.task_id.lower(), item.title.lower()))
    ordered.extend(extras)
    return ordered


def render_active_entry(record: TaskRecord, backlog_root: Path) -> str:
    parts = [f"- [{task_label(record)}]({relative_link(backlog_root, record.task_file)})"]
    if record.plan_file:
        parts.append(f"[plan]({relative_link(backlog_root, record.plan_file)})")
    if record.notes_file:
        parts.append(f"[notes]({relative_link(backlog_root, record.notes_file)})")
    return " | ".join(parts)


def render_history_entry(record: TaskRecord, log_path: Path) -> str:
    parts = [f"- [{task_label(record)}]({relative_link(log_path.parent, record.task_file)})"]
    if record.plan_file:
        parts.append(f"[plan]({relative_link(log_path.parent, record.plan_file)})")
    if record.notes_file:
        parts.append(f"[notes]({relative_link(log_path.parent, record.notes_file)})")
    return " | ".join(parts)


def rebuild_indexes(backlog_root: Path) -> None:
    ensure_task_indexes(backlog_root)
    tasks = discover_tasks(backlog_root)
    by_state: dict[str, list[TaskRecord]] = {state: [] for state in STATE_DIRS}
    for record in tasks:
        by_state[record.state].append(record)

    backlog_path = active_backlog_path(backlog_root)
    active_orders = parse_active_section_order(backlog_path)
    lines = ["# Backlog", ""]
    for heading, state in ACTIVE_SECTION_ORDER:
        lines.append(f"## {heading}")
        lines.append("")
        for record in order_records(by_state[state], active_orders[state]):
            lines.append(render_active_entry(record, backlog_root))
        lines.append("")
    lines.extend(
        [
            "## Historical Logs",
            "",
            "- [Archived Log](./archived/ARCHIVED.md)",
            "- [Completed Log](./completed/COMPLETED.md)",
            "",
        ]
    )
    backlog_path.write_text("\n".join(lines))

    completed_path = completed_log_path(backlog_root)
    completed_lines = ["# Completed", ""]
    for record in order_records(by_state["completed"], parse_index_order(completed_path)):
        completed_lines.append(render_history_entry(record, completed_path))
    completed_lines.append("")
    completed_path.write_text("\n".join(completed_lines))

    archived_path = archived_log_path(backlog_root)
    archived_lines = ["# Archived", ""]
    for record in order_records(by_state["archived"], parse_index_order(archived_path)):
        archived_lines.append(render_history_entry(record, archived_path))
    archived_lines.append("")
    archived_path.write_text("\n".join(archived_lines))


def apply_task_meta_defaults(meta: dict[str, str], task_id: str, status: str, timestamp: str) -> dict[str, str]:
    result = dict(meta)
    result["taskId"] = result.get("taskId") or task_id
    result["status"] = status
    result["createdAt"] = result.get("createdAt") or timestamp
    result["updatedAt"] = timestamp
    return result


def transition_task(
    backlog_root: Path,
    task_ref: str,
    to_state: str,
    *,
    review_after: str | None = None,
    timestamp: str | None = None,
) -> TaskRecord:
    timestamp = timestamp or now_iso()
    record = resolve_task(backlog_root, task_ref)
    meta, body = read_markdown(record.task_file)
    meta = apply_task_meta_defaults(meta, record.task_id, to_state, timestamp)
    if to_state == "wip":
        meta["startedAt"] = meta.get("startedAt") or timestamp
        meta.pop("reviewAfter", None)
    elif to_state == "blocked":
        if not review_after:
            raise ValueError("Blocked transitions require review_after")
        meta["reviewAfter"] = review_after
    elif to_state == "completed":
        meta["completedAt"] = timestamp
        meta.pop("reviewAfter", None)
    elif to_state == "archived":
        meta.pop("reviewAfter", None)

    destination_folder = state_dir(backlog_root, to_state) / record.folder.name
    if destination_folder != record.folder:
        destination_folder.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(record.folder), str(destination_folder))
        task_file = destination_folder / record.task_file.name
    else:
        task_file = record.task_file
    write_markdown(task_file, meta, body, "task")
    rebuild_indexes(backlog_root)
    return resolve_task(backlog_root, record.task_id)


def update_frontmatter(
    path: Path,
    *,
    kind: str | None = None,
    set_values: dict[str, str] | None = None,
    clear_keys: list[str] | None = None,
    refresh_updated_at: bool = False,
    timestamp: str | None = None,
) -> dict[str, str]:
    timestamp = timestamp or now_iso()
    meta, body = read_markdown(path)
    result = dict(meta)
    for key, value in (set_values or {}).items():
        result[key] = value
    for key in clear_keys or []:
        result.pop(key, None)
    if refresh_updated_at and "updatedAt" in result:
        result["updatedAt"] = timestamp
    kind = kind or detect_task_kind(path)
    if result.get("createdAt") == "":
        result["createdAt"] = timestamp
    write_markdown(path, result, body, kind)
    return result


def read_git_history_timestamps(path: Path, *, semantic_only: bool = False) -> list[tuple[str, str]]:
    root = repo_root(path.parent)
    try:
        result = subprocess.run(
            ["git", "log", "--follow", "--format=%aI%x09%s", "--", str(path.relative_to(root))],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError:
        return []
    rows: list[tuple[str, str]] = []
    for line in result.stdout.splitlines():
        if "\t" not in line:
            continue
        stamp, subject = line.split("\t", 1)
        if semantic_only and any(hint in subject.lower() for hint in STRUCTURAL_COMMIT_HINTS):
            continue
        rows.append((stamp, subject))
    return rows


def infer_oldest_timestamp(*paths: Path) -> str | None:
    timestamps: list[str] = []
    for path in paths:
        for stamp, _ in read_git_history_timestamps(path):
            timestamps.append(stamp)
    return min(timestamps) if timestamps else None


def infer_semantic_completion_timestamp(*paths: Path) -> str | None:
    timestamps: list[str] = []
    for path in paths:
        for stamp, _ in read_git_history_timestamps(path, semantic_only=True):
            timestamps.append(stamp)
    return max(timestamps) if timestamps else None


def strip_inline_metadata(body: str) -> tuple[str, str | None, str | None]:
    task_id: str | None = None
    status: str | None = None
    kept: list[str] = []
    for line in body.splitlines():
        match = INLINE_TASK_ID_RE.match(line.strip())
        if match:
            task_id = match.group(1).strip()
            continue
        match = INLINE_STATUS_RE.match(line.strip())
        if match:
            status = match.group(1).strip()
            continue
        kept.append(line)
    cleaned = "\n".join(kept).lstrip("\n")
    if body.endswith("\n"):
        cleaned += "\n"
    return cleaned, task_id, status


def derive_task_id(path: Path, meta: dict[str, str], body: str) -> str:
    if meta.get("taskId"):
        return str(meta["taskId"])
    _, inline_task_id, _ = strip_inline_metadata(body)
    if inline_task_id:
        return normalize_task_id(inline_task_id)
    match = TASK_ID_RE.search(path.name)
    if not match:
        raise ValueError(f"Could not derive task ID for {path}")
    return normalize_task_id(match.group(0))


def derive_task_slug(path: Path, task_id: str, title: str) -> str:
    stem = path.name
    if stem.endswith(".task.md"):
        stem = stem[: -len(".task.md")]
    elif stem.endswith(".md"):
        stem = stem[: -len(".md")]
    lowered = task_id.lower()
    for prefix in (task_id, lowered):
        if stem.startswith(prefix + "-"):
            return stem[len(prefix) + 1 :]
    return slugify(title)


def migrate_markdown_links(
    text: str,
    old_path: Path,
    new_path: Path,
    mapping: dict[Path, Path],
) -> str:
    def replace(match: re.Match[str]) -> str:
        label, target = match.groups()
        if target.startswith(("http://", "https://", "#", "mailto:")):
            return match.group(0)
        resolved = (old_path.parent / target).resolve()
        destination = mapping.get(resolved)
        if not destination:
            return match.group(0)
        return f"[{label}]({relative_link(new_path.parent, destination)})"

    return MARKDOWN_LINK_RE.sub(replace, text)
