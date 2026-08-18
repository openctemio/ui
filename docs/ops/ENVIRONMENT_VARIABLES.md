# Environment Variables Guide

## Overview

Next.js has two types of environment variables with different scopes and security implications. Understanding this difference is critical for building secure applications.

---

## NEXT_PUBLIC_* vs Server-only Variables

| Property | `NEXT_PUBLIC_*` | Server-only (no prefix) |
|----------|-----------------|-------------------------|
| **Visible to** | Browser + Server | Server only |
| **Used in** | Client Components, Browser JS | API Routes, Server Components, Server Actions |
| **Security** | Public (can be seen by anyone) | Private (hidden from client) |
| **Build time** | Bundled into client JS | Not bundled |
| **Example** | `NEXT_PUBLIC_APP_URL` | `BACKEND_API_URL` |

---

## API URL Variables Explained

### `BACKEND_API_URL` (the only one you need)

- **Purpose**: Internal URL for the Next.js server / proxy to reach the backend
- **Visibility**: Server-only (never sent to browser)
- **Value**: Internal Docker network URL (e.g., `http://api:8080`)
- **Why internal?**: More secure, faster (no external network hop)

### There is no browser-side API-URL variable

The browser **never** reads an env var for the API host. Client code calls the
**relative** path `/api/v1/*` and the Next.js BFF proxy (`proxy.ts`) forwards to
`BACKEND_API_URL`. `getApiBaseUrl()` returns an empty string in the browser.

> `NEXT_PUBLIC_API_URL` is **not** load-bearing — it appears only in the Vitest test
> setup (`src/test/setup.ts`) and is not read by application code. Do not set it in
> production.

---

## Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  fetch('/api/v1/users')  // relative — no env var        │   │
│  │  getApiBaseUrl() === '' in the browser (same origin)     │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               │ HTTP Request (Same Origin)
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                    NEXT.JS SERVER                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Route: /api/v1/users/route.ts                       │   │
│  │                                                          │   │
│  │  // Server-side code - BACKEND_API_URL is hidden         │   │
│  │  const response = await fetch(                           │   │
│  │    `${process.env.BACKEND_API_URL}/api/v1/users`        │   │
│  │  )                                                       │   │
│  │  // Uses: http://api:8080 (internal Docker network)      │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               │ Internal Network Request
                               │ (Docker Network)
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                    BACKEND API (Go)                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Endpoint: /api/v1/users                                 │   │
│  │  - Validates JWT token                                   │   │
│  │  - Queries database                                      │   │
│  │  - Returns JSON response                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Code Examples

### Client Component (Browser)

```typescript
// src/lib/api/client.ts
// This code runs in the BROWSER

// getApiBaseUrl() returns '' in the browser -> a relative, same-origin request.
const API_BASE = getApiBaseUrl() // '' client-side

export async function fetchUsers() {
  // Browser calls the same origin: /api/v1/users
  // The Next.js proxy forwards it to BACKEND_API_URL server-side.
  const response = await fetch(`${API_BASE}/api/v1/users`, { credentials: 'include' })
  return response.json()
}
```

### API Route (Server)

```typescript
// src/app/api/v1/users/route.ts
// This code runs on NEXT.JS SERVER

export async function GET(request: Request) {
  // Server calls backend using internal URL
  // Browser CANNOT see this URL
  const backendUrl = process.env.BACKEND_API_URL // http://api:8080

  const response = await fetch(`${backendUrl}/api/v1/users`, {
    headers: {
      // Forward auth headers from original request
      'Authorization': request.headers.get('Authorization') || '',
    },
  })

  const data = await response.json()
  return Response.json(data)
}
```

### Server Component

```typescript
// src/app/users/page.tsx
// This code runs on NEXT.JS SERVER

async function UsersPage() {
  // Can use server-only variable
  const backendUrl = process.env.BACKEND_API_URL

  const users = await fetch(`${backendUrl}/api/v1/users`, {
    headers: { Authorization: `Bearer ${getServerToken()}` },
    next: { revalidate: 60 }
  })

  return <UserList users={users} />
}
```

---

## Security Benefits

### 1. Backend URL is Hidden

```
Browser Network Tab shows:
  Request URL: http://localhost:3000/api/v1/users   ← Frontend URL

Attacker CANNOT see:
  Backend URL: http://api:8080/api/v1/users        ← Hidden internal URL
```

### 2. Backend is Not Publicly Accessible

```yaml
# docker-compose.prod.yml

api:
  # Only expose internally within Docker network
  expose:
    - "8080"
  # NO ports mapping = not accessible from host

ui:
  # Only UI is exposed to the outside world
  ports:
    - "3000:3000"
```

