/**
 * Platform sensor API hooks: GET /api/v1/platform/stats (any member of the
 * organization; aggregate pool numbers plus this organization's queue).
 */

'use client'

import useSWR, { type SWRConfiguration, mutate } from 'swr'
import { get } from './client'
import { handleApiError } from './error-handler'
import { platformEndpoints } from './endpoints'
import type { PlatformStatsResponse } from './platform-types'

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  // Don't retry on client errors (4xx) - only retry on server/network errors
  shouldRetryOnError: (error) => {
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      return false
    }
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

export const platformKeys = {
  all: ['platform'] as const,
  stats: () => [...platformKeys.all, 'stats'] as const,
}

/** Invalidate all platform caches. */
export async function invalidatePlatformCache() {
  await mutate((key) => Array.isArray(key) && key[0] === 'platform', undefined, {
    revalidate: true,
  })
}

/** Invalidate the platform stats cache. */
export async function invalidatePlatformStatsCache() {
  await mutate(platformKeys.stats(), undefined, { revalidate: true })
}

/** GET /api/v1/platform/stats. */
export function usePlatformStats(config?: SWRConfiguration) {
  return useSWR<PlatformStatsResponse>(
    platformKeys.stats(),
    () => get<PlatformStatsResponse>(platformEndpoints.stats()),
    { ...defaultConfig, ...config }
  )
}

/**
 * Whether this installation has platform sensors, plus the raw stats. Read
 * the numbers through `summarizePlatformPool` (`@/features/platform`): the
 * field names overstate what they measure.
 */
export function usePlatformUsage(config?: SWRConfiguration) {
  const { data, isLoading, error } = usePlatformStats(config)
  return {
    /** The installation has at least one active platform sensor. */
    isEnabled: data?.enabled ?? false,
    data,
    isLoading,
    error,
  }
}
