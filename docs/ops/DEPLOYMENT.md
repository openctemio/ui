# Deployment Guide

**Last Updated:** 2026-01-08
**Version:** 1.1.0

Complete guide for deploying this Next.js application to production.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Methods](#deployment-methods)
  - [Vercel (Recommended)](#vercel-deployment-recommended)
  - [Docker](#docker-deployment)
  - [Traditional Server](#traditional-server-deployment)
- [Post-Deployment](#post-deployment)
- [Production Checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

1. **Keycloak Server**
   - Production Keycloak instance running
   - Realm and client configured
   - HTTPS enabled
   - @see [docs/auth/KEYCLOAK_SETUP.md](./auth/KEYCLOAK_SETUP.md)

2. **Backend API**
   - Your separate backend API deployed
   - API accessible via HTTPS
   - CORS configured to allow frontend domain

3. **Domain & SSL**
   - Custom domain name (optional but recommended)
   - SSL/TLS certificate (automatic with Vercel, manual with Docker)

### Required Environment Variables

Copy from .env.example and configure for production:

```bash
# Keycloak (Production URLs)
NEXT_PUBLIC_KEYCLOAK_URL=https://auth.your-domain.com
NEXT_PUBLIC_KEYCLOAK_REALM=production-realm
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=nextjs-client
KEYCLOAK_CLIENT_SECRET=<secret-from-keycloak>
NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI=https://your-app.com/auth/callback

# Backend API
NEXT_PUBLIC_BACKEND_API_URL=https://api.your-domain.com
BACKEND_API_URL=https://api.your-domain.com

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.com

# Security (CRITICAL)
SECURE_COOKIES=true  # Must be true in production
CSRF_SECRET=<generated-64-char-secret>  # Run: npm run generate-secret
ENABLE_TOKEN_REFRESH=true
TOKEN_REFRESH_BEFORE_EXPIRY=300
```

---

## Environment Setup

### 1. Generate Secrets

```bash
# Generate CSRF secret
npm run generate-secret

# Copy the generated secret to your .env.production file
```

### 2. Validate Environment Variables

```bash
# Test validation locally
npm run build

# You should see:
# ✅ Environment variables validated successfully
```

### 3. Update Keycloak Configuration

In Keycloak Admin Console:

1. Navigate to your client settings
2. Update **Valid Redirect URIs**:
   ```
   https://your-app.com/*
   https://your-app.com/auth/callback
   ```
3. Update **Web Origins**:
   ```
   https://your-app.com
   ```
4. Update **Logout Redirect URIs**:
   ```
   https://your-app.com
   ```

---

## Deployment Methods

### Vercel Deployment (Recommended)

**Why Vercel:**
- ✅ Zero-configuration deployment
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Automatic previews for PRs
- ✅ Built-in analytics

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Configure Environment Variables

Create `.env.production` file with production values (DO NOT commit this file).

Then add to Vercel:

```bash
# Option A: Via CLI
vercel env add NEXT_PUBLIC_KEYCLOAK_URL
vercel env add NEXT_PUBLIC_KEYCLOAK_REALM
vercel env add NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
vercel env add KEYCLOAK_CLIENT_SECRET
vercel env add NEXT_PUBLIC_BACKEND_API_URL
vercel env add NEXT_PUBLIC_APP_URL
vercel env add SECURE_COOKIES
vercel env add CSRF_SECRET
# ... add all required vars

# Option B: Via Vercel Dashboard
# 1. Go to https://vercel.com/dashboard
# 2. Select your project
# 3. Go to Settings → Environment Variables
# 4. Add all variables from .env.example
```

#### Step 4: Deploy

```bash
# Deploy to production
vercel --prod

# Or connect Git repository for automatic deployments
# 1. Push code to GitHub/GitLab
# 2. Import project in Vercel dashboard
# 3. Configure environment variables
# 4. Deploy automatically on push to main
```

#### Step 5: Configure Custom Domain (Optional)

```bash
# Add custom domain
vercel domains add your-app.com

# Configure DNS:
# - Type: CNAME
# - Name: @ (or www)
# - Value: cname.vercel-dns.com
```

#### Vercel Configuration File

Create `vercel.json` (optional):

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["sfo1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

### Docker Deployment

**Why Docker:**
- ✅ Portable across platforms
- ✅ Consistent environments
- ✅ Easy scaling with orchestration
- ✅ Self-hosted option

#### Step 1: Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Multi-stage build for smaller image

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on package manager
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_KEYCLOAK_URL
ARG NEXT_PUBLIC_KEYCLOAK_REALM
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ARG NEXT_PUBLIC_BACKEND_API_URL
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ENV NEXT_PUBLIC_BACKEND_API_URL=$NEXT_PUBLIC_BACKEND_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NODE_ENV=production

# Build Next.js
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### Step 2: Create .dockerignore

```
node_modules
.next
.git
.env*
!.env.example
coverage
*.md
.vscode
.idea
```

#### Step 3: Update next.config.ts

Add standalone output:

```typescript
const nextConfig: NextConfig = {
  // ... existing config
  output: 'standalone', // Add this for Docker
}
```

#### Step 4: Create docker-compose.yml

```yaml
version: '3.8'

services:
  nextjs:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_KEYCLOAK_URL: ${NEXT_PUBLIC_KEYCLOAK_URL}
        NEXT_PUBLIC_KEYCLOAK_REALM: ${NEXT_PUBLIC_KEYCLOAK_REALM}
        NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: ${NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}
        NEXT_PUBLIC_BACKEND_API_URL: ${NEXT_PUBLIC_BACKEND_API_URL}
        NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - KEYCLOAK_CLIENT_SECRET=${KEYCLOAK_CLIENT_SECRET}
      - CSRF_SECRET=${CSRF_SECRET}
      - SECURE_COOKIES=true
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

#### Step 5: Build and Run

```bash
# Development: Build and run
docker-compose up --build

# Production: Build and run with Nginx reverse proxy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Health check verification
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"...","uptime":...,"environment":"production"}
```

**Important:** The production setup (`docker-compose.prod.yml`) includes:
- Nginx reverse proxy with SSL/TLS support
- Rate limiting (10 requests/second)
- Security headers
- Health check monitoring

#### Step 6: Setup Nginx Reverse Proxy (Recommended)

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-app.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-app.com;

    # SSL certificates
    ssl_certificate /etc/ssl/certs/your-app.crt;
    ssl_certificate_key /etc/ssl/private/your-app.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers (in addition to Next.js headers)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### Traditional Server Deployment

For VPS, AWS EC2, DigitalOcean, etc.

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

#### Step 2: Deploy Application

```bash
# Clone repository
git clone https://github.com/your-repo/app.git
cd app

# Install dependencies
npm ci --production=false

# Create .env.production
cp .env.example .env.production
# Edit .env.production with production values

# Build application
npm run build

# Start with PM2
pm2 start npm --name "nextjs-app" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Step 3: Setup Nginx

```bash
# Install Nginx
sudo apt install nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/nextjs-app

# Add the nginx.conf content from Docker section above

# Enable site
sudo ln -s /etc/nginx/sites-available/nextjs-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 4: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-app.com

# Auto-renewal is configured automatically
```

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Check if site is accessible
curl -I https://your-app.com

# Should return:
# HTTP/2 200
# ...security headers...
```

### 2. Test Authentication Flow

1. Open https://your-app.com
2. Click "Login"
3. Verify redirect to Keycloak
4. Complete login
5. Verify redirect back to app
6. Verify user data displayed
7. Test logout

### 3. Monitor Application

**With PM2 (Traditional):**
```bash
# View logs
pm2 logs nextjs-app

# Monitor performance
pm2 monit
```

**With Docker:**
```bash
# View logs
docker-compose logs -f nextjs

# Monitor resources
docker stats
```

**With Vercel:**
- View logs in Vercel Dashboard
- Setup integrations (Sentry, LogRocket, etc.)

### 4. Setup Monitoring (Recommended)

#### Sentry for Error Tracking

```bash
# Install Sentry
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard@latest -i nextjs

# Add NEXT_PUBLIC_SENTRY_DSN to environment variables
```

#### Health Check Endpoint

The health check endpoint is already implemented at `src/app/api/health/route.ts`:

```typescript
// GET /api/health
// Response:
{
  "status": "ok",
  "timestamp": "2026-01-08T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

Test your deployment:
```bash
# Local
curl http://localhost:3000/api/health

# Production
curl https://your-app.com/api/health

# Docker health check (automatic)
docker inspect --format='{{.State.Health.Status}}' <container_id>
```

**Note:** Docker health checks automatically use this endpoint. If the endpoint returns non-200, the container will be marked as unhealthy.

---

## Production Checklist

Before going live, verify:

### Environment

- [ ] All environment variables set
- [ ] SECURE_COOKIES=true
- [ ] CSRF_SECRET generated (64+ characters)
- [ ] NODE_ENV=production
- [ ] HTTPS enabled

### Keycloak

- [ ] Production realm created
- [ ] Client configured with production URLs
- [ ] Valid Redirect URIs updated
- [ ] Web Origins updated
- [ ] Client secret secure

### Security

- [ ] Security headers configured (X-Frame-Options, CSP, etc.)
- [ ] HTTPS enforced
- [ ] Cookies are HttpOnly and Secure
- [ ] No secrets in code
- [ ] CORS configured on backend

### Performance

- [ ] Build optimization enabled
- [ ] Static assets cached
- [ ] CDN configured (if using)
- [ ] Images optimized

### Monitoring

- [ ] Error reporting setup (Sentry)
- [ ] Logging configured
- [ ] Health check endpoint working
- [ ] Uptime monitoring setup

### Backup

- [ ] Environment variables backed up (in vault)
- [ ] Database backup strategy (if applicable)
- [ ] Disaster recovery plan documented

---

## Troubleshooting

### "Redirect URI mismatch" Error

**Cause:** Keycloak redirect URI not matching production URL

**Fix:**
1. Go to Keycloak Admin → Clients → Your Client
2. Add to **Valid Redirect URIs**: `https://your-app.com/auth/callback`
3. Save changes

### "CSRF validation failed" Error

**Cause:** CSRF_SECRET not set or cookies not working

**Fix:**
1. Verify CSRF_SECRET is set: `echo $CSRF_SECRET`
2. Verify SECURE_COOKIES=true in production
3. Verify HTTPS is enabled
4. Check browser console for cookie errors

### 502 Bad Gateway (Nginx)

**Cause:** Next.js app not running or port mismatch

**Fix:**
```bash
# Check if app is running
pm2 status
# or
docker ps

# Check port
sudo netstat -tulpn | grep 3000

# Restart service
pm2 restart nextjs-app
# or
docker-compose restart
```

### Environment Variables Not Loading

**Cause:** Build-time vs runtime variables confusion

**Fix:**
- `NEXT_PUBLIC_*` variables: Available in browser (build-time)
- Other variables: Server-side only (runtime)
- Rebuild after changing NEXT_PUBLIC_ variables

### Performance Issues

**Check:**
```bash
# Memory usage
free -h

# CPU usage
top

# Docker resources
docker stats
```

**Optimize:**
- Increase server resources
- Enable CDN
- Optimize images
- Review slow API calls

---

## Additional Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Keycloak Production Deployment](https://www.keycloak.org/server/configuration-production)

---

## Support

For deployment issues:
1. Check [docs/auth/TROUBLESHOOTING.md](../features/auth/TROUBLESHOOTING.md)
2. Review logs (PM2, Docker, Vercel)
3. Test in staging environment first
4. Open issue on GitHub

---

**Last Updated:** 2026-01-08
**Version:** 1.1.0
