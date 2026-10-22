# 42Go Docker Security Check

- Generated: 2026-10-22T09:50:27.331831+00:00
- Image: `42go-next:dependency-review-20261022`
- Build requested: `false`
- Findings: `0`
- Blocking findings: `0`

## Findings

No findings.

## Local Development Notes

### Local production compose uses env_file

- Source: `docker-compose.prod.yml`
- Detail: `env_file` injects local `.env` into the local production simulator. This file is not the real production topology; improve when convenient, but do not treat this as a release vulnerability by itself.

### Local production compose exposes PostgreSQL on the host

- Source: `docker-compose.prod.yml`
- Detail: Port 5432 is intentionally exposed for local tools such as Postico. This is acceptable for the local production simulator and must not be copied blindly into real production.

### Local production compose config includes host-gateway

- Source: `docker-compose.prod.yml`
- Detail: Useful for local production testing. This is local-only posture, not a production vulnerability.

### Local production compose bind-mounts contents

- Source: `docker-compose.prod.yml`
- Detail: Useful for local production testing. Real production should decide separately whether content is baked, mounted read-only, or externalized.

## Trivy Counts

- image_vulnerabilities: critical=0, high=0, medium=0, low=0, unknown=0
- config_misconfigurations: critical=0, high=0, medium=0, low=1, unknown=0
- source_secrets: critical=0, high=0, medium=0, low=0, unknown=0

## Image Observations

- AGENT_FILES: `0`
- CONTENTS_FILES: `21`
- DOCS_FILES: `0`
- ENV_FILES: `0`
- GROUP_ID: `65533`
- SOURCE_MAPS: `0`
- SQL_DUMPS: `0`
- USER_ID: `1001`

## Commands

- `npm run qa` -> `ok`
- `trivy image --scanners vuln --format json --output /private/tmp/lingocafe-gate/2026-10-22-image-security.trivy-image.json 42go-next:dependency-review-20261022` -> `ok`
- `trivy config --skip-dirs .next --skip-dirs node_modules --skip-dirs .devcontainer --format json --output /private/tmp/lingocafe-gate/2026-10-22-image-security.trivy-config.json .` -> `ok`
- `trivy fs --scanners secret --skip-dirs .local --format json --output /private/tmp/lingocafe-gate/2026-10-22-image-security.trivy-secrets.json .` -> `ok`
- `docker image inspect 42go-next:dependency-review-20261022` -> `ok`
- `docker run --rm --entrypoint sh 42go-next:dependency-review-20261022 -lc
set -eu
echo USER_ID="$(id -u)"
echo GROUP_ID="$(id -g)"
echo ENV_FILES="$(find /app -type f \( -name '.env' -o -name '.env.*' -o -name '.npmrc' \) 2>/dev/null | wc -l | tr -d ' ')"
echo SOURCE_MAPS="$(find /app -type f -name '*.map' 2>/dev/null | wc -l | tr -d ' ')"
echo SQL_DUMPS="$(find /app -type f \( -name '*.sql' -o -name '*.dump' -o -name '*.backup' \) 2>/dev/null | wc -l | tr -d ' ')"
echo DOCS_FILES="$(find /app/docs -type f 2>/dev/null | wc -l | tr -d ' ')"
echo AGENT_FILES="$(find /app/.agents -type f 2>/dev/null | wc -l | tr -d ' ')"
echo CONTENTS_FILES="$(find /app/contents -type f 2>/dev/null | wc -l | tr -d ' ')"
` -> `ok`

## Artifacts

- 2026-10-22-image-security.trivy-config.json: `/private/tmp/lingocafe-gate/2026-10-22-image-security.trivy-config.json`
- 2026-10-22-image-security.trivy-image.json: `/private/tmp/lingocafe-gate/2026-10-22-image-security.trivy-image.json`
- 2026-10-22-image-security.trivy-secrets.json: `/private/tmp/lingocafe-gate/2026-10-22-image-security.trivy-secrets.json`
