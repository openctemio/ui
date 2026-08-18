# Docker & Sentry Setup Guide

**Last Updated:** 2026-01-08

Complete guide for Docker deployment and Sentry error reporting.

---

## Table of Contents

- [Docker Setup](#docker-setup)
  - [Architecture](#architecture)
  - [Quick Start](#quick-start)
  - [Development](#development)
  - [Production](#production)
- [Sentry Setup](#sentry-setup)
- [Troubleshooting](#troubleshooting)

---

## Docker Setup

### Architecture

The project uses a single `Dockerfile` with multi-stage build targets:

```
┌─────────────────────────────────────────────────────────────┐
│                      Dockerfile                              │
├─────────────────────────────────────────────────────────────┤
│  base          │ Node.js 26 Alpine base image               │
│  deps          │ Install npm dependencies                   │
│  development   │ Dev server with hot reload (~1.3GB)        │
│  builder       │ Build production application               │
│  production    │ Optimized runtime (~341MB)                 │
└─────────────────────────────────────────────────────────────┘
```

### Prerequisites

```bash
# Check Docker version (v20.10+)
docker --version

# Check Docker Compose version (v2.0+)
docker compose version
```

### Quick Start

```bash
# Development (with hot reload)
docker compose up --build

# Production
docker compose -f docker-compose.prod.yml up --build -d
```

---

## Development

### Start Development Server

```bash
# Build and start with hot reload
docker compose up --build

# Or run in background
docker compose up --build -d

# View logs
docker compose logs -f nextjs
```

### How Hot Reload Works

- Source code is mounted as volume (`./:/app`)
- `node_modules` and `.next` use anonymous volumes (container's version)
- `WATCHPACK_POLLING=true` enables file watching in Docker
- Changes auto-refresh in browser

### Development Commands

```bash
# Start
docker compose up

# Rebuild (after package.json changes)
docker compose up --build

# Stop
docker compose down

# Shell access
docker compose exec nextjs sh

# View logs
docker compose logs -f nextjs
```

### Environment Variables

Development uses `.env.local`:

```bash
# Copy example
cp .env.example .env.local

# Edit values
nano .env.local
```

---

## Production

### Step 1: Configure Environment

Create `.env` file for production:

```bash
cp .env.example .env
nano .env
```

Required variables:

```env
# API (server-side only — single source of truth)
# Auth (local JWT / OAuth social / SAML SSO) is handled by the backend — no
# Keycloak/OIDC variables are needed. Client-side requests are proxied through
# Next.js at /api/v1/*.
BACKEND_API_URL=https://api.your-domain.com

# Application
NEXT_PUBLIC_APP_URL=https://app.your-domain.com

# Security (REQUIRED)
SECURE_COOKIES=true
CSRF_SECRET=<generate-with-npm-run-generate-secret>

# Optional (inert until @sentry/nextjs is wired — see Sentry Setup below)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

### Step 2: Build & Deploy

```bash
# Build and start production
docker compose -f docker-compose.prod.yml up --build -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps
```

### Step 3: Verify Deployment

```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":"...","environment":"production"}
```

### Production Commands

```bash
# Start
docker compose -f docker-compose.prod.yml up -d

# Stop
docker compose -f docker-compose.prod.yml down

# Rebuild (no cache)
docker compose -f docker-compose.prod.yml build --no-cache

# Update (rebuild and restart)
docker compose -f docker-compose.prod.yml up --build -d

# Logs
docker compose -f docker-compose.prod.yml logs -f nextjs

# Shell access
docker compose -f docker-compose.prod.yml exec nextjs sh
```

---

## Nginx Reverse Proxy (Optional)

For production with SSL, uncomment the nginx service in `docker-compose.prod.yml`.

### Setup SSL Certificates

**Option A: Let's Encrypt (Recommended)**

```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy to nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

**Option B: Self-Signed (Development Only)**

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

### Configure Nginx

Edit `nginx/nginx.conf`:

```nginx
# Line 85 & 97: Update domain
server_name your-domain.com www.your-domain.com;
```

### Enable Nginx

In `docker-compose.prod.yml`, uncomment the nginx service section.

---

## Sentry Setup

> **Sentry is NOT wired yet.** `@sentry/nextjs` is not a dependency. The files
> `sentry.{client,server,edge}.config.ts` are no-op stubs (`export {}`), the
> `register()` hook in `instrumentation.ts` is a commented-out placeholder,
> `next.config.ts` does not wrap the config in `withSentryConfig`, and there is no
> `/api/test-sentry` route. Setting `NEXT_PUBLIC_SENTRY_DSN` alone does nothing.
> The steps below are what it would take to enable it.

### Step 1: Create Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Create new project → Choose "Next.js"
3. Copy the DSN

### Step 2: Install the SDK and make it a dependency

```bash
npm install --save @sentry/nextjs
```

### Step 3: Wire it up

1. Replace the stub `sentry.*.config.ts` files with real `Sentry.init(...)` configs
   (reference copies live in `sentry-configs/`).
2. Uncomment the Sentry initialization inside `register()` in `instrumentation.ts`.
3. Wrap the exported config in `next.config.ts` with `withSentryConfig(...)`.
4. Set the DSN in `.env.local` (dev) or `.env` (prod):

```env
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

### Step 4: Verify

With the SDK installed and wired, throw an error from any server/client component
(or add a temporary throwing route) and confirm the event appears in the Sentry
dashboard. There is no built-in `/api/test-sentry` endpoint.

---

## Docker Image Sizes

| Target      | Size   | Use Case                    |
| ----------- | ------ | --------------------------- |
| development | ~1.3GB | Local dev with hot reload   |
| production  | ~341MB | Optimized production deploy |

---

## Troubleshooting

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Container Won't Start

```bash
# Check logs
docker compose logs nextjs

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up
```

### Hot Reload Not Working

1. Ensure volumes are mounted correctly
2. Check `WATCHPACK_POLLING=true` is set
3. Restart container: `docker compose restart nextjs`

### Build Fails

```bash
# Clear Docker cache
docker builder prune -a

# Rebuild
docker compose build --no-cache
```

### Permission Denied

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Fix Docker (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

---

## Production Checklist

### Environment

- [ ] `.env` file created with all required variables
- [ ] `CSRF_SECRET` generated (32+ chars)
- [ ] `SECURE_COOKIES=true`
- [ ] Backend API accessible (handles auth: local JWT / OAuth / SAML SSO)

### Docker

- [ ] Production image builds: `docker compose -f docker-compose.prod.yml build`
- [ ] Container starts: `docker compose -f docker-compose.prod.yml up -d`
- [ ] Health check passes: `curl http://localhost:3000/api/health`

### SSL (if using Nginx)

- [ ] SSL certificates in `nginx/ssl/`
- [ ] Domain configured in `nginx/nginx.conf`
- [ ] HTTPS working

### Monitoring (optional — Sentry not wired by default)

- [ ] `@sentry/nextjs` installed and configs wired (see Sentry Setup)
- [ ] Sentry DSN configured
- [ ] Test error captured in Sentry
- [ ] Alerts configured

---

## Quick Reference

```bash
# ===== Development =====
docker compose up --build          # Start with rebuild
docker compose up -d               # Background
docker compose logs -f nextjs      # View logs
docker compose down                # Stop

# ===== Production =====
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml down

# ===== Utilities =====
docker compose exec nextjs sh      # Shell access
docker stats                       # Resource usage
docker system prune -a             # Clean up
```

---

**Last Updated:** 2026-01-08
