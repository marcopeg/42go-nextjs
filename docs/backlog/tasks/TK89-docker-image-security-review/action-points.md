# TK89 Action Points

Source: `TK89.output.md`  
Latest assessment: 2026-05-12, `42go-next:latest`, `42go-security-check`

## Current Release Gate

- [x] `npm run qa` passes in the security assessment.
- [x] Trivy image scan reports `0` critical, `0` high, `0` medium, and `0` low vulnerabilities.
- [x] Final image contains no `.env`, `.env.*`, `.npmrc`, project SQL dumps, docs/backlog files, `.agents`, or baked `contents`.
- [x] Final image contains `0` source maps after the Dockerfile cleanup.
- [x] Current blocking findings: `0`.
- [x] Operator deployed and tested the production image online successfully.

## Go-Live Decision

- [x] No Docker image security blocker remains for going live.
- [x] `docker-compose.prod.yml` is local production only and is not part of the real production security model.
- [x] Local dump cleanup is deferred backup-system work, not a live-release blocker while dumps stay ignored and local.

## Remaining Action Points

- [ ] Review backup/dump storage and move local artifacts under a `.local/`-style private workflow.
  - Assessment: `.dockerignore` now protects Docker build context, and the final image is clean. The repository tree still contains local dump files under `db-backups` and `knex/dumps`, and Trivy reports token-looking material in ignored SQL dumps.
  - Public-release impact: not a Docker image blocker as long as these files stay Docker-ignored and never enter git, shared sync, CI, or build cache.
  - Action: defer this to a dedicated backup-system review. Likely target: move backup/dump outputs into `.local/`, following the events dump pattern already introduced in the repo.
  - Rotation rule: rotate affected credentials only if any of those dumps left this machine, entered a shared backup, or were uploaded to shared build/cache infrastructure.
  - Verification: backup commands write only to ignored local storage, docs explain the private path, and repo-level secret findings are limited to intentionally private local artifacts or disappear entirely.

- [ ] Decide health-check ownership for production.
  - Assessment: the Dockerfile image-level `HEALTHCHECK` is disabled, while local production Compose has its own health check. This is acceptable if the deployment platform owns health/restart behavior.
  - Go-live impact: not a security blocker if the hosting platform already monitors/restarts the app.
  - Action: either keep health checks platform-owned and document that choice, or enable an image/Compose health check that calls `/api/health`.
  - Verification: production restart/health behavior is visible in the deployment platform, or `docker inspect` / Compose config shows the intended health check.

- [ ] Add public image supply-chain policy before treating Docker Hub as a distribution channel.
  - Assessment: the image can now be built cleanly, but publish targets still move `latest` and version tags without SBOM, provenance, attestation, or signing policy.
  - Go-live impact: not a blocker for your own VPS deployment; more important if other people consume the Docker Hub image as a product artifact.
  - Action: decide whether Docker Hub is a private convenience registry or a public distribution surface. If public, add SBOM generation, provenance/attestation, signing policy, and a rule for when `latest` may move.
  - Verification: release docs or Make targets show the SBOM/provenance/signing workflow, and `latest` movement has a written rule.

## Historical Memory

- [x] Build context hygiene was fixed for Docker publishing: `.dockerignore` excludes `knex`, `db-backups`, `.local`, `.tmp`, `*.sql`, `*.dump`, and `*.backup`.
- [x] Runtime source maps are removed from the Docker image during the builder stage before final runner copy.
- [x] The redundant final-stage full `node_modules` copy was removed from the Dockerfile.
- [x] The standalone-only runtime image was built and smoke tested for health and host-based app resolution.
- [x] The final image size dropped from roughly `766MB` to roughly `234MB` after removing the extra `node_modules` layer and rebuilding on `node:26-alpine`.
- [x] Package-manager tooling (`npm`, `npx`, `corepack`, yarn shims) was removed from the runtime image.
- [x] Next.js and `eslint-config-next` were updated from `16.2.4` to `16.2.6`, resolving the high Next.js advisories from the first scan.
- [x] The prior `picomatch` high finding is no longer present in the rebuilt runtime image.
- [x] `node:26-alpine` was validated by the operator with local production and remote deployment.
- [x] Local production Compose warnings were reclassified: `env_file`, PostgreSQL host port `5432`, host-gateway, and `contents` bind mount are local-production concerns, not Docker image release blockers.
- [x] `docker-compose.prod.yml` is documented as local production only; it is not the real production deployment security model.
- [x] Runtime image vulnerability gate now passes with zero vulnerabilities reported by Trivy.
- [x] Full security check after source-map removal rebuilt the image with `--no-cache` and reported `6` non-blocking findings, all outside the final runtime image.
