/**
 * Integrations API Hooks
 *
 * SWR hooks for fetching and mutating integrations from backend.
 * Supports all integration types: SCM, Security, Cloud, Ticketing, Notification.
 *
 * Tenant is determined from JWT token (token-based tenant)
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import { useTenantModules } from './use-tenant-modules'
import type {
  Integration,
  IntegrationListFilters,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
  TestCredentialsRequest,
  TestCredentialsResponse,
  ListSCMRepositoriesResponse,
  CreateNotificationIntegrationRequest,
  TestNotificationResponse,
  SendNotificationRequest,
  NotificationEventsResponse,
} from '../types/integration.types'

// ============================================
// API RESPONSE TYPES
// ============================================

interface IntegrationListResponse {
  data: Integration[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

interface SCMIntegrationsResponse {
  data: Integration[]
}

interface NotificationIntegrationsResponse {
  data: Integration[]
}

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

const BASE_URL = '/api/v1/integrations'

function buildIntegrationsEndpoint(filters?: IntegrationListFilters): string {
  if (!filters) return BASE_URL

  const params = new URLSearchParams()

  if (filters.category) params.set('category', filters.category)
  if (filters.provider) params.set('provider', filters.provider)
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.order) params.set('order', filters.order)

  const queryString = params.toString()
  return queryString ? `${BASE_URL}?${queryString}` : BASE_URL
}

function buildRepositoriesEndpoint(
  integrationId: string,
  options?: { search?: string; page?: number; per_page?: number }
): string {
  const url = `${BASE_URL}/${integrationId}/repositories`
  if (!options) return url

  const params = new URLSearchParams()
  if (options.search) params.set('search', options.search)
  if (options.page) params.set('page', String(options.page))
  if (options.per_page) params.set('per_page', String(options.per_page))

  const queryString = params.toString()
  return queryString ? `${url}?${queryString}` : url
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchIntegrations(url: string): Promise<IntegrationListResponse> {
  return get<IntegrationListResponse>(url)
}

async function fetchIntegration(url: string): Promise<Integration> {
  return get<Integration>(url)
}

async function fetchSCMIntegrations(url: string): Promise<SCMIntegrationsResponse> {
  return get<SCMIntegrationsResponse>(url)
}

async function fetchRepositories(url: string): Promise<ListSCMRepositoriesResponse> {
  return get<ListSCMRepositoriesResponse>(url)
}

// ============================================
// LIST HOOKS
// ============================================

/**
 * Fetch integrations list for current tenant
 *
 * @example
 * ```typescript
 * function IntegrationsList() {
 *   const { data, error, isLoading } = useIntegrationsApi({
 *     category: 'scm',
 *     status: 'connected'
 *   })
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error error={error} />
 *
 *   return (
 *     <ul>
 *       {data?.data.map(integration => (
 *         <li key={integration.id}>{integration.name}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useIntegrationsApi(filters?: IntegrationListFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? buildIntegrationsEndpoint(filters) : null

  return useSWR<IntegrationListResponse>(key, fetchIntegrations, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch SCM integrations with their extensions
 * Only fetches if tenant has SCM module enabled (prevents 403 MODULE_NOT_ENABLED)
 */
export function useSCMIntegrationsApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { moduleIds, isLoading: modulesLoading } = useTenantModules()

  const hasSCMModule = moduleIds.includes('integrations.scm')

  // Only fetch if SCM module is enabled - prevents 403 MODULE_NOT_ENABLED
  const key = currentTenant && hasSCMModule && !modulesLoading ? `${BASE_URL}/scm` : null

  return useSWR<SCMIntegrationsResponse>(key, fetchSCMIntegrations, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single integration by ID
 */
export function useIntegrationApi(integrationId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && integrationId ? `${BASE_URL}/${integrationId}` : null

  return useSWR<Integration>(key, fetchIntegration, { ...defaultConfig, ...config })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new integration
 */
export function useCreateIntegrationApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    async (url: string, { arg }: { arg: CreateIntegrationRequest }) => {
      return post<Integration>(url, arg)
    }
  )
}

/**
 * Update an integration
 */
export function useUpdateIntegrationApi(integrationId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && integrationId ? `${BASE_URL}/${integrationId}` : null,
    async (url: string, { arg }: { arg: UpdateIntegrationRequest }) => {
      return put<Integration>(url, arg)
    }
  )
}

/**
 * Delete an integration
 */
export function useDeleteIntegrationApi(integrationId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && integrationId ? `${BASE_URL}/${integrationId}` : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Test an integration connection
 */
export function useTestIntegrationApi(integrationId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && integrationId ? `${BASE_URL}/${integrationId}/test` : null,
    async (url: string) => {
      return post<Integration>(url, {})
    }
  )
}

