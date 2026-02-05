/**
 * Asset Group API Hooks
 *
 * SWR hooks for fetching and mutating asset group data from backend
 * Following CTEM (Continuous Threat Exposure Management) Scoping phase
 *
 * Tenant is determined from JWT token (token-based tenant)
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, patch, del } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import { usePermissions, Permission } from '@/lib/permissions'
import type {
  ApiAssetGroup,
  ApiAssetGroupListResponse,
  ApiGroupAssetsResponse,
  ApiGroupFindingsResponse,
  AssetGroupApiFilters,
  GroupAssetsApiFilters,
  CreateAssetGroupApiInput,
  UpdateAssetGroupApiInput,
  AddAssetsToGroupApiInput,
  RemoveAssetsFromGroupApiInput,
  BulkUpdateGroupsApiInput,
  BulkDeleteGroupsApiInput,
  BulkOperationResponse,
  ApiAssetGroupStats,
} from './asset-group-api.types'

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

const BASE_URL = '/api/v1/asset-groups'

function buildAssetGroupsEndpoint(filters?: AssetGroupApiFilters): string {
  if (!filters) return BASE_URL

  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  if (filters.business_unit) params.set('business_unit', filters.business_unit)
  if (filters.owner) params.set('owner', filters.owner)
  if (filters.has_findings !== undefined) params.set('has_findings', String(filters.has_findings))
  if (filters.min_risk_score !== undefined)
    params.set('min_risk_score', String(filters.min_risk_score))
  if (filters.max_risk_score !== undefined)
    params.set('max_risk_score', String(filters.max_risk_score))
  if (filters.page) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))
  if (filters.sort_by) params.set('sort_by', filters.sort_by)
  if (filters.sort_order) params.set('sort_order', filters.sort_order)

  if (filters.environments?.length) params.set('environments', filters.environments.join(','))
  if (filters.criticalities?.length) params.set('criticalities', filters.criticalities.join(','))
  if (filters.tags?.length) params.set('tags', filters.tags.join(','))

  const queryString = params.toString()
  return queryString ? `${BASE_URL}?${queryString}` : BASE_URL
}

function buildAssetGroupEndpoint(groupId: string): string {
  return `${BASE_URL}/${groupId}`
}

function buildGroupAssetsEndpoint(groupId: string, filters?: GroupAssetsApiFilters): string {
  const baseUrl = `${BASE_URL}/${groupId}/assets`

  if (!filters) return baseUrl

  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))
  if (filters.types?.length) params.set('types', filters.types.join(','))

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

function buildGroupFindingsEndpoint(groupId: string, page?: number, perPage?: number): string {
  const baseUrl = `${BASE_URL}/${groupId}/findings`
  const params = new URLSearchParams()

  if (page) params.set('page', String(page))
  if (perPage) params.set('per_page', String(perPage))

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchAssetGroups(url: string): Promise<ApiAssetGroupListResponse> {
  return get<ApiAssetGroupListResponse>(url)
}

async function fetchAssetGroup(url: string): Promise<ApiAssetGroup> {
  return get<ApiAssetGroup>(url)
}

async function fetchGroupAssets(url: string): Promise<ApiGroupAssetsResponse> {
  return get<ApiGroupAssetsResponse>(url)
}

async function fetchGroupFindings(url: string): Promise<ApiGroupFindingsResponse> {
  return get<ApiGroupFindingsResponse>(url)
}

async function fetchAssetGroupStats(url: string): Promise<ApiAssetGroupStats> {
  return get<ApiAssetGroupStats>(url)
}

// ============================================
// LIST HOOKS
// ============================================

/**
 * Fetch asset groups list for current tenant
 *
 * @example
 * ```typescript
 * function AssetGroupList() {
 *   const { data, error, isLoading } = useAssetGroupsApi({
 *     environments: ['production'],
 *     criticalities: ['critical', 'high']
 *   })
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error error={error} />
 *
 *   return (
 *     <ul>
 *       {data?.data.map(group => (
 *         <li key={group.id}>{group.name}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useAssetGroupsApi(filters?: AssetGroupApiFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssetGroups = can(Permission.AssetGroupsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && canReadAssetGroups

  const key = shouldFetch ? buildAssetGroupsEndpoint(filters) : null

  return useSWR<ApiAssetGroupListResponse>(key, fetchAssetGroups, { ...defaultConfig, ...config })
}

/**
 * Fetch a single asset group by ID
 * Only fetches if user has asset-groups:read permission
 */
