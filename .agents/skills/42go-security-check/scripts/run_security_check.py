#!/usr/bin/env python3

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


SEVERITY_ORDER = ("CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN")
DEFAULT_IMAGE = "42go-next:latest"
REQUIRED_DOCKERIGNORE_PATTERNS = (
    ".git",
    ".agents",
    "docs",
    "node_modules",
    ".next",
    ".env",
    ".env*",
    ".npmrc",
    "db-backups",
    "knex/dumps",
    "*.sql",
    "*.dump",
    "*.backup",
)
SENSITIVE_SOURCE_GLOBS = (
    "db-backups/**/*",
    "knex/dumps/**/*",
    "*.sql",
    "*.dump",
    "*.backup",
)


@dataclass
class CommandResult:
    command: list[str]
    returncode: int
    stdout: str = ""
    stderr: str = ""

    @property
    def ok(self) -> bool:
        return self.returncode == 0

    def display(self) -> str:
        return " ".join(self.command)


@dataclass
class Finding:
    severity: str
    title: str
    detail: str
    source: str


@dataclass
class CheckState:
    repo_root: Path
    report_path: Path
    findings: list[Finding] = field(default_factory=list)
    commands: list[CommandResult] = field(default_factory=list)
    artifacts: dict[str, Path] = field(default_factory=dict)
    trivy_counts: dict[str, dict[str, int]] = field(default_factory=dict)
    image_observations: dict[str, str] = field(default_factory=dict)
    draft_result: dict[str, Any] | None = None

    def add(self, severity: str, title: str, detail: str, source: str) -> None:
        self.findings.append(Finding(severity.upper(), title, detail, source))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run 42Go Docker security checks.")
    parser.add_argument("--image", default=DEFAULT_IMAGE, help="Docker image tag to scan.")
    parser.add_argument("--dockerfile", default="Dockerfile", help="Dockerfile path.")
    parser.add_argument("--compose", default="docker-compose.prod.yml", help="Production compose file.")
    parser.add_argument("--build", action="store_true", help="Build the image before scanning.")
    parser.add_argument("--skip-qa", action="store_true", help="Skip npm run qa.")
    parser.add_argument("--skip-trivy", action="store_true", help="Skip all Trivy checks.")
    parser.add_argument("--draft", action="store_true", help="Create a draft backlog task when findings exist.")
    parser.add_argument("--fail-on-findings", action="store_true", help="Exit non-zero when blocking findings exist.")
    parser.add_argument("--output", help="Markdown report output path.")
    parser.add_argument("--backlog-root", default="docs/backlog", help="Backlog root for draft task creation.")
    parser.add_argument("--max-source-maps", type=int, default=0, help="Allowed runtime source map count.")
    return parser.parse_args()


def utc_timestamp() -> str:
    return dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")


def run_command(
    command: list[str],
    cwd: Path,
    timeout: int | None = None,
    env_extra: dict[str, str] | None = None,
) -> CommandResult:
    env = os.environ.copy()
    if env_extra:
        env.update(env_extra)
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            env=env,
            text=True,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
        return CommandResult(command, completed.returncode, completed.stdout, completed.stderr)
    except FileNotFoundError as error:
        return CommandResult(command, 127, "", str(error))
    except subprocess.TimeoutExpired as error:
        stdout = error.stdout if isinstance(error.stdout, str) else ""
        stderr = error.stderr if isinstance(error.stderr, str) else ""
        return CommandResult(command, 124, stdout, stderr or f"Timed out after {timeout}s")


