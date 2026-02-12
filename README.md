# OpenCTEM Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Hub-2496ED?logo=docker)](https://hub.docker.com/r/openctemio/ui)

Continuous Threat Exposure Management (CTEM) platform built with Next.js 16, featuring the complete 5-stage CTEM process: Scoping, Discovery, Prioritization, Validation, and Mobilization.

![OpenCTEM Dashboard](docs/images/dashboard.png)

## Overview

OpenCTEM is an enterprise-grade Attack Surface Management (ASM) and Vulnerability Management platform that helps security teams continuously monitor, assess, and remediate security risks across their digital infrastructure.

## Key Features

### CTEM 5-Stage Process

- **Scoping** - Define attack surface boundaries and business context
- **Discovery** - Automated asset discovery (domains, websites, services, repositories, cloud, credentials)
- **Prioritization** - Risk-based vulnerability prioritization with business impact analysis
- **Validation** - Attack simulation and security control testing
- **Mobilization** - Remediation task management with workflow automation

### Asset Management

- **6 Asset Types** - Domains, Websites, Services, Repositories, Cloud Assets, Credential Leaks
- **Asset Groups** - Organize assets by environment (Production, Staging, Development)
- **Risk Scoring** - 0-100 risk scores with severity-based visualization

### Scan Management

- **Single Scans** - One-time scans with custom configuration
- **Workflow Scans** - Predefined multi-tool workflows (Full Recon, Vuln Assessment, etc.)
- **Scan Runners** - Distributed scan execution with runner management
- **Agent Preference** - Choose between tenant-owned or platform agents:
  - `Auto` - Platform decides based on quota and availability
  - `Tenant` - Use only tenant-owned agents
  - `Platform` - Use shared platform agents (quota-based)

### Findings & Remediation

- **Severity Classification** - Critical, High, Medium, Low, Info
- **CVSS Scoring** - Industry-standard vulnerability scoring
- **Task Management** - Kanban-style remediation workflow
- **Assignee Tracking** - Team-based task assignment

### Security & Authentication

- **Keycloak OAuth2/OIDC** - Enterprise-grade authentication
- **Role-Based Access Control** - Fine-grained permissions
- **Secure Cookies** - HttpOnly, Secure, SameSite
- **CSRF Protection** - Cross-site request forgery prevention

### Deployment & Operations

- **Docker Support** - Multi-stage optimized build with health checks
- **Nginx Configuration** - Reverse proxy with SSL/TLS and rate limiting
- **Health Monitoring** - Built-in `/api/health` endpoint
- **Production-Ready** - Environment validation, security hardening

---

## 📚 Documentation

