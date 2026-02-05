# Authentication Flow

> Complete guide to authentication, authorization, and multi-tenant flow in Rediver.

## Overview

Rediver uses a **multi-tenant authentication system** with:
- **Local Auth**: Email/password via backend API
- **Social Auth**: Google, GitHub, Microsoft (OAuth2)
- **OIDC**: Keycloak for enterprise SSO
- **Multi-tenant**: Users can belong to multiple teams

## Authentication States

```
┌─────────────────────────────────────────────────────────────┐
│                    UNAUTHENTICATED                          │
│                                                             │
│  Allowed pages: /login, /register, /forgot-password, etc.   │
│  All other routes → redirect to /login                      │
└─────────────────────────────────────────────────────────────┘
                              │
                         Login/Register
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               AUTHENTICATED - NO TENANT                     │
│                                                             │
│  Has: refresh_token cookie                                  │
│  Missing: app_tenant cookie, auth_token         │
│  Redirect to: /onboarding/create-team                       │
└─────────────────────────────────────────────────────────────┘
                              │
                      Create/Select Team
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               AUTHENTICATED - HAS TENANT                    │
│                                                             │
│  Has: refresh_token, auth_token, app_tenant     │
│  Full access to dashboard and all features                  │
└─────────────────────────────────────────────────────────────┘
```

## Cookies

| Cookie | HttpOnly | Purpose | Set By |
|--------|----------|---------|--------|
| `auth_token` | Yes | Access token (JWT, 15min) | Server Action |
| `refresh_token` | Yes | Refresh token (7 days) | Server Action |
| `app_tenant` | No | Current tenant info | Server Action |
| `app_user_info` | No | User info for onboarding | Server Action |
| `app_pending_tenants` | No | Multi-tenant selection | Server Action |
| `app_permissions` | No | User's permissions array (JSON) | Server Action after token exchange |

**Permission Cookie Flow:**
```
Login/Token Exchange → Extract permissions from JWT → Store in app_permissions cookie
    → Client reads cookie via usePermissions() hook → Permission checks without API calls
```

## Route Protection

### Public Routes (No Auth Required)

Defined in `src/lib/middleware/config.ts`:

```typescript
export const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
  '/auth/error',
] as const
```

### Protected Routes

All routes NOT in `PUBLIC_ROUTES` require authentication. Protection is handled by:

1. **Server-side (proxy.ts)**: Checks cookies and redirects
2. **Page-level (Server Components)**: Additional checks in each page
3. **Client-side (TenantGate)**: Checks tenant cookie for dashboard

## Login Flow

### Step 1: User Submits Login Form

```typescript
// src/features/auth/components/login-form.tsx
const result = await loginAction({ email, password })
```

### Step 2: Backend Returns Tokens + Tenants

```typescript
// Backend response
{
  refresh_token: "...",
  user: { id, email, name },
  tenants: [{ id, slug, name, role }, ...]
}
```

### Step 3: Handle Based on Tenant Count

```typescript
// Case 1: No tenants → Onboarding
if (tenants.length === 0) {
  window.location.href = '/onboarding/create-team'
}

// Case 2: Multiple tenants → Selection
if (tenants.length > 1) {
  router.push('/select-tenant')
}

// Case 3: Single tenant → Auto-select + Dashboard
if (tenants.length === 1) {
  // Token exchange happens automatically
  router.push('/')
}
```

## Page-Level Auth Checks

Each auth-related page should check authentication status server-side:

```typescript
// src/app/(auth)/login/page.tsx
export default async function LoginPage() {
  const cookieStore = await cookies()
  const hasAuth = cookieStore.get(env.auth.cookieName)?.value ||
                  cookieStore.get(env.auth.refreshCookieName)?.value

  if (hasAuth) {
    const hasTenant = cookieStore.get('app_tenant')?.value
    redirect(hasTenant ? '/' : '/onboarding/create-team')
  }

  return <LoginForm />
}
```

## TenantGate Component

Guards dashboard routes, ensuring user has selected a tenant:

```typescript
// src/components/layout/tenant-gate.tsx
export function TenantGate({ children }) {
  useEffect(() => {
    const tenantCookie = getCookie("app_tenant")
    if (!tenantCookie) {
      window.location.href = "/onboarding/create-team"
      return
    }
    setHasCheckedTenant(true)
  }, [])

  // ...
}
```

## Server Actions

All auth operations use Server Actions for security:

