'use client'

/**
 * Tenant Gate Component
 *
 * Guards the dashboard layout based on tenant status:
 * - If auth is invalid: Redirect to login page (clear cookies first)
 * - If user has no tenants: Redirect to onboarding page
 * - If user has tenant: Show normal dashboard layout with sidebar
 *
 * IMPORTANT: We MUST wait for API response before deciding where to redirect.
 * The proxy only checks if cookie exists, not if it's valid.
 * So we need to let the tenant API call happen first to validate auth.
 */

import { useEffect, useRef, useState } from 'react'
import { useTenant } from '@/context/tenant-provider'
import { useBootstrapContextSafe } from '@/context/bootstrap-provider'
import { usePermissionsSafe } from '@/context/permission-provider'
import { getCookie, removeCookie } from '@/lib/cookies'
import { env } from '@/lib/env'
import { Loader2 } from 'lucide-react'

interface TenantGateProps {
  children: React.ReactNode
}

// Loading UI component
function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

/**
 * Check if error is an authentication error
 */
function isAuthError(error: Error): boolean {
  const statusCode = (error as { statusCode?: number }).statusCode
  const code = (error as { code?: string }).code
  const message = error.message?.toLowerCase() || ''

  return (
    statusCode === 401 ||
    statusCode === 403 ||
    code === 'UNAUTHORIZED' ||
    code === 'UNAUTHENTICATED' ||
    message.includes('unauthorized') ||
    message.includes('unauthenticated') ||
    message.includes('invalid token') ||
    message.includes('expired token') ||
    message.includes('invalid refresh token') ||
    message.includes('session expired') ||
    message.includes('not authenticated') ||
    message.includes('authentication failed')
  )
}

/**
 * Clear auth cookies and redirect to login
 *
 * IMPORTANT: We clear ALL auth-related cookies including tenant cookie.
 * This prevents login loops caused by stale tenant cookie pointing to
 * invalid tenant (e.g., user removed from team, different user logging in).
 *
 * We cannot clear HttpOnly cookies from client-side JavaScript.
 * The server/middleware will handle clearing those.
 */
function clearAuthAndRedirectToLogin() {
  console.log('[TenantGate] Auth error detected, clearing cookies and redirecting to login')

  // Clear non-HttpOnly auth cookies (if any)
  // Note: HttpOnly cookies (access_token, refresh_token) cannot be cleared from JS
  // The server will handle clearing those when the user tries to use them
  removeCookie(env.auth.cookieName)

  // Clear tenant cookie to prevent login loops
  // When user logs in again, they'll go through proper tenant selection
  removeCookie(env.cookies.tenant)

  // Clear pending tenants cookie
  removeCookie(env.cookies.pendingTenants)

  // Use hard redirect to ensure clean state
  window.location.href = '/login'
}

export function TenantGate({ children }: TenantGateProps) {
  const { tenants, isLoading, error } = useTenant()
  const { isBootstrapped, data: bootstrapData } = useBootstrapContextSafe()
  const { permissions } = usePermissionsSafe()
  const hasRedirected = useRef(false)

  // Check if tenant cookie exists directly (don't wait for state update)
  // This prevents the flash redirect to onboarding when cookie exists
  const [hasCookieChecked, setHasCookieChecked] = useState(false)
  const [hasTenantCookie, setHasTenantCookie] = useState(false)

  useEffect(() => {
    const cookie = getCookie(env.cookies.tenant)
    setHasTenantCookie(!!cookie)
    setHasCookieChecked(true)
  }, [])

  // Handle authentication errors - HIGHEST PRIORITY
  // When token is invalid, API will return 401 - redirect to login
  useEffect(() => {
    if (error && !hasRedirected.current) {
      if (isAuthError(error)) {
        hasRedirected.current = true
        clearAuthAndRedirectToLogin()
      }
    }
  }, [error])

  // Handle tenant check AFTER API response (when needed)
  // Only redirect to onboarding if:
  // 1. Cookie check completed
  // 2. API call completed (not loading) - only needed when no cookie
  // 3. No auth error
  // 4. User has no tenants AND no tenant cookie
  //
  // OPTIMIZATION: If user has a tenant cookie, we trust it and skip the
  // tenants API call. The API is only called when user doesn't have a
  // tenant cookie (to check if they need onboarding).
  useEffect(() => {
    // Wait for cookie check to complete
    if (!hasCookieChecked) return

    // If user has a tenant cookie, trust it - no need to check tenants
    if (hasTenantCookie) return

    // Wait for API to complete (only called when no tenant cookie)
    if (isLoading) return

    // If there's an auth error, let the auth error handler deal with it
    if (error && isAuthError(error)) return

    // Already redirected
    if (hasRedirected.current) return

    // Check if user has no tenants - redirect to onboarding
    // This means auth is valid but user hasn't created a team yet
    if (tenants.length === 0) {
      hasRedirected.current = true
      console.log('[TenantGate] No tenants found - redirecting to onboarding')
      window.location.href = '/onboarding/create-team'
      return
    }

    // Check if user has tenants but no tenant cookie selected
    // This can happen if cookie was cleared but auth is still valid
    if (tenants.length > 0) {
      console.log('[TenantGate] No tenant selected, but has tenants - selecting first one')
      // This will be handled by the first tenant selection flow
    }
  }, [hasCookieChecked, hasTenantCookie, isLoading, error, tenants.length])

  // Show loading while cookie check hasn't completed
  if (!hasCookieChecked) {
    return <LoadingScreen message="Loading..." />
  }

  // Show loading if auth error (will redirect to login)
  if (error && isAuthError(error)) {
    return <LoadingScreen message="Session expired..." />
  }

  // If user has tenant cookie, wait for ALL data before showing dashboard
  // Single loading screen approach - provides clean, professional UX
  if (hasTenantCookie) {
    // Check if all data is ready:
    // 1. Bootstrap completed (isBootstrapped = true)
    // 2. Permissions synced to PermissionProvider
    const hasBootstrapPermissions =
      bootstrapData?.permissions?.list && bootstrapData.permissions.list.length > 0
    const hasProviderPermissions = permissions.length > 0

    // Still loading if bootstrap not done OR permissions not synced yet
    const isDataReady = isBootstrapped && (!hasBootstrapPermissions || hasProviderPermissions)

    if (!isDataReady) {
      return <LoadingScreen message="Loading..." />
    }
    return <>{children}</>
  }

  // No tenant cookie - need to check tenants API
  // Show loading while API is fetching
  if (isLoading) {
    return <LoadingScreen message="Verifying..." />
  }

  // Show loading while redirecting for empty tenants
  if (tenants.length === 0) {
    return <LoadingScreen message="Redirecting..." />
  }

  // User has tenants from API - show normal dashboard layout
  return <>{children}</>
}