export function useAssetGroupApi(groupId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssetGroups = can(Permission.AssetGroupsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && groupId && canReadAssetGroups

  const key = shouldFetch ? buildAssetGroupEndpoint(groupId) : null

  return useSWR<ApiAssetGroup>(key, fetchAssetGroup, { ...defaultConfig, ...config })
}

/**
 * Fetch assets for a specific group
 * Only fetches if user has asset-groups:read permission
 */
export function useGroupAssetsApi(
  groupId: string | null,
  filters?: GroupAssetsApiFilters,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssetGroups = can(Permission.AssetGroupsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && groupId && canReadAssetGroups

  const key = shouldFetch ? buildGroupAssetsEndpoint(groupId, filters) : null

  return useSWR<ApiGroupAssetsResponse>(key, fetchGroupAssets, { ...defaultConfig, ...config })
}

/**
 * Fetch findings for a specific group
 * Only fetches if user has asset-groups:read permission
 */
export function useGroupFindingsApi(
  groupId: string | null,
  page?: number,
  perPage?: number,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssetGroups = can(Permission.AssetGroupsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && groupId && canReadAssetGroups

  const key = shouldFetch ? buildGroupFindingsEndpoint(groupId, page, perPage) : null

  return useSWR<ApiGroupFindingsResponse>(key, fetchGroupFindings, { ...defaultConfig, ...config })
}

/**
 * Fetch asset group statistics
 * Only fetches if user has asset-groups:read permission
 */
export function useAssetGroupStatsApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssetGroups = can(Permission.AssetGroupsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && canReadAssetGroups

  const key = shouldFetch ? `${BASE_URL}/stats` : null

  return useSWR<ApiAssetGroupStats>(key, fetchAssetGroupStats, { ...defaultConfig, ...config })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new asset group
 */
export function useCreateAssetGroupApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    async (url: string, { arg }: { arg: CreateAssetGroupApiInput }) => {
      return post<ApiAssetGroup>(url, arg)
    }
  )
}

/**
 * Update an asset group
 */
export function useUpdateAssetGroupApi(groupId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && groupId ? buildAssetGroupEndpoint(groupId) : null,
    async (url: string, { arg }: { arg: UpdateAssetGroupApiInput }) => {
      return put<ApiAssetGroup>(url, arg)
    }
  )
}

/**
 * Delete an asset group
 */
export function useDeleteAssetGroupApi(groupId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && groupId ? buildAssetGroupEndpoint(groupId) : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Add assets to a group
 */
export function useAddAssetsToGroupApi(groupId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && groupId ? `${buildAssetGroupEndpoint(groupId)}/assets` : null,
    async (url: string, { arg }: { arg: AddAssetsToGroupApiInput }) => {
      return post<ApiAssetGroup>(url, arg)
    }
  )
}

/**
 * Remove assets from a group
 * Uses DELETE to /assets endpoint with body
 */
export function useRemoveAssetsFromGroupApi(groupId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && groupId ? `${buildAssetGroupEndpoint(groupId)}/assets` : null,
    async (url: string, { arg }: { arg: RemoveAssetsFromGroupApiInput }) => {
      return del<ApiAssetGroup>(url, arg)
    }
  )
}

// ============================================
// BULK OPERATION HOOKS
// ============================================

/**
 * Bulk update multiple asset groups
 */
export function useBulkUpdateAssetGroupsApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `${BASE_URL}/bulk` : null,
    async (url: string, { arg }: { arg: BulkUpdateGroupsApiInput }) => {
      return patch<BulkOperationResponse>(url, arg)
    }
  )
}

/**
 * Bulk delete multiple asset groups
 */
export function useBulkDeleteAssetGroupsApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `${BASE_URL}/bulk/delete` : null,
    async (url: string, { arg }: { arg: BulkDeleteGroupsApiInput }) => {
      return post<BulkOperationResponse>(url, arg)
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate asset groups cache
 */
export async function invalidateAssetGroupsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/asset-groups'), undefined, {
    revalidate: true,
  })
}

/**
 * Invalidate a specific asset group cache
 */
export async function invalidateAssetGroupCache(groupId: string) {
  const { mutate } = await import('swr')
  await mutate(
    (key) => typeof key === 'string' && key.includes(`/asset-groups/${groupId}`),
    undefined,
    { revalidate: true }
  )
}
