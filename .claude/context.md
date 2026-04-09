# Project Context & Important Notes

**Last Updated:** 2025-12-11
**Project:** Next.js Frontend with Separate Backend API

---

## 🎯 Critical Information

### Architecture

**Type:** Frontend (Next.js) + Separate Backend API

```
┌──────────────────┐
│  Next.js         │  ← This codebase (Frontend only)
│  Frontend        │
└────────┬─────────┘
         │ HTTP/HTTPS
         │ Bearer Token Auth
┌────────▼─────────┐
│  Backend API     │  ← User's separate service
│  (Separate)      │
└──────────────────┘
```

### Important Notes

**DO NOT:**

- ❌ Add Prisma to this project
- ❌ Add database connection
- ❌ Create complex API routes in Next.js
- ❌ Implement business logic in frontend
- ❌ Store data in Next.js

**DO:**

- ✅ Create API client to connect to backend
- ✅ Use SWR or React Query for data fetching
- ✅ Focus on UI/UX and user experience
- ✅ Handle auth tokens (already done)
- ✅ Call backend API with Bearer token

---

## 📝 User Requirements

### Backend API

- User has a **separate backend API service**
- Backend handles:
  - Database operations
  - Business logic
  - Data persistence
  - File storage
  - Email sending
  - Background jobs

### Frontend (This Codebase)

- Responsibilities:
  - User interface
  - Authentication flow (Keycloak OAuth)
  - Token management
  - API calls to backend
  - Client-side state
  - Form validation

---

## 🔧 Configuration

### Environment Variables Needed

```env
# Backend API URL (server-side only — single source of truth)
# Client-side requests proxied through Next.js at /api/v1/*
BACKEND_API_URL=http://api:8080

# Keycloak (already configured)
NEXT_PUBLIC_KEYCLOAK_URL=...
NEXT_PUBLIC_KEYCLOAK_REALM=...
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=...
```

---

## 📊 Current Status

### Completed ✅

- Phase 1: Security & Keycloak (100%)
- Phase 2: Architecture & Best Practices (100%)
- Phase 3: Testing & Quality (84.28% coverage, 274 tests)

### TODO

- [ ] Create API client (`src/lib/api/client.ts`)
- [ ] Install SWR or React Query
- [ ] Define API endpoints & types
- [ ] Replace mock data with real API calls
- [ ] Setup CI/CD pipeline
- [ ] Add monitoring (Sentry)

---

## 🎯 Next Actions

**Priority 1: API Integration (1-2 days)**

1. Install SWR: `npm install swr`
2. Create `src/lib/api/client.ts` with auth headers
3. Define `src/lib/api/endpoints.ts` for type-safe URLs
4. Create custom hooks (`useUsers`, `usePosts`, etc.)
5. Replace dashboard mock data

**Priority 2: DevOps (1-2 days)**

1. Setup GitHub Actions for CI/CD
2. Install Sentry for error tracking
3. Setup Husky for pre-commit hooks

**Timeline:** 3-5 days to fully production-ready

---

## 📚 Documentation

**Key Files:**

- `docs/ARCHITECTURE.md` - Architecture overview & API integration guide
- `docs/PROJECT_ASSESSMENT.md` - Production readiness assessment
- `docs/PHASE1_SUMMARY.md` - Security & Keycloak
- `docs/PHASE2_SUMMARY.md` - Architecture & Best Practices
- `docs/PHASE3_SUMMARY.md` - Testing & Quality

**Assessment:**

- Current Score: 82/100 (B+ Grade)
- After API integration: 90+/100 (A Grade)
- Production-ready: ✅ Almost there!

---

## ⚠️ Remember

**This is a FRONTEND-ONLY codebase:**

- All data comes from user's backend API
- No database in this project
- No Prisma needed
- Focus on UI/UX excellence
- Backend API integration is the main task

**Backend API Requirements:**

- Must accept JWT tokens from Keycloak
- Must provide RESTful endpoints
- Should return JSON responses
- Should handle CORS for Next.js domain

---

**Author:** Claude Code
**Date:** 2025-12-11
