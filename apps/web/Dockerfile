# syntax=docker/dockerfile:1
# Build context: workspace root (dev_digest_tracker/)

# Base image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

# Dependencies
FROM base AS deps
# Copy workspace root manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy web app package.json
COPY apps/web/package.json ./apps/web/package.json
# Install only web app deps
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @devdigest/web...

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

# Generate Prisma client
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN ./node_modules/.bin/prisma generate --schema=./apps/web/prisma/schema.prisma

# Build web application
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @devdigest/web build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# With outputFileTracingRoot set to workspace root, standalone output is at:
# apps/web/.next/standalone/
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Copy Prisma schema for migrations
COPY --from=builder /app/apps/web/prisma ./apps/web/prisma

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
