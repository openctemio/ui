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
  SensorSession,
  SensorSessionListResponse,
  SensorSessionStats,
  SensorDailyStats,
  SensorDailyStatsListResponse,
  SensorSessionListFilters,
  SensorDailyStatsListFilters,
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

// For endpoints where a 404 means "no data yet" (a fresh or idle sensor has no
// sessions/stats/analytics). Surfacing that as a "Not Found" toast is wrong —
// it's a normal empty state the UI already renders. Toast only non-404 errors.
const suppress404OnError: SWRConfiguration['onError'] = (error) => {
  if (error?.statusCode !== 404) {
    handleApiError(error, { showToast: true, logError: true })
  }
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
  // Analytics keys
  sessions: (id: string) => [...sensorKeys.detail(id), 'sessions'] as const,
  sessionsList: (id: string, filters?: SensorSessionListFilters) =>
    [...sensorKeys.sessions(id), 'list', filters] as const,
  activeSession: (id: string) => [...sensorKeys.sessions(id), 'active'] as const,
  sessionStats: (id: string, filters?: { started_at?: string; ended_at?: string }) =>
    [...sensorKeys.sessions(id), 'stats', filters] as const,
  dailyStats: (id: string, filters?: SensorDailyStatsListFilters) =>
    [...sensorKeys.detail(id), 'daily-stats', filters] as const,
  timeSeries: (id: string, filters?: { from?: string; to?: string }) =>
    [...sensorKeys.detail(id), 'timeseries', filters] as const,
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

async function fetchSensorSessions(url: string): Promise<SensorSessionListResponse> {
  return get<SensorSessionListResponse>(url)
}

async function fetchActiveSession(url: string): Promise<SensorSession> {
  return get<SensorSession>(url)
}

async function fetchSessionStats(url: string): Promise<SensorSessionStats> {
  return get<SensorSessionStats>(url)
}

async function fetchDailyStats(url: string): Promise<SensorDailyStatsListResponse> {
  return get<SensorDailyStatsListResponse>(url)
}

async function fetchTimeSeries(url: string): Promise<SensorDailyStats[]> {
  return get<SensorDailyStats[]>(url)
}

// ============================================
// WORKER HOOKS
// ============================================

/**
 * Fetch sensors list
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
}

export function useTenantSensorStats(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant ? sensorEndpoints.tenantStats() : null
  return useSWR<TenantSensorStats>(key, (url: string) => get<TenantSensorStats>(url), {
    ...defaultConfig,
    dedupingInterval: 30000,
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
// ANALYTICS HOOKS
// ============================================

/**
 * Fetch sensor sessions list
 */
export function useSensorSessions(
  sensorId: string | null,
  filters?: SensorSessionListFilters,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key = currentTenant && sensorId ? sensorEndpoints.listSessions(sensorId, filters) : null

  return useSWR<SensorSessionListResponse>(key, fetchSensorSessions, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch active session for a sensor
 */
export function useActiveSensorSession(sensorId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && sensorId ? sensorEndpoints.getActiveSession(sensorId) : null

  return useSWR<SensorSession | null>(key, fetchActiveSession, {
    ...defaultConfig,
    onError: suppress404OnError, // no active session (404) is a normal state
    ...config,
  })
}

/**
 * Fetch session stats for a sensor
 */
export function useSensorSessionStats(
  sensorId: string | null,
  filters?: { started_at?: string; ended_at?: string },
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key = currentTenant && sensorId ? sensorEndpoints.getSessionStats(sensorId, filters) : null

  return useSWR<SensorSessionStats>(key, fetchSessionStats, {
    ...defaultConfig,
    onError: suppress404OnError, // a fresh/idle sensor has no stats yet (404)
    ...config,
  })
}

/**
 * Fetch daily stats for a sensor
 */
export function useSensorDailyStats(
  sensorId: string | null,
  filters?: SensorDailyStatsListFilters,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key = currentTenant && sensorId ? sensorEndpoints.listDailyStats(sensorId, filters) : null

  return useSWR<SensorDailyStatsListResponse>(key, fetchDailyStats, {
    ...defaultConfig,
    onError: suppress404OnError, // a fresh/idle sensor has no daily stats yet (404)
    ...config,
  })
}

/**
 * Fetch time series data for a sensor
 */
export function useSensorTimeSeries(
  sensorId: string | null,
  filters?: { from?: string; to?: string },
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key = currentTenant && sensorId ? sensorEndpoints.getTimeSeries(sensorId, filters) : null

  return useSWR<SensorDailyStats[]>(key, fetchTimeSeries, {
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
