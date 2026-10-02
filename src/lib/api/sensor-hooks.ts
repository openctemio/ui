/**
 * Sensor API Hooks
 *
 * SWR hooks for Sensor Management
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from './client'
import { handleApiError } from './error-handler'
import { useTenant } from '@/context/tenant-provider'
import { sensorEndpoints } from './endpoints'
import type {
  Sensor,
  SensorListResponse,
  SensorListFilters,
  CreateSensorRequest,
  CreateSensorResponse,
  UpdateSensorRequest,
  RegenerateAPIKeyResponse,
  AvailableCapabilitiesResponse,
} from './sensor-types'

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

export const sensorKeys = {
  all: ['sensors'] as const,
  lists: () => [...sensorKeys.all, 'list'] as const,
  list: (filters?: SensorListFilters) => [...sensorKeys.lists(), filters] as const,
  details: () => [...sensorKeys.all, 'detail'] as const,
  detail: (id: string) => [...sensorKeys.details(), id] as const,
  availableCapabilities: (includePlatform: boolean = true) =>
    [...sensorKeys.all, 'available-capabilities', includePlatform] as const,
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchSensors(url: string): Promise<SensorListResponse> {
  return get<SensorListResponse>(url)
}

async function fetchSensor(url: string): Promise<Sensor> {
  return get<Sensor>(url)
}

async function fetchAvailableCapabilities(url: string): Promise<AvailableCapabilitiesResponse> {
  return get<AvailableCapabilitiesResponse>(url)
}

// ============================================
// SENSOR HOOKS
// ============================================

/** The API's largest page (MaxPerPage). */
export const SENSOR_PAGE_SIZE = 100
/** Safety stop for fetchAllSensorPages: 5,000 sensors. */
const MAX_SENSOR_PAGES = 50

/**
 * Reads every page of GET /sensors. The sensors page groups, filters and
 * counts the whole fleet on the client (the state ladder depends on the
 * current time), and a fleet is small, so it loads all of it rather than
 * showing page 1 of a list the toolbar then filters. The page used to send
 * page_size, which the API ignores, so it only ever saw the first 20.
 */
export async function fetchAllSensorPages(
  getPage: (page: number) => Promise<SensorListResponse>
): Promise<SensorListResponse> {
  const items: Sensor[] = []
  let total = 0
  for (let page = 1; page <= MAX_SENSOR_PAGES; page++) {
    const res = await getPage(page)
    const batch = res.items ?? []
    items.push(...batch)
    total = res.total ?? items.length
    if (batch.length < SENSOR_PAGE_SIZE || items.length >= total) break
  }
  return { items, total: Math.max(total, items.length), page: 1, per_page: items.length }
}

/** Refresh interval for the live sensors view (list, stats and the open sensor). */
export const SENSOR_REFRESH_MS = 15_000

/**
 * The tenant's whole fleet (every page), refreshed every 15s while the tab
 * is visible.
 */
export function useAllSensors(config?: SWRConfiguration, enabled = true) {
  const { currentTenant } = useTenant()
  const key = currentTenant && enabled ? sensorEndpoints.list({ per_page: SENSOR_PAGE_SIZE }) : null
  return useSWR<SensorListResponse>(
    key,
    () =>
      fetchAllSensorPages((page) =>
        get<SensorListResponse>(sensorEndpoints.list({ per_page: SENSOR_PAGE_SIZE, page }))
      ),
    {
      ...defaultConfig,
      refreshInterval: SENSOR_REFRESH_MS,
      ...config,
    }
  )
}

/**
 * Fetch one page of sensors
 */
