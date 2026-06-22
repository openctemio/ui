/**
 * Component API Hooks
 *
 * SWR hooks for fetching and mutating component data from backend
 *
 * Tenant is now determined from JWT token (token-based tenant)
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import { usePermissions, Permission } from '@/lib/permissions'
import type {
  ApiComponent,
  ApiComponentAssetUsageListResponse,
  ApiComponentListResponse,
  ApiComponentStats,
  ApiComponentVulnerabilityListResponse,
  ApiEcosystemStats,
  ApiVulnerableComponent,
  ApiLicenseStats,
  ComponentApiFilters,
  CreateComponentInput,
  UpdateComponentInput,
} from './component-api.types'

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

function buildComponentsEndpoint(filters?: ComponentApiFilters): string {
  const baseUrl = `/api/v1/components`

  if (!filters) return baseUrl

  const params = new URLSearchParams()

  if (filters.asset_id) params.set('asset_id', filters.asset_id)
  if (filters.name) params.set('name', filters.name)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))
  if (filters.has_vulnerabilities !== undefined) {
    params.set('has_vulnerabilities', String(filters.has_vulnerabilities))
  }

  if (filters.ecosystems?.length) params.set('ecosystems', filters.ecosystems.join(','))
  if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','))
  if (filters.dependency_types?.length)
    params.set('dependency_types', filters.dependency_types.join(','))
  if (filters.licenses?.length) params.set('licenses', filters.licenses.join(','))

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

function buildComponentEndpoint(componentId: string): string {
  return `/api/v1/components/${componentId}`
}

function buildAssetComponentsEndpoint(assetId: string, page?: number, perPage?: number): string {
  const baseUrl = `/api/v1/assets/${assetId}/components`
  const params = new URLSearchParams()

  if (page) params.set('page', String(page))
  if (perPage) params.set('per_page', String(perPage))

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchComponents(url: string): Promise<ApiComponentListResponse> {
  return get<ApiComponentListResponse>(url)
}

async function fetchComponent(url: string): Promise<ApiComponent> {
  return get<ApiComponent>(url)
}

// ============================================
// HOOKS
// ============================================

/**
 * Fetch components list for current tenant
 *
 * @example
 * ```typescript
 * function ComponentList() {
 *   const { data, error, isLoading } = useComponentsApi({ page: 1, per_page: 20 })
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error error={error} />
 *
 *   return (
 *     <ul>
 *       {data?.data.map(component => (
 *         <li key={component.id}>{component.name}@{component.version}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useComponentsApi(filters?: ComponentApiFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadComponents = can(Permission.ComponentsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && canReadComponents

  const key = shouldFetch ? buildComponentsEndpoint(filters) : null

  return useSWR<ApiComponentListResponse>(key, fetchComponents, { ...defaultConfig, ...config })
}

/**
 * Fetch a single component by ID
 * Only fetches if user has components:read permission
 */
