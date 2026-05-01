#!/usr/bin/env python3

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any


DEFAULT_SESSIONS_ROOT = "docs/vibe-sessions"
SESSION_FILE_NAME = "session.md"
MEMORY_FILE_NAME = "memory.md"
SESSION_FRONTMATTER_ORDER = [
    "sessionId",
    "sessionSlug",
    "goal",
    "status",
    "startedAt",
    "updatedAt",
    "memoryFile",
]
MEMORY_FRONTMATTER_ORDER = [
    "sessionId",
    "sessionSlug",
    "goal",
    "status",
    "createdAt",
    "updatedAt",
    "sourceSession",
]


@dataclass
class MarkdownDocument:
    frontmatter: dict[str, Any]
    body: str


@dataclass
class SessionPaths:
    session_dir: Path
    session_file: Path
    memory_file: Path


def current_time() -> datetime:
    return datetime.now().astimezone()


def iso_timestamp(value: datetime | None = None) -> str:
    return (value or current_time()).isoformat(timespec="seconds")


def display_timestamp(value: datetime | None = None) -> str:
    return (value or current_time()).strftime("%Y-%m-%d %H:%M")


def make_session_id(value: datetime | None = None) -> str:
    return (value or current_time()).strftime("%y%m%d%H%M")


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "session"


def resolve_path(path_value: str) -> Path:
    path = Path(path_value)
    return path if path.is_absolute() else Path.cwd() / path


def resolve_sessions_root(path_value: str | None = None) -> Path:
    return resolve_path(path_value or DEFAULT_SESSIONS_ROOT)


def dump_frontmatter(frontmatter: dict[str, Any], ordered_keys: list[str]) -> str:
    lines = ["---"]
    for key in ordered_keys:
        if key in frontmatter:
            lines.append(f"{key}: {json.dumps(frontmatter[key])}")
    for key in sorted(frontmatter):
        if key not in ordered_keys:
            lines.append(f"{key}: {json.dumps(frontmatter[key])}")
    lines.append("---")
    return "\n".join(lines)


def load_document(path: Path) -> MarkdownDocument:
    content = path.read_text(encoding="utf-8")
    if not content.startswith("---\n"):
        raise ValueError(f"{path} does not start with YAML frontmatter")

    end_marker = "\n---\n"
    end_index = content.find(end_marker, 4)
    if end_index == -1:
        raise ValueError(f"{path} has malformed YAML frontmatter")

    raw_frontmatter = content[4:end_index]
    body = content[end_index + len(end_marker) :]
    frontmatter: dict[str, Any] = {}

    for line in raw_frontmatter.splitlines():
        if not line.strip():
            continue
        key, sep, raw_value = line.partition(":")
        if not sep:
            raise ValueError(f"Malformed frontmatter line in {path}: {line}")
        raw_value = raw_value.strip()
        frontmatter[key.strip()] = json.loads(raw_value) if raw_value.startswith('"') else raw_value

    return MarkdownDocument(frontmatter=frontmatter, body=body)


def save_document(path: Path, document: MarkdownDocument, ordered_keys: list[str]) -> None:
    content = f"{dump_frontmatter(document.frontmatter, ordered_keys)}\n{document.body}"
    path.write_text(content, encoding="utf-8")


def session_file_from_input(path_value: str) -> Path:
    path = resolve_path(path_value)
    if path.is_dir():
        path = path / SESSION_FILE_NAME
    return path


def load_session_paths(path_value: str) -> SessionPaths:
    session_file = session_file_from_input(path_value)
    session_dir = session_file.parent
    return SessionPaths(
        session_dir=session_dir,
        session_file=session_file,
        memory_file=session_dir / MEMORY_FILE_NAME,
    )


def create_session_body(goal: str) -> str:
    return (
        f"# Vibe Session — {goal}\n\n"
        "## Goal\n\n"
        f"{goal}\n\n"
        "## Context Digest\n\n"
        "> Populate after scanning the backlog, documentation, and codebase.\n\n"
        "## Durable Documentation Targets\n\n"
        "- Promote stable findings into the paired `memory.md` during the session.\n"
        "- Promote broader repo knowledge into the relevant permanent docs under `docs/`.\n\n"
        "## Log\n\n"
        "<!-- Timestamped working notes are appended here. -->\n"
    )


def create_memory_body(goal: str) -> str:
    return (
        f"# Session Memory — {goal}\n\n"
        "## Goal\n\n"
        f"{goal}\n\n"
        "## Stable Context\n\n"
        "> Move only durable context here. Keep temporary exploration in `session.md`.\n\n"
        "## Decisions\n\n"
        "- None yet.\n\n"
        "## Architecture Notes\n\n"
        "- None yet.\n\n"
        "## Working Agreements\n\n"
        "- None yet.\n\n"
        "## Open Questions\n\n"
        "- None yet.\n"
    )


