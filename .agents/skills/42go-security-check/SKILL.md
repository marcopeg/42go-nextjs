---
name: 42go-security-check
description: Run 42Go Docker release security checks before publish/deploy work, including Trivy image/config/secret scans, runtime image inspection, Docker Compose exposure checks, and optional backlog draft creation for findings.
---

# 42Go Docker Security Check

Use this skill whenever the user asks to audit Docker security, check publish readiness, run Trivy, prepare a production image, deploy/publish the app, or turn security findings into backlog work.

## Gate Command

Run the bundled gate script from the repository root:

```bash
python3 .agents/skills/42go-security-check/scripts/run_security_check.py --image 42go-next:latest --draft --fail-on-findings
```

For a fresh image audit, add `--build`:

```bash
python3 .agents/skills/42go-security-check/scripts/run_security_check.py --build --image 42go-next:latest --draft --fail-on-findings
```

## What It Checks

- `npm run qa`
- `trivy image` vulnerability scan
- `trivy config` Dockerfile/Compose misconfiguration scan
- `trivy fs --scanners secret` source secret scan
- `.dockerignore` coverage for local dumps, backups, env files, agent files, docs, and build outputs
- final Docker image user, env files, npmrc files, SQL/dump artifacts, docs/backlog/agent folders, and source map count
- `docker-compose.prod.yml` local-production settings such as `env_file: .env`, exposed database ports, bind-mounted app content, and host-gateway entries

The script never prints secret values. Secret findings are summarized by rule, file, and line only.

## Backlog Drafts

Use `--draft` when findings should become a draft task in `docs/backlog`. The script calls:

```bash
python3 .agents/skills/backlog-draft/scripts/scaffold_draft.py --input <generated-json>
```

The generated task includes the sanitized report path, finding summary, acceptance criteria, and the exact command that failed.

## Publish Behavior

This skill blocks agent-led publish/deploy work when `--fail-on-findings` returns non-zero. The repository Makefile also routes `publish`, `publish.nocache`, and `publish.universal` through `security.check` before `docker buildx build --push`.

Use `make security.check.draft` when the gate findings should become a draft backlog task.

## Operator Rules

- Prefer `--build` before publishing or deploying.
- Use `--draft` when there are actionable findings or the user explicitly asks for backlog work.
- Use `--fail-on-findings` for release gating.
- Do not paste raw Trivy secret payloads, environment values, tokens, or `.env` content into chat or backlog tasks.
- Treat `docker-compose.prod.yml` as a local production mimic. It can warn about env and networking posture, but it is not the real production deployment topology.
- If Docker or Trivy is missing, report that as a gate failure and draft the remediation task when `--draft` is set.
