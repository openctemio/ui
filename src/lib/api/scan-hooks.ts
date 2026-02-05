/**
 * Scan Configuration API Hooks
 *
 * SWR hooks for Scan Configuration Management
 * Part of the Scan Management feature.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from './client'
import { handleApiError } from './error-handler'
import { useTenant } from '@/context/tenant-provider'
import { scanEndpoints } from './endpoints'
import type {
  ScanConfig,
  ScanConfigListResponse,
  ScanConfigListFilters,
  ScanConfigStatsData,
  CreateScanConfigRequest,
  UpdateScanConfigRequest,
  TriggerScanRequest,
  CloneScanConfigRequest,
  BulkActionRequest,
  BulkActionResponse,
  PipelineRun,
  PipelineRunWithFiltering,
  ScanSession,
  ScanSessionListResponse,
} from './scan-types'

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

export const scanConfigKeys = {
  all: ['scan-configs'] as const,
  lists: () => [...scanConfigKeys.all, 'list'] as const,
  list: (filters?: ScanConfigListFilters) => [...scanConfigKeys.lists(), filters] as const,
  details: () => [...scanConfigKeys.all, 'detail'] as const,
  detail: (id: string) => [...scanConfigKeys.details(), id] as const,
  stats: () => [...scanConfigKeys.all, 'stats'] as const,
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchScanConfigs(url: string): Promise<ScanConfigListResponse> {
  return get<ScanConfigListResponse>(url)
}

async function fetchScanConfig(url: string): Promise<ScanConfig> {
  return get<ScanConfig>(url)
}

async function fetchScanConfigStats(url: string): Promise<ScanConfigStatsData> {
  return get<ScanConfigStatsData>(url)
}

// ============================================
// READ HOOKS
// ============================================

/**
 * Fetch scan configs list
 */
export function useScanConfigs(filters?: ScanConfigListFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? scanEndpoints.list(filters) : null

  return useSWR<ScanConfigListResponse>(key, fetchScanConfigs, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single scan config by ID
 */
export function useScanConfig(configId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && configId ? scanEndpoints.get(configId) : null

  return useSWR<ScanConfig>(key, fetchScanConfig, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch scan config stats
 */
export function useScanConfigStats(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? scanEndpoints.stats() : null

  return useSWR<ScanConfigStatsData>(key, fetchScanConfigStats, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new scan config
 */
export function useCreateScanConfig() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? scanEndpoints.create() : null,
    async (url: string, { arg }: { arg: CreateScanConfigRequest }) => {
      return post<ScanConfig>(url, arg)
    }
  )
}

/**
 * Update a scan config
 */
export function useUpdateScanConfig(configId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && configId ? scanEndpoints.update(configId) : null,
    async (url: string, { arg }: { arg: UpdateScanConfigRequest }) => {
      return put<ScanConfig>(url, arg)
    }
  )
}

/**
 * Delete a scan config
 */
export function useDeleteScanConfig(configId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && configId ? scanEndpoints.delete(configId) : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

// ============================================
// STATUS HOOKS
// ============================================

/**
 * Activate a scan config
 */
export function useActivateScanConfig(configId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && configId ? scanEndpoints.activate(configId) : null,
    async (url: string) => {
      return post<ScanConfig>(url, {})
    }
  )
}

/**
 * Pause a scan config
 */
export function usePauseScanConfig(configId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && configId ? scanEndpoints.pause(configId) : null,
    async (url: string) => {
      return post<ScanConfig>(url, {})
    }
  )
}

/**
 * Disable a scan config
 */
export function useDisableScanConfig(configId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && configId ? scanEndpoints.disable(configId) : null,
    async (url: string) => {
      return post<ScanConfig>(url, {})
    }
  )
}

// ============================================
// TRIGGER HOOKS
// ============================================

/**
 * Trigger scan execution
 * Returns PipelineRunWithFiltering which includes filtering_result for smart filtering
 */
export function useTriggerScan(configId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && configId ? scanEndpoints.trigger(configId) : null,
    async (url: string, { arg }: { arg?: TriggerScanRequest }) => {
      return post<PipelineRunWithFiltering>(url, arg || {})
    }
  )
}

/**
 * Clone a scan config
 */
export function useCloneScanConfig(configId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && configId ? scanEndpoints.clone(configId) : null,
    async (url: string, { arg }: { arg: CloneScanConfigRequest }) => {
      return post<ScanConfig>(url, arg)
    }
  )
}

// ============================================
// BULK OPERATION HOOKS
// ============================================

/**
 * Bulk activate scan configs
 */