| Guide                                                                       | Description               |
| --------------------------------------------------------------------------- | ------------------------- |
| [Getting Started](https://docs.openctem.io/docs/getting-started)            | Quick start guide         |
| [Development Setup](https://docs.openctem.io/docs/development-setup)        | IDE, debugging, testing   |
| [Authentication](https://docs.openctem.io/docs/guides/authentication)       | JWT & OIDC auth flow      |
| [Multi-tenancy](https://docs.openctem.io/docs/guides/multi-tenancy)         | Teams & tenant switching  |
| [Permissions](https://docs.openctem.io/docs/guides/permissions)             | Role-based access control |
| [API Reference](https://docs.openctem.io/docs/api/reference)                | Complete API endpoints    |
| [Configuration](https://docs.openctem.io/docs/operations/configuration)     | Environment variables     |
| [Troubleshooting](https://docs.openctem.io/docs/operations/troubleshooting) | Common issues             |

---

## 🛠️ Tech Stack

**Framework & Runtime:**

- Next.js 16.0.8 (App Router)
- React 19
- Node.js 20+

**Authentication:**

- Keycloak (OAuth2/OIDC)
- JWT token validation
- Cookie-based sessions

**UI & Styling:**

- Tailwind CSS 4
- shadcn/ui components
- Radix UI primitives

**State & Data:**

- Zustand (global state)
- SWR (data fetching)
- Zod (validation)

**Testing:**

- Vitest
- React Testing Library
- V8 coverage

**DevOps:**

- Docker
- Nginx
- Sentry (optional)

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 20+** - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Keycloak Server** - [Setup Guide](./docs/auth/KEYCLOAK_SETUP.md)
- **Backend API** (optional) - Your separate backend service

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd codebase-nextjs

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Generate CSRF secret
npm run generate-secret

# Edit .env.local with your values
nano .env.local
```

**Required environment variables:**

```env
# Keycloak Configuration
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=your-realm
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret

# Backend API
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000

# Security
CSRF_SECRET=<generated-secret>
SECURE_COOKIES=false  # Set to true in production

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Setup Keycloak

Follow the [Keycloak Setup Guide](./docs/auth/KEYCLOAK_SETUP.md) to:

1. Install Keycloak server
2. Create realm and client
3. Configure redirect URIs
4. Get client credentials

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

### Getting Started

- **[CLAUDE.md](./CLAUDE.md)** - Project architecture & conventions
- **[docs/README.md](./docs/README.md)** - Documentation overview

### Authentication

- **[Keycloak Setup](./docs/auth/KEYCLOAK_SETUP.md)** - Setup Keycloak server
- **[Auth Usage](./docs/auth/AUTH_USAGE.md)** - Implement login, logout, protected routes
- **[API Reference](./docs/auth/API_REFERENCE.md)** - Complete API documentation
- **[Troubleshooting](./docs/auth/TROUBLESHOOTING.md)** - Common issues & solutions

### Backend Integration

- **[API Integration](./docs/API_INTEGRATION.md)** - Connect to your backend API
- **[Customize Types](./docs/CUSTOMIZE_TYPES_GUIDE.md)** - Match your backend schema
- **[Scaling Types](./docs/ORGANIZING_TYPES_AT_SCALE.md)** - Organize for large projects

### Deployment

- **[Production Checklist](./docs/PRODUCTION_CHECKLIST.md)** - Pre-deployment checklist
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Vercel, Docker, traditional server
- **[Docker & Sentry](./docs/DOCKER_SENTRY_SETUP.md)** - Docker deployment with monitoring

---

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server (port 3000)

# Building
npm run build            # Create production build
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checks
npm test                 # Run tests
npm run test:coverage    # Run tests with coverage
npm run test:ui          # Run tests with UI

# Utilities
npm run generate-secret  # Generate CSRF secret
```

---

## Project Structure

```
ui/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── (auth)/               # Auth pages (login, register)
│   │   ├── (dashboard)/          # Protected dashboard pages
│   │   │   ├── page.tsx          # CTEM Dashboard
│   │   │   ├── asset-groups/     # Asset Groups management
│   │   │   ├── discovery/        # Discovery pages
│   │   │   │   ├── scans/        # Scan management
│   │   │   │   ├── runners/      # Scan runners
│   │   │   │   └── assets/       # Asset inventory (6 types)
│   │   │   ├── findings/         # Findings list
│   │   │   └── mobilization/     # Remediation tasks
│   │   └── api/                  # API routes
│   │       └── health/           # Health check endpoint
│   ├── components/               # Shared components
│   │   ├── ui/                   # shadcn/ui components
│   │   └── layout/               # Layout components
│   ├── features/                 # Feature-based modules
│   │   ├── auth/                 # Authentication
│   │   ├── assets/               # Asset management
│   │   ├── findings/             # Findings & vulnerabilities
│   │   ├── scans/                # Scan management
│   │   ├── remediation/          # Remediation tasks
│   │   └── shared/               # Shared CTEM components
│   ├── lib/                      # Shared utilities
│   └── stores/                   # Zustand stores
├── docs/                         # Documentation
├── nginx/                        # Nginx configuration
│   ├── nginx.conf               # Main Nginx config (SSL, rate limiting)
│   ├── ssl/                     # SSL certificates directory
│   └── README.md                # SSL setup instructions
├── docs/images/                  # README images/screenshots
├── Dockerfile                    # Multi-stage build (dev & prod targets)
├── docker-compose.yml            # Development with hot reload
├── docker-compose.prod.yml       # Production with Nginx/SSL
└── docker-compose.prod-simple.yml # Production without Nginx
```

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui

# Watch mode
npm test -- --watch
```

### Coverage Report

Current coverage: **84.28%** overall, **95%+** on critical auth components

```
src/
├── features/auth/        95.2% ✅
├── lib/keycloak/         94.8% ✅
├── stores/auth-store.ts  98.1% ✅
└── Overall               84.28% ✅
```

---

## 🚀 Deployment

### Option 1: Vercel (Recommended for quick deployment)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

See [Deployment Guide](./docs/DEPLOYMENT.md#vercel) for details.

### Option 2: Docker (Recommended for production)

#### Docker Compose Files

| File                             | Purpose             | Includes Nginx |
| -------------------------------- | ------------------- | -------------- |
| `docker-compose.yml`             | Development         | No             |
| `docker-compose.prod.yml`        | Production (full)   | Yes (SSL/TLS)  |
| `docker-compose.prod-simple.yml` | Production (simple) | No             |

#### Development (with hot reload)

```bash
docker compose up --build
```

Features:

- Hot reload with volume mounts
- Port 3000 exposed
- Environment from `.env.local`

#### Production with Nginx (Recommended)

Full production setup with built-in Nginx reverse proxy for SSL/TLS termination.

```bash
# 1. Setup SSL certificates (see nginx/README.md)
#    - Option A: Let's Encrypt (recommended for public domains)
#    - Option B: Self-signed (for testing only)

# 2. Update nginx/nginx.conf with your domain
sed -i 's/your-domain.com/yourdomain.com/g' nginx/nginx.conf

# 3. Create .env file
cp .env.example .env
# Edit with your values

# 4. Start
docker compose -f docker-compose.prod.yml up --build -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

Features:

- Nginx reverse proxy (ports 80, 443)
- HTTP to HTTPS redirect
- SSL/TLS termination
- Security headers (HSTS, X-Frame-Options, etc.)
- Rate limiting
- Gzip compression
- Static asset caching

#### Production without Nginx (External Proxy)

Use this when you have an external reverse proxy (cloud load balancer, Traefik, Kubernetes Ingress).

```bash
docker compose -f docker-compose.prod-simple.yml up --build -d
```

When to use:

- AWS ALB, GCP Load Balancer, Azure App Gateway
- Kubernetes Ingress
- Traefik, Caddy as external proxy
- Cloudflare Tunnel

**Docker Image Sizes:**
| Target | Size | Use Case |
|--------|------|----------|
| development | ~1.3GB | Local dev with hot reload |
| production | ~341MB | Optimized production |

See [Docker Setup Guide](./docs/DOCKER_SENTRY_SETUP.md) for details.

### Option 3: Traditional Server

```bash
# Build
npm run build

# Start
npm start
```

See [Deployment Guide](./docs/DEPLOYMENT.md#traditional-server) for details.

### Pre-Deployment Checklist

Before deploying to production, complete the [Production Checklist](./docs/PRODUCTION_CHECKLIST.md):

- [ ] Environment variables configured
- [ ] SECURE_COOKIES=true
- [ ] CSRF_SECRET generated (64+ characters)
- [ ] Keycloak configured with HTTPS
- [ ] Backend API accessible
- [ ] Build passes successfully
- [ ] Tests passing
- [ ] Security headers configured

---

## 🔒 Security

This project implements multiple security layers:

- ✅ **Secure Authentication** - OAuth2/OIDC with Keycloak
- ✅ **Cookie Security** - HttpOnly, Secure, SameSite=Lax
- ✅ **CSRF Protection** - Double-submit cookie pattern
- ✅ **XSS Prevention** - Content Security Policy headers
- ✅ **Clickjacking Protection** - X-Frame-Options
- ✅ **MIME Sniffing Protection** - X-Content-Type-Options
- ✅ **Open Redirect Prevention** - URL validation
- ✅ **Environment Validation** - Build-time checks
- ✅ **Input Validation** - Zod schemas

See [Security Documentation](./docs/auth/KEYCLOAK_SETUP.md#security-considerations) for details.

---

## 🐛 Troubleshooting

### Common Issues

**Authentication errors:**

- See [Troubleshooting Guide](./docs/auth/TROUBLESHOOTING.md)

**API connection issues:**

- Check `NEXT_PUBLIC_BACKEND_API_URL` in `.env.local`
- Verify backend is running
- Check CORS configuration on backend

**Build errors:**

- Ensure all environment variables are set
- Run `npm run type-check` to find TypeScript errors
- Check Node.js version (requires 20+)

**Docker issues:**

- See [Docker Setup Guide](./docs/DOCKER_SENTRY_SETUP.md#troubleshooting)

---

## 📞 Support

- **Documentation:** [docs/README.md](./docs/README.md)
- **Auth Issues:** [docs/auth/TROUBLESHOOTING.md](./docs/auth/TROUBLESHOOTING.md)
- **API Issues:** [docs/API_INTEGRATION.md](./docs/API_INTEGRATION.md)
- **Deployment:** [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## Project Status

**Version:** 1.0.0
**Status:** UI Complete - Ready for Backend Integration
**Last Updated:** 2026-01-08

### Completed (UI - 95%)

- CTEM Dashboard with 5-stage process visualization
- Asset Management (6 types with full CRUD)
- Asset Groups with risk scoring
- Findings management with severity classification
- Scan Management (Single + Workflow modes)
- Scan Runners with status monitoring
- Remediation Tasks with Kanban view
- Docker deployment with health checks
- Keycloak authentication integration
- Security hardening
- **Platform Agent Support:**
  - Agent preference selection in Create Scan form
  - Platform agent status indicator in Runs table
  - Queue position display for platform jobs
  - Platform usage quota card

### Pending (Backend - 0%)

- Backend API development
- Database schema implementation
- Real scan engine integration
- User management system
- Report generation

### Roadmap

- CI/CD pipeline
- Real-time notifications
- Performance monitoring (Sentry)
- Multi-tenancy support

---

## 💖 Support

If you find OpenCTEM useful, please consider supporting the project:

**BSC Network (BEP-20):**

```
0x97f0891b4a682904a78e6Bc854a58819Ea972454
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:

- [Next.js](https://nextjs.org/)
- [Keycloak](https://www.keycloak.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vercel](https://vercel.com/)

---

**For detailed documentation, see [docs/README.md](./docs/README.md)**
