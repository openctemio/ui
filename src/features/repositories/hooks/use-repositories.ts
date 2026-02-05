/**
 * Repository Hooks
 *
 * SWR hooks for fetching and mutating repository data
 * Uses unified asset architecture (assets with type='repository' + asset_repositories extension)
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import { usePermissions, Permission } from '@/lib/permissions'
import { useTenantModules } from '@/features/integrations/api/use-tenant-modules'
import type {
  AssetWithRepository,
  CreateRepositoryAssetInput,
  UpdateRepositoryExtensionInput,
} from '@/features/assets/types/asset.types'
import type {
  RepositoryListResponse,
  RepositoryFilters,
  RepositoryStats,
  RepositoryScan,
  TriggerScanInput,
  Branch,
  BranchConfig,
  SCMConnection,
  CreateSCMConnectionInput,
  ImportJob,
  ImportPreview,
  RepositoryImportConfig,
} from '../types/repository.types'

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

function buildRepositoriesEndpoint(filters?: RepositoryFilters): string {
  // Use assets endpoint with types=repository filter
  const baseUrl = '/api/v1/assets'
  const params = new URLSearchParams()

  // Always filter by repository type (API uses 'types' plural)
  params.set('types', 'repository')

  if (filters) {
    // Text search
    if (filters.name) params.set('name', filters.name)
    if (filters.search) params.set('search', filters.search)

    // SCM filters
    if (filters.scmProviders?.length) params.set('scm_providers', filters.scmProviders.join(','))
    if (filters.scmConnectionIds?.length)
      params.set('scm_connection_ids', filters.scmConnectionIds.join(','))
    if (filters.scmOrganizations?.length)
      params.set('scm_organizations', filters.scmOrganizations.join(','))

    // Status filters
    if (filters.visibilities?.length) params.set('visibilities', filters.visibilities.join(','))
    if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','))
    if (filters.syncStatuses?.length) params.set('sync_statuses', filters.syncStatuses.join(','))
    if (filters.complianceStatuses?.length)
      params.set('compliance_statuses', filters.complianceStatuses.join(','))
    if (filters.qualityGateStatuses?.length)
      params.set('quality_gate_statuses', filters.qualityGateStatuses.join(','))

    // Classification filters
    if (filters.criticalities?.length) params.set('criticalities', filters.criticalities.join(','))
    if (filters.scopes?.length) params.set('scopes', filters.scopes.join(','))
    if (filters.exposures?.length) params.set('exposures', filters.exposures.join(','))

    // Other filters
    if (filters.languages?.length) params.set('languages', filters.languages.join(','))
    if (filters.tags?.length) params.set('tags', filters.tags.join(','))
    if (filters.groupIds?.length) params.set('group_ids', filters.groupIds.join(','))
    if (filters.teamIds?.length) params.set('team_ids', filters.teamIds.join(','))
    if (filters.policyIds?.length) params.set('policy_ids', filters.policyIds.join(','))

    // Finding filters
    if (filters.hasFindings !== undefined) params.set('has_findings', String(filters.hasFindings))
    if (filters.hasCriticalFindings !== undefined)
      params.set('has_critical_findings', String(filters.hasCriticalFindings))
    if (filters.minRiskScore !== undefined)
      params.set('min_risk_score', String(filters.minRiskScore))
    if (filters.maxRiskScore !== undefined)
      params.set('max_risk_score', String(filters.maxRiskScore))

    // Date filters
    if (filters.lastScannedAfter) params.set('last_scanned_after', filters.lastScannedAfter)
    if (filters.lastScannedBefore) params.set('last_scanned_before', filters.lastScannedBefore)
    if (filters.createdAfter) params.set('created_after', filters.createdAfter)
    if (filters.createdBefore) params.set('created_before', filters.createdBefore)

    // Pagination & sorting
    if (filters.sortBy) params.set('sort_by', filters.sortBy)
    if (filters.sortOrder) params.set('sort_order', filters.sortOrder)
    if (filters.page) params.set('page', String(filters.page))
    if (filters.perPage) params.set('per_page', String(filters.perPage))
  }

  const queryString = params.toString()
  return `${baseUrl}?${queryString}`
}

function buildRepositoryEndpoint(assetId: string): string {
  return `/api/v1/assets/${assetId}/full`
}

function buildRepositoryExtensionEndpoint(assetId: string): string {
  return `/api/v1/assets/${assetId}/repository`
}

function buildSCMConnectionsEndpoint(): string {
  return '/api/v1/integrations/scm'
}

function buildSCMConnectionEndpoint(connectionId: string): string {
  return `/api/v1/integrations/${connectionId}`
}

function buildImportEndpoint(): string {
  return '/api/v1/assets/repository/import'
}

function buildImportPreviewEndpoint(): string {
  return '/api/v1/assets/repository/import/preview'
}

function buildImportJobEndpoint(jobId: string): string {
  return `/api/v1/assets/repository/import/${jobId}`
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchRepositories(url: string): Promise<RepositoryListResponse> {
  return get<RepositoryListResponse>(url)
}

async function fetchRepository(url: string): Promise<AssetWithRepository> {
  return get<AssetWithRepository>(url)
}

async function fetchRepositoryStats(url: string): Promise<RepositoryStats> {
  return get<RepositoryStats>(url)
}

// API response uses Integration format from new integrations API
interface IntegrationSCMExtension {
  scm_organization?: string
  repository_count: number
  webhook_id?: string
  webhook_url?: string
  default_branch_pattern?: string
  auto_import_repos: boolean
  import_private_repos: boolean
  import_archived_repos: boolean
  include_patterns?: string[]
  exclude_patterns?: string[]
  last_repo_sync_at?: string
}

interface IntegrationAPIResponse {
  id: string
  tenant_id?: string
  name: string
  description?: string
  provider: string
  category: string
  status: string
  status_message?: string
  auth_type: string
  base_url?: string
  credentials_masked?: string
  last_sync_at?: string
  next_sync_at?: string
  sync_interval_minutes?: number
  sync_error?: string
  stats?: {
    total_assets: number
    total_findings: number
    total_repositories?: number
  }
  config?: Record<string, unknown>
  metadata?: Record<string, unknown>
  scm_extension?: IntegrationSCMExtension
  created_at: string
  updated_at: string
  created_by?: string
}

interface IntegrationsListResponse {
  data: IntegrationAPIResponse[]
}

function transformSCMConnection(api: IntegrationAPIResponse): SCMConnection {
  return {
    id: api.id,
    tenantId: api.tenant_id || '',
    name: api.name,
    provider: api.provider as SCMConnection['provider'],
    baseUrl: api.base_url || '',
    authType: api.auth_type as SCMConnection['authType'],
    scmOrganization: api.scm_extension?.scm_organization,
    status: api.status as SCMConnection['status'],
    lastValidatedAt: api.last_sync_at,
    errorMessage: api.status_message,
    repositoryCount: api.scm_extension?.repository_count || 0,
    permissions: [] as SCMConnection['permissions'],
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    createdBy: api.created_by || '',
  }
}

async function fetchSCMConnections(url: string): Promise<SCMConnection[]> {
  const response = await get<IntegrationsListResponse>(url)
  // Handle both new format { data: [...] } and legacy direct array format
  const data = Array.isArray(response) ? response : response.data || []
  return data.map(transformSCMConnection)
}

async function fetchSCMConnection(url: string): Promise<SCMConnection> {
  const response = await get<IntegrationAPIResponse>(url)
  return transformSCMConnection(response)
}

async function fetchRepositoryScans(url: string): Promise<RepositoryScan[]> {
  return get<RepositoryScan[]>(url)
}

async function fetchRepositoryBranches(url: string): Promise<Branch[]> {
  return get<Branch[]>(url)
}

async function fetchImportJob(url: string): Promise<ImportJob> {
  return get<ImportJob>(url)
}

// ============================================
// REPOSITORY HOOKS
// ============================================

/**
 * Fetch repositories list for current tenant
 *
 * @example
 * ```typescript
 * function RepositoryList() {
 *   const { data, error, isLoading } = useRepositories({ page: 1, perPage: 20 })
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error error={error} />
 *
 *   return (
 *     <ul>
 *       {data?.data.map(repo => (
 *         <li key={repo.id}>{repo.name}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useRepositories(filters?: RepositoryFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  // Only fetch if user has permission (repositories are assets with type=repository)
  const shouldFetch = currentTenant && canReadAssets

  const key = shouldFetch ? buildRepositoriesEndpoint(filters) : null

  return useSWR<RepositoryListResponse>(key, fetchRepositories, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single repository by asset ID
 *
 * @example
 * ```typescript
 * function RepositoryDetail({ id }: { id: string }) {
 *   const { data: repository, error, isLoading } = useRepository(id)
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error error={error} />
 *
 *   return <h1>{repository?.name}</h1>
 * }
 * ```
 */
