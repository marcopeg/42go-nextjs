# ==========================================
# STAGE 1: Dependencies Cache Layer
# ==========================================
FROM node:22-alpine AS deps
WORKDIR /app

# Install dependencies only when needed
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ==========================================
# STAGE 2: Build Dependencies
# ==========================================
FROM node:22-alpine AS build-deps
WORKDIR /app

# Install all dependencies (including devDependencies)
COPY package.json package-lock.json* ./
RUN npm ci

# ==========================================
# STAGE 3: Builder Stage
# ==========================================
FROM node:22-alpine AS builder
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

# Build the application with standalone output
RUN npm run build

# ==========================================
# STAGE 4: Ultra-Slim Production Runner
# ==========================================
FROM node:22-alpine AS runner

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_OPTIONS="--max-old-space-size=512"

WORKDIR /app

# Copy production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy package.json for proper startup
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Remove any accidentally included env files from standalone output (defense in depth)
RUN rm -f .env .env.* || true

# Switch to non-root user
USER nextjs

# Health check for Next.js application
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Start the Next.js application
CMD ["node", "server.js"]