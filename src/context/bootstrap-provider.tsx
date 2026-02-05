/**
 * Bootstrap Provider
 *
 * Fetches all initial data needed after login in a single API call.
 * This reduces API calls from 4+ to 1, improving initial load time.
 *
 * The provider fetches:
 * - permissions: User permissions (used by PermissionProvider)
 * - subscription: Tenant subscription data
 * - modules: Tenant enabled modules
 * - dashboard: Dashboard statistics (if user has permission)
 *
 * Other providers and hooks can read from this context to avoid duplicate fetches.
 */

'use client'

import * as React from 'react'
import { get } from '@/lib/api/client'
import { useTenant } from './tenant-provider'
import type { TenantModulesResponse } from '@/features/integrations/api/use-tenant-modules'

// ============================================
// TYPES
// ============================================

export interface BootstrapPermissions {
  list: string[]
  version: number
}

// NOTE: Dashboard stats are NOT included in bootstrap to reduce query load.
// Dashboard should be fetched separately via /api/v1/dashboard/stats when needed.
export interface BootstrapData {
  permissions: BootstrapPermissions
  modules?: TenantModulesResponse
}

export interface BootstrapContextValue {
  /** Full bootstrap data */
  data: BootstrapData | null
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Whether bootstrap has been fetched at least once */
  isBootstrapped: boolean
  /** Refresh bootstrap data */
  refresh: () => Promise<void>
}

// ============================================
// CONTEXT
// ============================================

const BootstrapContext = React.createContext<BootstrapContextValue | null>(null)

// ============================================
// PROVIDER
// ============================================

interface BootstrapProviderProps {
  children: React.ReactNode
}

export function BootstrapProvider({ children }: BootstrapProviderProps) {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id

  const [data, setData] = React.useState<BootstrapData | null>(null)
  // Start with isLoading = true if we have a tenantId to bootstrap
  // This prevents other providers from thinking bootstrap is done when it hasn't started
  const [isLoading, setIsLoading] = React.useState(!!tenantId)
  const [error, setError] = React.useState<Error | null>(null)
  const [isBootstrapped, setIsBootstrapped] = React.useState(false)

  // Track previous tenant to detect switches
  const previousTenantIdRef = React.useRef<string | null>(null)

  // Fetch bootstrap data
  const fetchBootstrap = React.useCallback(async () => {
    if (!tenantId) {
      setData(null)
      setIsBootstrapped(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await get<BootstrapData>('/api/v1/me/bootstrap')
      setData(result)
      setIsBootstrapped(true)

      if (process.env.NODE_ENV === 'development') {
        console.log('[BootstrapProvider] Fetched bootstrap data', {
          permissions: result.permissions?.list?.length,
          hasModules: !!result.modules,
        })
      }
    } catch (err) {
      console.error('[BootstrapProvider] Failed to fetch bootstrap:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch bootstrap'))
      // Set minimal data on error so the app can still function
      setData({ permissions: { list: [], version: 0 } })
      setIsBootstrapped(true) // Mark as bootstrapped even on error to prevent infinite retry
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  // Fetch on tenant change
  React.useEffect(() => {
    if (!tenantId) {
      setData(null)
      setIsBootstrapped(false)
      setIsLoading(false)
      previousTenantIdRef.current = null
      return
    }

    // Skip if same tenant and already bootstrapped
    if (previousTenantIdRef.current === tenantId && isBootstrapped) {
      return
    }

    // Set loading to true IMMEDIATELY when tenant is available
    // This prevents other providers from making duplicate API calls
    // before bootstrap has a chance to fetch
    setIsLoading(true)
    previousTenantIdRef.current = tenantId
    fetchBootstrap()
  }, [tenantId, isBootstrapped, fetchBootstrap])

  // Refresh function
  const refresh = React.useCallback(async () => {
    await fetchBootstrap()
  }, [fetchBootstrap])

  const value = React.useMemo<BootstrapContextValue>(
    () => ({
      data,
      isLoading,
      error,
      isBootstrapped,
      refresh,
    }),
    [data, isLoading, error, isBootstrapped, refresh]
  )

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to access bootstrap context (throws if outside provider)
 */
export function useBootstrapContext() {
  const context = React.useContext(BootstrapContext)
  if (!context) {
    throw new Error('useBootstrapContext must be used within a BootstrapProvider')
  }
  return context
}

/**
 * Default context value for when outside BootstrapProvider
 */
const defaultContextValue: BootstrapContextValue = {
  data: null,
  isLoading: false,
  error: null,
  isBootstrapped: false,
  refresh: async () => {},
}

/**
 * Safe hook that returns default value when outside provider
 */
export function useBootstrapContextSafe(): BootstrapContextValue {
  const context = React.useContext(BootstrapContext)
  return context ?? defaultContextValue
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Get permissions from bootstrap
 */
export function useBootstrapPermissions() {
  const { data, isLoading, isBootstrapped } = useBootstrapContext()

  return {
    permissions: data?.permissions?.list || [],
    version: data?.permissions?.version || 0,
    isLoading,
    isBootstrapped,
  }
}

/**
 * Get modules from bootstrap
 */
export function useBootstrapModules() {
  const { data, isLoading } = useBootstrapContext()

  const hasModule = React.useCallback(
    (moduleId: string) => data?.modules?.module_ids?.includes(moduleId) || false,
    [data?.modules?.module_ids]
  )

  return {
    moduleIds: data?.modules?.module_ids || [],
    modules: data?.modules?.modules || [],
    eventTypes: data?.modules?.event_types || [],
    comingSoonModuleIds: data?.modules?.coming_soon_module_ids || [],
    betaModuleIds: data?.modules?.beta_module_ids || [],
    hasModule,
    isLoading,
  }
}

// NOTE: useBootstrapDashboard has been removed.
// Dashboard stats should be fetched separately via useDashboardStats() hook
// to reduce initial bootstrap query load.
