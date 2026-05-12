# TK89 Action Points

Source: `TK89.output.md`

## Release Blockers

- [x] Upgrade vulnerable runtime dependencies, starting with `next` from `16.2.4` to at least `16.2.6`.
- [ ] Upgrade or resolve the vulnerable `picomatch` dependency path so Trivy no longer reports the high advisory.
- [ ] Run `npm run qa` after dependency updates.
- [ ] Rebuild the Docker image with no cache.
- [ ] Rerun `trivy image` against the rebuilt image and confirm no critical/high runtime findings remain, or document a formal accepted risk.
- [x] Validate `node:26-alpine` with local-production `make prod`.
- [x] Move `db-backups` and `knex/dumps` outside the repository, or formally accept the local-only repository hygiene risk.
- [ ] Rotate any credentials or tokens that were present in SQL dump files if those files ever left this machine or entered shared build/cache infrastructure.
- [ ] Remove production source maps from the final image, or formally accept the source disclosure risk for a public Docker Hub image.

## Docker Image Size And Runtime Contents

- [x] Test whether the final-stage `COPY --from=deps /app/node_modules ./node_modules` can be removed safely.
- [x] Build a trial image using only `.next/standalone`, `.next/static`, `public`, and `package.json`.
- [x] Smoke test the trial image for host-based app resolution on default and LingoCafe hosts.
- [ ] Smoke test auth, health, and one protected app route in the trial image.
- [x] Compare final image size before and after removing the extra `node_modules` layer.
- [x] If the trial passes, remove the redundant final `node_modules` copy from `Dockerfile`.
- [ ] If the trial fails, document the missing package or trace gap and keep the copy with a clear justification.

## Runtime Hardening

- [x] Document `docker-compose.prod.yml` as local production only: it mimics a production build locally but is not the real production topology.
- [ ] Keep `env_file: .env` acceptable only for local production; do not reuse it for real production deployment.
- [ ] Keep PostgreSQL host port `5432` acceptable only for local production; do not reuse it for real production deployment.
- [ ] Review `extra_hosts: host.docker.internal:host-gateway` as local-only and avoid copying it to real production unless required.
- [ ] For any real Compose production topology, add compatible hardening: `cap_drop`, `security_opt: no-new-privileges`, and read-only bind mounts.
- [ ] For any real Compose production topology, evaluate `read_only: true` plus `tmpfs` for writable temp/cache paths.
- [ ] Align the runtime user and group so `nextjs` belongs to `nodejs`, or document `nextjs:nogroup` as intentional.
- [ ] Decide whether health checks belong in the Docker image, Compose, or both.

## Publish Hygiene

- [ ] Add SBOM generation for published images.
- [ ] Add provenance or attestation for published images.
- [ ] Add image signing policy before public Docker Hub distribution.
- [ ] Define when `latest` may be moved.
- [ ] Keep the `make publish` security gate enabled before `docker buildx build --push`.

## Security Tooling

- [ ] Extend the security check to inspect source maps, dump/backup files, `.npmrc`, docs/backlog, `.agents`, runtime user, final filesystem policy, and Trivy status.
- [ ] Keep secret scan output sanitized: report rule, path, and line only; never paste secret values.
- [ ] Run `make security.check.draft` when findings should become a draft backlog task.

## Already Addressed

- [x] Update `.dockerignore` so Docker build context excludes `knex`, `db-backups`, `.local`, `.tmp`, `*.sql`, `*.dump`, and `*.backup`.
