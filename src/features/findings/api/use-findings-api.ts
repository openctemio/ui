/**
 * Finding API Hooks
 *
 * SWR hooks for fetching and mutating finding data from backend
 *
 * Tenant is now determined from JWT token (token-based tenant)
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, patch, put, del } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import type {
  ApiFinding,
  ApiFindingListResponse,
  ApiFindingComment,
  ApiFindingCommentListResponse,
  ApiVulnerability,
  ApiVulnerabilityListResponse,
  FindingApiFilters,
  VulnerabilityApiFilters,
  CreateFindingInput,
  UpdateFindingStatusInput,
  UpdateFindingSeverityInput,
  AssignFindingInput,
  TriageFindingInput,
  ClassifyFindingInput,
  SetFindingTagsInput,
  AddCommentInput,
  UpdateCommentInput,
} from './finding-api.types'

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

function buildFindingsEndpoint(filters?: FindingApiFilters): string {
  const baseUrl = '/api/v1/findings'

  if (!filters) return baseUrl

  const params = new URLSearchParams()

  if (filters.asset_id) params.set('asset_id', filters.asset_id)
  if (filters.component_id) params.set('component_id', filters.component_id)
  if (filters.vulnerability_id) params.set('vulnerability_id', filters.vulnerability_id)
  if (filters.source_id) params.set('source_id', filters.source_id)
  if (filters.tool_name) params.set('tool_name', filters.tool_name)
  if (filters.rule_id) params.set('rule_id', filters.rule_id)
  if (filters.scan_id) params.set('scan_id', filters.scan_id)
  if (filters.file_path) params.set('file_path', filters.file_path)
  if (filters.search) params.set('search', filters.search)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))

  if (filters.severities?.length) params.set('severities', filters.severities.join(','))
  if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','))
  if (filters.sources?.length) params.set('sources', filters.sources.join(','))

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

function buildFindingEndpoint(findingId: string): string {
  return `/api/v1/findings/${findingId}`
}

function buildAssetFindingsEndpoint(
  assetId: string,
  sort?: string,
  page?: number,
  perPage?: number
): string {
  const baseUrl = `/api/v1/assets/${assetId}/findings`
  const params = new URLSearchParams()

  if (sort) params.set('sort', sort)
  if (page) params.set('page', String(page))
  if (perPage) params.set('per_page', String(perPage))

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

function buildVulnerabilitiesEndpoint(filters?: VulnerabilityApiFilters): string {
  const baseUrl = '/api/v1/vulnerabilities'

  if (!filters) return baseUrl

  const params = new URLSearchParams()

  if (filters.page) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))
  if (filters.exploit_available !== undefined) {
    params.set('exploit_available', String(filters.exploit_available))
  }
  if (filters.cisa_kev_only !== undefined) {
    params.set('cisa_kev_only', String(filters.cisa_kev_only))
  }
  if (filters.min_cvss !== undefined) params.set('min_cvss', String(filters.min_cvss))
  if (filters.max_cvss !== undefined) params.set('max_cvss', String(filters.max_cvss))
  if (filters.min_epss !== undefined) params.set('min_epss', String(filters.min_epss))

  if (filters.cve_ids?.length) params.set('cve_ids', filters.cve_ids.join(','))
  if (filters.severities?.length) params.set('severities', filters.severities.join(','))
  if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','))

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchFindings(url: string): Promise<ApiFindingListResponse> {
  return get<ApiFindingListResponse>(url)
}

async function fetchFinding(url: string): Promise<ApiFinding> {
  return get<ApiFinding>(url)
}

async function fetchVulnerabilities(url: string): Promise<ApiVulnerabilityListResponse> {
  return get<ApiVulnerabilityListResponse>(url)
}

async function fetchVulnerability(url: string): Promise<ApiVulnerability> {
  return get<ApiVulnerability>(url)
}

// ============================================
// FINDING HOOKS
// ============================================

/**
 * Fetch findings list for current tenant
 *
 * @example
 * ```typescript
 * function FindingList() {
 *   const { data, error, isLoading } = useFindingsApi({ page: 1, severities: ['critical', 'high'] })
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error error={error} />
 *
 *   return (
 *     <ul>
 *       {data?.data.map(finding => (
 *         <li key={finding.id}>{finding.message}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useFindingsApi(filters?: FindingApiFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  // Ensure user has a tenant before making requests
  const key = currentTenant ? buildFindingsEndpoint(filters) : null

  return useSWR<ApiFindingListResponse>(key, fetchFindings, { ...defaultConfig, ...config })
}

/**
 * Fetch a single finding by ID
 */
