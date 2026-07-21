#!/usr/bin/env python3
"""Install one bundled Agent Skill for a supported assistant."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import shutil
import sys


@dataclass(frozen=True)
class Target:
    user: str
    project: str


TARGETS = {
    "agents": Target("~/.agents/skills", ".agents/skills"),
    "claude": Target("~/.claude/skills", ".claude/skills"),
    "codex": Target("~/.agents/skills", ".agents/skills"),
    "copilot": Target("~/.copilot/skills", ".github/skills"),
    "cursor": Target("~/.cursor/skills", ".cursor/skills"),
    "gemini": Target("~/.gemini/skills", ".gemini/skills"),
    "opencode": Target("~/.config/opencode/skills", ".opencode/skills"),
}


class InstallError(RuntimeError):
    pass


def repository_root() -> Path:
    return Path(__file__).resolve().parent.parent


def available_skills() -> dict[str, Path]:
    found: dict[str, Path] = {}
    collisions: set[str] = set()
    for skill_file in sorted((repository_root() / "plugins").glob("*/skills/*/SKILL.md")):
        name = skill_file.parent.name
        if name in found:
            collisions.add(name)
        found[name] = skill_file.parent
    if collisions:
        names = ", ".join(sorted(collisions))
        raise InstallError(f"Duplicate skill names in repository: {names}")
    return found


def destination(args: argparse.Namespace) -> Path:
    target = TARGETS[args.target]
    if args.scope == "user":
        parent = Path(target.user).expanduser()
    else:
        project = Path(args.project_dir).expanduser().resolve()
        if not project.is_dir():
            raise InstallError(f"Project directory does not exist: {project}")
        parent = project / target.project
    return parent / args.skill


def install(args: argparse.Namespace) -> Path:
    skills = available_skills()
    source = skills.get(args.skill)
    if source is None:
        choices = ", ".join(sorted(skills)) or "none"
        raise InstallError(f"Unknown skill '{args.skill}'. Available skills: {choices}")

    target = destination(args)
    if args.dry_run:
        print(f"Would copy {source} -> {target}")
        return target

    if target.exists() and not args.force:
        raise InstallError(f"Destination already exists: {target}. Use --force to replace it.")
    if target.exists():
        if target.is_dir() and not target.is_symlink():
            shutil.rmtree(target)
        else:
            target.unlink()

    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(
        source,
        target,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo", ".DS_Store"),
    )
    print(f"Installed {args.skill} for {args.target} ({args.scope}) at {target}")
    return target


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Install a bundled Agent Skill for a supported assistant."
    )
    parser.add_argument("skill", nargs="?", help="Skill name, for example quicklist")
    parser.add_argument("--target", choices=sorted(TARGETS), help="Assistant to configure")
    parser.add_argument("--scope", choices=("user", "project"), default="user")
    parser.add_argument(
        "--project-dir",
        default=".",
        help="Project root for --scope project (default: current directory)",
    )
    parser.add_argument("--force", action="store_true", help="Replace an existing installation")
    parser.add_argument("--dry-run", action="store_true", help="Print the destination without copying")
    parser.add_argument("--list", action="store_true", help="List bundled skills and targets")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        if args.list:
            print("Skills:")
            for name in sorted(available_skills()):
                print(f"  {name}")
            print("Targets:")
            for name in sorted(TARGETS):
                print(f"  {name}")
            return 0
        if not args.skill or not args.target:
            parser.error("skill and --target are required unless --list is used")
        install(args)
        return 0
    except InstallError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