export function useComponentApi(componentId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadComponents = can(Permission.ComponentsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && componentId && canReadComponents

  const key = shouldFetch ? buildComponentEndpoint(componentId) : null

  return useSWR<ApiComponent>(key, fetchComponent, { ...defaultConfig, ...config })
}

/**
 * Fetch components for a specific asset
 * Only fetches if user has components:read permission
 */
export function useAssetComponentsApi(
  assetId: string | null,
  page?: number,
  perPage?: number,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadComponents = can(Permission.ComponentsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && assetId && canReadComponents

  const key = shouldFetch ? buildAssetComponentsEndpoint(assetId, page, perPage) : null

  return useSWR<ApiComponentListResponse>(key, fetchComponents, { ...defaultConfig, ...config })
}

/**
 * Fetch the assets in the tenant that use a given global component
 * (blast-radius reverse lookup). Backed by GET /api/v1/components/{id}/assets.
 * Only fetches if user has components:read permission.
 *
 * SWR cache key includes tenant.id to prevent cross-tenant cache leaks
 * when the user switches tenants (component IDs are global so the URL
 * alone would collide).
 */
export function useComponentAssetsApi(
  componentId: string | null,
  page?: number,
  perPage?: number,
  options?: { atRiskOnly?: boolean },
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadComponents = can(Permission.ComponentsRead)

  const shouldFetch = currentTenant && componentId && canReadComponents

  const params = new URLSearchParams()
  if (options?.atRiskOnly) params.set('at_risk_only', 'true')
  if (page) params.set('page', String(page))
  if (perPage) params.set('per_page', String(perPage))
  const qs = params.toString()
  const url = shouldFetch ? `/api/v1/components/${componentId}/assets${qs ? `?${qs}` : ''}` : null
  const key = url && currentTenant ? ([url, currentTenant.id] as const) : null

  return useSWR<ApiComponentAssetUsageListResponse>(
    key,
    ([url]) => get<ApiComponentAssetUsageListResponse>(url),
    { ...defaultConfig, ...config }
  )
}

/**
 * Fetch the CVEs that affect a given global component within the current tenant
 * (forward lookup). Backed by GET /api/v1/components/{id}/vulnerabilities.
 * One row per CVE — affected_assets_count is rolled up.
 *
 * SWR cache key includes tenant.id to prevent cross-tenant cache leaks.
 */
export function useComponentVulnsApi(
  componentId: string | null,
  options?: { includeResolved?: boolean; page?: number; perPage?: number },
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadComponents = can(Permission.ComponentsRead)

  const shouldFetch = currentTenant && componentId && canReadComponents

  const params = new URLSearchParams()
  if (options?.includeResolved) params.set('include_resolved', 'true')
  if (options?.page) params.set('page', String(options.page))
  if (options?.perPage) params.set('per_page', String(options.perPage))
  const qs = params.toString()
  const url = shouldFetch
    ? `/api/v1/components/${componentId}/vulnerabilities${qs ? `?${qs}` : ''}`
    : null
  const key = url && currentTenant ? ([url, currentTenant.id] as const) : null

  return useSWR<ApiComponentVulnerabilityListResponse>(
    key,
    ([url]) => get<ApiComponentVulnerabilityListResponse>(url),
    { ...defaultConfig, ...config }
  )
}

/**
 * Fetch component stats for current tenant
 * Only fetches if user has components:read permission
 */
export function useComponentStatsApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadComponents = can(Permission.ComponentsRead)

  const shouldFetch = currentTenant && canReadComponents

  return useSWR<ApiComponentStats>(
    shouldFetch ? `/api/v1/components/stats` : null,
    (url: string) => get<ApiComponentStats>(url),
    {
      ...defaultConfig,
      dedupingInterval: 60000, // Cache 60s — stats don't change on filter
      revalidateOnFocus: false,
      ...config,
    }
  )
}

/**
 * Fetch ecosystem stats for current tenant
 * Only fetches if user has components:read permission
 */
export function useEcosystemStatsApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadComponents = can(Permission.ComponentsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && canReadComponents

  return useSWR<ApiEcosystemStats[]>(
    shouldFetch ? `/api/v1/components/ecosystems` : null,
    (url: string) => get<ApiEcosystemStats[]>(url),
    { ...defaultConfig, dedupingInterval: 30000, ...config }
  )
}

/**
 * Fetch vulnerable components for current tenant
 * Only fetches if user has components:read permission
 */
export function useVulnerableComponentsApi(
  page: number = 1,
  perPage: number = 20,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadComponents = can(Permission.ComponentsRead)
  const shouldFetch = currentTenant && canReadComponents

  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })

  return useSWR<{
    data: ApiVulnerableComponent[]
    total: number
    page: number
    per_page: number
    total_pages: number
  }>(
    shouldFetch ? `/api/v1/components/vulnerable?${params.toString()}` : null,
    (url: string) => get(url),
    { ...defaultConfig, ...config }
  )
}

/**
 * Fetch license stats for current tenant
 * Only fetches if user has components:read permission
 */
export function useLicenseStatsApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadComponents = can(Permission.ComponentsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && canReadComponents

  return useSWR<ApiLicenseStats[]>(
    shouldFetch ? `/api/v1/components/licenses` : null,
    (url: string) => get<ApiLicenseStats[]>(url),
    { ...defaultConfig, dedupingInterval: 30000, ...config }
  )
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new component
 */
export function useCreateComponentApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `/api/v1/components` : null,
    async (url: string, { arg }: { arg: CreateComponentInput }) => {
      return post<ApiComponent>(url, arg)
    }
  )
}

/**
 * Update an existing component
 */
export function useUpdateComponentApi(componentId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && componentId ? buildComponentEndpoint(componentId) : null,
    async (url: string, { arg }: { arg: UpdateComponentInput }) => {
      return put<ApiComponent>(url, arg)
    }
  )
}

/**
 * Delete a component
 */
export function useDeleteComponentApi(componentId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && componentId ? buildComponentEndpoint(componentId) : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate components cache
 */
export async function invalidateComponentsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes(`/api/v1/components`), undefined, {
    revalidate: true,
  })
}
