#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
PACKAGE_JSON = ROOT / "package.json"
PACKAGE_LOCK_JSON = ROOT / "package-lock.json"
SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text())


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n")


def bump_patch(version: str) -> str:
    match = SEMVER_RE.match(version)
    if not match:
      raise SystemExit(f"Unsupported version format: {version}")

    major, minor, patch = match.groups()
    return f"{major}.{minor}.{int(patch) + 1}"


def main() -> int:
    package_json = read_json(PACKAGE_JSON)
    package_lock = read_json(PACKAGE_LOCK_JSON)

    current_version = str(package_json["version"])
    next_version = bump_patch(current_version)

    package_json["version"] = next_version
    package_lock["version"] = next_version
    package_lock.setdefault("packages", {}).setdefault("", {})["version"] = next_version

    write_json(PACKAGE_JSON, package_json)
    write_json(PACKAGE_LOCK_JSON, package_lock)

    print(
        json.dumps(
            {
                "previousVersion": current_version,
                "nextVersion": next_version,
                "command": "make deploy",
                "files": [
                    str(PACKAGE_JSON.relative_to(ROOT)),
                    str(PACKAGE_LOCK_JSON.relative_to(ROOT)),
                ],
            },
            indent=2,
        )
    )

    return subprocess.run(["make", "deploy"], cwd=ROOT).returncode


if __name__ == "__main__":
    raise SystemExit(main())
