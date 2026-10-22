# syntax=docker/dockerfile:1.7

# Node 24 LTS security release (2026-10-21): fixes CVE-2026-111497 (Brotli
# remote code execution), TLS validation, and DNS flaws. See the dependency
# maintenance report for the evidence supporting this release-age exception.
ARG NODE_IMAGE=node:24.22.1-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
ARG APP_VERSION

# ==========================================
# STAGE 1: Build Dependencies
# ==========================================
FROM ${NODE_IMAGE} AS build-deps
WORKDIR /app

# Install all dependencies (including devDependencies)
COPY package.json package-lock.json* ./
RUN npm install --global npm@12.2.0 --min-release-age=7
RUN --mount=type=cache,id=npm-build,target=/root/.npm,sharing=locked npm ci --min-release-age=7

# ==========================================
# STAGE 2: Builder Stage
# ==========================================
FROM ${NODE_IMAGE} AS builder
WORKDIR /app

# Copy node_modules from build-deps stage
COPY --from=build-deps /app/node_modules ./node_modules

# Copy source code and configuration files
# Copy source code and configuration files (respecting .dockerignore to exclude secrets)
COPY . .

# Set environment variables for production build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_BUILD_CPUS=1
ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}

# Build the application with standalone output. Source maps are useful when
# uploaded to a private error tracker, but they expose readable production
# internals in a public image; keep them out of the runtime artifact.
RUN npm run build:docker && \
    find .next/standalone .next/static -type f -name '*.map' -delete && \
    rm -f .next/standalone/.env .next/standalone/.env.*

# ==========================================
# STAGE 3: Ultra-Slim Production Runner
# ==========================================
FROM ${NODE_IMAGE} AS runner

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_OPTIONS="--max-old-space-size=512"
ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}

WORKDIR /app

# Copy Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/contents ./contents

# Copy package.json for proper startup
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Remove package-manager tooling and any accidentally included env files from
# the runtime image. The server only needs `node server.js`.
RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack \
    /opt/yarn* \
    /usr/local/bin/yarn \
    /usr/local/bin/yarnpkg && \
    rm -f .env .env.* || true

# Switch to non-root user
USER nextjs

# Health check for Next.js application (disabled for debugging)
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#     CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Start the Next.js application
CMD ["node", "server.js"]
