/**
 * Tenant Modules API Hook
 *
 * SWR hook for fetching tenant's enabled modules based on their subscription plan.
 * Used for filtering available event types in notification channels and other
 * module-gated features.
 *
 * The endpoint returns modules enabled for the current tenant, including
 * the event types that map to each module.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { get } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import type { NotificationEventType } from '../types/integration.types'

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
  event_types?: string[]
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
  event_types?: NotificationEventType[]
  coming_soon_module_ids?: string[]
  beta_module_ids?: string[]
}

// ============================================
// CONFIGURATION
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000, // Cache for 1 minute
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
 * Fetch tenant's enabled modules based on their subscription plan
 *
 * @returns Object with module IDs, module details, and available event types
 *
 * @example
 * ```tsx
 * const { moduleIds, modules, eventTypes, isLoading } = useTenantModules();
 *
 * // Filter event types based on enabled modules
 * const availableEventTypes = getAvailableEventTypes(moduleIds);
 * ```
 */
export function useTenantModules() {
  const { data, error, isLoading, mutate } = useSWR<TenantModulesResponse>(
    '/api/v1/me/modules',
    async (url: string) => {
      try {
        return await get<TenantModulesResponse>(url)
      } catch {
        // Return empty data if endpoint not available
        // This allows the UI to gracefully degrade
        return {
          module_ids: [],
          modules: [],
          event_types: [],
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
    /** Pre-computed available event types for this tenant */
    eventTypes: data?.event_types || [],
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
