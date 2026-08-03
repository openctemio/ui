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
import { ServerCrash, Loader2 } from 'lucide-react'
import { get } from '@/lib/api/client'
import { devLog } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { useTenant } from './tenant-provider'
import type { TenantModulesResponse } from '@/features/integrations/api/use-tenant-modules'
import type { RiskLevelThresholds } from '@/features/shared/types/common.types'

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
  risk_levels?: RiskLevelThresholds
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
  // Start with isLoading = true always to prevent flash of error/access-denied
  // during the initial bootstrap fetch. It will be set to false once bootstrap
  // completes or when there's no tenantId to bootstrap.
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)
  const [isBootstrapped, setIsBootstrapped] = React.useState(false)
  const [fetchedTenantId, setFetchedTenantId] = React.useState<string | null>(null)

  // Track previous tenant to detect switches
  const previousTenantIdRef = React.useRef<string | null>(null)

  // Fetch bootstrap data — retries once on first failure (typically a token-refresh
  // race right after login/select-tenant). Uses a non-recursive for-loop so the
  // callback never references itself by name (React Compiler TDZ rule).
  const fetchBootstrap = React.useCallback(async () => {
    if (!tenantId) {
      setData(null)
      setIsBootstrapped(false)
      setFetchedTenantId(null)
      return
    }

    setIsLoading(true)
    setError(null)

    const maxAttempts = 2
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await get<BootstrapData>('/api/v1/me/bootstrap')

        // Prevent race conditions: ignore response if tenant changed while fetching
        if (previousTenantIdRef.current !== tenantId) return

        setData(result)
        setFetchedTenantId(tenantId)
        setIsBootstrapped(true)

        devLog.log('[BootstrapProvider] Fetched bootstrap data', {
          permissions: result.permissions?.list?.length,
          hasModules: !!result.modules,
        })
        if (previousTenantIdRef.current === tenantId) {
          setIsLoading(false)
        }
        return
      } catch (err) {
        if (previousTenantIdRef.current !== tenantId) return

        devLog.error('[BootstrapProvider] Failed to fetch bootstrap:', err)

        if (attempt < maxAttempts) {
          devLog.log('[BootstrapProvider] Retrying bootstrap fetch...')
          // Wait briefly for token refresh to settle
          await new Promise((resolve) => setTimeout(resolve, 1500))
          if (previousTenantIdRef.current !== tenantId) return
          continue
        }

        setError(err instanceof Error ? err : new Error('Failed to fetch bootstrap'))
        // Minimal data on final failure so the app can still function
        setData({ permissions: { list: [], version: 0 } })
        setFetchedTenantId(tenantId)
        setIsBootstrapped(true) // mark bootstrapped even on error to stop infinite retry
        if (previousTenantIdRef.current === tenantId) {
          setIsLoading(false)
        }
      }
    }
  }, [tenantId])

  // Refs sync with state for the stale-data guard below — kept off the main effect's
  // dep array so it doesn't re-fire when fetchedTenantId/isBootstrapped change. Refs
  // assigned inside dedicated effects (React Compiler refs rule).
  const fetchedTenantIdRef = React.useRef<string | null>(fetchedTenantId)
  React.useEffect(() => {
    fetchedTenantIdRef.current = fetchedTenantId
  }, [fetchedTenantId])

  const isBootstrappedRef = React.useRef(isBootstrapped)
  React.useEffect(() => {
    isBootstrappedRef.current = isBootstrapped
  }, [isBootstrapped])

  // Fetch on tenant change
  React.useEffect(() => {
    if (!tenantId) {
      // Don't reset if we previously had a tenant OR if we already have data.
      // This handles transient null during component remount / forward navigation
      // where TenantProvider hasn't set currentTenant from cookie yet.
      if (previousTenantIdRef.current || isBootstrappedRef.current || fetchedTenantIdRef.current) {
        return
      }
      setData(null)
      setIsBootstrapped(false)
      setFetchedTenantId(null)
      setIsLoading(false)
      previousTenantIdRef.current = null
      return
    }

    // Skip if same tenant (already fetched or fetching)
    if (previousTenantIdRef.current === tenantId) {
      return
    }

    // Reset bootstrap state IMMEDIATELY when tenant changes
    // This prevents RouteGuard from evaluating stale permissions/modules
    // while the new tenant's data is being fetched
    setIsBootstrapped(false)
    setIsLoading(true)
    previousTenantIdRef.current = tenantId
    fetchBootstrap()
  }, [tenantId, fetchBootstrap])

  // Refresh function
  const refresh = React.useCallback(async () => {
    await fetchBootstrap()
  }, [fetchBootstrap])

  const value = React.useMemo<BootstrapContextValue>(() => {
    // Synchronize context instantly with currentTenant to prevent stale data
    // leaking during the React render cycle before useEffect runs.
    const isStale = tenantId ? fetchedTenantId !== tenantId : false

    return {
      data: isStale ? null : data,
      isLoading: isLoading || isStale,
      error: isStale ? null : error,
      isBootstrapped: isStale ? false : isBootstrapped,
      refresh,
    }
  }, [data, isLoading, error, isBootstrapped, fetchedTenantId, tenantId, refresh])

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>
}

// ============================================
// GATE
// ============================================

/**
 * Full-screen "can't reach the server" state with a Retry button.
 *
 * Why this exists: when /me/bootstrap fails (server 5xx / network / API down),
 * the provider degrades to EMPTY permissions. Without this gate every route
 * then renders "Access Denied — missing permission", which is a lie: the real
 * problem is the backend, not the user's roles. (This masqueraded as a
 * permissions bug during a real outage.) The gate turns a backend failure into
 * an honest, actionable message.
 */
function ConnectionErrorScreen({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-destructive/10 text-destructive flex h-14 w-14 items-center justify-center rounded-full">
        <ServerCrash className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Can’t reach the server</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          We couldn’t load your workspace. This is usually a temporary connection or server issue —
          not a problem with your account.
        </p>
      </div>
      <Button onClick={onRetry} disabled={retrying}>
        {retrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {retrying ? 'Retrying…' : 'Retry'}
      </Button>
    </div>
  )
}

/**
 * Blocks the app shell when bootstrap has definitively failed, so a backend
 * outage never surfaces as a permissions error. A successful-but-empty
 * permission set is NOT an error and passes through untouched.
 */
export function BootstrapGate({ children }: { children: React.ReactNode }) {
  const { error, isBootstrapped, isLoading, refresh } = useBootstrapContext()
  const [retrying, setRetrying] = React.useState(false)

  if (error && isBootstrapped && !isLoading) {
    return (
      <ConnectionErrorScreen
        retrying={retrying}
        onRetry={async () => {
          setRetrying(true)
          try {
            await refresh()
          } finally {
            setRetrying(false)
          }
        }}
      />
    )
  }
  return <>{children}</>
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
    // No eventTypes here: the bootstrap payload declared an `event_types` field
    // the api never populated, so this was always []. The notification
    // event-type catalog comes from `useTenantEventTypes()`.
    comingSoonModuleIds: data?.modules?.coming_soon_module_ids || [],
    betaModuleIds: data?.modules?.beta_module_ids || [],
    hasModule,
    isLoading,
  }
}

/**
 * Get risk level thresholds from bootstrap
 */
export function useBootstrapRiskLevels() {
  const { data, isLoading } = useBootstrapContext()

  return {
    riskLevels: data?.risk_levels || null,
    isLoading,
  }
}

// NOTE: useBootstrapDashboard has been removed.
// Dashboard stats should be fetched separately via useDashboardStats() hook
// to reduce initial bootstrap query load.
