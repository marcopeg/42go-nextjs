# 🪲 Next Standalone `.env` File Security Issue [acj]

**Problem**: The Next.js standalone build in `.next/standalone/` includes a copy of the `.env` file containing sensitive secrets. This creates a security vulnerability where production builds inadvertently expose environment variables.

**Security Risk**: Production Docker images contain unredacted environment variables that could expose sensitive credentials if inspected.

## Investigation Findings

### Root Cause

Next.js standalone output (`output: "standalone"`) automatically copies the project's `.env` file to `.next/standalone/.env` during the build process. This behavior is by design to ensure standalone applications have access to environment variables without requiring external configuration.

### Current Architecture Impact

- **Dockerfile Stage 3 (Builder)**: Copies entire project including `.env` file
- **Build Process**: `npm run build` generates `.next/standalone/` with `.env` copy
- **Docker Stage 4 (Runner)**: Copies `.next/standalone/` including the `.env` file
- **Security Gap**: Production container contains original `.env` with all secrets

### Next.js Environment Variable Best Practices

According to Next.js documentation:

- Environment variables should be injected at **runtime**, not build time
- Standalone mode expects environment variables via `process.env` at runtime
- The copied `.env` file is a fallback mechanism, not the primary method

## Goals

- [x] Remove `.env` file from production Docker images
- [x] Ensure environment variables work correctly via Docker environment injection
- [x] Verify standalone application functions without the `.env` file
- [x] Document secure environment variable practices for production
- [x] Test production deployment pipeline with corrected approach

## Acceptance Criteria

- [x] `.env` file is not present in final Docker production image
- [x] Environment variables are passed through `docker-compose.prod.yml` environment section
- [x] Application starts and functions correctly with runtime environment injection
- [x] No secrets are hardcoded or copied into the Docker image
- [x] Production build process is documented with security considerations
- [x] Verification script to check for presence of `.env` in built images
- [x] Update `Dockerfile` to explicitly exclude `.env` files from production layers

## Technical Analysis

### Current State

```bash
# Evidence of security issue
$ ls -la .next/standalone/
-rw-r--r-- 1 user staff 700 Aug 7 06:57 .env  # ❌ SECURITY RISK
```

### Expected Behavior

- Environment variables injected via Docker: `ENV NODE_ENV=production`
- Runtime variable access: `docker run -e DATABASE_URL=... app`
- No `.env` files in production containers

### Next.js Standalone Documentation Reference

> "You can define `PORT` or `HOSTNAME` environment variables before running to listen on a specific address, for example: `PORT=8080 HOSTNAME=0.0.0.0 node server.js`"

This confirms variables should be provided at runtime, not via copied files.

## Implementation Strategy

1. **Dockerfile Enhancement**: Add explicit `.env` exclusion from production stages
2. **Environment Injection**: Verify `docker-compose.prod.yml` properly injects variables
3. **Build Verification**: Add security check to ensure no `.env` files in final image
4. **Documentation Update**: Update production deployment guide with security practices
5. **Testing**: Validate application works with runtime-only environment variables

## Development Plan

### Phase 1: Dockerfile Security Enhancement

- [x] Create `.dockerignore` file to prevent sensitive files from being copied
- [x] Keep `.dockerignore` enforcement and add defense-in-depth `rm -f .env*` in runner stage
- [x] Ensure `.next/standalone/` directory doesn't include `.env` in final image

### Phase 2: Environment Variable Injection Verification

- [x] Remove `env_file: - .env` dependency from `docker-compose.prod.yml`
- [x] Ensure required variables are explicitly listed in `environment:` section (added NEXTAUTH_URL, NEXTAUTH_SECRET, PGSTRING)
- [x] Test Next.js standalone server receives variables via runtime `process.env`

### Phase 3: Security Validation & Testing

- [x] Create `scripts/check-docker-security.sh` verification script
- [ ] Add security test to production pipeline
- [x] Validate application functionality with runtime-only environment variables

## Progress

Implemented .dockerignore, hardened Dockerfile (removed duplicate CMD, added env file purge), updated docker-compose.prod.yml to drop env_file and inject required envs explicitly, created security check script (remember to chmod +x on first run), and updated production docs. Verified: prod build/start OK, app healthy, envs injected at runtime, no .env present in container.

### Files to Modify

1. **Create**: `.dockerignore` (prevent sensitive file copying)
2. **Modify**: `Dockerfile` (Stage 3 selective copying)
3. **Modify**: `docker-compose.prod.yml` (remove env_file dependency)
4. **Create**: `scripts/check-docker-security.sh` (security verification)
5. **Update**: `docs/articles/PRODUCTION_DEPLOYMENT.md` (security documentation)

### Testing Strategy

```bash
# Build and verify security
make prod.build
docker run --rm -it <image> find / -name ".env*" 2>/dev/null

# Test functionality
make prod.start && make prod.health

# Verify environment variables
docker exec <container> printenv | grep -E "(DATABASE_URL|NODE_ENV)"
```

## Dependencies

- Requires understanding of current Dockerfile multi-stage build
- Integration with existing `docker-compose.prod.yml` configuration
- Alignment with production deployment workflow (`make prod`)

## Next Steps

Execute task (k3) to implement the security fixes

## References

- [Next.js Standalone Output Documentation](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [Next.js Environment Variables Guide](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- Task [abo] Production Build implementation for context