export function useFindingApi(findingId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  // Ensure user has a tenant before making requests
  const key = currentTenant && findingId ? buildFindingEndpoint(findingId) : null

  return useSWR<ApiFinding>(key, fetchFinding, { ...defaultConfig, ...config })
}

/**
 * Fetch findings for a specific asset
 */
export function useAssetFindingsApi(
  assetId: string | null,
  sort?: string,
  page?: number,
  perPage?: number,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  // Ensure user has a tenant before making requests
  const key =
    currentTenant && assetId ? buildAssetFindingsEndpoint(assetId, sort, page, perPage) : null

  return useSWR<ApiFindingListResponse>(key, fetchFindings, { ...defaultConfig, ...config })
}

// ============================================
// VULNERABILITY HOOKS (Global CVE Database)
// ============================================

/**
 * Fetch vulnerabilities from global CVE database
 */
export function useVulnerabilitiesApi(
  filters?: VulnerabilityApiFilters,
  config?: SWRConfiguration
) {
  const key = buildVulnerabilitiesEndpoint(filters)

  return useSWR<ApiVulnerabilityListResponse>(key, fetchVulnerabilities, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single vulnerability by ID
 */
export function useVulnerabilityApi(vulnerabilityId: string | null, config?: SWRConfiguration) {
  const key = vulnerabilityId ? `/api/v1/vulnerabilities/${vulnerabilityId}` : null

  return useSWR<ApiVulnerability>(key, fetchVulnerability, { ...defaultConfig, ...config })
}

/**
 * Fetch a vulnerability by CVE ID
 */
export function useVulnerabilityByCveApi(cveId: string | null, config?: SWRConfiguration) {
  const key = cveId ? `/api/v1/vulnerabilities/cve/${cveId}` : null

  return useSWR<ApiVulnerability>(key, fetchVulnerability, { ...defaultConfig, ...config })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new finding
 */
export function useCreateFindingApi() {
  const { currentTenant } = useTenant()

  // Ensure user has a tenant before making requests
  return useSWRMutation(
    currentTenant ? '/api/v1/findings' : null,
    async (url: string, { arg }: { arg: CreateFindingInput }) => {
      return post<ApiFinding>(url, arg)
    }
  )
}

/**
 * Update finding status
 */
export function useUpdateFindingStatusApi(findingId: string) {
  const { currentTenant } = useTenant()

  // Ensure user has a tenant before making requests
  return useSWRMutation(
    currentTenant && findingId ? `${buildFindingEndpoint(findingId)}/status` : null,
    async (url: string, { arg }: { arg: UpdateFindingStatusInput }) => {
      return patch<ApiFinding>(url, arg)
    }
  )
}

/**
 * Delete a finding
 */
export function useDeleteFindingApi(findingId: string) {
  const { currentTenant } = useTenant()

  // Ensure user has a tenant before making requests
  return useSWRMutation(
    currentTenant && findingId ? buildFindingEndpoint(findingId) : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Update finding severity
 */
export function useUpdateFindingSeverityApi(findingId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? `${buildFindingEndpoint(findingId)}/severity` : null,
    async (url: string, { arg }: { arg: UpdateFindingSeverityInput }) => {
      return patch<ApiFinding>(url, arg)
    }
  )
}

/**
 * Assign finding to a user
 */
export function useAssignFindingApi(findingId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? `${buildFindingEndpoint(findingId)}/assign` : null,
    async (url: string, { arg }: { arg: AssignFindingInput }) => {
      return post<ApiFinding>(url, arg)
    }
  )
}

/**
 * Unassign finding from current assignee
 */
export function useUnassignFindingApi(findingId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? `${buildFindingEndpoint(findingId)}/unassign` : null,
    async (url: string) => {
      return post<ApiFinding>(url, {})
    }
  )
}

/**
 * Triage finding (accept, reject, defer)
 */
export function useTriageFindingApi(findingId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? `${buildFindingEndpoint(findingId)}/triage` : null,
    async (url: string, { arg }: { arg: TriageFindingInput }) => {
      return patch<ApiFinding>(url, arg)
    }
  )
}

/**
 * Classify finding (CVE, CWE, OWASP)
 */
export function useClassifyFindingApi(findingId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? `${buildFindingEndpoint(findingId)}/classify` : null,
    async (url: string, { arg }: { arg: ClassifyFindingInput }) => {
      return patch<ApiFinding>(url, arg)
    }
  )
}