### 3. Attack Surface Reduction

| Without BFF Pattern | With BFF Pattern |
|---------------------|------------------|
| Browser → Backend (exposed) | Browser → Next.js → Backend (internal) |
| Backend must handle CORS | CORS handled at Next.js level |
| Backend exposed to DDoS | Only Next.js exposed |
| API keys visible to browser | API keys server-side only |

---

## Environment File Example

This mirrors the authoritative [`.env.example`](../../.env.example) — only variables
the UI actually reads are shown. The UI has no database, SMTP or JWT-signing secret
of its own; those belong to the backend, not here.

```env
# .env.local

# -----------------------------------------------------------------------------
# Public Variables (NEXT_PUBLIC_*)
# These are bundled into client-side JavaScript and visible to users
# -----------------------------------------------------------------------------

# App URL for links, redirects, etc.
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cookie names (browser needs to know these)
NEXT_PUBLIC_AUTH_COOKIE_NAME=auth_token
NEXT_PUBLIC_REFRESH_COOKIE_NAME=refresh_token

# Optional: Sentry (inert until @sentry/nextjs is installed — see DOCKER_SENTRY_SETUP.md)
NEXT_PUBLIC_SENTRY_DSN=


# -----------------------------------------------------------------------------
# Server-only Variables (no NEXT_PUBLIC_ prefix)
# These are NEVER sent to browser - only available on server
# -----------------------------------------------------------------------------

# Internal backend URL (Docker network) — the single required variable
BACKEND_API_URL=http://api:8080

# CSRF secret for the double-submit token (MUST be server-only!)
CSRF_SECRET=your-csrf-secret

# HTTPS-only cookies (set true in production)
SECURE_COOKIES=false
```

> The UI does **not** read `AUTH_JWT_SECRET`, `DB_PASSWORD`, `SMTP_PASSWORD`,
> `NEXT_PUBLIC_AUTH_PROVIDER`, or `NEXT_PUBLIC_API_URL` — earlier revisions listed
> these but they are phantom for this app.

---

## Common Mistakes

### Mistake 1: Using server variable in client code

```typescript
// src/components/UserCard.tsx
"use client"

// WRONG - This will be undefined in browser!
const API_URL = process.env.BACKEND_API_URL

export function UserCard() {
  // fetch will fail because API_URL is undefined
  const data = await fetch(`${API_URL}/api/users`)
}
```

**Fix**: Use `NEXT_PUBLIC_*` for client-side code.

### Mistake 2: Exposing secrets with NEXT_PUBLIC_

```env
# WRONG - Secret exposed to browser!
NEXT_PUBLIC_JWT_SECRET=my-secret-key
NEXT_PUBLIC_DB_PASSWORD=password123
```

**Fix**: Never prefix secrets with `NEXT_PUBLIC_`.

### Mistake 3: Calling backend directly from browser

```typescript
"use client"

// WRONG - Exposes backend URL and bypasses proxy
const BACKEND = "http://api:8080"  // or process.env.BACKEND_API_URL

export function fetchData() {
  // This exposes your internal architecture
  fetch(`${BACKEND}/api/users`)
}
```

**Fix**: Always call through Next.js API routes.

---

## Debugging Tips

### Check if variable is available

```typescript
// Server-side (API route, Server Component)
console.log('BACKEND_API_URL:', process.env.BACKEND_API_URL)
// Output: http://api:8080

// Client-side (Browser)
console.log('BACKEND_API_URL:', process.env.BACKEND_API_URL)
// Output: undefined (correct - not exposed)

// Client code uses a relative path, not an env var:
await fetch('/api/v1/users', { credentials: 'include' })
```

### Verify in browser DevTools

1. Open DevTools → Network tab
2. Make an API request
3. Check Request URL - should be frontend URL, not backend URL
4. Check Sources tab → search for backend URL → should NOT find it

---

## Summary

| Variable Type | Use For | Example |
|---------------|---------|---------|
| `NEXT_PUBLIC_*` | Browser-visible config | App URL, Cookie names, Feature flags |
| Server-only | Secrets, Internal URLs | JWT secrets, Database passwords, Backend URL |

**Key Rules**:
1. Never put secrets in `NEXT_PUBLIC_*` variables
2. Backend URL should be server-only for security
3. Browser calls frontend URL, not backend directly
4. API routes proxy requests to internal backend

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [API_INTEGRATION.md](./API_INTEGRATION.md) - API integration patterns
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [`.env.example`](../../.env.example) - Authoritative list of variables the app reads
- [Docker Compose](../../docker-compose.prod.yml) - Production configuration

---

**Last Updated**: 2025-01-14
