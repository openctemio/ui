/**
 * Credential Leak API Hooks
 *
 * SWR hooks for fetching and mutating credential leak data from backend
 *
 * Tenant is determined from JWT token (token-based tenant)
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import type {
  ApiCredential,
  ApiCredentialListResponse,
  ApiCredentialStats,
  ApiCredentialEnums,
  CredentialApiFilters,
  ApiIdentityListResponse,
} from './credential-api.types'

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

function buildCredentialsEndpoint(filters?: CredentialApiFilters): string {
  const baseUrl = '/api/v1/credentials'

  if (!filters) return baseUrl

  const params = new URLSearchParams()

  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  if (filters.search) params.set('search', filters.search)
  if (filters.sort) params.set('sort', filters.sort)

  if (filters.severity?.length) params.set('severity', filters.severity.join(','))
  if (filters.state?.length) params.set('state', filters.state.join(','))
  if (filters.source?.length) params.set('source', filters.source.join(','))

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

function buildCredentialEndpoint(credentialId: string): string {
  return `/api/v1/credentials/${credentialId}`
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchCredentials(url: string): Promise<ApiCredentialListResponse> {
  return get<ApiCredentialListResponse>(url)
}

async function fetchCredential(url: string): Promise<ApiCredential> {
  return get<ApiCredential>(url)
}

async function fetchCredentialStats(url: string): Promise<ApiCredentialStats> {
  return get<ApiCredentialStats>(url)
}

async function fetchCredentialEnums(url: string): Promise<ApiCredentialEnums> {
  return get<ApiCredentialEnums>(url)
}

// ============================================
// CREDENTIAL HOOKS
// ============================================

/**
 * Fetch credentials list for current tenant
 *
 * @example
 * ```typescript
 * function CredentialList() {
 *   const { data, error, isLoading } = useCredentialsApi({ page: 1, severity: ['critical'] })
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error error={error} />
 *
 *   return (
 *     <ul>
 *       {data?.items.map(cred => (
 *         <li key={cred.id}>{cred.identifier}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useCredentialsApi(filters?: CredentialApiFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  // Ensure user has a tenant before making requests
  const key = currentTenant ? buildCredentialsEndpoint(filters) : null

  return useSWR<ApiCredentialListResponse>(key, fetchCredentials, { ...defaultConfig, ...config })
}

/**
 * Fetch a single credential by ID
 */
export function useCredentialApi(credentialId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  // Ensure user has a tenant before making requests
  const key = currentTenant && credentialId ? buildCredentialEndpoint(credentialId) : null

  return useSWR<ApiCredential>(key, fetchCredential, { ...defaultConfig, ...config })
}

/**
 * Fetch credential stats (total, by severity, by state)
 */
export function useCredentialStatsApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? '/api/v1/credentials/stats' : null

  return useSWR<ApiCredentialStats>(key, fetchCredentialStats, { ...defaultConfig, ...config })
}

/**
 * Fetch credential enums (credential types, source types, etc.)
 */
export function useCredentialEnumsApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? '/api/v1/credentials/enums' : null

  return useSWR<ApiCredentialEnums>(key, fetchCredentialEnums, { ...defaultConfig, ...config })
}

/**
 * Fetch credentials grouped by identity (username/email)
 */
export function useCredentialIdentitiesApi(
  filters?: CredentialApiFilters,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const buildUrl = (): string => {
    const baseUrl = '/api/v1/credentials/identities'
    if (!filters) return baseUrl

    const params = new URLSearchParams()
    if (filters.page) params.set('page', String(filters.page))
    if (filters.page_size) params.set('page_size', String(filters.page_size))
    if (filters.search) params.set('search', filters.search)
    if (filters.state?.length) params.set('state', filters.state.join(','))

    const queryString = params.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }

  const key = currentTenant ? buildUrl() : null

  return useSWR<ApiIdentityListResponse>(key, (url: string) => get<ApiIdentityListResponse>(url), {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch related credentials (same identity) for a given credential
 */
export function useRelatedCredentialsApi(credentialId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && credentialId ? `/api/v1/credentials/${credentialId}/related` : null

  return useSWR<ApiCredential[]>(key, (url: string) => get<ApiCredential[]>(url), {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch exposures for a specific identity (lazy loading)
 *
 * @example
 * ```typescript
 * function IdentityExposures({ identity }: { identity: string }) {
 *   const { data, isLoading } = useIdentityExposuresApi(identity)
 *
 *   if (isLoading) return <Loading />
 *   return <ExposuresList exposures={data?.items} />
 * }
 * ```
 */
export function useIdentityExposuresApi(
  identity: string | null,
  filters?: { page?: number; page_size?: number },
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const buildUrl = (): string | null => {
    if (!identity) return null

    const encodedIdentity = encodeURIComponent(identity)
    const baseUrl = `/api/v1/credentials/identities/${encodedIdentity}/exposures`

    if (!filters) return baseUrl

    const params = new URLSearchParams()
    if (filters.page) params.set('page', String(filters.page))
    if (filters.page_size) params.set('page_size', String(filters.page_size))

    const queryString = params.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }

  const key = currentTenant && identity ? buildUrl() : null

  return useSWR<ApiCredentialListResponse>(
    key,
    (url: string) => get<ApiCredentialListResponse>(url),
    { ...defaultConfig, ...config }
  )
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Resolve a credential (mark as resolved)
 */
export function useResolveCredentialApi(credentialId: string | null) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && credentialId ? `${buildCredentialEndpoint(credentialId)}/resolve` : null,
    async (url: string, { arg }: { arg: { notes?: string } }) => {
      return post<ApiCredential>(url, arg)
    }
  )
}

/**
 * Accept a credential (mark as accepted risk)
 */
export function useAcceptCredentialApi(credentialId: string | null) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && credentialId ? `${buildCredentialEndpoint(credentialId)}/accept` : null,
    async (url: string, { arg }: { arg: { notes?: string } }) => {
      return post<ApiCredential>(url, arg)
    }
  )
}

/**
 * Mark a credential as false positive
 */
export function useMarkFalsePositiveApi(credentialId: string | null) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && credentialId
      ? `${buildCredentialEndpoint(credentialId)}/false-positive`
      : null,
    async (url: string, { arg }: { arg: { notes?: string } }) => {
      return post<ApiCredential>(url, arg)
    }
  )
}

/**
 * Reactivate a resolved credential
 */
export function useReactivateCredentialApi(credentialId: string | null) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && credentialId ? `${buildCredentialEndpoint(credentialId)}/reactivate` : null,
    async (url: string) => {
      return post<ApiCredential>(url, {})
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate credentials cache
 */
export async function invalidateCredentialsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/credentials'), undefined, {
    revalidate: true,
  })
}
