/**
 * Permission Provider
 *
 * Provides real-time permission synchronization for the application.
 *
 * OPTIMIZATION: Uses bootstrap data for initial load to avoid duplicate API call.
 * If BootstrapProvider is available and has permissions, uses that data first
 * and skips the initial /sync call.
 *
 * Permissions are refreshed when:
 * 1. Version mismatch detected (X-Permission-Stale header)
 * 2. 403 Forbidden error received
 * 3. Tab/window gains focus (after 30s hidden)
 * 4. Polling interval (2 minutes)
 */

'use client'

import * as React from 'react'
import {
  getStoredPermissions,
  storePermissions,
  cleanupExpiredPermissions,
} from '@/lib/permission-storage'
import { devLog } from '@/lib/logger'
import { useTenant } from './tenant-provider'
import { useBootstrapContextSafe } from './bootstrap-provider'

// ============================================
// TYPES
// ============================================

export interface PermissionContextValue {
  /** Current permissions array */
  permissions: string[]
  /** Current permission version */
  version: number
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean
  /** Check if user has any of the permissions */
  hasAnyPermission: (permissions: string[]) => boolean
  /** Check if user has all of the permissions */
  hasAllPermissions: (permissions: string[]) => boolean
  /** Force refresh permissions from server */
  refreshPermissions: () => Promise<void>
  /** Permissions are stale (version mismatch detected) */
  isStale: boolean
}

interface PermissionsResponse {
  permissions: string[]
  version: number
}

// ============================================
// CONSTANTS
// ============================================

// Polling interval (2 minutes)
const POLL_INTERVAL_MS = 2 * 60 * 1000

// API endpoint for permission sync
const PERMISSIONS_SYNC_URL = '/api/v1/me/permissions/sync'

// Minimum interval between fetches (5 seconds) to prevent rapid successive calls
const MIN_FETCH_INTERVAL_MS = 5000

// Minimum time tab must be hidden before sync on focus (30 seconds)
// This prevents unnecessary syncs when quickly switching tabs
const MIN_HIDDEN_DURATION_FOR_SYNC_MS = 30 * 1000

// ============================================
// CONTEXT
// ============================================

const PermissionContext = React.createContext<PermissionContextValue | undefined>(undefined)

// ============================================
// PROVIDER
// ============================================

interface PermissionProviderProps {
  children: React.ReactNode
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id || ''

  // Get bootstrap data (safe hook returns default if outside BootstrapProvider)
  const bootstrap = useBootstrapContextSafe()

