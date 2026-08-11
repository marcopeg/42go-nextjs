---
name: 42go-security-check
description: Run 42Go Docker image security checks before local image publish/deploy work or when explicitly requested, including Trivy image/config/secret scans, runtime image inspection, Docker Compose exposure checks, and optional backlog draft creation. Do not use for the GitHub-only deployment flow, where GitHub Actions owns the image build.
---

# 42Go Docker Security Check

Use this skill whenever the user asks to audit Docker security, check local image publish readiness, run Trivy, prepare a production image locally, deploy/publish a locally built image, or turn security findings into backlog work.

Do not run this skill for `make deploy.github`. That workflow runs `npm run qa`
locally, while GitHub Actions owns the Docker image build, publish, and
deployment.

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
- `trivy fs --scanners secret` source secret scan, skipping `.local/` because it is Git-ignored and Docker-ignored local machine state
- `.dockerignore` coverage for local dumps, backups, env files, agent files, docs, and build outputs
- final Docker image user, env files, npmrc files, SQL/dump artifacts, docs/backlog/agent folders, and source map count
- `docker-compose.prod.yml` local-production settings such as `env_file: .env`, exposed database ports, bind-mounted app content, and host-gateway entries

The script never prints secret values. Secret findings are summarized by rule, file, and line only.

## Local-Only Context

`docker-compose.prod.yml` is a local development simulator for a closer-to-production runtime. It does not describe the real production deployment topology. Findings from this file should be treated as local posture notes or "best to improve when possible" items unless the same pattern is being copied into real production.

Examples:

- Exposing PostgreSQL on `5432:5432` is expected locally so tools such as Postico can inspect the database. It is not a vulnerability in this repository context by itself.
- `env_file: .env`, bind-mounted `contents`, and `host-gateway` are local simulation conveniences. They are notes, not blockers, unless used in the actual production topology.

`.local/**` is local machine state and should stay ignored by both Git and Docker. If `git check-ignore` confirms a secret-like file under `.local/**`, do not report it as a repository vulnerability. If secret-like material is outside Git/Docker ignore coverage, report it as a real finding because it can leave the machine or enter the build context.

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

- Prefer `--build` before publishing or deploying a locally built image.
- Use `--draft` when there are actionable findings or the user explicitly asks for backlog work.
- Use `--fail-on-findings` for release gating.
- Do not paste raw Trivy secret payloads, environment values, tokens, or `.env` content into chat or backlog tasks.
- Treat `docker-compose.prod.yml` as a local production mimic. Local-only env, port, bind-mount, and host-gateway posture should be notes, not production vulnerabilities.
- Do not flag `.local/**` secret scan hits as vulnerabilities when Git and Docker ignore coverage is in place. Explain that the data remains local; flag only secret-like files outside ignore coverage.
- If Docker or Trivy is missing, report that as a gate failure and draft the remediation task when `--draft` is set.
