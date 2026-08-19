# Architecture Overview

**Project Type:** Frontend Application with Separate Backend
**Last Updated:** 2025-12-11
**Version:** 3.0.0

---

## 🏗️ System Architecture

### Architecture Type: **Frontend + Separate Backend API**

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Browser (Client-side)                  │   │
│  │  - React Components                              │   │
│  │  - Zustand State Management                      │   │
│  │  - Client-side Navigation                        │   │
│  └─────────────────┬───────────────────────────────┘   │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐   │
│  │        Next.js Server (Edge/Node.js)            │   │
│  │  - Server Components                             │   │
│  │  - Server Actions                                │   │
│  │  - proxy.ts (BFF proxy for /api/v1/*)            │   │
│  │  - API Route Handlers                            │   │
│  └─────────────────┬───────────────────────────────┘   │
└────────────────────┼─────────────────────────────────────┘
                     │
                     │ HTTP/HTTPS Requests
                     │ (server attaches auth from httpOnly cookie)
                     │
┌────────────────────▼─────────────────────────────────────┐
│              External Backend API                         │
│  - RESTful APIs                                          │
│  - Business Logic                                         │
│  - Database Access                                        │
│  - File Storage                                           │
│  - Email Service                                          │
│  └──────────────────────────────────────────────────────┘
```

---

## 🎯 Architecture Decision

### ✅ **Separate Backend API** (Current Setup)

**Backend API URL:** Set in environment variable `BACKEND_API_URL` (server-side only). Client-side requests go through the Next.js proxy at `/api/v1/*`.

**Responsibilities:**

**Frontend (Next.js):**

- ✅ User Interface & UX
- ✅ Authentication Flow (local JWT + OAuth social + SAML SSO)
- ✅ Token Management (httpOnly cookies set by the BFF proxy)
- ✅ Client-side State Management (Zustand)
- ✅ Route Protection
- ✅ Form Validation (Zod)
- ✅ API Request/Response Handling
- ✅ Error Display & User Feedback

**Backend API (Separate Service):**

- ✅ Business Logic
- ✅ Database Operations (CRUD)
- ✅ Data Validation & Processing
- ✅ File Upload & Storage
- ✅ Email Sending
- ✅ Background Jobs
- ✅ Third-party API Integration
- ✅ Server-side Token Validation

---

## 📡 API Integration Pattern

### Current Setup

**Environment Variable:**

```env
# .env.local — server-side only (single source of truth)
# Client-side requests proxied through Next.js at /api/v1/*
BACKEND_API_URL=http://api:8080
```

**API Client Location:**

```
src/lib/api/
├── client.ts          # API client with auth
├── endpoints.ts       # API endpoint definitions
├── error-handler.ts   # Error handling
└── types.ts          # Request/Response types
```

### API Call Flow

```typescript
┌──────────────┐
│   Component  │
└──────┬───────┘
       │
       │ Call hook/action
       │
┌──────▼───────┐
│  Custom Hook │  (useUsers, usePosts)
│  or Action   │
└──────┬───────┘
       │
       │ Use API client
       │
┌──────▼───────┐
│  API Client  │  (fetch with auth headers)
└──────┬───────┘
       │
       │ HTTP Request
       │ Authorization: Bearer {accessToken}
       │
┌──────▼────────────┐
│   Backend API     │
│  (Your Service)   │
└───────────────────┘
```

### Example Implementation

```typescript
// src/lib/api/client.ts
import { useAuthStore } from '@/stores/auth-store'

export async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken
  // Client-side: empty string (proxied via /api/v1/*)
  // Server-side: env.api.url (BACKEND_API_URL)
  const baseUrl = getApiBaseUrl()

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }

  return response.json()
}

// Usage in component
const users = await apiClient<User[]>('/api/users')
```

---

## 🔐 Authentication Flow (with Separate Backend)

Auth is **local JWT (email/password)** plus **OAuth social login** (Google, GitHub,
Microsoft) and **SAML SSO**. There is no Keycloak/OIDC dependency — `src/` contains
zero `keycloak` references. Social/SSO callbacks land on
`/auth/callback/[provider]` and `/auth/sso/callback/[provider]`.

Tokens live in **httpOnly cookies** set by the Next.js BFF proxy — the browser
never sees a Bearer token. The browser calls the relative proxy path `/api/v1/*`
with `credentials: 'include'`; the proxy attaches the cookie-borne auth when it
forwards to `BACKEND_API_URL`. A double-submit `csrf_token` cookie (JS-readable,
backend-set) is echoed as the `X-CSRF-Token` header on mutations.

```
1. User signs in (email/password, OAuth social, or SAML SSO)
   └─> Local: POST /api/v1/auth/login
   └─> Social/SSO: redirect to provider, return to
       /auth/callback/[provider] or /auth/sso/callback/[provider]

2. Server (proxy / route handler) exchanges credentials for tokens
   └─> Sets access + refresh tokens as httpOnly cookies
   └─> Sets a JS-readable csrf_token cookie (double-submit)

3. Browser makes API calls to the relative proxy path
   └─> fetch('/api/v1/...', { credentials: 'include' })
   └─> Mutations also send X-CSRF-Token: <csrf_token cookie>

4. Proxy forwards to BACKEND_API_URL with the cookie-borne auth

5. Backend validates the JWT (signature + expiry) and returns data

6. On token expiry
   └─> Proxy/route handler refreshes via the refresh-token cookie
   └─> Rotates the httpOnly cookies; browser retries transparently
```

---

## 🗂️ Data Flow Patterns

### Pattern 1: Server Component + API (Recommended)

```typescript
// app/users/page.tsx (Server Component)
async function UsersPage() {
  // Fetch on server
  const users = await fetch(`${env.api.url}/api/users`, {
    headers: {
      Authorization: `Bearer ${getServerSideToken()}`,
    },
  })

  return <UserList users={users} />
}
```

**Pros:**

- SEO friendly
- Faster initial load
- No loading state needed

### Pattern 2: Client Component + SWR/React Query

```typescript
// components/users-list.tsx (Client Component)
'use client'
import useSWR from 'swr'

function UsersList() {
  const { data, error } = useSWR('/api/users', apiClient)

  if (error) return <Error />
  if (!data) return <Loading />

  return <div>{data.map(user => ...)}</div>
}
```

**Pros:**

- Client-side caching
- Auto-revalidation
- Optimistic updates

### Pattern 3: Server Action + Mutation

```typescript
// actions/create-user.ts
'use server'
export async function createUser(formData: FormData) {
  const response = await fetch(`${env.api.url}/api/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getServerSideToken()}`,
    },
    body: JSON.stringify(formData),
  })

  revalidatePath('/users')
  return response.json()
}
```

**Pros:**

- Type-safe
- Progressive enhancement
- No client-side JS needed

---

## 📦 Recommended Libraries for API Integration

### Data Fetching

```json
{
  "dependencies": {
    "swr": "^2.x", // Client-side data fetching
    "@tanstack/react-query": "^5.x" // Alternative to SWR
  }
}
```

### HTTP Client

```typescript
// Option 1: Native fetch (current)
✅ Built-in, no dependencies
❌ More boilerplate

// Option 2: Axios
✅ More features (interceptors, cancellation)
❌ Additional dependency

// Option 3: ky
✅ Modern, lightweight
❌ Less popular
```

---

## 🔧 Configuration

### Environment Variables

```env
# Backend API — single source of truth (server-side only)
# Client-side requests are proxied through Next.js at /api/v1/*
BACKEND_API_URL=http://api:8080
```

---

## 🎨 Frontend Responsibilities (This Codebase)

### ✅ What Frontend SHOULD Do

1. **UI/UX Layer**
   - Render components
   - Handle user interactions
   - Display data from backend
   - Show loading/error states

2. **Authentication**
   - Local JWT, OAuth social (Google/GitHub/Microsoft), SAML SSO
   - Token storage (httpOnly cookies set by the BFF proxy)
   - Token refresh (server-side, via refresh-token cookie)
   - Route protection (RouteGuard: module + permission)

3. **Client State**
   - UI state (modals, forms)
   - Auth state (Zustand)
   - Cached API data (SWR/React Query)

4. **Validation**
   - Form validation (Zod)
   - Client-side validation for UX
   - Display validation errors

5. **API Communication**
   - HTTP requests to backend
   - Add auth headers
   - Handle responses/errors
   - Retry logic

### ❌ What Frontend SHOULD NOT Do

1. ❌ Database operations
2. ❌ Business logic (complex calculations)
3. ❌ File storage
4. ❌ Email sending
5. ❌ Background jobs
6. ❌ Third-party API calls (should go through backend)

---

## 🏛️ Backend Responsibilities (Your Separate API)

### What Backend SHOULD Provide

1. **RESTful API Endpoints**

   ```
   GET    /api/users
   POST   /api/users
   GET    /api/users/:id
   PUT    /api/users/:id
   DELETE /api/users/:id
   ```

2. **Authentication Validation**
   - Validate JWT tokens
   - Check token expiration
   - Extract user info from token

3. **Business Logic**
   - Data processing
   - Complex calculations
   - Workflow management

4. **Data Persistence**
   - Database CRUD
   - Transactions
   - Data integrity

5. **External Services**
   - Email sending
   - SMS notifications
   - Payment processing
   - File storage (S3, etc.)

---

## 📋 Integration Checklist

### Setup Required

- [ ] **Backend API URL configured** in `.env.local`
- [ ] **API client created** in `src/lib/api/client.ts`
- [ ] **Error handling** for API calls
- [ ] **Token injection** in API requests
- [ ] **API endpoints defined** in `src/lib/api/endpoints.ts`
- [ ] **Request/Response types** defined
- [ ] **Loading states** implemented
- [ ] **Error states** implemented
- [ ] **Retry logic** for failed requests
- [ ] **CORS configured** on backend (if needed)

### Backend Requirements

Your backend API should support:

- [ ] **JWT token validation** (verify backend-issued JWTs)
- [ ] **CORS headers** (allow Next.js domain)
- [ ] **RESTful endpoints** (or GraphQL)
- [ ] **Error responses** (consistent format)
- [ ] **Rate limiting** (to prevent abuse)
- [ ] **API documentation** (Swagger/OpenAPI)

---

## 🎯 Advantages of This Architecture

### ✅ Pros

1. **Separation of Concerns**
   - Frontend focuses on UI/UX
   - Backend focuses on business logic

2. **Scalability**
   - Scale frontend and backend independently
   - Multiple frontends can use same backend

3. **Technology Freedom**
   - Backend can be in any language (Node.js, Python, Go, Java)
   - Frontend stays in Next.js/React

4. **Team Structure**
   - Frontend team works independently
   - Backend team works independently

5. **Security**
   - Backend API can be private (not public)
   - Sensitive operations on backend only

### ⚠️ Considerations

1. **Network Latency**
   - Extra network hop (Frontend -> Backend -> Database)
   - Mitigation: Caching (SWR, React Query)

2. **CORS Configuration**
   - Need to configure CORS on backend
   - Development vs Production URLs

3. **Token Management**
   - Frontend must handle token refresh
   - Backend must validate tokens

4. **Error Handling**
   - Need consistent error format
   - Handle network errors gracefully

---

## 🎨 Design System (current)

The API client is mature — this is a shipping product, not a mock-data scaffold.
The shared UI primitives worth knowing:

- **`DataTable`** (`src/components/`) supports a server-pagination mode; list pages
  page/sort/filter against the backend instead of capping rows client-side.
- **`SeverityBadge`** is the single source of truth for severity colours
  (`src/lib/severity-colors.ts`); pages must not hardcode their own severity hues.
- **`Can`** (`src/components/auth`) gates UI by permission and supports a `minRole`
  prop; route-level access is enforced by `RouteGuard` (module + permission, see
  `src/config/route-permissions.ts`).
- **Routing:** Next.js 16 uses **`proxy.ts`** at the repo root for the `/api/v1/*`
  BFF proxy — there is no `middleware.ts`.

---

## 🧩 Dashboard UI Architecture (New 2026)

### **Header Centralization Strategy**

To optimize performance and maintainability, the Dashboard Header architecture follows a **Hybrid Server/Client Split**:

```mermaid
graph TD
    RootLayout["(dashboard)/layout.tsx\n(Server Component)"] --> DashboardHeader["DashboardHeader\n(Client Component)"]
    DashboardHeader -->|Default| AppHeader["Header (Global)"]
    DashboardHeader -->|Regex Match| Null["null (Hidden)"]

    RootLayout --> PageContent["Page Content"]

    subgraph "Finding Detail Page"
    PageContent --> LocalHeader["Header (Custom/Local)"]
    end
```

#### **1. Layout Layer (Server Component)**

- File: `src/app/(dashboard)/layout.tsx`
- **Role**: Acts as the skeleton shell. Handles SEO metadata, cookies (Sidebar state), and wraps content in Providers.
- **Why**: Must remain a Server Component to access `cookies()` and avoid de-optimizing the entire tree.

#### **2. Header Layer (Client Component)**

- File: `src/components/layout/dashboard-header.tsx`
- **Role**: Determines _visibility_ logic based on the current route.
- **Logic**:
  - **Default**: Renders the global `<Header />`.
  - **Exceptions**: Hides global header if route matches specific patterns (e.g. specialized detail pages).
  - **Implementation**: Uses `usePathname()` hook and Regex testing.
    ```typescript
    // Example: Hide global header only on Finding Detail pages
    const shouldHideHeader = /^\/findings\/[^/]+$/.test(pathname)
    ```

#### **3. Page Layer (Server/Client Hybrid)**

- **Standard Pages**: Do _not_ render their own header. They rely on the Global Header from the Layout.
- **Exception Pages** (e.g., `findings/[id]`):
  - The Global Header is hidden via the Regex logic above.
  - The Page renders its _own_ custom `<Header>` with specific context (e.g., Back button, Breadcrumbs, Status actions).

### **Advantages**

1.  **Duplicate Removal**: Removed redundant `<Header fixed />` from 80+ pages.
2.  **Performance**: `layout.tsx` stays Server-Side. Only the Header island is Client-Side.
3.  **Flexibility**: Strict Regex allows precise exceptions (e.g., hiding header on `findings/123` but showing it on `findings/123/edit`).

---

**Last Updated:** 2026-01-25
**Version:** 3.1.0 (UI Architecture Update)