export function useBulkActivateScanConfigs() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? scanEndpoints.bulkActivate() : null,
    async (url: string, { arg }: { arg: BulkActionRequest }) => {
      return post<BulkActionResponse>(url, arg)
    }
  )
}

/**
 * Bulk pause scan configs
 */
export function useBulkPauseScanConfigs() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? scanEndpoints.bulkPause() : null,
    async (url: string, { arg }: { arg: BulkActionRequest }) => {
      return post<BulkActionResponse>(url, arg)
    }
  )
}

/**
 * Bulk disable scan configs
 */
export function useBulkDisableScanConfigs() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? scanEndpoints.bulkDisable() : null,
    async (url: string, { arg }: { arg: BulkActionRequest }) => {
      return post<BulkActionResponse>(url, arg)
    }
  )
}

/**
 * Bulk delete scan configs
 */
export function useBulkDeleteScanConfigs() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? scanEndpoints.bulkDelete() : null,
    async (url: string, { arg }: { arg: BulkActionRequest }) => {
      return post<BulkActionResponse>(url, arg)
    }
  )
}

// ============================================
// SCAN SESSIONS HOOKS (Real API)
// ============================================

async function fetchScanSessions(url: string): Promise<ScanSessionListResponse> {
  return get<ScanSessionListResponse>(url)
}

async function fetchScanSession(url: string): Promise<ScanSession> {
  return get<ScanSession>(url)
}

export interface ScanSessionListFilters {
  scanner_name?: string
  asset_type?: string
  asset_value?: string
  branch?: string
  status?: string
  page?: number
  per_page?: number
}

/**
 * Fetch all scan sessions for the tenant
 */
export function useScanSessions(filters?: ScanSessionListFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const params = new URLSearchParams()
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.per_page) params.set('per_page', String(filters.per_page))
  if (filters?.scanner_name) params.set('scanner_name', filters.scanner_name)
  if (filters?.asset_type) params.set('asset_type', filters.asset_type)
  if (filters?.status) params.set('status', filters.status)

  const queryString = params.toString()
  const key = currentTenant ? `/api/v1/scan-sessions${queryString ? `?${queryString}` : ''}` : null

  return useSWR<ScanSessionListResponse>(key, fetchScanSessions, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a specific scan session by ID
 */
export function useScanSession(sessionId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && sessionId ? `/api/v1/scan-sessions/${sessionId}` : null

  return useSWR<ScanSession>(key, fetchScanSession, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch scan session stats
 */
export interface ScanSessionStats {
  total: number
  by_status: Record<string, number>
  by_scanner: Record<string, number>
  by_asset_type: Record<string, number>
  findings_total: number
  findings_by_severity: Record<string, number>
}

async function fetchScanSessionStats(url: string): Promise<ScanSessionStats> {
  return get<ScanSessionStats>(url)
}

export function useScanSessionStats(since?: string, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? `/api/v1/scan-sessions/stats${since ? `?since=${since}` : ''}` : null

  return useSWR<ScanSessionStats>(key, fetchScanSessionStats, {
    ...defaultConfig,
    ...config,
  })
}

// Legacy aliases for backward compatibility
export const useScanRuns = useScanSessions
export const useAllScanRuns = useScanSessions

// ============================================
// SCAN SESSION ACTIONS
// ============================================

/**
 * Stop a running scan session
 */
export function useStopScanSession(sessionId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && sessionId ? `/api/v1/scan-sessions/${sessionId}/stop` : null,
    async (url: string) => {
      return post<ScanSession>(url, {})
    }
  )
}

/**
 * Retry a failed scan session
 */
export function useRetryScanSession(sessionId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && sessionId ? `/api/v1/scan-sessions/${sessionId}/retry` : null,
    async (url: string) => {
      return post<ScanSession>(url, {})
    }
  )
}

/**
 * Invalidate scan sessions cache
 */
export async function invalidateScanSessionsCache() {
  const { mutate } = await import('swr')
  await mutate(
    (key) => typeof key === 'string' && key.includes('/api/v1/scan-sessions'),
    undefined,
    {
      revalidate: true,
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate scan configs cache
 */
export async function invalidateScanConfigsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/api/v1/scans'), undefined, {
    revalidate: true,
  })
}

/**
 * Invalidate scan config stats cache
 */
export async function invalidateScanConfigStatsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/api/v1/scans/stats'), undefined, {
    revalidate: true,
  })
}

/**
 * Invalidate all scan config-related caches
 */
export async function invalidateAllScanConfigCaches() {
  await Promise.all([invalidateScanConfigsCache(), invalidateScanConfigStatsCache()])
}
