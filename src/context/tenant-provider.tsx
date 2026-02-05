/**
 * Tenant Context Provider
 *
 * Manages current tenant state and provides team switching functionality.
 * - Reads current tenant from cookie
 * - Fetches all user's tenants
 * - Provides switchTeam function for changing teams
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import { useMyTenants, invalidateMyTenantsCache } from '@/lib/api/user-tenant-hooks'
import type { TenantMembership, TenantRole } from '@/lib/api/user-tenant-types'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import { env } from '@/lib/env'
import { removeStoredPermissions } from '@/lib/permission-storage'
import { clearAllLogoCaches, clearTenantLogoCache } from '@/lib/logo-storage'

// ============================================
// TYPES
// ============================================

export interface CurrentTenant {
  id: string
  slug: string
  name?: string
  role: TenantRole
  plan?: string
  logo_url?: string
}

interface TenantContextValue {
  /** Current active tenant */
  currentTenant: CurrentTenant | null
  /** All tenants user has access to */
  tenants: TenantMembership[]
  /** Loading state for tenants */
  isLoading: boolean
  /** Error fetching tenants */
  error: Error | null
  /** Switch to a different team */
  switchTeam: (tenantId: string) => Promise<void>
  /** Switching in progress */
  isSwitching: boolean
  /** Refresh tenant list */
  refreshTenants: () => Promise<void>
  /** Update current tenant info (name, slug) without full reload */
  updateCurrentTenant: (updates: Partial<Pick<CurrentTenant, 'name' | 'slug'>>) => void
  /** Trigger eager fetch of tenant list (call when opening dropdown) */
  loadTenants: () => void
}

// ============================================
// CONTEXT
// ============================================

const TenantContext = React.createContext<TenantContextValue | undefined>(undefined)

// Cookie name for storing current tenant (from env config)
const TENANT_COOKIE = env.cookies.tenant

// ============================================
// PROVIDER
// ============================================

interface TenantProviderProps {
  children: React.ReactNode
}

// Helper to read tenant from cookie synchronously (for initial state)
function readTenantFromCookie(): { tenant: CurrentTenant | null; hasCookie: boolean } {
  if (typeof window === 'undefined') {
    return { tenant: null, hasCookie: false }
  }
  const tenantCookie = getCookie(TENANT_COOKIE)
  if (tenantCookie) {
    try {
      const parsed = JSON.parse(tenantCookie) as CurrentTenant
      return { tenant: parsed, hasCookie: true }
    } catch {
      // Old cookie format - will be cleared in useEffect
      return { tenant: null, hasCookie: false }
    }
  }
  return { tenant: null, hasCookie: false }
}

