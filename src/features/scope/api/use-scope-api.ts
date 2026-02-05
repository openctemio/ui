/**
 * Scope Configuration API Hooks
 *
 * SWR hooks for fetching and mutating scope configuration data from backend
 * Following CTEM (Continuous Threat Exposure Management) Scoping phase
 *
 * Tenant is determined from JWT token (token-based tenant)
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import type {
  ApiScopeTarget,
  ApiScopeTargetListResponse,
  ApiScopeExclusion,
  ApiScopeExclusionListResponse,
  ApiScanSchedule,
  ApiScanScheduleListResponse,
  ApiScopeStats,
  ApiCheckScopeResponse,
  ScopeTargetFilters,
  ScopeExclusionFilters,
  ScanScheduleFilters,
  CreateScopeTargetInput,
  UpdateScopeTargetInput,
  CreateScopeExclusionInput,
  UpdateScopeExclusionInput,
  CreateScanScheduleInput,
  UpdateScanScheduleInput,
  BulkDeleteTargetsInput,
  BulkDeleteExclusionsInput,
  BulkDeleteSchedulesInput,
  BulkUpdateTargetsInput,
  BulkOperationResponse,
} from './scope-api.types'

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

const BASE_URL = '/api/v1/scope'

function buildTargetsEndpoint(filters?: ScopeTargetFilters): string {
  const url = `${BASE_URL}/targets`
  if (!filters) return url

  const params = new URLSearchParams()

  if (filters.target_type) params.set('target_type', filters.target_type)
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))
  if (filters.sort_by) params.set('sort_by', filters.sort_by)
  if (filters.sort_order) params.set('sort_order', filters.sort_order)

  const queryString = params.toString()
  return queryString ? `${url}?${queryString}` : url
}

function buildExclusionsEndpoint(filters?: ScopeExclusionFilters): string {
  const url = `${BASE_URL}/exclusions`
  if (!filters) return url

  const params = new URLSearchParams()

  if (filters.exclusion_type) params.set('exclusion_type', filters.exclusion_type)
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))
  if (filters.sort_by) params.set('sort_by', filters.sort_by)
  if (filters.sort_order) params.set('sort_order', filters.sort_order)

  const queryString = params.toString()
  return queryString ? `${url}?${queryString}` : url
}

function buildSchedulesEndpoint(filters?: ScanScheduleFilters): string {
  const url = `${BASE_URL}/schedules`
  if (!filters) return url

  const params = new URLSearchParams()

  if (filters.scan_type) params.set('scan_type', filters.scan_type)
  if (filters.enabled !== undefined) params.set('enabled', String(filters.enabled))
  if (filters.search) params.set('search', filters.search)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))
  if (filters.sort_by) params.set('sort_by', filters.sort_by)
  if (filters.sort_order) params.set('sort_order', filters.sort_order)

  const queryString = params.toString()
  return queryString ? `${url}?${queryString}` : url
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchTargets(url: string): Promise<ApiScopeTargetListResponse> {
  return get<ApiScopeTargetListResponse>(url)
}

async function fetchTarget(url: string): Promise<ApiScopeTarget> {
  return get<ApiScopeTarget>(url)
}

async function fetchExclusions(url: string): Promise<ApiScopeExclusionListResponse> {
  return get<ApiScopeExclusionListResponse>(url)
}

async function fetchExclusion(url: string): Promise<ApiScopeExclusion> {
  return get<ApiScopeExclusion>(url)
}

async function fetchSchedules(url: string): Promise<ApiScanScheduleListResponse> {
  return get<ApiScanScheduleListResponse>(url)
}

async function fetchSchedule(url: string): Promise<ApiScanSchedule> {
  return get<ApiScanSchedule>(url)
}

async function fetchStats(url: string): Promise<ApiScopeStats> {
  return get<ApiScopeStats>(url)
}

// ============================================
// TARGETS HOOKS
// ============================================

/**
 * Fetch scope targets list for current tenant
 *
 * @example
 * ```typescript
 * function TargetsList() {
 *   const { data, error, isLoading } = useScopeTargetsApi({
 *     status: 'active',
 *     type: 'domain'
 *   })
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error error={error} />
 *
 *   return (
 *     <ul>
 *       {data?.data.map(target => (
 *         <li key={target.id}>{target.pattern}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useScopeTargetsApi(filters?: ScopeTargetFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? buildTargetsEndpoint(filters) : null

  return useSWR<ApiScopeTargetListResponse>(key, fetchTargets, { ...defaultConfig, ...config })
}

/**
 * Fetch a single scope target by ID
 */
export function useScopeTargetApi(targetId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && targetId ? `${BASE_URL}/targets/${targetId}` : null

  return useSWR<ApiScopeTarget>(key, fetchTarget, { ...defaultConfig, ...config })
}

/**
 * Create a new scope target
 */
export function useCreateScopeTargetApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `${BASE_URL}/targets` : null,
    async (url: string, { arg }: { arg: CreateScopeTargetInput }) => {
      return post<ApiScopeTarget>(url, arg)
    }
  )
}

/**
 * Update a scope target
 */
export function useUpdateScopeTargetApi(targetId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && targetId ? `${BASE_URL}/targets/${targetId}` : null,
    async (url: string, { arg }: { arg: UpdateScopeTargetInput }) => {
      return put<ApiScopeTarget>(url, arg)
    }
  )
}

/**
 * Delete a scope target
 */