def write_json_artifact(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")


def sanitize_line(value: str, limit: int = 220) -> str:
    value = re.sub(r"(?i)(password|secret|token|key|authorization)=\S+", r"\1=<redacted>", value)
    value = value.replace("\x00", "")
    value = " ".join(value.split())
    return value[:limit]


def count_severities(results: list[dict[str, Any]], key: str) -> dict[str, int]:
    counts = {severity: 0 for severity in SEVERITY_ORDER}
    for result in results:
        for item in result.get(key) or []:
            severity = str(item.get("Severity") or "UNKNOWN").upper()
            counts[severity if severity in counts else "UNKNOWN"] += 1
    return counts


def parse_trivy_file(path: Path) -> dict[str, Any]:
    if not path.exists() or path.stat().st_size == 0:
        return {}
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def summarize_trivy_image(state: CheckState, path: Path) -> None:
    data = parse_trivy_file(path)
    results = data.get("Results") or []
    counts = count_severities(results, "Vulnerabilities")
    state.trivy_counts["image_vulnerabilities"] = counts

    if counts["CRITICAL"] or counts["HIGH"]:
        state.add(
            "HIGH",
            "Container image has high or critical vulnerabilities",
            f"Trivy image counts: {format_counts(counts)}",
            "trivy image",
        )


def summarize_trivy_config(state: CheckState, path: Path) -> None:
    data = parse_trivy_file(path)
    results = data.get("Results") or []
    counts = count_severities(results, "Misconfigurations")
    state.trivy_counts["config_misconfigurations"] = counts

    if counts["CRITICAL"] or counts["HIGH"]:
        state.add(
            "HIGH",
            "Docker configuration has high or critical misconfigurations",
            f"Trivy config counts: {format_counts(counts)}",
            "trivy config",
        )


def summarize_trivy_secrets(state: CheckState, path: Path) -> None:
    data = parse_trivy_file(path)
    results = data.get("Results") or []
    counts = count_severities(results, "Secrets")
    total = sum(counts.values())
    state.trivy_counts["source_secrets"] = counts

    if total:
        samples: list[str] = []
        for result in results:
            target = result.get("Target") or "unknown"
            for secret in result.get("Secrets") or []:
                rule = secret.get("RuleID") or secret.get("Category") or "secret"
                line = secret.get("StartLine") or secret.get("EndLine") or "?"
                samples.append(f"{target}:{line} ({rule})")
                if len(samples) >= 8:
                    break
            if len(samples) >= 8:
                break
        state.add(
            "HIGH",
            "Repository secret scan found sensitive-looking material",
            "Examples: " + "; ".join(samples),
            "trivy fs secret",
        )


def format_counts(counts: dict[str, int]) -> str:
    return ", ".join(f"{severity.lower()}={counts.get(severity, 0)}" for severity in SEVERITY_ORDER)


def check_tools(state: CheckState, args: argparse.Namespace) -> None:
    if shutil.which("docker") is None:
        state.add("HIGH", "Docker is not installed or not in PATH", "Docker is required for image inspection.", "tooling")
    if not args.skip_trivy and shutil.which("trivy") is None:
        state.add("HIGH", "Trivy is not installed or not in PATH", "Trivy is required for vulnerability, config, and secret scans.", "tooling")
    if shutil.which("npm") is None and not args.skip_qa:
        state.add("MEDIUM", "npm is not installed or not in PATH", "`npm run qa` could not be executed.", "tooling")


def check_qa(state: CheckState, args: argparse.Namespace) -> None:
    if args.skip_qa:
        state.add("LOW", "QA gate skipped", "The run used --skip-qa.", "npm run qa")
        return

    result = run_command(["npm", "run", "qa"], state.repo_root, timeout=900)
    state.commands.append(result)
    if not result.ok:
        tail = "\n".join((result.stdout + "\n" + result.stderr).splitlines()[-20:])
        state.add("HIGH", "`npm run qa` failed", sanitize_line(tail, 1200), "npm run qa")


def build_image(state: CheckState, args: argparse.Namespace) -> None:
    if not args.build:
        return
    result = run_command(
        [
            "docker",
            "build",
            "--progress=plain",
            "--load",
            "--no-cache",
            "-f",
            args.dockerfile,
            "-t",
            args.image,
            ".",
        ],
        state.repo_root,
        timeout=1800,
    )
    state.commands.append(result)
    if not result.ok:
        tail = "\n".join((result.stdout + "\n" + result.stderr).splitlines()[-30:])
        state.add("HIGH", "Docker image build failed", sanitize_line(tail, 1600), "docker build")


def run_trivy(state: CheckState, args: argparse.Namespace) -> None:
    if args.skip_trivy:
        state.add("LOW", "Trivy checks skipped", "The run used --skip-trivy.", "trivy")
        return
    if shutil.which("trivy") is None:
        return

    image_json = state.report_path.with_suffix(".trivy-image.json")
    config_json = state.report_path.with_suffix(".trivy-config.json")
    secrets_json = state.report_path.with_suffix(".trivy-secrets.json")
    cache_dir = state.report_path.parent / "trivy-cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    trivy_env = {"TRIVY_CACHE_DIR": str(cache_dir)}

    commands = [
        (["trivy", "image", "--scanners", "vuln", "--format", "json", "--output", str(image_json), args.image], image_json, summarize_trivy_image),
        (["trivy", "config", "--format", "json", "--output", str(config_json), "."], config_json, summarize_trivy_config),
        (["trivy", "fs", "--scanners", "secret", "--format", "json", "--output", str(secrets_json), "."], secrets_json, summarize_trivy_secrets),
    ]
    for command, artifact, summarizer in commands:
        result = run_command(command, state.repo_root, timeout=1200, env_extra=trivy_env)
        state.commands.append(result)
        state.artifacts[artifact.name] = artifact
        if result.ok:
            summarizer(state, artifact)
        else:
            detail = sanitize_line(result.stderr or result.stdout or "Trivy command failed.", 1200)
            state.add("HIGH", f"{command[0]} {' '.join(command[1:3])} failed", detail, "trivy")


def check_dockerignore(state: CheckState) -> None:
    dockerignore = state.repo_root / ".dockerignore"
    if not dockerignore.exists():
        state.add("HIGH", ".dockerignore is missing", "Docker build context may include secrets and local artifacts.", ".dockerignore")
        return

    lines = [
        line.strip()
        for line in dockerignore.read_text(errors="replace").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    missing = [pattern for pattern in REQUIRED_DOCKERIGNORE_PATTERNS if not dockerignore_covers(lines, pattern)]
    if missing:
        state.add(
            "MEDIUM",
            ".dockerignore is missing release-safety exclusions",
            "Missing patterns: " + ", ".join(missing),
            ".dockerignore",
        )

    present_sensitive_files: list[str] = []
    for pattern in SENSITIVE_SOURCE_GLOBS:
        for path in state.repo_root.glob(pattern):
            if path.is_file():
                if path.name == ".gitkeep":
                    continue
                present_sensitive_files.append(path.relative_to(state.repo_root).as_posix())
                if len(present_sensitive_files) >= 20:
                    break
        if len(present_sensitive_files) >= 20:
            break
    if present_sensitive_files:
        state.add(
            "MEDIUM",
            "Sensitive local artifacts exist in the repository tree",
            "Examples: " + ", ".join(present_sensitive_files),
            "source tree",
        )


def dockerignore_covers(lines: list[str], pattern: str) -> bool:
    if pattern in lines:
        return True

    target = pattern.strip("/")
    for line in lines:
        normalized = line.strip().strip("/")
        if not normalized:
            continue
        if target.startswith(normalized + "/"):
            return True
        if normalized.startswith("*.") and target == normalized:
            return True
    return False


def parse_image_probe(output: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in output.splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def inspect_image(state: CheckState, args: argparse.Namespace) -> None:
    if shutil.which("docker") is None:
        return

    inspect = run_command(["docker", "image", "inspect", args.image], state.repo_root, timeout=60)
    state.commands.append(inspect)
    if not inspect.ok:
        state.add("HIGH", "Docker image is not available for inspection", sanitize_line(inspect.stderr or inspect.stdout), "docker image inspect")
        return

    probe_script = r"""
set -eu
echo USER_ID="$(id -u)"
echo GROUP_ID="$(id -g)"
echo ENV_FILES="$(find /app -type f \( -name '.env' -o -name '.env.*' -o -name '.npmrc' \) 2>/dev/null | wc -l | tr -d ' ')"
echo SOURCE_MAPS="$(find /app -type f -name '*.map' 2>/dev/null | wc -l | tr -d ' ')"
echo SQL_DUMPS="$(find /app -type f \( -name '*.sql' -o -name '*.dump' -o -name '*.backup' \) 2>/dev/null | wc -l | tr -d ' ')"
echo DOCS_FILES="$(find /app/docs -type f 2>/dev/null | wc -l | tr -d ' ')"
echo AGENT_FILES="$(find /app/.agents -type f 2>/dev/null | wc -l | tr -d ' ')"
echo CONTENTS_FILES="$(find /app/contents -type f 2>/dev/null | wc -l | tr -d ' ')"
"""
    probe = run_command(["docker", "run", "--rm", "--entrypoint", "sh", args.image, "-lc", probe_script], state.repo_root, timeout=180)
    state.commands.append(probe)
    if not probe.ok:
        state.add("MEDIUM", "Docker image runtime probe failed", sanitize_line(probe.stderr or probe.stdout), "docker run probe")
        return

    values = parse_image_probe(probe.stdout)
    state.image_observations.update(values)
    if values.get("USER_ID") == "0":
        state.add("HIGH", "Runtime image runs as root", "Expected non-root user in final image.", "docker run id")
    if int(values.get("ENV_FILES") or "0") > 0:
        state.add("HIGH", "Runtime image contains env or npmrc files", f"Count: {values.get('ENV_FILES')}", "docker image contents")
    if int(values.get("SQL_DUMPS") or "0") > 0:
        state.add("HIGH", "Runtime image contains SQL or dump artifacts", f"Count: {values.get('SQL_DUMPS')}", "docker image contents")
    if int(values.get("DOCS_FILES") or "0") > 0:
        state.add("MEDIUM", "Runtime image contains docs files", f"Count: {values.get('DOCS_FILES')}", "docker image contents")
    if int(values.get("AGENT_FILES") or "0") > 0:
        state.add("MEDIUM", "Runtime image contains agent files", f"Count: {values.get('AGENT_FILES')}", "docker image contents")
    source_maps = int(values.get("SOURCE_MAPS") or "0")
    if source_maps > args.max_source_maps:
        state.add(
            "MEDIUM",
            "Runtime image contains source maps",
            f"Count: {source_maps}; allowed: {args.max_source_maps}",
            "docker image contents",
        )


def check_compose(state: CheckState, args: argparse.Namespace) -> None:
    compose_path = state.repo_root / args.compose
    if not compose_path.exists():
        state.add("MEDIUM", "Production compose file is missing", f"Expected {args.compose}.", "docker compose")
        return

    text = compose_path.read_text(errors="replace")
    if re.search(r"(?m)^\s*env_file\s*:", text):
        state.add(
            "HIGH",
            "Production compose uses env_file",
            "`env_file` can inject the full local .env into runtime. Prefer an explicit allowlist of runtime variables.",
            args.compose,
        )
    if re.search(r'(?m)^\s*-\s*["\']?5432:5432["\']?\s*$', text):
        state.add(
            "MEDIUM",
            "Production compose exposes PostgreSQL on the host",
            "Port 5432 should not be published in release topology unless explicitly required.",
            args.compose,
        )
    if "host-gateway" in text:
        state.add(
            "LOW",
            "Production compose config includes host-gateway",
            "Review whether host network escape hatch is needed in production.",
            args.compose,
        )
    if re.search(r"(?m)^\s*-\s*\./contents:/app/contents", text):
        state.add(
            "LOW",
            "Production compose bind-mounts contents",
            "Bind mounts bypass immutable image guarantees. Confirm this is intentional for production.",
            args.compose,
        )


def blocking_findings(findings: list[Finding]) -> list[Finding]:
    return [finding for finding in findings if finding.severity in {"HIGH", "CRITICAL"}]


def render_report(state: CheckState, args: argparse.Namespace) -> str:
    blockers = blocking_findings(state.findings)
    lines = [
        "# 42Go Docker Security Check",
        "",
        f"- Generated: {dt.datetime.now(dt.UTC).isoformat()}",
        f"- Image: `{args.image}`",
        f"- Build requested: `{str(args.build).lower()}`",
        f"- Findings: `{len(state.findings)}`",
        f"- Blocking findings: `{len(blockers)}`",
        "",
        "## Findings",
        "",
    ]
    if state.findings:
        for finding in sorted(state.findings, key=lambda item: SEVERITY_ORDER.index(item.severity) if item.severity in SEVERITY_ORDER else 99):
            lines.extend(
                [
                    f"### {finding.severity}: {finding.title}",
                    "",
                    f"- Source: `{finding.source}`",
                    f"- Detail: {finding.detail}",
                    "",
                ]
            )
    else:
        lines.extend(["No findings.", ""])

    lines.extend(["## Trivy Counts", ""])
    if state.trivy_counts:
        for label, counts in state.trivy_counts.items():
            lines.append(f"- {label}: {format_counts(counts)}")
    else:
        lines.append("- No Trivy counts recorded.")
    lines.append("")

    lines.extend(["## Image Observations", ""])
    if state.image_observations:
        for key, value in sorted(state.image_observations.items()):
            lines.append(f"- {key}: `{value}`")
    else:
        lines.append("- No image observations recorded.")
    lines.append("")

    lines.extend(["## Commands", ""])
    for result in state.commands:
        status = "ok" if result.ok else f"failed:{result.returncode}"
        lines.append(f"- `{result.display()}` -> `{status}`")
    if not state.commands:
        lines.append("- No commands recorded.")
    lines.append("")

    lines.extend(["## Artifacts", ""])
    if state.artifacts:
        for name, path in sorted(state.artifacts.items()):
            lines.append(f"- {name}: `{path}`")
    else:
        lines.append("- No artifacts recorded.")
    lines.append("")
    return "\n".join(lines)


def create_draft(state: CheckState, args: argparse.Namespace) -> None:
    if not args.draft or not state.findings:
        return

    blockers = blocking_findings(state.findings)
    high_level = [
        f"{finding.severity}: {finding.title} ({finding.source})"
        for finding in state.findings[:20]
    ]
    payload = {
        "title": "Fix Docker Security Gate Findings",
        "group": "security",
        "sections": {
            "Elevator's Pitch": "Resolve Docker release security gate findings before publishing production images.",
            "Business Gain": "Publishing should fail before vulnerable images, leaked local artifacts, or risky production compose settings reach Docker Hub or CapRover.",
            "Current State": [
                f"The security gate reported {len(state.findings)} findings, including {len(blockers)} blocking findings.",
                f"Sanitized report: {state.report_path}",
                *high_level,
            ],
            "Desired State": "The Docker security gate passes with no blocking findings and can be used before publish/deploy work.",
            "Definition of Success": [
                "`npm run qa` passes.",
                "`trivy image`, `trivy config`, and source secret scans pass or have documented accepted exceptions.",
                "Runtime image has no env files, npmrc files, SQL/dump artifacts, docs/backlog files, or agent files.",
                "Production compose exposes only required ports and uses explicit runtime environment variables.",
            ],
            "Additional Context": [
                f"Generated by `.agents/skills/42go-docker-security-check/scripts/run_security_check.py`.",
                f"Image scanned: `{args.image}`.",
                "Secret values are intentionally omitted from this task.",
            ],
            "Constraints": [
                "Do not paste secret values or raw environment files into the backlog.",
                "Keep fixes compatible with the existing Dockerfile and multi-app runtime.",
            ],
            "Acceptance Criteria": [
                "- [ ] Run `python3 .agents/skills/42go-docker-security-check/scripts/run_security_check.py --build --image 42go-next:latest --draft --fail-on-findings`.",
                "- [ ] Blocking findings are fixed or explicitly documented as accepted risk.",
                "- [ ] `npm run qa` passes after fixes.",
                "- [ ] The sanitized security report is linked from task notes or output.",
            ],
            "Related to": ["TK89 Docker Image Security Review"],
        },
    }

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
        json.dump(payload, handle, indent=2)
        input_path = Path(handle.name)

    try:
        command = [
            "python3",
            ".agents/skills/backlog-draft/scripts/scaffold_draft.py",
            "--backlog-root",
            args.backlog_root,
            "--input",
            str(input_path),
        ]
        result = run_command(command, state.repo_root, timeout=60)
        state.commands.append(result)
        if result.ok:
            try:
                state.draft_result = json.loads(result.stdout)
            except json.JSONDecodeError:
                state.add("MEDIUM", "Backlog draft created but output was not JSON", sanitize_line(result.stdout), "backlog-draft")
        else:
            state.add("HIGH", "Backlog draft creation failed", sanitize_line(result.stderr or result.stdout, 1200), "backlog-draft")
    finally:
        input_path.unlink(missing_ok=True)


def main() -> int:
    args = parse_args()
    repo_root = Path.cwd().resolve()
    default_report = Path(tempfile.gettempdir()) / f"42go-security-check-{utc_timestamp()}.md"
    report_path = Path(args.output).resolve() if args.output else default_report
    state = CheckState(repo_root=repo_root, report_path=report_path)

    check_tools(state, args)
    check_dockerignore(state)
    check_compose(state, args)
    check_qa(state, args)
    build_image(state, args)
    run_trivy(state, args)
    inspect_image(state, args)

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(render_report(state, args))
    create_draft(state, args)

    if state.draft_result:
        report_path.write_text(render_report(state, args) + f"\n## Backlog Draft\n\n- {state.draft_result.get('taskId')}: `{state.draft_result.get('absoluteDraftPath')}`\n")

    print(f"Report: {report_path}")
    if state.draft_result:
        print(f"Draft: {state.draft_result.get('taskId')} {state.draft_result.get('absoluteDraftPath')}")
    print(f"Findings: {len(state.findings)}")
    print(f"Blocking findings: {len(blocking_findings(state.findings))}")

    if args.fail_on_findings and blocking_findings(state.findings):
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
