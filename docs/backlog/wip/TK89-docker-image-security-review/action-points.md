# TK89 Action Points

Source: `TK89.output.md`  
Latest assessment: 2026-05-12, `42go-next:latest`, `42go-security-check`

## Current Release Gate

- [x] `npm run qa` passes in the security assessment.
- [x] Trivy image scan reports `0` critical, `0` high, `0` medium, and `0` low vulnerabilities.
- [x] Final image contains no `.env`, `.env.*`, `.npmrc`, project SQL dumps, docs/backlog files, `.agents`, or baked `contents`.
- [x] Current blocking findings: `0`.

## Remaining Action Points

- [ ] Decide and enforce the production source-map policy.
  - Assessment: the final image still contains `54` `.next` source maps. This is not a runtime exploit by itself, but it increases source disclosure in a public or inspectable image.
  - Action: either remove runtime source maps from the Docker image after `next build`, or document a formal accepted risk explaining why the maps are needed.
  - Verification: `docker run --rm --entrypoint sh 42go-next:latest -lc "find /app -type f -name '*.map' | wc -l"` returns `0`, or the accepted-risk note names the exact reason and audience.

- [ ] Clean up local dump and token hygiene outside the Docker build path.
  - Assessment: `.dockerignore` now protects Docker build context, and the final image is clean. The repository tree still contains local dump files under `db-backups` and `knex/dumps`, and Trivy reports token-looking material in ignored SQL dumps.
  - Action: move local dumps outside the repository, or keep them only under a clearly documented private local path that is never shared, synced, or copied into CI/build cache.
  - Rotation rule: rotate affected credentials only if any of those dumps left this machine, entered a shared backup, or were uploaded to shared build/cache infrastructure.
  - Verification: a repo-level secret scan has no findings in project-controlled files, or the remaining findings are explicitly limited to documented private local dump storage.

- [ ] Document the real production environment-variable surface.
  - Assessment: `docker-compose.prod.yml` is local production only. Its broad `env_file: .env`, host DB port, host-gateway entry, and content bind mount are acceptable for local mimicry, not for a real production topology.
  - Action: document the actual VPS/platform runtime env allowlist: only variables required by the deployed app, no CapRover deploy token, no unrelated OAuth/provider secrets, no local-only database credentials.
  - Verification: the real deployment docs or platform config list required runtime variables explicitly, and do not point engineers at `docker-compose.prod.yml` as the production security model.

- [ ] Decide health-check ownership for production.
  - Assessment: the Dockerfile image-level `HEALTHCHECK` is disabled, while local production Compose has its own health check. This is acceptable if the deployment platform owns health/restart behavior.
  - Action: either keep health checks platform-owned and document that choice, or enable an image/Compose health check that calls `/api/health`.
  - Verification: production restart/health behavior is visible in the deployment platform, or `docker inspect` / Compose config shows the intended health check.

- [ ] Add public image supply-chain policy before treating Docker Hub as a distribution channel.
  - Assessment: the image can now be built cleanly, but publish targets still move `latest` and version tags without SBOM, provenance, attestation, or signing policy.
  - Action: decide whether Docker Hub is a private convenience registry or a public distribution surface. If public, add SBOM generation, provenance/attestation, signing policy, and a rule for when `latest` may move.
  - Verification: release docs or Make targets show the SBOM/provenance/signing workflow, and `latest` movement has a written rule.

- [ ] Run one final authenticated smoke test against the deployed image.
  - Assessment: local production and remote deployment now work. The remaining confidence gap is app-level runtime behavior behind auth.
  - Action: test `/api/health`, login, and one protected LingoCafe route on the deployed environment.
  - Verification: record the tested URL, account type, protected route, and result in `TK89.notes.md`.

## Historical Memory

- [x] Build context hygiene was fixed for Docker publishing: `.dockerignore` excludes `knex`, `db-backups`, `.local`, `.tmp`, `*.sql`, `*.dump`, and `*.backup`.
- [x] The redundant final-stage full `node_modules` copy was removed from the Dockerfile.
- [x] The standalone-only runtime image was built and smoke tested for health and host-based app resolution.
- [x] The final image size dropped from roughly `766MB` to roughly `234MB` after removing the extra `node_modules` layer and rebuilding on `node:26-alpine`.
- [x] Package-manager tooling (`npm`, `npx`, `corepack`, yarn shims) was removed from the runtime image.
- [x] Next.js and `eslint-config-next` were updated from `16.2.4` to `16.2.6`, resolving the high Next.js advisories from the first scan.
- [x] The prior `picomatch` high finding is no longer present in the rebuilt runtime image.
- [x] `node:26-alpine` was validated by the operator with local production and remote deployment.
- [x] Local production Compose warnings were reclassified: `env_file`, PostgreSQL host port `5432`, host-gateway, and `contents` bind mount are local-production concerns, not Docker image release blockers.
- [x] Runtime image vulnerability gate now passes with zero vulnerabilities reported by Trivy.