  const [permissions, setPermissions] = React.useState<string[]>([])
  const [version, setVersion] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)
  const [isStale, setIsStale] = React.useState(false)

  // Use refs for values that shouldn't trigger callback recreation
  const etagRef = React.useRef<string | null>(null)
  const lastFetchTimeRef = React.useRef<number>(0)
  const tabHiddenAtRef = React.useRef<number>(0)

  // Track current tenant to detect switches
  const previousTenantIdRef = React.useRef<string | null>(null)

  // Track if we've used bootstrap data to avoid re-fetching
  const usedBootstrapRef = React.useRef(false)

  // Cleanup expired permissions on mount
  React.useEffect(() => {
    cleanupExpiredPermissions()
  }, [])

  // Fetch permissions from server
  // NOTE: This callback is stable (no etag in deps) to prevent cascading effect re-runs.
  // Declared before the main effect so it can be called directly.
  const fetchPermissions = React.useCallback(
    async (force = false) => {
      if (!tenantId) {
        setPermissions([])
        setVersion(0)
        setIsLoading(false)
        return
      }

      // Debounce: Skip if fetched recently (unless forced)
      const now = Date.now()
      if (!force && lastFetchTimeRef.current > 0) {
        const timeSinceLastFetch = now - lastFetchTimeRef.current
        if (timeSinceLastFetch < MIN_FETCH_INTERVAL_MS) {
          devLog.log(
            `[PermissionProvider] Skipping fetch - last fetch was ${timeSinceLastFetch}ms ago (min: ${MIN_FETCH_INTERVAL_MS}ms)`
          )
          return
        }
      }

      lastFetchTimeRef.current = now

      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        }

        if (!force && etagRef.current) {
          headers['If-None-Match'] = etagRef.current
        }

        const response = await fetch(PERMISSIONS_SYNC_URL, {
          method: 'GET',
          headers,
          credentials: 'include',
        })

        // Prevent race conditions: ignore response if tenant changed while fetching
        if (previousTenantIdRef.current !== tenantId) return

        if (response.status === 304) {
          setIsStale(false)
          setIsLoading(false)
          return
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch permissions: ${response.status}`)
        }

        const data: PermissionsResponse = await response.json()

        setPermissions(data.permissions)
        setVersion(data.version)
        setError(null)
        setIsStale(false)

        const newEtag = response.headers.get('ETag')
        if (newEtag) {
          etagRef.current = newEtag
        }

        storePermissions(tenantId, data.permissions, data.version)
      } catch (err) {
        if (previousTenantIdRef.current !== tenantId) return

        devLog.error('[PermissionProvider] Failed to fetch permissions:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))

        const stored = getStoredPermissions(tenantId)
        if (stored) {
          setPermissions(stored.permissions)
          setVersion(stored.version)
        }
      } finally {
        if (previousTenantIdRef.current === tenantId) {
          setIsLoading(false)
        }
      }
    },
    [tenantId]
  )

  // Force refresh (ignores ETag and debounce)
  const refreshPermissions = React.useCallback(async () => {
    setIsLoading(true)
    etagRef.current = null
    lastFetchTimeRef.current = 0
    await fetchPermissions(true)
  }, [fetchPermissions])

  // Main effect: Handle initial load, tenant switches, and bootstrap → API fallback.
  // This is the SINGLE effect that decides whether to use bootstrap or fetch from API.
  React.useEffect(() => {
    // Skip if no tenant
    if (!tenantId) {
      setPermissions([])
      setVersion(0)
      setIsLoading(false)
      usedBootstrapRef.current = false
      previousTenantIdRef.current = null
      return
    }

    // Tenant changed - reset state immediately
    const tenantChanged = previousTenantIdRef.current !== tenantId
    if (tenantChanged) {
      previousTenantIdRef.current = tenantId
      etagRef.current = null
      lastFetchTimeRef.current = 0
      setError(null)
      setIsStale(false)
      usedBootstrapRef.current = false
    }

    // OPTIMIZATION: Wait for bootstrap to finish loading first.
    // This prevents fetching /sync before bootstrap has a chance to provide permissions.
    if (bootstrap.isLoading) {
      // Show cached permissions while waiting (instant UI)
      if (tenantChanged) {
        const stored = getStoredPermissions(tenantId)
        if (stored) {
          setPermissions(stored.permissions)
          setVersion(stored.version)
        }
        setIsLoading(true)
      }
      return
    }

    // CASE 1: Bootstrap has permissions — use them, DON'T fetch
    if (bootstrap.isBootstrapped && bootstrap.data?.permissions) {
      const bootstrapPerms = bootstrap.data.permissions

      if (!usedBootstrapRef.current || tenantChanged) {
        setPermissions(bootstrapPerms.list)
        setVersion(bootstrapPerms.version)
        setIsLoading(false)
        usedBootstrapRef.current = true

        storePermissions(tenantId, bootstrapPerms.list, bootstrapPerms.version)

        devLog.log('[PermissionProvider] Using bootstrap permissions — NO /sync call needed', {
          count: bootstrapPerms.list.length,
          version: bootstrapPerms.version,
        })
      }
      return
    }

    // CASE 2: Bootstrap finished but no permissions — fetch from API directly.
    if (!usedBootstrapRef.current) {
      devLog.log('[PermissionProvider] Bootstrap has no permissions, fetching from /sync')

      // Show cached permissions while fetching
      const stored = getStoredPermissions(tenantId)
      if (stored) {
        setPermissions(stored.permissions)
        setVersion(stored.version)
      } else {
        setPermissions([])
        setVersion(0)
      }
      setIsLoading(true)

      // Fetch directly — no second effect needed
      fetchPermissions()
    }
  }, [
    tenantId,
    bootstrap.isLoading,
    bootstrap.isBootstrapped,
    bootstrap.data?.permissions,
    fetchPermissions,
  ])

  // Polling for updates
  React.useEffect(() => {
    if (!tenantId) return

    const intervalId = setInterval(() => {
      fetchPermissions()
    }, POLL_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [tenantId, fetchPermissions])

  // Track tab visibility and sync on focus only if hidden for a while
  // This prevents unnecessary API calls when quickly switching tabs
  React.useEffect(() => {
    // Track when tab becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenAtRef.current = Date.now()
      }
    }

    // Sync on focus only if tab was hidden for MIN_HIDDEN_DURATION_FOR_SYNC_MS
    const handleFocus = () => {
      if (!tenantId) return

      const hiddenDuration = tabHiddenAtRef.current > 0 ? Date.now() - tabHiddenAtRef.current : 0

      // Only sync if tab was hidden for a significant period
      if (hiddenDuration >= MIN_HIDDEN_DURATION_FOR_SYNC_MS) {
        devLog.log(
          `[PermissionProvider] Tab was hidden for ${Math.round(hiddenDuration / 1000)}s, syncing permissions`
        )
        fetchPermissions()
      } else if (tabHiddenAtRef.current > 0) {
        devLog.log(
          `[PermissionProvider] Tab was hidden for only ${Math.round(hiddenDuration / 1000)}s, skipping sync (min: ${MIN_HIDDEN_DURATION_FOR_SYNC_MS / 1000}s)`
        )
      }

      // Reset hidden timestamp
      tabHiddenAtRef.current = 0
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [tenantId, fetchPermissions])

  // Handle stale detection from API responses (via custom event)
  // Debounced: if multiple stale events fire in quick succession, only handle once
  React.useEffect(() => {
    let staleTimeout: ReturnType<typeof setTimeout> | null = null

    const handleStale = () => {
      setIsStale(true)
      // Debounce: wait 1s before refreshing (in case multiple stale events fire)
      if (staleTimeout) clearTimeout(staleTimeout)
      staleTimeout = setTimeout(() => {
        refreshPermissions()
        staleTimeout = null
      }, 1000)
    }

    window.addEventListener('permission-stale', handleStale)
    return () => {
      window.removeEventListener('permission-stale', handleStale)
      if (staleTimeout) clearTimeout(staleTimeout)
    }
  }, [refreshPermissions])

  // Permission check functions
  const hasPermission = React.useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions]
  )

  const hasAnyPermission = React.useCallback(
    (perms: string[]) => perms.some((p) => permissions.includes(p)),
    [permissions]
  )

  const hasAllPermissions = React.useCallback(
    (perms: string[]) => perms.every((p) => permissions.includes(p)),
    [permissions]
  )

  const value = React.useMemo<PermissionContextValue>(
    () => ({
      permissions,
      version,
      isLoading,
      error,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      refreshPermissions,
      isStale,
    }),
    [
      permissions,
      version,
      isLoading,
      error,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      refreshPermissions,
      isStale,
    ]
  )

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to access permission context (throws if outside provider)
 */
export function usePermissions() {
  const context = React.useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

/**
 * Default context value for when outside PermissionProvider
 */
const defaultContextValue: PermissionContextValue = {
  permissions: [],
  version: 0,
  isLoading: false,
  error: null,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  refreshPermissions: async () => {},
  isStale: false,
}

/**
 * Safe hook that returns default value when outside provider
 * Use this in components that might be rendered outside PermissionProvider
 */
export function usePermissionsSafe(): PermissionContextValue {
  const context = React.useContext(PermissionContext)
  return context ?? defaultContextValue
}

// ============================================
// UTILITIES
// ============================================

/**
 * Dispatch a permission-stale event to trigger refresh
 * Call this from API interceptor when X-Permission-Stale header is detected
 */
export function dispatchPermissionStaleEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('permission-stale'))
  }
}

/**
 * Dispatch a permission-stale event on 403 Forbidden error
 * Call this from API interceptor when 403 error is received
 */
export function handleForbiddenError() {
  devLog.warn('[Permission] 403 Forbidden - triggering permission refresh')
  dispatchPermissionStaleEvent()
}