export function useRepository(assetId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && assetId && canReadAssets

  const key = shouldFetch ? buildRepositoryEndpoint(assetId) : null

  return useSWR<AssetWithRepository>(key, fetchRepository, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch repository statistics
 * Only fetches if user has assets:read permission
 */
export function useRepositoryStats(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && canReadAssets

  const key = shouldFetch ? '/api/v1/assets/stats?type=repository' : null

  return useSWR<RepositoryStats>(key, fetchRepositoryStats, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch scans for a repository
 * Only fetches if user has scans:read permission
 */
export function useRepositoryScans(assetId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadScans = can(Permission.ScansRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && assetId && canReadScans

  const key = shouldFetch ? `/api/v1/assets/${assetId}/scans` : null

  return useSWR<RepositoryScan[]>(key, fetchRepositoryScans, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch branches for a repository
 * Only fetches if user has assets:read permission
 */
export function useRepositoryBranches(assetId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && assetId && canReadAssets

  const key = shouldFetch ? `/api/v1/assets/${assetId}/branches` : null

  return useSWR<Branch[]>(key, fetchRepositoryBranches, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// REPOSITORY MUTATION HOOKS
// ============================================

/**
 * Create a new repository asset
 */
export function useCreateRepository() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? '/api/v1/assets/repository' : null,
    async (url: string, { arg }: { arg: CreateRepositoryAssetInput }) => {
      // Convert camelCase to snake_case for backend
      const payload = {
        // Basic info
        name: arg.name,
        description: arg.description,
        criticality: arg.criticality || 'medium',
        scope: arg.scope,
        exposure: arg.exposure,
        tags: arg.tags,
        // SCM connection info
        provider: arg.provider,
        external_id: arg.externalId,
        repo_id: arg.repoId,
        full_name: arg.fullName,
        scm_organization: arg.scmOrganization,
        // URLs
        clone_url: arg.cloneUrl,
        web_url: arg.webUrl,
        ssh_url: arg.sshUrl,
        // Repository settings
        default_branch: arg.defaultBranch,
        visibility: arg.visibility,
        language: arg.language,
        languages: arg.languages,
        topics: arg.topics,
        // Stats
        stars: arg.stars,
        forks: arg.forks,
        watchers: arg.watchers,
        open_issues: arg.openIssues,
        size_kb: arg.sizeKb,
        // Scan settings
        scan_enabled: arg.scanEnabled,
        scan_schedule: arg.scanSchedule,
        // Timestamps from SCM
        repo_created_at: arg.repoCreatedAt,
        repo_updated_at: arg.repoUpdatedAt,
        repo_pushed_at: arg.repoPushedAt,
      }
      return post<AssetWithRepository>(url, payload)
    }
  )
}

/**
 * Update a repository extension
 */
export function useUpdateRepository(assetId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && assetId ? buildRepositoryExtensionEndpoint(assetId) : null,
    async (url: string, { arg }: { arg: UpdateRepositoryExtensionInput }) => {
      return put<AssetWithRepository>(url, arg)
    }
  )
}

/**
 * Delete a repository asset
 */
export function useDeleteRepository(assetId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && assetId ? `/api/v1/assets/${assetId}` : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Trigger a scan for a repository
 */
export function useTriggerRepositoryScan(assetId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && assetId ? `/api/v1/assets/${assetId}/scan` : null,
    async (url: string, { arg }: { arg: TriggerScanInput }) => {
      return post<RepositoryScan>(url, arg)
    }
  )
}

/**
 * Sync a repository with SCM
 */
export function useSyncRepository(assetId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && assetId ? `/api/v1/assets/${assetId}/sync` : null,
    async (url: string) => {
      return post<AssetWithRepository>(url, {})
    }
  )
}

/**
 * Bulk sync result for a single asset
 */
export interface BulkSyncResultItem {
  asset_id: string
  success: boolean
  message?: string
  updated_fields?: string[]
  error?: string
}

/**
 * Bulk sync response
 */
export interface BulkSyncResponse {
  total_count: number
  success_count: number
  failed_count: number
  synced_at: string
  results: BulkSyncResultItem[]
}

/**
 * Bulk sync input
 */
export interface BulkSyncInput {
  asset_ids: string[]
}

/**
 * Bulk sync multiple repositories with SCM
 * Uses POST /api/v1/assets/bulk-sync
 */
export function useBulkSyncRepositories() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? '/api/v1/assets/bulk-sync' : null,
    async (url: string, { arg }: { arg: BulkSyncInput }) => {
      return post<BulkSyncResponse>(url, arg)
    }
  )
}

/**
 * Update branch configuration
 */
export function useUpdateBranchConfig(assetId: string, branchName: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && assetId && branchName
      ? `/api/v1/assets/${assetId}/branches/${encodeURIComponent(branchName)}`
      : null,
    async (url: string, { arg }: { arg: BranchConfig }) => {
      return put<Branch>(url, arg)
    }
  )
}

/**
 * Activate a repository asset
 */
export function useActivateRepository(assetId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && assetId ? `/api/v1/assets/${assetId}/activate` : null,
    async (url: string) => {
      return post<AssetWithRepository>(url, {})
    }
  )
}

/**
 * Deactivate a repository asset
 */
export function useDeactivateRepository(assetId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && assetId ? `/api/v1/assets/${assetId}/deactivate` : null,
    async (url: string) => {
      return post<AssetWithRepository>(url, {})
    }
  )
}