| Action | Purpose | File |
|--------|---------|------|
| `loginAction` | Email/password login | `local-auth-actions.ts` |
| `registerAction` | User registration | `local-auth-actions.ts` |
| `selectTenantAction` | Multi-tenant selection | `local-auth-actions.ts` |
| `createFirstTeamAction` | Onboarding team creation | `local-auth-actions.ts` |
| `localLogoutAction` | Logout + clear cookies | `local-auth-actions.ts` |
| `refreshLocalTokenAction` | Token refresh | `local-auth-actions.ts` |

## Important: Full Page Reload After Auth Changes

After Server Actions set cookies, use `window.location.href` instead of `router.push()`:

```typescript
// ❌ BAD - Cookies may not be picked up
router.push('/')

// ✅ GOOD - Full reload ensures cookies are available
window.location.href = '/'
```

## File Structure

```
src/
├── app/
│   ├── (auth)/                    # Auth route group (centered layout)
│   │   ├── login/page.tsx         # Login page
│   │   ├── register/page.tsx      # Register page
│   │   ├── select-tenant/page.tsx # Multi-tenant selection
│   │   ├── onboarding/
│   │   │   └── create-team/page.tsx # First team creation
│   │   └── layout.tsx             # Auth layout (centered, logo)
│   │
│   └── (dashboard)/               # Dashboard route group
│       └── layout.tsx             # Uses TenantGate
│
├── features/auth/
│   ├── actions/
│   │   ├── local-auth-actions.ts  # Server actions
│   │   └── social-auth-actions.ts # OAuth actions
│   ├── components/
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   └── schemas/
│       └── auth.schema.ts         # Zod validation
│
├── components/layout/
│   └── tenant-gate.tsx            # Dashboard guard
│
├── lib/
│   ├── middleware/
│   │   ├── auth.ts                # Auth helpers for proxy
│   │   └── config.ts              # PUBLIC_ROUTES
│   ├── cookies.ts                 # Client-side cookies
│   └── cookies-server.ts          # Server-side cookies (HttpOnly)
│
└── proxy.ts                       # Next.js 16 middleware
```

## Access Control (Groups & Permission Sets)

### Overview

Rediver uses a **two-layer role model**:

1. **Tenant Role** (tenant_members.role): owner, admin, member, viewer
2. **Group Permissions**: Fine-grained permissions via groups and permission sets

### Permission Checking

```typescript
import { Can, Permission, usePermissions } from "@/lib/permissions";

// Component-based
<Can permission={Permission.AssetsWrite}>
  <Button>Create Asset</Button>
</Can>

// Hook-based
const { can } = usePermissions();
if (can(Permission.AssetsDelete)) {
  // Show delete option
}
```

### Admin Pages

- **Groups**: `/settings/access-control/groups`
- **Permission Sets**: `/settings/access-control/permission-sets`

See [ACCESS_CONTROL.md](../docs/ACCESS_CONTROL.md) for full documentation.

## Security Best Practices

### 1. HttpOnly Cookies for Tokens

```typescript
// ✅ Access/refresh tokens are HttpOnly
await setServerCookie(env.auth.cookieName, token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
})
```

### 2. CSRF Protection

- `sameSite: 'lax'` on all cookies
- CSRF token for sensitive operations

### 3. Redirect URL Validation

```typescript
// Prevent open redirect attacks
export function validateRedirectUrl(url: string): string {
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url
  }
  return '/dashboard'
}
```

### 4. Server-Side Auth Checks

Always validate auth on server-side, not just client-side:

```typescript
// Server Component
export default async function ProtectedPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(env.auth.cookieName)?.value

  if (!token) {
    redirect('/login')
  }

  // ... render page
}
```

## Troubleshooting

### User sees login page after logging in

1. Check if cookies are being set (DevTools → Application → Cookies)
2. Ensure `window.location.href` is used instead of `router.push()`
3. Check cookie domain/path settings

### User stuck on "Create Team" page

1. Check if `app_tenant` cookie exists
2. Check if `createFirstTeamAction` completed successfully
3. Look for errors in browser console

### Token refresh fails

1. Check if `refresh_token` cookie exists
2. Check backend logs for token validation errors
3. User may need to re-login

## Related Documentation

- [Architecture](./architecture.md) - Project structure
- [Patterns](./patterns.md) - Code patterns
- [Troubleshooting](./troubleshooting.md) - Common issues
- [Access Control](../docs/ACCESS_CONTROL.md) - Groups and permission sets
