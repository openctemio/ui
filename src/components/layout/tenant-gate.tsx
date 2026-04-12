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
 *
 * Navigation strategy:
 * - FIRST LOAD: Block rendering until bootstrap completes (max 15s timeout)
 * - SUBSEQUENT: Never block — always render children. Auth is validated per-API-call.
 *   This eliminates the persistent "Loading..." on browser back/forward navigation.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { devLog } from '@/lib/logger'
import { useTenant } from '@/context/tenant-provider'
import { useBootstrapContextSafe } from '@/context/bootstrap-provider'
import { usePermissionsSafe } from '@/context/permission-provider'
import { getCookie, removeCookie } from '@/lib/cookies'
import { env } from '@/lib/env'
import { Loader2 } from 'lucide-react'

// ============================================
// Constants
// ============================================

/** Max time to wait for bootstrap on first load before showing children anyway. */
const BOOTSTRAP_TIMEOUT_MS = 15_000

/** sessionStorage key — NOT tenant-scoped because we just need to know
 *  "has this tab ever successfully loaded the dashboard?" to skip
 *  blocking on subsequent navigations. */
const SESSION_KEY = 'tenant_gate_loaded'

// ============================================
// UI Components
// ============================================

interface TenantGateProps {
  children: React.ReactNode
}

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

function LoadingOverlay({ message = 'Switching workspace...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-lg border bg-background px-6 py-4 shadow-lg">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  )
}

// ============================================
// Helpers
// ============================================

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

function clearAuthAndRedirectToLogin() {
  devLog.log('[TenantGate] Auth error detected, clearing cookies and redirecting to login')

  removeCookie(env.auth.cookieName)
  removeCookie(env.cookies.tenant)
  removeCookie(env.cookies.pendingTenants)

  // Clear session flag so next login goes through full bootstrap
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }

  window.location.href = '/login'
}

// ============================================
// Component
// ============================================

export function TenantGate({ children }: TenantGateProps) {
  const { tenants, currentTenant, isLoading, error } = useTenant()
  const { isBootstrapped, data: _bootstrapData } = useBootstrapContextSafe()
  const { permissions: _permissions } = usePermissionsSafe()
  const hasRedirected = useRef(false)

  const [hasCookieChecked, setHasCookieChecked] = useState(false)
  const [hasTenantCookie, setHasTenantCookie] = useState(false)
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)

  // Track tenant ID for detecting real workspace switches
  const [lastLoadedTenantId, setLastLoadedTenantId] = useState<string | null>(null)

  // Timeout: if first-load bootstrap takes too long, show children anyway.
  // Backend validates auth per-request, so this is safe.
  const [timedOut, setTimedOut] = useState(false)

  // ─── Synchronous cookie check (runs before paint)
  useLayoutEffect(() => {
    const cookie = getCookie(env.cookies.tenant)
    setHasTenantCookie(!!cookie)
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        setHasInitiallyLoaded(true)
      }
    } catch {
      /* ignore */
    }
    setHasCookieChecked(true)
  }, [])

  // ─── Auth error handler
  useEffect(() => {
    if (error && !hasRedirected.current && isAuthError(error)) {
      hasRedirected.current = true
      clearAuthAndRedirectToLogin()
    }
  }, [error])

  // ─── No-tenant redirect (onboarding)
  useEffect(() => {
    if (!hasCookieChecked || hasTenantCookie || isLoading) return
    if (error && isAuthError(error)) return
    if (hasRedirected.current) return

    if (tenants.length === 0) {
      hasRedirected.current = true
      devLog.log('[TenantGate] No tenants found - redirecting to onboarding')
      window.location.href = '/onboarding/create-team'
    }
  }, [hasCookieChecked, hasTenantCookie, isLoading, error, tenants.length])

  // ─── Track successful bootstrap
  const currentTenantId = currentTenant?.id ?? null

  useEffect(() => {
    if (isBootstrapped) {
      if (!hasInitiallyLoaded) {
        setHasInitiallyLoaded(true)
        try {
          sessionStorage.setItem(SESSION_KEY, '1')
        } catch {
          /* ignore */
        }
      }
      if (currentTenantId && currentTenantId !== lastLoadedTenantId) {
        setLastLoadedTenantId(currentTenantId)
      }
      // Reset timeout flag if it was set
      if (timedOut) setTimedOut(false)
    }
  }, [isBootstrapped, hasInitiallyLoaded, currentTenantId, lastLoadedTenantId, timedOut])

  // ─── Timeout: prevent indefinite loading on first load
  useEffect(() => {
    // Only set timeout for first-load scenario (not after hasInitiallyLoaded)
    if (hasInitiallyLoaded || isBootstrapped || timedOut) return

    const timer = setTimeout(() => {
      devLog.warn('[TenantGate] Bootstrap timeout — showing children anyway')
      setTimedOut(true)
    }, BOOTSTRAP_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [hasInitiallyLoaded, isBootstrapped, timedOut])

  // ════════════════════════════════════════════
  // RENDER LOGIC
  // ════════════════════════════════════════════

  // ─── FAST PATH: After the first successful load in this browser tab,
  // never block rendering again. Backend validates auth on every API call;
  // if the token is invalid, SWR error handlers redirect to /login.
  if (hasInitiallyLoaded || timedOut) {
    // Auth error → redirect (already handled in effect, show interim screen)
    if (error && isAuthError(error)) {
      return <LoadingScreen message="Session expired..." />
    }

    // Only show overlay for REAL tenant switches
    if (
      !isBootstrapped &&
      currentTenantId &&
      lastLoadedTenantId &&
      currentTenantId !== lastLoadedTenantId
    ) {
      return (
        <>
          <LoadingOverlay message="Switching workspace..." />
          {children}
        </>
      )
    }

    return <>{children}</>
  }

  // ─── FIRST LOAD: Wait for cookie check + bootstrap

  if (!hasCookieChecked) {
    return <LoadingScreen message="Loading..." />
  }

  if (error && isAuthError(error)) {
    return <LoadingScreen message="Session expired..." />
  }

  if (hasTenantCookie) {
    if (isBootstrapped) {
      return <>{children}</>
    }
    return <LoadingScreen message="Loading..." />
  }

  // No tenant cookie — check tenants API
  if (isLoading) {
    return <LoadingScreen message="Verifying..." />
  }
  if (tenants.length === 0) {
    return <LoadingScreen message="Redirecting..." />
  }

  return <>{children}</>
}