/**
 * Archive a repository asset
 */
export function useArchiveRepository(assetId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && assetId ? `/api/v1/assets/${assetId}/archive` : null,
    async (url: string) => {
      return post<AssetWithRepository>(url, {})
    }
  )
}

// ============================================
// SCM CONNECTION HOOKS
// ============================================

/**
 * Fetch all SCM connections
 * Only fetches if:
 * - User has scm-connections:read permission
 * - Tenant has SCM module enabled (prevents 403 MODULE_NOT_ENABLED)
 */
export function useSCMConnections(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const { moduleIds, isLoading: modulesLoading } = useTenantModules()

  const canReadScmConnections = can(Permission.ScmConnectionsRead)
  const hasSCMModule = moduleIds.includes('integrations.scm')

  // Only fetch if user has permission AND SCM module is enabled
  // This prevents 403 MODULE_NOT_ENABLED errors for tenants without SCM module
  const shouldFetch = currentTenant && canReadScmConnections && hasSCMModule && !modulesLoading

  const key = shouldFetch ? buildSCMConnectionsEndpoint() : null

  return useSWR<SCMConnection[]>(key, fetchSCMConnections, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single SCM connection
 * Only fetches if:
 * - User has scm-connections:read permission
 * - Tenant has SCM module enabled
 */
export function useSCMConnection(connectionId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const { moduleIds, isLoading: modulesLoading } = useTenantModules()

  const canReadScmConnections = can(Permission.ScmConnectionsRead)
  const hasSCMModule = moduleIds.includes('integrations.scm')

  // Only fetch if user has permission AND SCM module is enabled
  const shouldFetch =
    currentTenant && connectionId && canReadScmConnections && hasSCMModule && !modulesLoading

  const key = shouldFetch ? buildSCMConnectionEndpoint(connectionId) : null

  return useSWR<SCMConnection>(key, fetchSCMConnection, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Create a new SCM connection
 */
export function useCreateSCMConnection() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? buildSCMConnectionsEndpoint() : null,
    async (url: string, { arg }: { arg: CreateSCMConnectionInput }) => {
      // Convert camelCase to snake_case for backend
      return post<SCMConnection>(url, {
        name: arg.name,
        provider: arg.provider,
        base_url: arg.baseUrl,
        auth_type: arg.authType,
        access_token: arg.accessToken,
        scm_organization: arg.scmOrganization,
      })
    }
  )
}

/**
 * Delete an SCM connection
 */
export function useDeleteSCMConnection(connectionId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && connectionId ? buildSCMConnectionEndpoint(connectionId) : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Update SCM connection input
 */
export interface UpdateSCMConnectionInput {
  name?: string
  accessToken?: string
  scmOrganization?: string
}

/**
 * Update an SCM connection
 */
export function useUpdateSCMConnection(connectionId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && connectionId ? buildSCMConnectionEndpoint(connectionId) : null,
    async (url: string, { arg }: { arg: UpdateSCMConnectionInput }) => {
      // Convert camelCase to snake_case for backend
      const response = await put<IntegrationAPIResponse>(url, {
        name: arg.name,
        access_token: arg.accessToken,
        scm_organization: arg.scmOrganization,
      })
      return transformSCMConnection(response)
    }
  )
}

/**
 * Test an SCM connection (validates credentials and updates status)
 */
export function useValidateSCMConnection(connectionId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && connectionId ? `${buildSCMConnectionEndpoint(connectionId)}/test` : null,
    async (url: string) => {
      const response = await post<IntegrationAPIResponse>(url, {})
      return transformSCMConnection(response)
    }
  )
}

/**
 * SCM Repository from provider (not yet imported)
 */
export interface SCMRepository {
  id: string
  name: string
  full_name: string
  description: string
  html_url: string
  clone_url: string
  ssh_url: string
  default_branch: string
  is_private: boolean
  is_fork: boolean
  is_archived: boolean
  language: string
  languages?: Record<string, number>
  topics: string[]
  stars: number
  forks: number
  size: number
  created_at: string
  updated_at: string
  pushed_at: string
}

/**
 * Response from listing SCM repositories
 */
export interface SCMRepositoriesResponse {
  repositories: SCMRepository[]
  total: number
  has_more: boolean
  next_page: number
}

/**
 * Options for listing SCM repositories
 */
export interface SCMRepositoriesOptions {
  search?: string
  page?: number
  perPage?: number
}

function buildSCMRepositoriesEndpoint(
  connectionId: string,
  options?: SCMRepositoriesOptions
): string {
  const baseUrl = `/api/v1/integrations/${connectionId}/repositories`
  const params = new URLSearchParams()

  if (options?.search) params.set('search', options.search)
  if (options?.page) params.set('page', String(options.page))
  if (options?.perPage) params.set('per_page', String(options.perPage))

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

async function fetchSCMRepositories(url: string): Promise<SCMRepositoriesResponse> {
  return get<SCMRepositoriesResponse>(url)
}

/**
 * Fetch repositories from an SCM connection (from the provider, not yet imported)
 * Only fetches if:
 * - User has scm-connections:read permission
 * - Tenant has SCM module enabled
 */
export function useSCMRepositories(
  connectionId: string | null,
  options?: SCMRepositoriesOptions,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const { moduleIds, isLoading: modulesLoading } = useTenantModules()

  const canReadScmConnections = can(Permission.ScmConnectionsRead)
  const hasSCMModule = moduleIds.includes('integrations.scm')

  // Only fetch if user has permission AND SCM module is enabled
  const shouldFetch =
    currentTenant && connectionId && canReadScmConnections && hasSCMModule && !modulesLoading

  const key = shouldFetch ? buildSCMRepositoriesEndpoint(connectionId, options) : null

  return useSWR<SCMRepositoriesResponse>(key, fetchSCMRepositories, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// IMPORT HOOKS
// ============================================

/**
 * Preview import results before actually importing
 */
export function useImportPreview() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? buildImportPreviewEndpoint() : null,
    async (url: string, { arg }: { arg: RepositoryImportConfig }) => {
      return post<ImportPreview>(url, arg)
    }
  )
}

/**
 * Start repository import
 */
export function useStartImport() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? buildImportEndpoint() : null,
    async (url: string, { arg }: { arg: RepositoryImportConfig }) => {
      return post<ImportJob>(url, arg)
    }
  )
}

