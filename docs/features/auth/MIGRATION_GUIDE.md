# Migration Guide

Step-by-step guide to migrate from old authentication to Keycloak.

## Table of Contents

1. [Overview](#overview)
2. [Breaking Changes](#breaking-changes)
3. [Update Auth Store](#update-auth-store)
4. [Update Login Components](#update-login-components)
5. [Update Protected Routes](#update-protected-routes)
6. [Update API Calls](#update-api-calls)
7. [Remove Old Code](#remove-old-code)
8. [Testing Migration](#testing-migration)

---

## Overview

### What Changed

| Old System | New System (Keycloak) |
|------------|----------------------|
| Mock authentication | Real Keycloak OAuth2 |
| Client-side cookie storage | In-memory token + HttpOnly refresh token |
| Hardcoded token key | Keycloak JWT tokens |
| `auth.setAccessToken()` | `login(accessToken)` |
| `auth.reset()` | `logout()` |
| Manual user object | Auto-extracted from JWT |

### Migration Strategy

**Option A: Big Bang** (Recommended for small apps)
- Update all code at once
- Faster, but requires testing everything

**Option B: Gradual** (For large apps)
- Keep old code alongside new
- Migrate page by page
- More complex, but lower risk

This guide covers **Option A**.

---

## Breaking Changes

### 1. Auth Store Interface Changed

**OLD:**
```typescript
interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
  }
}
```

**NEW:**
```typescript
interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
  expiresAt: number | null
  error: string | null

  login: (accessToken: string) => void
  logout: (postLogoutRedirectUri?: string) => void
  updateToken: (accessToken: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}
```

### 2. User Object Structure Changed

**OLD:**
```typescript
interface AuthUser {
  accountNo: string
  email: string
  role: string[]
  exp: number
}
```

**NEW:**
```typescript
interface AuthUser {
  id: string                 // Was: accountNo (now from JWT 'sub')
  email: string
  name: string               // NEW: Full name
  username: string           // NEW: Username
  emailVerified: boolean     // NEW: Email verification status
  roles: string[]            // Combined realm + client roles
  realmRoles: string[]       // NEW: Realm roles only
  clientRoles: Record<string, string[]> // NEW: Client-specific roles
}
```

### 3. Token Storage Changed

**OLD:** Client-side cookies
```typescript
setCookie('thisisjustarandomstring', token)
```

**NEW:** In-memory (Zustand) + Server-side HttpOnly cookies
```typescript
login(accessToken) // Stored in Zustand (memory)
// Refresh token in HttpOnly cookie (server-side)
```

---

## Update Auth Store

### Step 1: Update Import Paths

**OLD:**
```typescript
import { useAuthStore } from '@/stores/auth-store'

const { auth } = useAuthStore()
const { user, accessToken, setAccessToken, reset } = auth
```

**NEW:**
```typescript
import { useAuthStore, useUser, useIsAuthenticated } from '@/stores/auth-store'

// Option 1: Full store
const { user, accessToken, login, logout, isAuthenticated } = useAuthStore()

// Option 2: Optimized selectors (recommended)
const user = useUser()
const isAuth = useIsAuthenticated()
```

### Step 2: Update setAccessToken → login

**OLD:**
```typescript
auth.setAccessToken('mock-access-token')
```

**NEW:**
```typescript
login(realAccessTokenFromKeycloak)
```

### Step 3: Update reset → logout

**OLD:**
```typescript
auth.reset()
```

**NEW:**
```typescript
logout(window.location.origin) // Redirects to Keycloak logout
```

### Step 4: Update user access

**OLD:**
```typescript
if (auth.user) {
  console.log(auth.user.accountNo)
  console.log(auth.user.role)
}
```

**NEW:**
```typescript
if (user) {
  console.log(user.id)          // Was: accountNo
  console.log(user.name)        // NEW
  console.log(user.roles)       // Same
  console.log(user.realmRoles)  // NEW
}
```

---

## Update Login Components

### Step 1: Replace Login Form

**OLD:** `src/app/(auth)/login/components/user-auth-form.tsx`

```typescript
// ❌ DELETE THIS
function onSubmit(data: z.infer<typeof formSchema>) {
  setIsLoading(true)
  setTimeout(() => {
    auth.setAccessToken('mock-access-token')
    router.push('/dashboard')
  }, 2000)
}
```

**NEW:**

```typescript
// ✅ REPLACE WITH THIS
import { redirectToLogin } from '@/lib/keycloak'

function LoginPage() {
  const handleLogin = () => {
    redirectToLogin('/dashboard')
  }

  return (
    <Button onClick={handleLogin}>
      Sign In with Keycloak
    </Button>
  )
}
```

### Step 2: Create Callback Page

Create `src/app/auth/callback/page.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import {
  getCallbackParams,
  validateState,
  exchangeCodeForTokens,
  clearCallbackParams,
} from '@/lib/keycloak'
import { toast } from 'sonner'

export default function CallbackPage() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)

  useEffect(() => {
    async function handleCallback() {
      try {
        const { code, state } = getCallbackParams()

        if (!code || !validateState(state)) {
          throw new Error('Invalid callback')
        }

        const tokens = await exchangeCodeForTokens(code)
        login(tokens.access_token)

        clearCallbackParams()
        router.push('/dashboard')
        toast.success('Logged in successfully!')
      } catch (error) {
        console.error(error)
        router.push('/login?error=callback_failed')
      }
    }

    handleCallback()
  }, [])

  return <div>Processing login...</div>
}
```

### Step 3: Update Logout Button

**OLD:**
```typescript
<SignOutDialog
  onConfirm={() => auth.reset()}
/>
```

**NEW:**
```typescript
import { logoutUser } from '@/stores/auth-store'

<SignOutDialog
  onConfirm={() => logoutUser(window.location.origin)}
/>
```

---

## Update Protected Routes

### Option 1: Client-Side Guard

**OLD:**
```typescript
// No protection - anyone can access
export default function DashboardPage() {
  return <div>Dashboard</div>
}
```

**NEW:**
```typescript
'use client'

import { useEffect } from 'react'
import { useIsAuthenticated, forceLogin } from '@/stores/auth-store'

export default function DashboardPage() {
  const isAuth = useIsAuthenticated()

  useEffect(() => {
    if (!isAuth) {
      forceLogin('/dashboard')
    }
  }, [isAuth])

  if (!isAuth) {
    return <div>Checking authentication...</div>
  }

  return <div>Dashboard</div>
}
```

### Option 2: Layout Guard (Better)

Update `src/app/(dashboard)/layout.tsx`:

```typescript
import { ProtectedRoute } from '@/components/protected-route'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  )
}
```

### Option 3: Middleware (Best - Coming in Task 5)

Will add authentication check in `middleware.ts`.

---

## Update API Calls

### Step 1: Create API Client

**OLD:**
```typescript
// Direct fetch with no auth
const response = await fetch('/api/users')
```

**NEW:** Create `src/lib/api-client.ts`:

```typescript
import { useAuthStore } from '@/stores/auth-store'
import { env } from '@/lib/env'

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().accessToken

  const response = await fetch(`${env.api.url}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  if (response.status === 401) {
    useAuthStore.getState().logout()
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }

  return response.json()
}
```

### Step 2: Update API Calls

**OLD:**
```typescript
const users = await fetch('/api/users').then(r => r.json())
```

**NEW:**
```typescript
import { apiCall } from '@/lib/api-client'

const users = await apiCall('/users')
```

---

## Remove Old Code

### Files to Delete

```bash
# ❌ Delete old mock auth forms (if not using Keycloak UI)
rm src/app/(auth)/login/components/user-auth-form.tsx
rm src/app/(auth)/register/components/sign-up-form.tsx

# ❌ Or keep and update to redirect to Keycloak
```

### Code to Remove

#### 1. Remove Mock Authentication

**OLD:** In form components:
```typescript
// ❌ DELETE
setTimeout(() => {
  auth.setAccessToken('mock-access-token')
}, 2000)
```

#### 2. Remove Cookie Storage Logic

**OLD:** In auth-store:
```typescript
// ❌ DELETE
const cookieState = getCookie(ACCESS_TOKEN)
const initToken = cookieState ? JSON.parse(cookieState) : ''

setAccessToken: (accessToken) => {
  setCookie(ACCESS_TOKEN, JSON.stringify(accessToken))
  // ...
}
```

Already removed in new `auth-store.ts`.

#### 3. Remove Hardcoded Data

**OLD:** In sidebar-data.ts:
```typescript
// ❌ UPDATE THIS
user: {
  name: 'satnaing',
  email: 'satnaingdev@gmail.com',
  avatar: '/avatars/shadcn.jpg',
}
```

**NEW:**
```typescript
// ✅ Get from auth store
import { useAuthStore } from '@/stores/auth-store'

const user = useAuthStore(state => state.user)
// Use user.name, user.email dynamically
```

---

## Testing Migration

### Checklist

- [ ] Environment variables configured (`.env.local`)
- [ ] Keycloak client created and configured
- [ ] Can click login and redirect to Keycloak
- [ ] Can login with Keycloak test user
- [ ] Redirects back to app after login
- [ ] Token stored in Zustand (check Redux DevTools)
- [ ] User info displays correctly
- [ ] User roles display correctly
- [ ] Can access protected routes
- [ ] Redirects to login if not authenticated
- [ ] API calls include Bearer token
- [ ] Can logout successfully
- [ ] Redirects to Keycloak logout
- [ ] No console errors
- [ ] No TypeScript errors

### Test Each Page

1. **Login Page** (`/login`)
   - Shows login button
   - Redirects to Keycloak
   - Handles callback correctly

2. **Dashboard** (`/dashboard`)
   - Protected (redirects if not logged in)
   - Displays user info
   - Shows user roles

3. **API Calls**
   - Include Authorization header
   - Handle 401 errors (logout)

4. **Logout**
   - Clears Zustand state
   - Redirects to Keycloak logout
   - Cannot access dashboard after logout

### Debug Tools

```typescript
// Check auth state in console
import { useAuthStore } from '@/stores/auth-store'
console.log(useAuthStore.getState())

// Debug token
import { debugToken } from '@/lib/keycloak'
debugToken(accessToken, 'My Token')

// Check if authenticated
import { useIsAuthenticated } from '@/stores/auth-store'
const isAuth = useIsAuthenticated()
console.log('Authenticated?', isAuth)
```

---

## Common Issues During Migration

### Issue 1: "Missing environment variable"

**Solution:** Copy `.env.example` to `.env.local` and fill in values.

### Issue 2: "Invalid redirect URI"

**Solution:** Add redirect URI to Keycloak client settings:
```
http://localhost:3000/auth/callback
```

### Issue 3: TypeScript errors on `user.accountNo`

**Solution:** Change to `user.id`:
```typescript
// OLD
user.accountNo

// NEW
user.id
```

### Issue 4: "Cannot access dashboard"

**Solution:** Check if:
1. Token is in Zustand (Redux DevTools)
2. Token is not expired (`debugToken()`)
3. Protected route check is working

### Issue 5: "API calls return 401"

**Solution:** Check if:
1. Token is included in Authorization header
2. Backend accepts Keycloak JWT tokens
3. Backend validates token signature

---

## Rollback Plan

If migration fails, rollback to old system:

```bash
# Restore old auth-store.ts from git
git checkout HEAD -- src/stores/auth-store.ts

# Keep Keycloak setup for later
# Just revert components to use old auth.setAccessToken()
```

---

## Next Steps

After successful migration:

1. Complete Task 5: Add authentication middleware
2. Complete Task 6: Fix open redirect vulnerability
3. Test in staging environment
4. Update production Keycloak configuration
5. Deploy to production

---

**Last Updated**: 2025-12-10
