# Authentication Usage Guide

Practical examples for implementing Keycloak authentication in your Next.js app.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Login Flow](#login-flow)
3. [Logout Flow](#logout-flow)
4. [Protected Routes](#protected-routes)
5. [Role-Based Access](#role-based-access)
6. [API Calls with Auth](#api-calls-with-auth)
7. [Common Patterns](#common-patterns)

---

## Quick Start

### Basic Login Button

```tsx
'use client'

import { redirectToLogin } from '@/lib/keycloak'
import { Button } from '@/components/ui/button'

export function LoginButton() {
  const handleLogin = () => {
    // Redirect to Keycloak login page
    // After login, returns to /auth/callback
    redirectToLogin('/dashboard') // Return URL after login
  }

  return (
    <Button onClick={handleLogin}>
      Sign In with Keycloak
    </Button>
  )
}
```

### Basic Logout Button

```tsx
'use client'

import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = () => {
    // Clears local state and redirects to Keycloak logout
    logout(window.location.origin)
  }

  return (
    <Button onClick={handleLogout} variant="outline">
      Sign Out
    </Button>
  )
}
```

### Display User Info

```tsx
'use client'

import { useUser, useIsAuthenticated } from '@/stores/auth-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function UserProfile() {
  const user = useUser()
  const isAuthenticated = useIsAuthenticated()

  if (!isAuthenticated || !user) {
    return <div>Not logged in</div>
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback>
          {user.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
    </div>
  )
}
```

---

## Login Flow

### Step 1: Create OAuth Callback Page

Create `src/app/auth/callback/page.tsx`:

```tsx
'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import {
  getCallbackParams,
  validateState,
  getReturnUrl,
  exchangeCodeForTokens,
  clearCallbackParams,
  formatKeycloakError,
} from '@/lib/keycloak'
import { toast } from 'sonner'

function CallbackContent() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const setError = useAuthStore((state) => state.setError)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get OAuth parameters from URL
        const { code, state, error, error_description } = getCallbackParams()

        // Handle OAuth error
        if (error) {
          throw new Error(error_description || error)
        }

        // Validate code exists
        if (!code) {
          throw new Error('No authorization code received')
        }

        // Validate state (CSRF protection)
        if (!validateState(state)) {
          throw new Error('Invalid state parameter - possible CSRF attack')
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code)

        // Store access token in Zustand (memory)
        // Refresh token should be stored in HttpOnly cookie via API route
        login(tokens.access_token)

        // Optional: Store refresh token via API route
        await fetch('/api/auth/set-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refresh_token }),
        })

        // Clear OAuth params from URL
        clearCallbackParams()

        // Get return URL or default to dashboard
        const returnUrl = getReturnUrl() || '/dashboard'

        // Success toast
        toast.success('Successfully logged in!')

        // Redirect
        router.push(returnUrl)
      } catch (error) {
        console.error('Login callback error:', error)

        const errorMessage = formatKeycloakError(error)
        setError(errorMessage)
        toast.error(`Login failed: ${errorMessage}`)

        // Redirect to login page with error
        router.push('/login?error=callback_failed')
      }
    }

    handleCallback()
  }, [login, setError, router])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground">Completing login...</p>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  )
}
```

### Step 2: Create Login Page

Create `src/app/login/page.tsx`:

```tsx
'use client'

import { useEffect } from 'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useIsAuthenticated } from '@/stores/auth-store'
import { redirectToLogin } from '@/lib/keycloak'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAuthenticated = useIsAuthenticated()

  const error = searchParams.get('error')
  const returnUrl = searchParams.get('redirect') || '/dashboard'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push(returnUrl)
    }
  }, [isAuthenticated, router, returnUrl])

  const handleLogin = () => {
    redirectToLogin(returnUrl)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error === 'callback_failed'
                ? 'Login failed. Please try again.'
                : 'An error occurred. Please try again.'}
            </div>
          )}

          <Button onClick={handleLogin} className="w-full" size="lg">
            Sign In with Keycloak
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button
              onClick={() => redirectToRegister()}
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Logout Flow

### Simple Logout

```tsx
'use client'

import { logoutUser } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  return (
    <Button onClick={() => logoutUser(window.location.origin)}>
      Sign Out
    </Button>
  )
}
```

### Logout with Confirmation

```tsx
'use client'

import { useState } from 'react'
import { logoutUser } from '@/stores/auth-store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function LogoutWithConfirm() {
  const handleLogout = () => {
    logoutUser(window.location.origin)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost">Sign Out</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be signed out from your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout}>
            Sign Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## Protected Routes

### Client Component Guard

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useIsAuthenticated, forceLogin } from '@/stores/auth-store'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isAuthenticated = useIsAuthenticated()

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to Keycloak login
      forceLogin(window.location.pathname)
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

### Usage in Layout

```tsx
// src/app/(dashboard)/layout.tsx
import { ProtectedRoute } from '@/components/protected-route'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Your dashboard layout */}
        {children}
      </div>
    </ProtectedRoute>
  )
}
```

### Server Component Check (Middleware)

Better approach - check in middleware (coming in Task 5):

```tsx
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('kc_auth_token')
  const { pathname } = request.nextUrl

  // Protected routes
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Role-Based Access

### Check Single Role

```tsx
'use client'

import { useHasRole } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'

export function AdminButton() {
  const isAdmin = useHasRole('admin')

  if (!isAdmin) {
    return null // Hide button if not admin
  }

  return <Button>Admin Panel</Button>
}
```

### Check Multiple Roles

```tsx
'use client'

import { useUser } from '@/stores/auth-store'
import { hasRole } from '@/lib/keycloak'

export function ModeratorPanel() {
  const user = useUser()

  if (!user) return null

  // User must have EITHER admin OR moderator role
  const canModerate = hasRole(user, ['admin', 'moderator'])

  if (!canModerate) {
    return <div>Access Denied</div>
  }

  return <div>Moderator Panel Content</div>
}
```

### Require All Roles

```tsx
'use client'

import { useUser } from '@/stores/auth-store'
import { hasRole } from '@/lib/keycloak'

export function SuperAdminPanel() {
  const user = useUser()

  if (!user) return null

  // User must have BOTH admin AND superuser roles
  const isSuperAdmin = hasRole(user, ['admin', 'superuser'], true)

  if (!isSuperAdmin) {
    return <div>Access Denied - Requires admin AND superuser roles</div>
  }

  return <div>Super Admin Panel Content</div>
}
```

### Role-Based Component

```tsx
'use client'

import { useUser } from '@/stores/auth-store'
import { hasRole } from '@/lib/keycloak'

interface RoleGuardProps {
  roles: string | string[]
  requireAll?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function RoleGuard({
  roles,
  requireAll = false,
  fallback = null,
  children,
}: RoleGuardProps) {
  const user = useUser()

  if (!user || !hasRole(user, roles, requireAll)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Usage
<RoleGuard roles="admin" fallback={<div>Admin only</div>}>
  <AdminPanel />
</RoleGuard>

<RoleGuard roles={['admin', 'moderator']}>
  <ModerationTools />
</RoleGuard>

<RoleGuard roles={['admin', 'superuser']} requireAll>
  <DangerZone />
</RoleGuard>
```

---

## API Calls with Auth

### Fetch with Token

```tsx
'use client'

import { useAuthStore } from '@/stores/auth-store'
import { env } from '@/lib/env'

export function useApi() {
  const accessToken = useAuthStore((state) => state.accessToken)

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${env.api.url}${endpoint}`

    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired - logout and redirect to login
        useAuthStore.getState().logout()
        throw new Error('Session expired')
      }

      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  return { fetchWithAuth }
}

// Usage in component
export function UserList() {
  const { fetchWithAuth } = useApi()
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchWithAuth('/users')
      .then(setUsers)
      .catch(console.error)
  }, [])

  return <div>{/* render users */}</div>
}
```

### Axios Instance with Auth

```tsx
// src/lib/api-client.ts
import axios from 'axios'
import { env } from '@/lib/env'
import { useAuthStore } from '@/stores/auth-store'

export const apiClient = axios.create({
  baseURL: env.api.url,
  timeout: env.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - logout
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

// Usage
import { apiClient } from '@/lib/api-client'

const users = await apiClient.get('/users')
const newUser = await apiClient.post('/users', { name: 'John' })
```

---

## Common Patterns

### Auto Token Refresh

```tsx
// src/hooks/use-token-refresh.ts
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

export function useTokenRefresh() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const isTokenExpiring = useAuthStore((state) => state.isTokenExpiring())
  const updateToken = useAuthStore((state) => state.updateToken)

  useEffect(() => {
    if (!isAuthenticated || !isTokenExpiring) return

    const refreshToken = async () => {
      try {
        // Call your refresh token API endpoint
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include', // Include HttpOnly cookies
        })

        if (!response.ok) {
          throw new Error('Refresh failed')
        }

        const { accessToken } = await response.json()
        updateToken(accessToken)

        console.log('Token refreshed successfully')
      } catch (error) {
        console.error('Token refresh failed:', error)
        toast.error('Session expired. Please login again.')
        useAuthStore.getState().logout()
      }
    }

    refreshToken()
  }, [isAuthenticated, isTokenExpiring, updateToken])
}

// Usage in root layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  useTokenRefresh() // Auto-refresh token

  return <html>{children}</html>
}
```

### Show User Roles

```tsx
'use client'

import { useUser } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'

export function UserRoles() {
  const user = useUser()

  if (!user) return null

  return (
    <div className="flex flex-wrap gap-2">
      {user.roles.map((role) => (
        <Badge key={role} variant="secondary">
          {role}
        </Badge>
      ))}
    </div>
  )
}
```

### Conditional Rendering

```tsx
'use client'

import { useIsAuthenticated } from '@/stores/auth-store'
import { LoginButton } from './login-button'
import { UserProfile } from './user-profile'

export function AuthStatus() {
  const isAuthenticated = useIsAuthenticated()

  return (
    <div>
      {isAuthenticated ? (
        <UserProfile />
      ) : (
        <LoginButton />
      )}
    </div>
  )
}
```

---

## Next Steps

- Read [API_REFERENCE.md](./API_REFERENCE.md) for complete API documentation
- Read [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) to update existing code
- Read [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues

---

**Last Updated**: 2025-12-10