/**
 * Fetch import job status
 * Only fetches if user has assets:read permission
 */
export function useImportJob(jobId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  // Only fetch if user has permission
  const shouldFetch = currentTenant && jobId && canReadAssets

  const key = shouldFetch ? buildImportJobEndpoint(jobId) : null

  return useSWR<ImportJob>(key, fetchImportJob, {
    ...defaultConfig,
    // Poll more frequently for running jobs
    refreshInterval: 5000,
    ...config,
  })
}

/**
 * Cancel an import job
 */
export function useCancelImport(jobId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && jobId ? `${buildImportJobEndpoint(jobId)}/cancel` : null,
    async (url: string) => {
      return post<ImportJob>(url, {})
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Get cache key for repositories list
 */
export function getRepositoriesKey(filters?: RepositoryFilters) {
  return buildRepositoriesEndpoint(filters)
}

/**
 * Get cache key for single repository
 */
export function getRepositoryKey(assetId: string) {
  return buildRepositoryEndpoint(assetId)
}

/**
 * Get cache key for SCM connections
 */
export function getSCMConnectionsKey() {
  return buildSCMConnectionsEndpoint()
}

/**
 * Invalidate repositories cache
 */
export async function invalidateRepositoriesCache() {
  const { mutate } = await import('swr')
  // Match any assets endpoint with types=repository (note: 'types' with 's')
  await mutate(
    (key) =>
      typeof key === 'string' && key.includes('/api/v1/assets') && key.includes('types=repository'),
    undefined,
    { revalidate: true }
  )
}

/**
 * Invalidate SCM connections cache
 */
export async function invalidateSCMConnectionsCache() {
  const { mutate } = await import('swr')
  await mutate(
    (key) => typeof key === 'string' && key.includes('/api/v1/integrations'),
    undefined,
    { revalidate: true }
  )
}