def create_session(goal: str, sessions_root: Path) -> dict[str, str]:
    started = current_time()
    session_id = make_session_id(started)
    session_slug = slugify(goal)
    session_dir = sessions_root / f"{session_id}.{session_slug}"
    counter = 2
    while session_dir.exists():
        session_dir = sessions_root / f"{session_id}.{session_slug}-{counter}"
        counter += 1
    session_dir.mkdir(parents=True, exist_ok=False)

    session_file = session_dir / SESSION_FILE_NAME
    memory_file = session_dir / MEMORY_FILE_NAME
    timestamp = iso_timestamp(started)

    save_document(
        session_file,
        MarkdownDocument(
            frontmatter={
                "sessionId": session_id,
                "sessionSlug": session_slug,
                "goal": goal,
                "status": "active",
                "startedAt": timestamp,
                "updatedAt": timestamp,
                "memoryFile": "./memory.md",
            },
            body=create_session_body(goal),
        ),
        SESSION_FRONTMATTER_ORDER,
    )
    save_document(
        memory_file,
        MarkdownDocument(
            frontmatter={
                "sessionId": session_id,
                "sessionSlug": session_slug,
                "goal": goal,
                "status": "active",
                "createdAt": timestamp,
                "updatedAt": timestamp,
                "sourceSession": "./session.md",
            },
            body=create_memory_body(goal),
        ),
        MEMORY_FRONTMATTER_ORDER,
    )

    return {
        "sessionDir": str(session_dir),
        "sessionFile": str(session_file),
        "memoryFile": str(memory_file),
        "sessionId": session_id,
        "sessionSlug": session_slug,
        "status": "active",
    }


def append_session_entry(session_file: Path, title: str, body: str) -> dict[str, str]:
    document = load_document(session_file)
    entry = f"\n### {display_timestamp()} — {title.strip()}\n\n{body.strip()}\n"
    if not document.body.endswith("\n"):
        document.body += "\n"
    document.body += entry
    document.frontmatter["updatedAt"] = iso_timestamp()
    save_document(session_file, document, SESSION_FRONTMATTER_ORDER)
    return {
        "sessionFile": str(session_file),
        "updatedAt": document.frontmatter["updatedAt"],
    }


def touch_memory(memory_file: Path) -> dict[str, str]:
    document = load_document(memory_file)
    document.frontmatter["updatedAt"] = iso_timestamp()
    save_document(memory_file, document, MEMORY_FRONTMATTER_ORDER)
    return {
        "memoryFile": str(memory_file),
        "updatedAt": document.frontmatter["updatedAt"],
    }


def latest_session(sessions_root: Path, only_active: bool = True) -> dict[str, str] | None:
    if not sessions_root.exists():
        return None

    for session_dir in sorted((path for path in sessions_root.iterdir() if path.is_dir()), reverse=True):
        session_file = session_dir / SESSION_FILE_NAME
        if not session_file.exists():
            continue
        document = load_document(session_file)
        if only_active and document.frontmatter.get("status") != "active":
            continue
        return {
            "sessionDir": str(session_dir),
            "sessionFile": str(session_file),
            "memoryFile": str(session_dir / MEMORY_FILE_NAME),
            "sessionId": str(document.frontmatter.get("sessionId", "")),
            "sessionSlug": str(document.frontmatter.get("sessionSlug", "")),
            "status": str(document.frontmatter.get("status", "")),
            "goal": str(document.frontmatter.get("goal", "")),
            "updatedAt": str(document.frontmatter.get("updatedAt", "")),
        }
    return None


def promote_memory(session_file: Path, memory_file: Path, title: str, summary: str, doc_path: str | None) -> dict[str, str]:
    append_body = summary.strip()
    if doc_path:
        append_body = f"Promoted stable context into `{doc_path}`. {append_body}".strip()
    append_session_entry(session_file, title, append_body)
    touch_memory(memory_file)
    return {
        "sessionFile": str(session_file),
        "memoryFile": str(memory_file),
        "status": "active",
    }


def close_session(session_file: Path, memory_file: Path, summary: str | None) -> dict[str, str]:
    document = load_document(session_file)
    document.frontmatter["status"] = "closed"
    document.frontmatter["updatedAt"] = iso_timestamp()
    if summary:
        entry = f"\n### {display_timestamp()} — Session closed\n\n{summary.strip()}\n"
        if not document.body.endswith("\n"):
            document.body += "\n"
        document.body += entry
    save_document(session_file, document, SESSION_FRONTMATTER_ORDER)

    memory_document = load_document(memory_file)
    memory_document.frontmatter["status"] = "closed"
    memory_document.frontmatter["updatedAt"] = iso_timestamp()
    save_document(memory_file, memory_document, MEMORY_FRONTMATTER_ORDER)

    return {
        "sessionFile": str(session_file),
        "memoryFile": str(memory_file),
        "status": "closed",
        "updatedAt": str(document.frontmatter["updatedAt"]),
    }