export function TenantProvider({ children }: TenantProviderProps) {
  const router = useRouter()
  const { mutate: globalMutate } = useSWRConfig()

  // Start with null, read from cookie in useLayoutEffect to avoid hydration mismatch
  const [currentTenant, setCurrentTenant] = React.useState<CurrentTenant | null>(null)
  const [isSwitching, setIsSwitching] = React.useState(false)
  const [hasTenantCookie, setHasTenantCookie] = React.useState<boolean | null>(null)
  // Track if dropdown has been opened (trigger eager fetch when user wants to switch)
  const [shouldEagerFetch, setShouldEagerFetch] = React.useState(false)
  // Track if initial read has been done
  const initialReadDoneRef = React.useRef(false)

  // Read tenant from cookie on mount (client-side only)
  // This runs immediately after hydration, before paint
  React.useLayoutEffect(() => {
    if (initialReadDoneRef.current) return
    initialReadDoneRef.current = true

    const { tenant, hasCookie } = readTenantFromCookie()
    console.log('[TenantProvider] Initial read:', { tenant: tenant?.id, hasCookie })
    setCurrentTenant(tenant)
    setHasTenantCookie(hasCookie)

    // Handle invalid cookie format
    if (!tenant && hasCookie) {
      const tenantCookie = getCookie(TENANT_COOKIE)
      if (tenantCookie) {
        console.warn('[TenantProvider] Invalid tenant cookie format, clearing cookie')
        removeCookie(TENANT_COOKIE)
        setHasTenantCookie(false)
      }
    }
  }, [])

  // OPTIMIZATION: Only fetch tenants on page load if:
  // 1. No tenant cookie exists (need to check if user needs onboarding)
  // 2. User has opened the dropdown (wants to switch teams)
  // Otherwise, skip the API call to reduce load time
  const skipTenantsFetch = hasTenantCookie === null || (hasTenantCookie && !shouldEagerFetch)
  const { data: tenants = [], error, isLoading, mutate } = useMyTenants({ skip: skipTenantsFetch })

  // Update current tenant with additional info from tenants list
  // Use ref to prevent unnecessary updates
  const lastUpdatedTenantId = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (currentTenant && tenants.length > 0) {
      // Skip if we already updated this tenant
      if (lastUpdatedTenantId.current === currentTenant.id && currentTenant.name) {
        return
      }

      const fullTenant = tenants.find((t) => t.id === currentTenant.id)
      if (fullTenant && (!currentTenant.name || currentTenant.name !== fullTenant.name)) {
        lastUpdatedTenantId.current = currentTenant.id
        setCurrentTenant({
          ...currentTenant,
          name: fullTenant.name,
          plan: fullTenant.plan,
        })
      }
    }
  }, [currentTenant, tenants])

  // Switch to a different team
  const switchTeam = React.useCallback(
    async (tenantId: string) => {
      if (isSwitching) return

      // Find the target tenant
      const targetTenant = tenants.find((t) => t.id === tenantId)
      if (!targetTenant) {
        console.error('[TenantProvider] Tenant not found:', tenantId)
        return
      }

      // Don't switch if already on this tenant
      if (currentTenant?.id === tenantId) {
        return
      }

      setIsSwitching(true)

      try {
        // Call the switch team API endpoint
        const response = await fetch('/api/auth/switch-team', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            tenant_id: tenantId,
            tenant_name: targetTenant.name, // Include name for cookie storage
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Failed to switch team')
        }

        const data = await response.json()

        // Clear cached data of old tenant from localStorage
        if (currentTenant?.id) {
          removeStoredPermissions(currentTenant.id)
          clearTenantLogoCache(currentTenant.id)
        }

        // Clear all logo caches to ensure fresh logo for new tenant
        clearAllLogoCaches()

        // Update current tenant
        const newTenant: CurrentTenant = {
          id: data.data.tenant_id,
          slug: data.data.tenant_slug,
          name: targetTenant.name,
          role: data.data.role as TenantRole,
          plan: targetTenant.plan,
        }

        setCurrentTenant(newTenant)

        // Update cookie (non-httpOnly for client read)
        setCookie(
          TENANT_COOKIE,
          JSON.stringify({
            id: newTenant.id,
            slug: newTenant.slug,
            name: newTenant.name,
            role: newTenant.role,
          }),
          { path: '/', maxAge: 7 * 24 * 60 * 60 }
        )

        // Clear all SWR caches to force refetch with new tenant context
        // This invalidates all cached data so components will refetch
        await globalMutate(
          () => true, // Match all keys
          undefined, // Clear data
          { revalidate: true } // Trigger revalidation
        )

        // Also refresh server components
        router.refresh()

        console.log('[TenantProvider] Switched to team:', newTenant.name)
      } catch (error) {
        console.error('[TenantProvider] Failed to switch team:', error)
        throw error
      } finally {
        setIsSwitching(false)
      }
    },
    [currentTenant, tenants, isSwitching, router, globalMutate]
  )

  // Refresh tenants
  const refreshTenants = React.useCallback(async () => {
    await mutate()
    await invalidateMyTenantsCache()
  }, [mutate])

  // Update current tenant info (name, slug) without full reload
  const updateCurrentTenant = React.useCallback(
    (updates: Partial<Pick<CurrentTenant, 'name' | 'slug'>>) => {
      if (!currentTenant) return

      const updatedTenant: CurrentTenant = {
        ...currentTenant,
        ...updates,
      }

      setCurrentTenant(updatedTenant)

      // Update cookie with new info
      setCookie(
        TENANT_COOKIE,
        JSON.stringify({
          id: updatedTenant.id,
          slug: updatedTenant.slug,
          name: updatedTenant.name,
          role: updatedTenant.role,
        }),
        { path: '/', maxAge: 7 * 24 * 60 * 60 }
      )
    },
    [currentTenant]
  )

  // Load tenants on demand (for dropdown)
  const loadTenants = React.useCallback(() => {
    if (!shouldEagerFetch) {
      setShouldEagerFetch(true)
    }
  }, [shouldEagerFetch])

  const value = React.useMemo<TenantContextValue>(
    () => ({
      currentTenant,
      tenants,
      isLoading,
      error: error || null,
      switchTeam,
      isSwitching,
      refreshTenants,
      updateCurrentTenant,
      loadTenants,
    }),
    [
      currentTenant,
      tenants,
      isLoading,
      error,
      switchTeam,
      isSwitching,
      refreshTenants,
      updateCurrentTenant,
      loadTenants,
    ]
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

// ============================================
// HOOK
// ============================================

export function useTenant() {
  const context = React.useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

// ============================================
// UTILITIES
// ============================================

/**
 * Get current tenant from cookie (can be used server-side)
 */
export function getCurrentTenantFromCookie(): CurrentTenant | null {
  if (typeof window === 'undefined') return null

  const tenantCookie = getCookie(TENANT_COOKIE)
  if (!tenantCookie) return null

  try {
    return JSON.parse(tenantCookie) as CurrentTenant
  } catch {
    return null
  }
}
