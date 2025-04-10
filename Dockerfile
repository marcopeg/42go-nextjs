# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies only when needed
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Define build arguments
# ARG DATABASE_URL
# ARG NEXTAUTH_SECRET
# ARG NEXT_PUBLIC_APP_URL
# ARG NEXT_PUBLIC_NEXTAUTH_URL

# Set environment variables based on build arguments
# ENV DATABASE_URL=$DATABASE_URL
# ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
# ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# ENV NEXT_PUBLIC_NEXTAUTH_URL=$NEXT_PUBLIC_NEXTAUTH_URL

# Set environment variables for production build
# ENV NEXT_TELEMETRY_DISABLED 1
# ENV NODE_ENV production

# Build the application
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_BUILD_OUTPUT=standalone
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Add the docs folder to the image
COPY docs .

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
#ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]