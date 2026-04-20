# 🦲 Next Standalone `.env` File Security Issue [acj]

Status: COMPLETE — August 14, 2025

## Summary

Eliminated `.env` files from production Docker images in Next.js standalone builds. Moved to explicit runtime environment variable injection via Compose. Added verification script and updated docs.

## Changes

- Added `.dockerignore` to exclude `.env` and other local artifacts
- Hardened `Dockerfile` runner stage to remove accidental `.env*` files and removed duplicate CMD
- Updated `docker-compose.prod.yml` to remove `env_file` and inject envs explicitly (added NEXTAUTH_URL, NEXTAUTH_SECRET, PGSTRING)
- Created `scripts/check-docker-security.sh` to assert no `.env` files exist inside the container
- Updated `docs/articles/PRODUCTION_DEPLOYMENT.md` with secure env handling and verification steps

## Validation

- Built image via `make prod.build`
- Started environment via `make prod.start` — health OK
- Ran `./scripts/check-docker-security.sh` — no `.env` found
- Verified runtime envs via `printenv` inside container

## Files Touched

- `.dockerignore` (new)
- `Dockerfile` (update)
- `docker-compose.prod.yml` (update)
- `scripts/check-docker-security.sh` (new)
- `docs/articles/PRODUCTION_DEPLOYMENT.md` (update)
- `docs/backlog/tasks/acj-next-standalone.md` (progress + completion)
- `docs/backlog/BACKLOG.md` (moved to Completed)

## Notes

- Replace `NEXTAUTH_SECRET=replace-me-in-prod` with a strong secret in real deployments
- Keep envs in orchestration only; never bake secrets into images
