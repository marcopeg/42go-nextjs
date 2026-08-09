#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import subprocess
import argparse
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
PACKAGE_JSON = ROOT / "package.json"
PACKAGE_LOCK_JSON = ROOT / "package-lock.json"
SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text())


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n")


def bump_version(version: str, release: str) -> str:
    match = SEMVER_RE.match(version)
    if not match:
        raise SystemExit(f"Unsupported version format: {version}")

    major, minor, patch = (int(value) for value in match.groups())
    if release == "major":
        return f"{major + 1}.0.0"
    if release == "minor":
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


def run(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, cwd=ROOT, check=check, text=True)


def output(*args: str) -> str:
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def ensure_release_preconditions() -> None:
    if output("git", "status", "--porcelain"):
        raise SystemExit("Working tree is not clean. Commit or stash changes before releasing.")

    branch = output("git", "branch", "--show-current")
    if branch != "main":
        raise SystemExit(f"Releases must run from main (current branch: {branch or 'detached HEAD'}).")

    run("git", "fetch", "origin", "main", "--tags")


def ensure_tag_is_available(version: str) -> None:
    if run("git", "rev-parse", "-q", "--verify", f"refs/tags/{version}", check=False).returncode == 0:
        raise SystemExit(f"Tag {version} already exists locally.")
    if run("git", "ls-remote", "--exit-code", "--tags", "origin", f"refs/tags/{version}", check=False).returncode == 0:
        raise SystemExit(f"Tag {version} already exists on origin.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Create and push a semantic-versioned GitHub release.")
    parser.add_argument("--release", choices=("patch", "minor", "major"), default="patch")
    args = parser.parse_args()

    ensure_release_preconditions()
    package_json = read_json(PACKAGE_JSON)
    package_lock = read_json(PACKAGE_LOCK_JSON)

    current_version = str(package_json["version"])
    next_version = bump_version(current_version, args.release)
    ensure_tag_is_available(next_version)

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
                "releaseType": args.release,
                "command": "git commit, tag, and push to trigger GitHub Actions",
                "files": [
                    str(PACKAGE_JSON.relative_to(ROOT)),
                    str(PACKAGE_LOCK_JSON.relative_to(ROOT)),
                ],
            },
            indent=2,
        )
    )

    run("git", "add", "package.json", "package-lock.json")
    run("git", "commit", "-m", f"chore(release): {next_version}")
    run("git", "tag", "-a", next_version, "-m", f"Release {next_version}")
    run("git", "push", "origin", "HEAD:main")
    run("git", "push", "origin", next_version)
    run("make", "verify.deployment.maybe", f"VERSION={next_version}")
    print(f"Release {next_version} pushed and verified through GitHub Actions.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
