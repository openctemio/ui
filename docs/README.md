# Project Documentation

Complete documentation for the Next.js 16 application with Keycloak authentication and backend API integration.

## 📁 Documentation Structure

```
ui/docs/
├── README.md                        # This file
├── ARCHITECTURE.md                  # System architecture
├── ROADMAP.md                       # Future plans
│
├── guides/                          # Development Guides
│   ├── README.md
│   ├── API_INTEGRATION.md           # API Client Guide
│   ├── ASSETS_API_INTEGRATION.md    # Assets API Guide
│   ├── CUSTOMIZE_TYPES_GUIDE.md     # Type Customization
│   └── ORGANIZING_TYPES_AT_SCALE.md # Type Organization
│
├── features/                        # Feature Documentation
│   ├── README.md
│   ├── auth/                        # Authentication (Keycloak)
│   └── ACCESS_CONTROL.md            # Access Control
│
├── ops/                             # Operations & Deployment
│   ├── README.md
│   ├── DEPLOYMENT.md                # Deployment Guide
│   ├── DOCKER_SENTRY_SETUP.md       # Docker & Sentry
│   ├── ENVIRONMENT_VARIABLES.md     # Env Vars
│   └── PRODUCTION_CHECKLIST.md      # Production Checklist
│
└── examples/                        # Code Examples
    └── types.custom.example.ts
```

---

## 🚀 Quick Start

### For New Developers

**1. Setup Project**
1. Read root [CLAUDE.md](../../CLAUDE.md) - Project overview & architecture
2. Read root [README.md](../../README.md) - Setup instructions
3. Configure environment variables ([ops/ENVIRONMENT_VARIABLES.md](./ops/ENVIRONMENT_VARIABLES.md))

**2. Setup Authentication**
1. [features/auth/KEYCLOAK_SETUP.md](./features/auth/KEYCLOAK_SETUP.md) - Setup Keycloak server
2. [features/auth/AUTH_USAGE.md](./features/auth/AUTH_USAGE.md) - Implement login/logout

**3. Connect to Backend**
1. [guides/API_INTEGRATION.md](./guides/API_INTEGRATION.md) - Setup API client
2. [guides/CUSTOMIZE_TYPES_GUIDE.md](./guides/CUSTOMIZE_TYPES_GUIDE.md) - Customize types

**4. Deploy to Production**
1. [ops/PRODUCTION_CHECKLIST.md](./ops/PRODUCTION_CHECKLIST.md) - Pre-deployment checklist
2. [ops/DEPLOYMENT.md](./ops/DEPLOYMENT.md) - Deployment guide

---

## 📚 Documentation by Topic

### 🏗️ Architecture & Setup

**[ARCHITECTURE.md](./ARCHITECTURE.md)**
- System architecture overview
- Frontend + Backend interaction
- State management

### 💻 Development Guides (`guides/`)

**[API_INTEGRATION.md](./guides/API_INTEGRATION.md)**
- Setup HTTP client with auto auth headers
- Configure SWR hooks for data fetching

**[CUSTOMIZE_TYPES_GUIDE.md](./guides/CUSTOMIZE_TYPES_GUIDE.md)**
- Match TypeScript types to your backend schema
- Override default types

**[ORGANIZING_TYPES_AT_SCALE.md](./guides/ORGANIZING_TYPES_AT_SCALE.md)**
- Organize types for large projects
- Domain-driven structure

### ✨ Features (`features/`)

**[Authentication](./features/auth/README.md)**
- **[Setup Guide](./features/auth/KEYCLOAK_SETUP.md)**
- **[Usage Guide](./features/auth/AUTH_USAGE.md)**
- **[API Reference](./features/auth/API_REFERENCE.md)**

**[Access Control](./features/ACCESS_CONTROL.md)**
- Group-based permissions
- Role management

### 🚀 Operations (`ops/`)

**[DEPLOYMENT.md](./ops/DEPLOYMENT.md)**
- Deploy to Vercel, Docker, or VP
- Nginx & SSL configuration

**[ENVIRONMENT_VARIABLES.md](./ops/ENVIRONMENT_VARIABLES.md)**
- `NEXT_PUBLIC_*` vs server-only variables
- Security best practices

**[DOCKER_SENTRY_SETUP.md](./ops/DOCKER_SENTRY_SETUP.md)**
- Docker multi-stage build
- Sentry error tracking

**[PRODUCTION_CHECKLIST.md](./ops/PRODUCTION_CHECKLIST.md)**
- Go-live verification steps

---

## 🔍 Quick Reference

| Task | Documentation |
|------|---------------|
| **Setup project** | [README.md](../../README.md) |
| **Understand system** | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| **Configure env vars** | [ops/ENVIRONMENT_VARIABLES.md](./ops/ENVIRONMENT_VARIABLES.md) |
| **Add login/logout** | [features/auth/AUTH_USAGE.md](./features/auth/AUTH_USAGE.md) |
| **Call backend API** | [guides/API_INTEGRATION.md](./guides/API_INTEGRATION.md) |
| **Customize types** | [guides/CUSTOMIZE_TYPES_GUIDE.md](./guides/CUSTOMIZE_TYPES_GUIDE.md) |
| **Deploy** | [ops/DEPLOYMENT.md](./ops/DEPLOYMENT.md) |

---

## 📖 External Resources

- **Next.js 16:** [nextjs.org/docs](https://nextjs.org/docs)
- **React 19:** [react.dev](https://react.dev)
- **Tailwind CSS:** [tailwindcss.com](https://tailwindcss.com)
- **Keycloak:** [keycloak.org/documentation](https://www.keycloak.org/documentation)

---