export function useSensors(filters?: SensorListFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? sensorEndpoints.list(filters) : null

  return useSWR<SensorListResponse>(key, fetchSensors, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Tenant-wide aggregated sensor stats from `/api/v1/sensors/stats`.
 *
 * Use this for the sensors page stat cards instead of computing
 * `sensors.filter(...).length` from a paginated list — that pattern undercounts
 * once a tenant has more than one page of sensors (the default page size is 20).
 *
 * This hook does NOT depend on filters/pagination so it stays stable when the
 * user filters the table by status / health / search.
 */
export interface TenantSensorStats {
  total: number
  by_status: Record<string, number>
  by_health: Record<string, number>
  by_type: Record<string, number>
  by_execution_mode: Record<string, number>
  active_jobs: number
  online_active: number
  // Fleet summary (newer APIs): the same population GET /sensors lists.
  by_state?: Record<string, number>
  by_version_status?: Record<string, number>
  needs_attention?: number
  can_take_jobs?: number
  jobs_running?: number
  job_slots?: number
  /** Release channel: "" when not configured. */
  latest_version?: string
  min_version?: string
  /** State ladder thresholds. */
  online_window_seconds?: number
  offline_after_seconds?: number
}

export function useTenantSensorStats(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant ? sensorEndpoints.tenantStats() : null
  return useSWR<TenantSensorStats>(key, (url: string) => get<TenantSensorStats>(url), {
    ...defaultConfig,
    dedupingInterval: 5000,
    refreshInterval: SENSOR_REFRESH_MS,
    ...config,
  })
}

/**
 * Fetch a single sensor by ID
 */
export function useSensor(sensorId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && sensorId ? sensorEndpoints.get(sensorId) : null

  return useSWR<Sensor>(key, fetchSensor, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch available capabilities for the current tenant.
 * Returns unique capability names from all sensors accessible to the tenant:
 * - Tenant's own sensors (active + online)
 * - Platform sensors (if includePlatform=true, which is default)
 *
 * Use case: Determine what capabilities a tenant can use based on their available sensors.
 * Example: If platform sensors have capabilities A, B, C and tenant adds a sensor with capability D,
 * the tenant will see they have access to capabilities A, B, C, D.
 *
 * @param includePlatform - Whether to include platform sensors' capabilities (default: true)
 * @param config - SWR configuration options
 */
export function useAvailableCapabilities(
  includePlatform: boolean = true,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? sensorEndpoints.availableCapabilities(includePlatform) : null

  return useSWR<AvailableCapabilitiesResponse>(key, fetchAvailableCapabilities, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================
//
// Hooks that act on one existing sensor take its id when they are
// triggered (`trigger(sensor.id)`), not when the hook is created. A row
// action sets the selection and triggers in the same handler, before React
// re-renders, so a hook bound to the selection would still point at the
// previous sensor (or at none at all).

/**
 * Create a new sensor
 */
export function useCreateSensor() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? sensorEndpoints.create() : null,
    async (url: string, { arg }: { arg: CreateSensorRequest }) => {
      return post<CreateSensorResponse>(url, arg)
    }
  )
}

/**
 * Update a sensor
 */
export function useUpdateSensor(sensorId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && sensorId ? sensorEndpoints.update(sensorId) : null,
    async (url: string, { arg }: { arg: UpdateSensorRequest }) => {
      return put<Sensor>(url, arg)
    }
  )
}

/**
 * Delete a sensor
 */
export function useDeleteSensor() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? 'sensor-delete' : null,
    async (_key: string, { arg: sensorId }: { arg: string }) => {
      return del<void>(sensorEndpoints.delete(sensorId))
    }
  )
}

/**
 * Delete multiple sensors (bulk delete)
 */
export function useBulkDeleteSensors() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? 'bulk-delete-sensors' : null,
    async (_key: string, { arg: sensorIds }: { arg: string[] }) => {
      // Delete sensors sequentially to avoid overwhelming the server
      const results: { id: string; success: boolean; error?: string }[] = []

      for (const id of sensorIds) {
        try {
          await del<void>(sensorEndpoints.delete(id))
          results.push({ id, success: true })
        } catch (error) {
          results.push({
            id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return results
    }
  )
}

/**
 * Regenerate sensor API key
 */
export function useRegenerateSensorKey() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? 'sensor-regenerate-key' : null,
    async (_key: string, { arg: sensorId }: { arg: string }) => {
      return post<RegenerateAPIKeyResponse>(sensorEndpoints.regenerateKey(sensorId), {})
    },
    {
      // Don't revalidate other SWR hooks after mutation
      // We'll manually invalidate when user closes the dialog
      revalidate: false,
      populateCache: false,
    }
  )
}

/**
 * Activate a sensor (set status to active)
 */
export function useActivateSensor() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? 'sensor-activate' : null,
    async (_key: string, { arg: sensorId }: { arg: string }) => {
      return post<Sensor>(sensorEndpoints.activate(sensorId), {})
    }
  )
}

/**
 * Deactivate a sensor (set status to disabled)
 */
export function useDeactivateSensor() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? 'sensor-deactivate' : null,
    async (_key: string, { arg: sensorId }: { arg: string }) => {
      return post<Sensor>(sensorEndpoints.deactivate(sensorId), {})
    }
  )
}

/**
 * Revoke a sensor (permanently revoke access)
 */
export function useRevokeSensor() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? 'sensor-revoke' : null,
    async (_key: string, { arg: sensorId }: { arg: string }) => {
      return post<Sensor>(sensorEndpoints.revoke(sensorId), {})
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate sensors cache
 */
export async function invalidateSensorsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/api/v1/sensors'), undefined, {
    revalidate: true,
  })
}
