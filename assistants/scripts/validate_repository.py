#!/usr/bin/env python3
"""Validate marketplace, plugin, and Agent Skill invariants."""

from __future__ import annotations

import json
from pathlib import Path
import re
import sys
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def load_json(path: Path, errors: list[str]) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"{path.relative_to(ROOT)}: cannot read JSON: {exc}")
        return {}
    if not isinstance(value, dict):
        errors.append(f"{path.relative_to(ROOT)}: root must be an object")
        return {}
    return value


def entries_by_name(catalog: dict[str, Any], path: Path, errors: list[str]) -> dict[str, Any]:
    entries = catalog.get("plugins")
    if not isinstance(entries, list):
        errors.append(f"{path.relative_to(ROOT)}: plugins must be an array")
        return {}
    result: dict[str, Any] = {}
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("name"), str):
            errors.append(f"{path.relative_to(ROOT)}: every plugin needs a string name")
            continue
        name = entry["name"]
        if name in result:
            errors.append(f"{path.relative_to(ROOT)}: duplicate plugin {name}")
        result[name] = entry
    return result


def skill_metadata(path: Path, errors: list[str]) -> tuple[str | None, str | None]:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        errors.append(f"{path.relative_to(ROOT)}: cannot read: {exc}")
        return None, None
    if not text.startswith("---\n"):
        errors.append(f"{path.relative_to(ROOT)}: YAML frontmatter must be first")
        return None, None
    try:
        frontmatter = text.split("---\n", 2)[1]
    except IndexError:
        errors.append(f"{path.relative_to(ROOT)}: unterminated YAML frontmatter")
        return None, None
    name_match = re.search(r"^name:\s*[\"']?([^\n\"']+)", frontmatter, re.MULTILINE)
    description_match = re.search(r"^description:\s*(.+)$", frontmatter, re.MULTILINE)
    return (
        name_match.group(1).strip() if name_match else None,
        description_match.group(1).strip() if description_match else None,
    )


def main() -> int:
    errors: list[str] = []
    codex_path = ROOT / ".agents/plugins/marketplace.json"
    claude_path = ROOT / ".claude-plugin/marketplace.json"
    codex = load_json(codex_path, errors)
    claude = load_json(claude_path, errors)
    codex_entries = entries_by_name(codex, codex_path, errors)
    claude_entries = entries_by_name(claude, claude_path, errors)

    if codex.get("name") != claude.get("name"):
        errors.append("Codex and Claude marketplace names must match")

    plugins_root = ROOT / "plugins"
    plugin_dirs = sorted(path for path in plugins_root.iterdir() if path.is_dir())
    plugin_names = {path.name for path in plugin_dirs}
    if set(codex_entries) != plugin_names:
        errors.append("Codex marketplace entries must match plugin directories")
    if set(claude_entries) != plugin_names:
        errors.append("Claude marketplace entries must match plugin directories")

    for plugin in plugin_dirs:
        name = plugin.name
        if not NAME_RE.fullmatch(name):
            errors.append(f"plugins/{name}: plugin name must be lowercase kebab-case")

        codex_manifest_path = plugin / ".codex-plugin/plugin.json"
        claude_manifest_path = plugin / ".claude-plugin/plugin.json"
        codex_manifest = load_json(codex_manifest_path, errors)
        claude_manifest = load_json(claude_manifest_path, errors)
        if codex_manifest.get("name") != name:
            errors.append(f"plugins/{name}: Codex manifest name must match directory")
        if claude_manifest.get("name") != name:
            errors.append(f"plugins/{name}: Claude manifest name must match directory")

        versions = {
            codex_manifest.get("version"),
            claude_manifest.get("version"),
            claude_entries.get(name, {}).get("version"),
        }
        if len(versions) != 1 or None in versions:
            errors.append(f"plugins/{name}: manifest and Claude catalog versions must match")

        licenses = {
            codex_manifest.get("license"),
            claude_manifest.get("license"),
            claude_entries.get(name, {}).get("license"),
        }
        if licenses != {"MIT"}:
            errors.append(f"plugins/{name}: manifests and Claude catalog must declare MIT")

        codex_source = codex_entries.get(name, {}).get("source", {})
        if not isinstance(codex_source, dict) or codex_source.get("path") != f"./plugins/{name}":
            errors.append(f"plugins/{name}: invalid Codex marketplace source")
        if claude_entries.get(name, {}).get("source") != f"./plugins/{name}":
            errors.append(f"plugins/{name}: invalid Claude marketplace source")

        skill_files = sorted((plugin / "skills").glob("*/SKILL.md"))
        if not skill_files:
            errors.append(f"plugins/{name}: no Agent Skills found")
        for skill_file in skill_files:
            skill_name, description = skill_metadata(skill_file, errors)
            directory_name = skill_file.parent.name
            if skill_name != directory_name or not skill_name or not NAME_RE.fullmatch(skill_name):
                errors.append(
                    f"{skill_file.relative_to(ROOT)}: name must match its lowercase kebab-case directory"
                )
            if not description:
                errors.append(f"{skill_file.relative_to(ROOT)}: description is required")

    for path in ROOT.rglob("*"):
        if path.is_symlink():
            errors.append(f"{path.relative_to(ROOT)}: symlinks are not allowed in published bundles")
        if path.name == "__pycache__" or path.suffix in {".pyc", ".pyo"}:
            errors.append(f"{path.relative_to(ROOT)}: generated Python cache must not be published")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"Validation failed with {len(errors)} error(s).", file=sys.stderr)
        return 1
    print(f"Validated {len(plugin_dirs)} plugin(s) across Codex, Claude Code, and Agent Skills.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