/**
 * Sync an integration (trigger data refresh)
 */
export function useSyncIntegrationApi(integrationId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && integrationId ? `${BASE_URL}/${integrationId}/sync` : null,
    async (url: string) => {
      return post<Integration>(url, {})
    }
  )
}

/**
 * Enable a disabled integration
 */
export function useEnableIntegrationApi(integrationId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && integrationId ? `${BASE_URL}/${integrationId}/enable` : null,
    async (url: string) => {
      return post<Integration>(url, {})
    }
  )
}

/**
 * Disable an integration
 */
export function useDisableIntegrationApi(integrationId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && integrationId ? `${BASE_URL}/${integrationId}/disable` : null,
    async (url: string) => {
      return post<Integration>(url, {})
    }
  )
}

/**
 * Test credentials without creating an integration
 */
export function useTestCredentialsApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `${BASE_URL}/test-credentials` : null,
    async (url: string, { arg }: { arg: TestCredentialsRequest }) => {
      return post<TestCredentialsResponse>(url, arg)
    }
  )
}

// ============================================
// REPOSITORY HOOKS (SCM-specific)
// ============================================

/**
 * Fetch repositories from an SCM integration
 */
export function useIntegrationRepositoriesApi(
  integrationId: string | null,
  options?: { search?: string; page?: number; per_page?: number },
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key =
    currentTenant && integrationId ? buildRepositoriesEndpoint(integrationId, options) : null

  return useSWR<ListSCMRepositoriesResponse>(key, fetchRepositories, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// NOTIFICATION HOOKS
// ============================================

async function fetchNotificationIntegrations(
  url: string
): Promise<NotificationIntegrationsResponse> {
  return get<NotificationIntegrationsResponse>(url)
}

/**
 * Fetch notification integrations with their extensions
 */
export function useNotificationIntegrationsApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? `${BASE_URL}/notifications` : null

  return useSWR<NotificationIntegrationsResponse>(key, fetchNotificationIntegrations, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Create a new notification integration
 */
export function useCreateNotificationIntegrationApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? `${BASE_URL}/notifications` : null,
    async (url: string, { arg }: { arg: CreateNotificationIntegrationRequest }) => {
      return post<Integration>(url, arg)
    }
  )
}

/**
 * Test a notification integration
 */
export function useTestNotificationApi(integrationId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && integrationId ? `${BASE_URL}/${integrationId}/test-notification` : null,
    async (url: string) => {
      return post<TestNotificationResponse>(url, {})
    }
  )
}

/**
 * Send a notification through an integration
 */
export function useSendNotificationApi(integrationId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && integrationId ? `${BASE_URL}/${integrationId}/send` : null,
    async (url: string, { arg }: { arg: SendNotificationRequest }) => {
      return post<TestNotificationResponse>(url, arg)
    }
  )
}

/**
 * Fetch notification events for an integration (audit trail)
 */
export function useNotificationEventsApi(
  integrationId: string | null,
  options?: { limit?: number; offset?: number },
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  // Build URL with query params
  let url = integrationId ? `${BASE_URL}/${integrationId}/notification-events` : null
  if (url) {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())
    const queryString = params.toString()
    if (queryString) url += `?${queryString}`
  }

  const key = currentTenant && integrationId ? url : null

  return useSWR<NotificationEventsResponse>(
    key,
    (u: string) => get<NotificationEventsResponse>(u),
    {
      ...defaultConfig,
      ...config,
    }
  )
}

/**
 * Invalidate notification events cache
 */
export async function invalidateNotificationEventsCache(integrationId: string) {
  const { mutate } = await import('swr')
  await mutate(
    (key) =>
      typeof key === 'string' && key.includes(`/integrations/${integrationId}/notification-events`),
    undefined,
    { revalidate: true }
  )
}

/**
 * Invalidate notification integrations cache
 */
export async function invalidateNotificationIntegrationsCache() {
  const { mutate } = await import('swr')
  await mutate(
    (key) => typeof key === 'string' && key.includes('/integrations/notifications'),
    undefined,
    { revalidate: true }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate all integrations-related caches
 */
export async function invalidateIntegrationsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/integrations'), undefined, {
    revalidate: true,
  })
}

/**
 * Invalidate a specific integration cache
 */
export async function invalidateIntegrationCache(integrationId: string) {
  const { mutate } = await import('swr')
  await mutate(
    (key) => typeof key === 'string' && key.includes(`/integrations/${integrationId}`),
    undefined,
    { revalidate: true }
  )
}

/**
 * Invalidate SCM integrations cache
 */
export async function invalidateSCMIntegrationsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/integrations/scm'), undefined, {
    revalidate: true,
  })
}
