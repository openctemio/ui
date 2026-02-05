/**
 * Platform Agent API Hooks
 *
 * SWR hooks for Tiered Platform Agents feature
 *
 * NOTE: Platform Stats API is not yet implemented on backend.
 * Set PLATFORM_STATS_ENABLED to true when backend endpoint is ready.
 */

'use client'

import useSWR, { type SWRConfiguration, mutate } from 'swr'
import { get } from './client'
import { handleApiError } from './error-handler'
import { platformEndpoints } from './endpoints'
import type {
  PlatformStatsResponse,
  PlatformAgentListResponse,
  PlatformAgentListFilters,
  PlatformAgentTier,
} from './platform-types'

// ============================================
// FEATURE FLAG
// ============================================

/**
 * Feature flag for platform stats API
 * Set to true when GET /api/v1/platform/stats is implemented on backend
 * TODO: Remove this flag after backend implementation
 */
const PLATFORM_STATS_ENABLED = false

// ============================================
// SWR CONFIGURATION
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  // Don't retry on client errors (4xx) - only retry on server/network errors
  shouldRetryOnError: (error) => {
    // Don't retry on 4xx errors (client errors like 403, 404, etc.)
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      return false
    }
    // Retry on 5xx or network errors
    return true
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
  onError: (error) => {
    handleApiError(error, {
      showToast: true,
      logError: true,
    })
  },
}

// ============================================
// CACHE KEYS
// ============================================

export const platformKeys = {
  all: ['platform'] as const,
  stats: () => [...platformKeys.all, 'stats'] as const,
  agents: () => [...platformKeys.all, 'agents'] as const,
  agentList: (filters?: PlatformAgentListFilters) =>
    [...platformKeys.agents(), 'list', filters] as const,
}

// ============================================
// CACHE INVALIDATION
// ============================================

/**
 * Invalidate all platform caches
 */
export async function invalidatePlatformCache() {
  await mutate((key) => Array.isArray(key) && key[0] === 'platform', undefined, {
    revalidate: true,
  })
}

/**
 * Invalidate platform stats cache
 */
export async function invalidatePlatformStatsCache() {
  await mutate(platformKeys.stats(), undefined, { revalidate: true })
}

// ============================================
// READ HOOKS
// ============================================

/**
 * Fetch platform agent stats
 * Returns tier stats, usage limits, and available slots
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = usePlatformStats();
 *
 * if (data?.enabled) {
 *   console.log(`Using ${data.current_active}/${data.max_concurrent} slots`);
 *   console.log(`Max tier: ${data.max_tier}`);
 * }
 * ```
 */
export function usePlatformStats(config?: SWRConfiguration) {
  return useSWR<PlatformStatsResponse>(
    // Return null key to disable fetching when feature is not enabled
    PLATFORM_STATS_ENABLED ? platformKeys.stats() : null,
    () => get<PlatformStatsResponse>(platformEndpoints.stats()),
    { ...defaultConfig, ...config }
  )
}

/**
 * Fetch platform agents list
 * Can filter by tier, status, health
 *
 * @example
 * ```tsx
 * const { data } = usePlatformAgents({ tier: 'dedicated', health: 'online' });
 * ```
 */
export function usePlatformAgents(filters?: PlatformAgentListFilters, config?: SWRConfiguration) {
  return useSWR<PlatformAgentListResponse>(
    // Return null key to disable fetching when feature is not enabled
    PLATFORM_STATS_ENABLED ? platformKeys.agentList(filters) : null,
    () => get<PlatformAgentListResponse>(platformEndpoints.agents(filters)),
    { ...defaultConfig, ...config }
  )
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook to check if platform agents are enabled and get usage info
 *
 * @example
 * ```tsx
 * const { isEnabled, maxTier, usagePercent, availableSlots } = usePlatformUsage();
 *
 * if (!isEnabled) {
 *   return <UpgradePrompt />;
 * }
 * ```
 */
export function usePlatformUsage(config?: SWRConfiguration) {
  const { data, isLoading, error } = usePlatformStats(config)

  return {
    /** Whether platform agents are enabled for this tenant */
    isEnabled: data?.enabled ?? false,
    /** Maximum tier accessible to this tenant */
    maxTier: data?.max_tier as PlatformAgentTier | undefined,
    /** Accessible tiers based on plan */
    accessibleTiers: data?.accessible_tiers ?? [],
    /** Maximum concurrent jobs allowed */
    maxConcurrent: data?.max_concurrent ?? 0,
    /** Maximum queued jobs allowed */
    maxQueued: data?.max_queued ?? 0,
    /** Currently active jobs */
    currentActive: data?.current_active ?? 0,
    /** Currently queued jobs */
    currentQueued: data?.current_queued ?? 0,
    /** Available slots for new jobs */
    availableSlots: data?.available_slots ?? 0,
    /** Usage percentage (active / max) */
    usagePercent:
      data?.max_concurrent && data.max_concurrent > 0
        ? Math.round((data.current_active / data.max_concurrent) * 100)
        : 0,
    /** Queue usage percentage */
    queuePercent:
      data?.max_queued && data.max_queued > 0
        ? Math.round((data.current_queued / data.max_queued) * 100)
        : 0,
    /** Tier-specific stats */
    tierStats: data?.tier_stats,
    /** Raw stats data */
    data,
    /** Loading state */
    isLoading,
    /** Error state */
    error,
  }
}
