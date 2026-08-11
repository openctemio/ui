/**
 * Tenant Modules API Hook
 *
 * SWR hook for fetching tenant's enabled modules.
 * Used for module-gated features (sidebar, route guards, feature toggles).
 *
 * Notification event types are NOT here: the server module-filters that catalog
 * itself and serves it from `GET /api/v1/me/event-types`
 * (see `useTenantEventTypes`). This response carried an `event_types` field that
 * the api never populated, so anything reading it got an empty list forever.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { get } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { devLog } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

/**
 * Release status for a module
 * - released: Module is fully available
 * - coming_soon: Module is planned, shown with "Soon" badge, disabled
 * - beta: Module is in beta, shown with "Beta" badge, usable
 * - deprecated: Module is being phased out
 * - disabled: Module is hidden from sidebar completely
 */
export type ReleaseStatus = 'released' | 'coming_soon' | 'beta' | 'deprecated' | 'disabled'

/**
 * Permission belonging to a module
 */
export interface ModulePermission {
  id: string // Permission ID like "iocs:read", "threat_intel:write"
  module_id: string // Module ID like "threat_intel", "assets"
  name: string // Human-readable name
  description?: string
}

/**
 * Licensing module from backend
 */
export interface LicensingModule {
  id: string
  slug: string
  name: string
  description?: string
  icon?: string
  category: string
  display_order: number
  is_active: boolean
  release_status: ReleaseStatus
  /** Parent module ID for sub-modules (e.g., "assets" for "assets.domains") */
  parent_module_id?: string
  /** Permissions that belong to this module - used for access control */
  permissions?: ModulePermission[]
}

/**
 * Response from tenant modules endpoint
 */
export interface TenantModulesResponse {
  module_ids: string[]
  modules: LicensingModule[]
  /** Sub-modules organized by parent module ID (e.g., "assets" -> [domains, certificates, ...]) */
  sub_modules?: Record<string, LicensingModule[]>
  coming_soon_module_ids?: string[]
  beta_module_ids?: string[]
}

// ============================================
// CONFIGURATION
// ============================================

const defaultConfig: SWRConfiguration = {
  // Revalidate on focus = true so the admin returning to the tab picks
  // up toggles made elsewhere. For cross-client realtime, the
  // WebSocket "module.updated" event calls mutate() directly and
  // bypasses this dedup window entirely.
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  // 5-min dedup — module state is low-frequency config, not live data.
  // Bounded by WebSocket push + revalidateOnFocus for freshness.
  dedupingInterval: 5 * 60 * 1000,
  onError: (error) => {
    // Don't log 404 errors - expected in OSS edition where modules API doesn't exist
    const is404 = error?.status === 404 || error?.message?.includes('404')
    if (!is404) {
      handleApiError(error, {
        showToast: false, // Silently fail - modules will default to empty
        logError: true,
      })
    }
  },
}

// ============================================
// HOOK
// ============================================

/**
 * Fetch tenant's enabled modules
 *
 * @returns Object with module IDs and module details
 *
 * @example
 * ```tsx
 * const { moduleIds, modules, isLoading } = useTenantModules();
 * ```
 */
export function useTenantModules() {
  const { data, error, isLoading, mutate } = useSWR<TenantModulesResponse>(
    '/api/v1/me/modules',
    async (url: string) => {
      try {
        return await get<TenantModulesResponse>(url)
      } catch (err: unknown) {
        // Return empty data for 404 (OSS edition without licensing API)
        // For other errors, still degrade gracefully but log for debugging
        const status = (err as { status?: number })?.status
        if (status && status !== 404) {
          devLog.warn('[useTenantModules] API error:', status)
        }
        return {
          module_ids: [],
          modules: [],
        }
      }
    },
    defaultConfig
  )

  return {
    /** Array of enabled module IDs (e.g., ['dashboard', 'assets', 'findings']) */
    moduleIds: data?.module_ids || [],
    /** Full module objects with details */
    modules: data?.modules || [],
    /** Sub-modules organized by parent module ID (e.g., "assets" -> [domains, certificates, ...]) */
    subModules: data?.sub_modules || {},
    /** Module IDs that are coming soon */
    comingSoonModuleIds: data?.coming_soon_module_ids || [],
    /** Module IDs that are in beta */
    betaModuleIds: data?.beta_module_ids || [],
    /** Loading state */
    isLoading,
    /** Error object if request failed */
    error,
    /** Refetch function */
    mutate,
  }
}

/**
 * Check if a specific module is enabled for the current tenant
 *
 * @param moduleId - The module ID to check (e.g., 'findings', 'scans')
 * @returns Object with hasModule boolean and loading state
 *
 * @example
 * ```tsx
 * const { hasModule, isLoading } = useHasModule('findings');
 * if (hasModule) {
 *   // Show findings-related features
 * }
 * ```
 */
export function useHasModule(moduleId: string) {
  const { moduleIds, isLoading } = useTenantModules()

  return {
    hasModule: moduleIds.includes(moduleId),
    isLoading,
  }
}

/**
 * Check whether a module is enabled for the current tenant, with fail-open.
 *
 * Returns a single boolean suitable for gating in-page features (tabs,
 * sections, widgets) and for building conditional SWR keys so a disabled
 * module's endpoint is never fetched (it would 403 with MODULE_NOT_ENABLED).
 *
 * Fail-open: when no module data is present (`moduleIds.length === 0`, e.g. the
 * OSS edition where the licensing API 404s), EVERYTHING is treated as enabled —
 * mirroring `ModuleGate`. This intentionally errs toward showing features when
 * the platform has no opinion about modules.
 *
 * @param moduleId - The module ID to check (e.g. 'branches', 'threat_intel')
 * @returns true when the module is enabled (or module data is absent)
 *
 * @example
 * ```tsx
 * const branchesEnabled = useModuleEnabled('branches')
 * const { data } = useRepositoryBranches(branchesEnabled ? repoId : null)
 * {branchesEnabled && <TabsTrigger value="branches">Branches</TabsTrigger>}
 * ```
 */
export function useModuleEnabled(moduleId: string): boolean {
  const { moduleIds } = useTenantModules()
  // Fail-open when the platform reports no modules (OSS edition / no licensing).
  return moduleIds.length === 0 || moduleIds.includes(moduleId)
}
