'use client'

/**
 * SWR Global Configuration
 *
 * Provides optimized default configuration for all SWR hooks in the application.
 * This ensures consistent behavior across all data fetching operations.
 *
 * Key optimizations:
 * - Deduplication: Prevents duplicate requests within 2 seconds
 * - Smart revalidation: Disable on focus, enable on reconnect
 * - Error retry: Only retry on server/network errors, not client errors (4xx)
 * - Keep previous data: Show stale data while revalidating for better UX
 */

import { SWRConfig, type SWRConfiguration } from 'swr'
import { type ReactNode } from 'react'

/**
 * Default SWR configuration for the entire application
 */
export const swrDefaultConfig: SWRConfiguration = {
  // Deduplication: Prevent duplicate requests within 2 seconds
  dedupingInterval: 2000,

  // Revalidation settings
  revalidateOnFocus: false, // Don't refetch when window regains focus
  revalidateOnReconnect: true, // Refetch when network reconnects
  revalidateIfStale: true, // Revalidate if data is stale

  // Keep previous data while revalidating for smoother UX
  keepPreviousData: true,

  // Error retry configuration
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  shouldRetryOnError: (error: unknown) => {
    // Don't retry on client errors (4xx) - these are expected errors
    const statusCode = (error as { statusCode?: number })?.statusCode
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return false
    }
    // Retry on server errors (5xx) or network errors
    return true
  },

  // Loading state configuration
  // suspense: false, // Don't use React Suspense by default
  // fallbackData: undefined, // No fallback data by default

  // Performance optimizations
  // focusThrottleInterval: 5000, // Throttle focus revalidation
  // loadingTimeout: 3000, // Show loading state after 3s
}

interface SWRProviderProps {
  children: ReactNode
  config?: SWRConfiguration
}

/**
 * SWR Provider component
 *
 * Wraps the application with SWR's global configuration.
 * Can be customized per-subtree if needed.
 *
 * @example
 * ```tsx
 * // In providers.tsx
 * <SWRProvider>
 *   {children}
 * </SWRProvider>
 *
 * // With custom config
 * <SWRProvider config={{ refreshInterval: 5000 }}>
 *   {children}
 * </SWRProvider>
 * ```
 */
export function SWRProvider({ children, config }: SWRProviderProps) {
  return <SWRConfig value={{ ...swrDefaultConfig, ...config }}>{children}</SWRConfig>
}

export default SWRProvider
