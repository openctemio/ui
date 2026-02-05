/**
 * User Tenant Hooks
 *
 * Custom React hooks for fetching user's tenant memberships
 */

'use client'

import * as React from 'react'
import useSWR, { type SWRConfiguration } from 'swr'
import { get } from './client'
import { handleApiError } from './error-handler'
import type { TenantMembership } from './user-tenant-types'

// ============================================
// SWR CONFIGURATION
// ============================================

/**
 * Optimized SWR config for tenant list
 *
 * Rationale:
 * - Team list rarely changes (user joins/leaves teams infrequently)
 * - Eager loading is required for auth validation and TenantGate
 * - Long cache duration reduces unnecessary API calls
 * - keepPreviousData provides instant UI while revalidating
 */
const defaultConfig: SWRConfiguration = {
  // Cache & Revalidation
  dedupingInterval: 60000, // 60s - team list rarely changes
  revalidateOnFocus: false, // Don't refetch on window focus
  revalidateOnReconnect: true, // Refetch when network reconnects
  revalidateIfStale: true, // Background revalidate if data is stale
  keepPreviousData: true, // Show stale data while fetching (no loading flash)

  // Error handling
  shouldRetryOnError: (error) => {
    const statusCode = (error as { statusCode?: number }).statusCode
    // Don't retry on auth errors (401, 403)
    if (statusCode === 401 || statusCode === 403) {
      return false
    }
    return true
  },
  errorRetryCount: 2,
  errorRetryInterval: 3000, // 3s between retries

  onError: (error) => {
    // Don't show toast for auth errors - TenantGate will handle redirect
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401) {
      console.log('[useMyTenants] Auth error, will redirect to login')
      return
    }
    handleApiError(error, {
      showToast: true,
      logError: true,
    })
  },
}

// ============================================
// ENDPOINTS
// ============================================

const userTenantEndpoints = {
  /**
   * Get current user's tenants
   */
  myTenants: () => '/api/v1/users/me/tenants',
} as const

// ============================================
// HOOKS
// ============================================

export interface UseMyTenantsOptions extends SWRConfiguration {
  /**
   * Skip fetching until explicitly needed (for lazy loading)
   * When true, the hook will not fetch until skip becomes false
   */
  skip?: boolean
}

/**
 * Fetch current user's tenants with their roles
 *
 * IMPORTANT: This hook makes an API call to:
 * 1. Validate the user's auth token (returns 401 if invalid)
 * 2. Fetch the user's tenants (returns empty array if new user)
 *
 * The API call is essential for auth validation when no tenant cookie exists.
 * TenantGate relies on this to properly redirect:
 * - 401 error → redirect to /login
 * - Empty tenants → redirect to /onboarding
 * - Has tenants → show dashboard
 *
 * OPTIMIZATION: Pass `skip: true` to lazy load tenant list.
 * Use this when user already has a tenant cookie and you only need
 * the list when they open the team switcher dropdown.
 *
 * NOTE: We cannot check for refresh_token cookies because they are HttpOnly.
 * We must always make the API call and let the server validate auth.
 *
 * @example
 * ```typescript
 * // Eager load (for TenantGate - needs to check if user has tenants)
 * const { data: tenants } = useMyTenants()
 *
 * // Lazy load (for dropdown - only fetch when opened)
 * const [dropdownOpen, setDropdownOpen] = useState(false)
 * const { data: tenants } = useMyTenants({ skip: !dropdownOpen })
 * ```
 */
export function useMyTenants(options?: UseMyTenantsOptions) {
  const { skip, ...config } = options || {}

  // Track if component has mounted on client
  // This prevents SSR/hydration issues with SWR
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // Only make the API call if:
  // 1. Component is mounted (client-side)
  // 2. Not explicitly skipped (for lazy loading)
  const shouldFetch = isMounted && !skip
  const swrKey = shouldFetch ? userTenantEndpoints.myTenants() : null

  const result = useSWR<TenantMembership[]>(
    swrKey,
    (url: string) => get<TenantMembership[]>(url),
    { ...defaultConfig, ...config }
  )

  // Return with custom isLoading that includes mount check
  // With keepPreviousData, we only show loading on initial fetch (no data yet)
  // If skipped, isLoading should be false (not loading, just not fetching)
  return {
    ...result,
    isLoading: skip ? false : (!isMounted || (result.isLoading && !result.data)),
  }
}

/**
 * Get cache key for user's tenants
 */
export function getMyTenantsKey() {
  return userTenantEndpoints.myTenants()
}

/**
 * Invalidate user's tenants cache
 */
export async function invalidateMyTenantsCache() {
  const { mutate } = await import('swr')
  await mutate(userTenantEndpoints.myTenants())
}
