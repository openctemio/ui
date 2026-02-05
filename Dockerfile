# ==============================================================================
# Multi-Stage Dockerfile for Next.js 16
# ==============================================================================
# Single Dockerfile with targets for both development and production.
#
# Development (with hot reload):
#   docker-compose up
#   OR: docker build --target development -t ui:dev .
#
# Production:
#   docker-compose -f docker-compose.prod.yml up --build
#   OR: docker build --target production -t ui:prod .
# ==============================================================================

# ==============================================================================
# BASE STAGE - Common dependencies
# ==============================================================================
FROM public.ecr.aws/docker/library/node:25-alpine AS base

# Add libc6-compat for Alpine compatibility with some npm packages
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ==============================================================================
# DEPS STAGE - Install dependencies
# ==============================================================================
FROM base AS deps

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies with BuildKit cache mount for faster builds
# Cache is shared across builds, significantly speeding up npm ci
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ==============================================================================
# DEVELOPMENT STAGE - Hot reload enabled
# ==============================================================================
FROM base AS development

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package.json for scripts
COPY package.json ./

# Set development environment
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Enable file watching in Docker (required for hot reload)
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

# Expose port
EXPOSE 3000

# Start development server with Turbopack
CMD ["npm", "run", "dev"]

# ==============================================================================
# BUILDER STAGE - Build production application
# ==============================================================================
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build-time environment variables (NEXT_PUBLIC_*)
# These are baked into the client bundle - NEVER put secrets here!
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_AUTH_PROVIDER=local
ARG NEXT_PUBLIC_AUTH_COOKIE_NAME=auth_token
ARG NEXT_PUBLIC_REFRESH_COOKIE_NAME=refresh_token
ARG NEXT_PUBLIC_OAUTH_CALLBACK_URL
ARG NEXT_PUBLIC_SENTRY_DSN
# Keycloak (only needed for OIDC auth)
ARG NEXT_PUBLIC_KEYCLOAK_URL
ARG NEXT_PUBLIC_KEYCLOAK_REALM
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ARG NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI
# Server-side only (NOT exposed to browser)
ARG BACKEND_API_URL

# Set environment for build
ENV DOCKER_BUILD=true
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Pass build args to env (NEXT_PUBLIC_* are baked into client bundle)
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_AUTH_PROVIDER=$NEXT_PUBLIC_AUTH_PROVIDER
ENV NEXT_PUBLIC_AUTH_COOKIE_NAME=$NEXT_PUBLIC_AUTH_COOKIE_NAME
ENV NEXT_PUBLIC_REFRESH_COOKIE_NAME=$NEXT_PUBLIC_REFRESH_COOKIE_NAME
ENV NEXT_PUBLIC_OAUTH_CALLBACK_URL=$NEXT_PUBLIC_OAUTH_CALLBACK_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
# Keycloak
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ENV NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI=$NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI
# Server-side only
ENV BACKEND_API_URL=$BACKEND_API_URL

# Build application
RUN npm run build

# ==============================================================================
# PRODUCTION STAGE - Minimal production image
# ==============================================================================
FROM base AS production

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Create .next directory with correct permissions
RUN mkdir .next && chown nextjs:nodejs .next

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "server.js"]
