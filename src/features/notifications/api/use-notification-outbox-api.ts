/**
 * Notification Outbox API Hooks
 *
 * SWR hooks for fetching and managing notification outbox entries.
 * All endpoints are tenant-scoped (tenant from JWT token).
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, del } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import type {
  OutboxEntry,
  OutboxStats,
  OutboxListResponse,
  OutboxListFilters,
} from '../types/notification-outbox.types'

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
// ENDPOINT BUILDERS
// ============================================

const BASE_URL = '/api/v1/notification-outbox'

function buildOutboxListEndpoint(filters?: OutboxListFilters): string {
  if (!filters) return BASE_URL

  const params = new URLSearchParams()

  if (filters.status) params.set('status', filters.status)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))

  const queryString = params.toString()
  return queryString ? `${BASE_URL}?${queryString}` : BASE_URL
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchOutboxList(url: string): Promise<OutboxListResponse> {
  return get<OutboxListResponse>(url)
}

async function fetchOutboxStats(url: string): Promise<OutboxStats> {
  return get<OutboxStats>(url)
}

async function fetchOutboxEntry(url: string): Promise<OutboxEntry> {
  return get<OutboxEntry>(url)
}

// ============================================
// LIST HOOKS
// ============================================

/**
 * Fetch notification outbox entries for current tenant
 *
 * @example
 * ```typescript
 * function OutboxList() {
 *   const { data, error, isLoading } = useNotificationOutboxApi({ status: 'failed' })
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error error={error} />
 *
 *   return (
 *     <ul>
 *       {data?.data.map(entry => (
 *         <li key={entry.id}>{entry.title}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useNotificationOutboxApi(filters?: OutboxListFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? buildOutboxListEndpoint(filters) : null

  return useSWR<OutboxListResponse>(key, fetchOutboxList, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch notification outbox statistics for current tenant
 */
export function useNotificationOutboxStatsApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? `${BASE_URL}/stats` : null

  return useSWR<OutboxStats>(key, fetchOutboxStats, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single outbox entry by ID
 */
export function useNotificationOutboxEntryApi(entryId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && entryId ? `${BASE_URL}/${entryId}` : null

  return useSWR<OutboxEntry>(key, fetchOutboxEntry, { ...defaultConfig, ...config })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Retry a failed/dead outbox entry
 */
export function useRetryOutboxEntryApi(entryId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && entryId ? `${BASE_URL}/${entryId}/retry` : null,
    async (url: string) => {
      return post<OutboxEntry>(url, {})
    }
  )
}

/**
 * Delete an outbox entry
 */
export function useDeleteOutboxEntryApi(entryId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && entryId ? `${BASE_URL}/${entryId}` : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate notification outbox cache
 */
export async function invalidateNotificationOutboxCache() {
  const { mutate } = await import('swr')
  await mutate(
    (key) => typeof key === 'string' && key.includes('/notification-outbox'),
    undefined,
    { revalidate: true }
  )
}

/**
 * Invalidate notification outbox stats cache
 */
export async function invalidateNotificationOutboxStatsCache() {
  const { mutate } = await import('swr')
  await mutate(
    (key) => typeof key === 'string' && key.includes('/notification-outbox/stats'),
    undefined,
    { revalidate: true }
  )
}
