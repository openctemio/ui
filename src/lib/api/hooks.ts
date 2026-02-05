/**
 * API Hooks
 *
 * Custom React hooks for data fetching using SWR
 * Hooks for Rediver API operations
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import useSWRInfinite from 'swr/infinite'
import { get, post, put, patch, del } from './client'
import { handleApiError } from './error-handler'
import { endpoints } from './endpoints'
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserListFilters,
  SearchFilters,
  PaginatedResponse,
} from './types'

// ============================================
// SWR CONFIGURATION
// ============================================

/**
 * Default SWR configuration
 *
 * IMPORTANT: Don't retry on 4xx client errors (403, 404, etc.)
 * Only retry on 5xx server errors or network failures
 * This prevents infinite loops when user lacks permissions
 */
export const defaultSwrConfig: SWRConfiguration = {
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
// CURRENT USER HOOKS
// ============================================

/**
 * Fetch current user profile
 */
export function useCurrentUser(config?: SWRConfiguration) {
  return useSWR<User>(endpoints.users.me(), get, { ...defaultSwrConfig, ...config })
}

/**
 * Update current user profile
 */
export function useUpdateCurrentUser() {
  return useSWRMutation(endpoints.users.updateMe(), (url, { arg }: { arg: UpdateUserRequest }) =>
    put<User>(url, arg)
  )
}

// NOTE: For user tenant fetching, use useMyTenants from '@/lib/api/user-tenant-hooks'
// That version includes proper cookie checking to prevent 401 errors for new users

// ============================================
// USER MANAGEMENT HOOKS (Admin)
// ============================================

/**
 * Fetch user by ID
 */
export function useUser(userId: string | null, config?: SWRConfiguration) {
  return useSWR<User>(userId ? endpoints.users.get(userId) : null, get, {
    ...defaultSwrConfig,
    ...config,
  })
}

/**
 * Fetch users list with pagination and filters
 */
export function useUsers(filters?: UserListFilters, config?: SWRConfiguration) {
  return useSWR<PaginatedResponse<User>>(endpoints.users.list(filters), get, {
    ...defaultSwrConfig,
    ...config,
  })
}

/**
 * Create user mutation
 */
export function useCreateUser() {
  return useSWRMutation(endpoints.users.create(), (url, { arg }: { arg: CreateUserRequest }) =>
    post<User>(url, arg)
  )
}

/**
 * Update user mutation
 */
export function useUpdateUser(userId: string) {
  return useSWRMutation(
    endpoints.users.update(userId),
    (url, { arg }: { arg: UpdateUserRequest }) => put<User>(url, arg)
  )
}

/**
 * Delete user mutation
 */
export function useDeleteUser(userId: string) {
  return useSWRMutation(endpoints.users.delete(userId), (url) => del(url))
}

// ============================================
// TENANT HOOKS
// ============================================

/**
 * Fetch tenants list
 */
export function useTenants(filters?: SearchFilters, config?: SWRConfiguration) {
  return useSWR(endpoints.tenants.list(filters), get, { ...defaultSwrConfig, ...config })
}

/**
 * Fetch tenant by ID or slug
 */
export function useTenant(tenantIdOrSlug: string | null, config?: SWRConfiguration) {
  return useSWR(tenantIdOrSlug ? endpoints.tenants.get(tenantIdOrSlug) : null, get, {
    ...defaultSwrConfig,
    ...config,
  })
}

/**
 * Create tenant mutation
 */
export function useCreateTenant() {
  return useSWRMutation(
    endpoints.tenants.create(),
    (url, { arg }: { arg: { name: string; slug?: string } }) => post(url, arg)
  )
}

/**
 * Update tenant mutation
 */
export function useUpdateTenant(tenantIdOrSlug: string) {
  return useSWRMutation(
    endpoints.tenants.update(tenantIdOrSlug),
    (url, { arg }: { arg: { name?: string; slug?: string } }) => patch(url, arg)
  )
}

/**
 * Delete tenant mutation
 */
export function useDeleteTenant(tenantIdOrSlug: string) {
  return useSWRMutation(endpoints.tenants.delete(tenantIdOrSlug), (url) => del(url))
}

/**
 * Fetch tenant members
 */
export function useTenantMembers(tenantIdOrSlug: string | null, config?: SWRConfiguration) {
  return useSWR(tenantIdOrSlug ? endpoints.tenants.members(tenantIdOrSlug) : null, get, {
    ...defaultSwrConfig,
    ...config,
  })
}

// ============================================
// VULNERABILITY HOOKS
// ============================================

/**
 * Fetch vulnerabilities list
 */
export function useVulnerabilities(filters?: SearchFilters, config?: SWRConfiguration) {
  return useSWR(endpoints.vulnerabilities.list(filters), get, { ...defaultSwrConfig, ...config })
}

/**
 * Fetch vulnerability by ID
 */
export function useVulnerability(vulnId: string | null, config?: SWRConfiguration) {
  return useSWR(vulnId ? endpoints.vulnerabilities.get(vulnId) : null, get, {
    ...defaultSwrConfig,
    ...config,
  })
}

/**
 * Fetch vulnerability by CVE ID
 */
export function useVulnerabilityByCVE(cveId: string | null, config?: SWRConfiguration) {
  return useSWR(cveId ? endpoints.vulnerabilities.getByCVE(cveId) : null, get, {
    ...defaultSwrConfig,
    ...config,
  })
}

// ============================================
// FINDING HOOKS
// ============================================

/**
 * Fetch findings (tenant extracted from JWT, not URL path)
 */
export function useFindings(
  tenantIdOrSlug: string | null,
  filters?: SearchFilters,
  config?: SWRConfiguration
) {
  return useSWR(tenantIdOrSlug ? endpoints.findings.list(filters) : null, get, {
    ...defaultSwrConfig,
    ...config,
  })
}

/**
 * Fetch finding by ID (tenant extracted from JWT, not URL path)
 */
export function useFinding(
  tenantIdOrSlug: string | null,
  findingId: string | null,
  config?: SWRConfiguration
) {
  return useSWR(tenantIdOrSlug && findingId ? endpoints.findings.get(findingId) : null, get, {
    ...defaultSwrConfig,
    ...config,
  })
}

/**
 * Fetch findings by asset (tenant extracted from JWT, not URL path)
 */
export function useFindingsByProject(
  tenantIdOrSlug: string | null,
  projectId: string | null,
  filters?: SearchFilters,
  config?: SWRConfiguration
) {
  return useSWR(
    tenantIdOrSlug && projectId ? endpoints.findings.listByAsset(projectId, filters) : null,
    get,
    { ...defaultSwrConfig, ...config }
  )
}

// ============================================
// PROJECT HOOKS
// ============================================

/**
 * Fetch projects for a tenant
 */
export function useProjects(
  tenantIdOrSlug: string | null,
  filters?: SearchFilters,
  config?: SWRConfiguration
) {
  return useSWR(tenantIdOrSlug ? endpoints.projects.list(tenantIdOrSlug, filters) : null, get, {
    ...defaultSwrConfig,
    ...config,
  })
}

/**
 * Fetch project by ID
 */
export function useProject(
  tenantIdOrSlug: string | null,
  projectId: string | null,
  config?: SWRConfiguration
) {
  return useSWR(
    tenantIdOrSlug && projectId ? endpoints.projects.get(tenantIdOrSlug, projectId) : null,
    get,
    { ...defaultSwrConfig, ...config }
  )
}

// ============================================
// COMPONENT HOOKS
// ============================================

/**
 * Fetch components for a tenant
 */
export function useComponents(
  tenantIdOrSlug: string | null,
  filters?: SearchFilters,
  config?: SWRConfiguration
) {
  return useSWR(tenantIdOrSlug ? endpoints.components.list(tenantIdOrSlug, filters) : null, get, {
    ...defaultSwrConfig,
    ...config,
  })
}

/**
 * Fetch components by project
 */
export function useComponentsByProject(
  tenantIdOrSlug: string | null,
  projectId: string | null,
  filters?: SearchFilters,
  config?: SWRConfiguration
) {
  return useSWR(
    tenantIdOrSlug && projectId
      ? endpoints.components.listByProject(tenantIdOrSlug, projectId, filters)
      : null,
    get,
    { ...defaultSwrConfig, ...config }
  )
}

// ============================================
// ASSET HOOKS
// ============================================

/**
 * Fetch assets list
 */
export function useAssets(filters?: SearchFilters, config?: SWRConfiguration) {
  return useSWR(endpoints.assets.list(filters), get, { ...defaultSwrConfig, ...config })
}

/**
 * Fetch asset by ID
 */
export function useAsset(assetId: string | null, config?: SWRConfiguration) {
  return useSWR(assetId ? endpoints.assets.get(assetId) : null, get, {
    ...defaultSwrConfig,
    ...config,
  })
}

// ============================================
// UTILITIES
// ============================================

/**
 * Mutate (revalidate) multiple SWR keys
 */
export async function mutateMultiple(keys: string[]) {
  const { mutate } = await import('swr')
  await Promise.all(keys.map((key) => mutate(key)))
}

/**
 * Clear all SWR cache
 */
export async function clearAllCache() {
  const { mutate } = await import('swr')
  await mutate(() => true, undefined, { revalidate: false })
}

/**
 * Create optimistic update helper
 */
export async function optimisticUpdate<T>(
  key: string,
  optimisticData: T,
  updateFn: () => Promise<T>
) {
  const { mutate } = await import('swr')

  await mutate(key, updateFn(), {
    optimisticData,
    rollbackOnError: true,
    revalidate: false,
  })
}

// ============================================
// ADVANCED HOOKS
// ============================================

/**
 * Infinite scroll hook for paginated users
 */
export function useInfiniteUsers(filters?: UserListFilters) {
  return useSWRInfinite(
    (pageIndex: number) => endpoints.users.list({ ...filters, page: pageIndex + 1 }),
    get,
    defaultSwrConfig
  )
}

/**
 * Dependent fetching - fetch data only when condition is met
 */
export function useDependentData<T, C = unknown>(
  condition: C,
  keyFn: (condition: NonNullable<C>) => string,
  fetcher: (key: string) => Promise<T>,
  config?: SWRConfiguration
) {
  return useSWR<T>(condition ? keyFn(condition as NonNullable<C>) : null, fetcher, {
    ...defaultSwrConfig,
    ...config,
  })
}

/**
 * Polling hook - automatically refetch data at interval
 */
export function usePolling<T>(
  key: string | null,
  fetcher: (key: string) => Promise<T>,
  interval: number = 5000,
  config?: SWRConfiguration
) {
  return useSWR<T>(key, fetcher, {
    ...defaultSwrConfig,
    refreshInterval: interval,
    ...config,
  })
}