export function useDeleteScopeTargetApi(targetId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && targetId ? `${BASE_URL}/targets/${targetId}` : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Bulk delete scope targets
 */
export function useBulkDeleteTargetsApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `${BASE_URL}/targets/bulk/delete` : null,
    async (url: string, { arg }: { arg: BulkDeleteTargetsInput }) => {
      return post<BulkOperationResponse>(url, arg)
    }
  )
}

/**
 * Bulk update scope targets
 */
export function useBulkUpdateTargetsApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `${BASE_URL}/targets/bulk` : null,
    async (url: string, { arg }: { arg: BulkUpdateTargetsInput }) => {
      return post<BulkOperationResponse>(url, arg)
    }
  )
}

// ============================================
// EXCLUSIONS HOOKS
// ============================================

/**
 * Fetch scope exclusions list for current tenant
 */
export function useScopeExclusionsApi(filters?: ScopeExclusionFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? buildExclusionsEndpoint(filters) : null

  return useSWR<ApiScopeExclusionListResponse>(key, fetchExclusions, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single scope exclusion by ID
 */
export function useScopeExclusionApi(exclusionId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && exclusionId ? `${BASE_URL}/exclusions/${exclusionId}` : null

  return useSWR<ApiScopeExclusion>(key, fetchExclusion, { ...defaultConfig, ...config })
}

/**
 * Create a new scope exclusion
 */
export function useCreateScopeExclusionApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `${BASE_URL}/exclusions` : null,
    async (url: string, { arg }: { arg: CreateScopeExclusionInput }) => {
      return post<ApiScopeExclusion>(url, arg)
    }
  )
}

/**
 * Update a scope exclusion
 */
export function useUpdateScopeExclusionApi(exclusionId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && exclusionId ? `${BASE_URL}/exclusions/${exclusionId}` : null,
    async (url: string, { arg }: { arg: UpdateScopeExclusionInput }) => {
      return put<ApiScopeExclusion>(url, arg)
    }
  )
}

/**
 * Delete a scope exclusion
 */
export function useDeleteScopeExclusionApi(exclusionId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && exclusionId ? `${BASE_URL}/exclusions/${exclusionId}` : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Bulk delete scope exclusions
 */
export function useBulkDeleteExclusionsApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `${BASE_URL}/exclusions/bulk/delete` : null,
    async (url: string, { arg }: { arg: BulkDeleteExclusionsInput }) => {
      return post<BulkOperationResponse>(url, arg)
    }
  )
}

// ============================================
// SCHEDULES HOOKS
// ============================================

/**
 * Fetch scan schedules list for current tenant
 */
export function useScanSchedulesApi(filters?: ScanScheduleFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? buildSchedulesEndpoint(filters) : null

  return useSWR<ApiScanScheduleListResponse>(key, fetchSchedules, { ...defaultConfig, ...config })
}

/**
 * Fetch a single scan schedule by ID
 */
export function useScanScheduleApi(scheduleId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && scheduleId ? `${BASE_URL}/schedules/${scheduleId}` : null

  return useSWR<ApiScanSchedule>(key, fetchSchedule, { ...defaultConfig, ...config })
}

/**
 * Create a new scan schedule
 */
export function useCreateScanScheduleApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `${BASE_URL}/schedules` : null,
    async (url: string, { arg }: { arg: CreateScanScheduleInput }) => {
      return post<ApiScanSchedule>(url, arg)
    }
  )
}

/**
 * Update a scan schedule
 */
export function useUpdateScanScheduleApi(scheduleId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && scheduleId ? `${BASE_URL}/schedules/${scheduleId}` : null,
    async (url: string, { arg }: { arg: UpdateScanScheduleInput }) => {
      return put<ApiScanSchedule>(url, arg)
    }
  )
}

/**
 * Delete a scan schedule
 */
export function useDeleteScanScheduleApi(scheduleId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && scheduleId ? `${BASE_URL}/schedules/${scheduleId}` : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Bulk delete scan schedules
 */
export function useBulkDeleteSchedulesApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `${BASE_URL}/schedules/bulk/delete` : null,
    async (url: string, { arg }: { arg: BulkDeleteSchedulesInput }) => {
      return post<BulkOperationResponse>(url, arg)
    }
  )
}

// ============================================
// STATS HOOK
// ============================================

/**
 * Fetch scope statistics for current tenant
 */
export function useScopeStatsApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? `${BASE_URL}/stats` : null

  return useSWR<ApiScopeStats>(key, fetchStats, { ...defaultConfig, ...config })
}

// ============================================
// CHECK SCOPE HOOK
// ============================================

/**
 * Check if a value is in scope
 */
export function useCheckScopeApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `${BASE_URL}/check` : null,
    async (url: string, { arg }: { arg: { type: string; value: string } }) => {
      const params = new URLSearchParams()
      params.set('type', arg.type)
      params.set('value', arg.value)
      return get<ApiCheckScopeResponse>(`${url}?${params.toString()}`)
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate all scope-related caches
 */
export async function invalidateScopeCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/scope'), undefined, {
    revalidate: true,
  })
}

/**
 * Invalidate scope targets cache
 */
export async function invalidateScopeTargetsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/scope/targets'), undefined, {
    revalidate: true,
  })
}

/**
 * Invalidate scope exclusions cache
 */
export async function invalidateScopeExclusionsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/scope/exclusions'), undefined, {
    revalidate: true,
  })
}

/**
 * Invalidate scan schedules cache
 */
export async function invalidateScanSchedulesCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/scope/schedules'), undefined, {
    revalidate: true,
  })
}

/**
 * Invalidate scope stats cache
 */
export async function invalidateScopeStatsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/scope/stats'), undefined, {
    revalidate: true,
  })
}