/**
 * Verify finding resolution
 */
export function useVerifyFindingApi(findingId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? `${buildFindingEndpoint(findingId)}/verify` : null,
    async (url: string) => {
      return post<ApiFinding>(url, {})
    }
  )
}

/**
 * Set finding tags
 */
export function useSetFindingTagsApi(findingId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? `${buildFindingEndpoint(findingId)}/tags` : null,
    async (url: string, { arg }: { arg: SetFindingTagsInput }) => {
      return put<ApiFinding>(url, arg)
    }
  )
}

// ============================================
// COMMENT HOOKS
// ============================================

async function fetchComments(url: string): Promise<ApiFindingCommentListResponse> {
  return get<ApiFindingCommentListResponse>(url)
}

/**
 * Fetch comments for a finding
 */
export function useFindingCommentsApi(findingId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && findingId ? `${buildFindingEndpoint(findingId)}/comments` : null

  return useSWR<ApiFindingCommentListResponse>(key, fetchComments, { ...defaultConfig, ...config })
}

/**
 * Add comment to a finding
 */
export function useAddFindingCommentApi(findingId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? `${buildFindingEndpoint(findingId)}/comments` : null,
    async (url: string, { arg }: { arg: AddCommentInput }) => {
      return post<ApiFindingComment>(url, arg)
    }
  )
}

/**
 * Update a comment
 */
export function useUpdateFindingCommentApi(findingId: string, commentId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId && commentId
      ? `${buildFindingEndpoint(findingId)}/comments/${commentId}`
      : null,
    async (url: string, { arg }: { arg: UpdateCommentInput }) => {
      return patch<ApiFindingComment>(url, arg)
    }
  )
}

/**
 * Delete a comment
 */
export function useDeleteFindingCommentApi(findingId: string, commentId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId && commentId
      ? `${buildFindingEndpoint(findingId)}/comments/${commentId}`
      : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

// ============================================
// FINDING STATS HOOKS
// ============================================

import type { FindingStatsResponse } from './finding-api.types'

async function fetchFindingStats(url: string): Promise<FindingStatsResponse> {
  return get<FindingStatsResponse>(url)
}

/**
 * Fetch finding stats (total, by severity, by status, by source)
 * Use this for stable stats that don't change when filtering by severity tab
 */
export function useFindingStatsApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? '/api/v1/findings/stats' : null

  return useSWR<FindingStatsResponse>(key, fetchFindingStats, { ...defaultConfig, ...config })
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate findings cache
 */
export async function invalidateFindingsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/findings'), undefined, {
    revalidate: true,
  })
}

/**
 * Invalidate vulnerabilities cache
 */
export async function invalidateVulnerabilitiesCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/vulnerabilities'), undefined, {
    revalidate: true,
  })
}
