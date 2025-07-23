# Production Build [abo]

Improve the `Dockerfile` and `docker-compose.prod.yml` and relative tasks in the `Makefile` so to be able to run a locally built production container.

## Development Plan

### Current State Analysis

**✅ Existing Infrastructure**:

- Basic multi-stage Dockerfile with deps/builder/runner stages
- Production docker-compose setup with PostgreSQL
- Makefile with production targets (`prod.build`, `prod.start`, etc.)
- Next.js 15.3.3 with App Router and TypeScript

**❌ Areas for Improvement**:

- Dockerfile not optimized for Next.js standalone output
- Missing application health checks
- Suboptimal layer caching and image size
- No Next.js specific optimizations
- Missing security hardening

### Architecture: Next.js Standalone Production Build

**Core Strategy**: Leverage Next.js standalone output mode for minimal, self-contained production images with optimized Docker layer caching.

### Implementation Steps

#### 1. Enable Next.js Standalone Output ✅ **PRIORITY**

**Target**: Configure Next.js for optimal production builds

**Changes**:

- Update `next.config.ts` to enable `output: "standalone"`
- Configure proper external packages handling
- Optimize build configuration for production

#### 2. Optimize Dockerfile for Next.js ✅ **PRIORITY**

**Target**: Multi-stage build optimized for Next.js standalone output

**Key Features**:

- **Stage 1: Dependencies** - Cached dependency installation
- **Stage 2: Builder** - Next.js standalone build
- **Stage 3: Production Dependencies** - Minimal runtime dependencies
- **Stage 4: Runner** - Ultra-slim production image

**Optimizations**:

- Proper layer caching for dependencies
- Next.js standalone output utilization
- Security hardening with non-root user
- Application health checks
- Minimal image size

#### 3. Enhance docker-compose.prod.yml ✅ **PRIORITY**

**Target**: Production-ready container orchestration

**Improvements**:

- Proper dependency management between services
- Enhanced health check configuration
- Environment variable security
- Network isolation and security
- Persistent volume management

#### 4. Update Makefile Production Workflow ✅ **PRIORITY**

**Target**: Streamlined production deployment pipeline

**Enhancements**:

- Health check verification commands
- Complete build and deployment pipeline
- Log management utilities
- Environment validation
- Clean rebuild processes

#### 5. Testing and Documentation ✅ **ESSENTIAL**

**Target**: Verified production deployment process

**Deliverables**:

- Local production build testing
- Performance benchmarking comparison
- Complete deployment documentation
- Troubleshooting guide

### Expected Outcomes

**Performance Benefits**:

- 🚀 **Faster builds**: Better Docker layer caching
- 📦 **Smaller images**: Next.js standalone output reduces image size by 60-80%
- ⚡ **Faster startup**: Minimal runtime dependencies

**Security & Reliability**:

- 🔒 **Security hardening**: Non-root user, minimal attack surface
- 💪 **Health monitoring**: Application and database health checks
- 🔄 **Restart policies**: Automatic recovery from failures

**Developer Experience**:

- 📚 **Documentation**: Complete production deployment guide
- 🛠️ **Tooling**: Streamlined Makefile commands
- 🔍 **Debugging**: Enhanced logging and monitoring

## Next Steps

**Execute with**: `k2` (execute task)

---

## Original Inspiration

Take inspiration from the multi-stage build that I've used for a NestJS app:

```Dockerfile
# ==========================================
# STAGE 1: Dependencies Cache Layer
# ==========================================
FROM node:22-alpine AS deps
WORKDIR /app

# Install only package.json first for better caching
# COPY package.json yarn.lock ./
COPY package.json ./
RUN yarn install --frozen-lockfile --production=false


# ==========================================
# STAGE 2: Build Stage (Minimal)
# ==========================================
FROM node:22-alpine AS build
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source and build (minimal files only)
COPY package.json nest-cli.json tsconfig*.json ./
COPY src ./src

# Build the application
RUN yarn build

# ==========================================
# STAGE 3: Production Dependencies Only
# ==========================================
FROM node:22-alpine AS prod-deps
WORKDIR /app

# Copy package files and install ONLY production dependencies
# COPY package.json yarn.lock ./
COPY package.json ./
RUN yarn install --frozen-lockfile --production=true && \
    yarn cache clean && \
    # Remove unnecessary files from node_modules
    find node_modules -name "*.d.ts" -delete && \
    find node_modules -name "*.map" -delete && \
    find node_modules -name "*.md" -delete && \
    find node_modules -name "LICENSE*" -delete && \
    find node_modules -name "CHANGELOG*" -delete && \
    find node_modules -name "*.test.js" -delete && \
    find node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "docs" -type d -exec rm -rf {} + 2>/dev/null || true


# ==========================================
# STAGE 4: Ultra-Slim Production Image
# ==========================================
FROM node:22-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=512"

WORKDIR /app

# Copy ONLY what's needed for production
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/dist ./dist
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json

# Copy runtime files (minimal set)
COPY --chown=nextjs:nodejs llms.md .

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]
```
