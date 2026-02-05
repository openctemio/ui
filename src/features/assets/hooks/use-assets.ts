'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { get, post, put, del } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { useTenant } from '@/context/tenant-provider'
import { usePermissions, Permission } from '@/lib/permissions'
import type {
  Asset,
  AssetType,
  AssetScope,
  ExposureLevel,
  Criticality,
  CreateAssetInput,
  UpdateAssetInput,
  RepositoryExtension,
  AssetWithRepository,
  CreateRepositoryAssetInput,
  UpdateRepositoryExtensionInput,
  RepoVisibility,
} from '../types'

/**
 * Backend paginated response format (matches Go ListResponse struct)
 */
interface BackendListResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
  links?: {
    self?: string
    first?: string
    prev?: string
    next?: string
    last?: string
  }
}

/**
 * Asset-specific search filters
 * Maps to backend ListAssetsInput struct
 */
export interface AssetSearchFilters {
  // Pagination
  page?: number
  pageSize?: number

  // Filtering
  name?: string
  types?: AssetType[]
  criticalities?: Criticality[]
  statuses?: ('active' | 'inactive' | 'archived')[]
  scopes?: AssetScope[]
  exposures?: ExposureLevel[]
  tags?: string[]

  // Search
  search?: string

  // Risk score range
  minRiskScore?: number
  maxRiskScore?: number

  // Has findings filter
  hasFindings?: boolean

  // Sorting (e.g., "-created_at", "name", "-risk_score")
  sort?: string

  // Skip fetching (for lazy loading dialogs)
  skip?: boolean
}

// Backend asset type mapping (matches Go AssetResponse struct)
interface BackendAsset {
  id: string
  tenant_id?: string
  name: string
  type: string // Backend uses "type" in JSON
  criticality: string // low, medium, high, critical
  status: string // active, inactive, archived
  scope: string // internal, external, cloud, partner, vendor, shadow
  exposure: string // public, restricted, private, isolated, unknown
  risk_score: number // 0-100
  finding_count: number
  description?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  first_seen: string
  last_seen: string
  created_at: string
  updated_at: string
}

// Transform backend asset to frontend format
function transformAsset(backend: BackendAsset): Asset {
  return {
    id: backend.id,
    name: backend.name,
    type: backend.type as AssetType,
    criticality: backend.criticality as Criticality,
    status: backend.status as 'active' | 'inactive' | 'archived',
    description: backend.description,
    scope: backend.scope as AssetScope,
    exposure: backend.exposure as ExposureLevel,
    riskScore: backend.risk_score,
    findingCount: backend.finding_count,
    metadata: backend.metadata || {},
    tags: backend.tags || [],
    firstSeen: backend.first_seen,
    lastSeen: backend.last_seen,
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
  }
}

// Asset stats from backend - matches /api/v1/assets/stats response
interface BackendAssetStats {
  total: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  by_criticality: Record<string, number>
  by_scope: Record<string, number>
  by_exposure: Record<string, number>
  with_findings: number
  risk_score_avg: number
  findings_total: number
  high_risk_count?: number // Assets with risk_score >= 70
}

export interface AssetStatsData {
  total: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  byCriticality: Record<string, number>
  byScope: Record<string, number>
  byExposure: Record<string, number>
  withFindings: number
  averageRiskScore: number
  totalFindings: number
  highRiskCount: number
}

function transformAssetStats(backend: BackendAssetStats): AssetStatsData {
  return {
    total: backend.total || 0,
    byType: backend.by_type || {},
    byStatus: backend.by_status || {},
    byCriticality: backend.by_criticality || {},
    byScope: backend.by_scope || {},
    byExposure: backend.by_exposure || {},
    withFindings: backend.with_findings || 0,
    averageRiskScore: backend.risk_score_avg || 0,
    totalFindings: backend.findings_total || 0,
    highRiskCount: backend.high_risk_count || 0,
  }
}

// Backend repository extension type (matches Go RepositoryExtensionResponse struct)
interface BackendRepositoryExtension {
  asset_id: string
  repo_id?: string
  full_name: string
  scm_organization?: string
  clone_url?: string
  web_url?: string
  ssh_url?: string
  default_branch?: string
  visibility: string
  language?: string
  languages?: Record<string, number>
  topics?: string[]
  stars: number
  forks: number
  watchers: number
  open_issues: number
  contributors_count: number
  size_kb: number
  branch_count: number
  protected_branch_count: number
  component_count: number
  vulnerable_component_count: number
  finding_count: number
  scan_enabled: boolean
  scan_schedule?: string
  last_scanned_at?: string
  repo_created_at?: string
  repo_updated_at?: string
  repo_pushed_at?: string
}

// Transform backend repository extension to frontend format
function transformRepositoryExtension(backend: BackendRepositoryExtension): RepositoryExtension {
  return {
    assetId: backend.asset_id,
    repoId: backend.repo_id,
    fullName: backend.full_name,
    scmOrganization: backend.scm_organization,
    cloneUrl: backend.clone_url,
    webUrl: backend.web_url,
    sshUrl: backend.ssh_url,
    defaultBranch: backend.default_branch,
    visibility: backend.visibility as RepoVisibility,
    language: backend.language,
    languages: backend.languages,
    topics: backend.topics,
    stars: backend.stars,
    forks: backend.forks,
    watchers: backend.watchers,
    openIssues: backend.open_issues,
    contributorsCount: backend.contributors_count,
    sizeKb: backend.size_kb,
    branchCount: backend.branch_count,
    protectedBranchCount: backend.protected_branch_count,
    componentCount: backend.component_count,
    vulnerableComponentCount: backend.vulnerable_component_count,
    findingCount: backend.finding_count,
    scanEnabled: backend.scan_enabled,
    scanSchedule: backend.scan_schedule,
    lastScannedAt: backend.last_scanned_at,
    repoCreatedAt: backend.repo_created_at,
    repoUpdatedAt: backend.repo_updated_at,
    repoPushedAt: backend.repo_pushed_at,
  }
}

// Backend asset with repository response (matches Go AssetWithRepositoryResponse struct)
interface BackendAssetWithRepository extends BackendAsset {
  repository?: BackendRepositoryExtension
}

// Transform backend asset with repository to frontend format
function transformAssetWithRepository(backend: BackendAssetWithRepository): AssetWithRepository {
  return {
    ...transformAsset(backend),
    repository: backend.repository ? transformRepositoryExtension(backend.repository) : undefined,
  }
}

/**
 * Build query params from AssetSearchFilters
 * Converts frontend filter format to backend query string
 */
function buildAssetQueryParams(filters?: AssetSearchFilters): Record<string, string> {
  if (!filters) return {}

  const params: Record<string, string> = {}

  // Pagination
  if (filters.page) params.page = String(filters.page)
  if (filters.pageSize) params.per_page = String(filters.pageSize)

  // Filtering - arrays need to be comma-separated for backend
  if (filters.name) params.name = filters.name
  if (filters.types?.length) params.types = filters.types.join(',')
  if (filters.criticalities?.length) params.criticalities = filters.criticalities.join(',')
  if (filters.statuses?.length) params.statuses = filters.statuses.join(',')
  if (filters.scopes?.length) params.scopes = filters.scopes.join(',')
  if (filters.exposures?.length) params.exposures = filters.exposures.join(',')
  if (filters.tags?.length) params.tags = filters.tags.join(',')

  // Search
  if (filters.search) params.search = filters.search

  // Risk score range
  if (filters.minRiskScore !== undefined) params.min_risk_score = String(filters.minRiskScore)
  if (filters.maxRiskScore !== undefined) params.max_risk_score = String(filters.maxRiskScore)

  // Has findings
  if (filters.hasFindings !== undefined) params.has_findings = String(filters.hasFindings)

  // Sorting
  if (filters.sort) params.sort = filters.sort

  return params
}

/**
 * Hook to fetch paginated assets list
 * Only fetches if user has assets:read permission
 */
export function useAssets(filters?: AssetSearchFilters) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  // Build query string from filters
  const queryParams = buildAssetQueryParams(filters)
  const queryString =
    Object.keys(queryParams).length > 0 ? '?' + new URLSearchParams(queryParams).toString() : ''

  // Only fetch if user has permission, tenant context, and not skipped
  const shouldFetch = currentTenant && canReadAssets && !filters?.skip

  const { data, error, isLoading, mutate } = useSWR<BackendListResponse<BackendAsset>>(
    shouldFetch ? ['assets', filters] : null,
    () => get<BackendListResponse<BackendAsset>>(`/api/v1/assets${queryString}`),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  const memoizedResult = useMemo(
    () => ({
      assets: data?.data?.map(transformAsset) || [],
      total: data?.total || 0,
      page: data?.page || 1,
      pageSize: data?.per_page || 20,
      totalPages: data?.total_pages || 1,
      isLoading: shouldFetch ? isLoading : false,
      isError: !!error,
      error,
      mutate,
    }),
    [data, shouldFetch, isLoading, error, mutate]
  )

  return memoizedResult
}

/**
 * Hook to fetch a single asset by ID
 * Only fetches if user has assets:read permission
 */
export function useAsset(assetId: string | null) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  // Only fetch if user has permission and tenant context
  const shouldFetch = assetId && currentTenant && canReadAssets

  const { data, error, isLoading, mutate } = useSWR<BackendAsset>(
    shouldFetch ? ['asset', assetId] : null,
    () => get<BackendAsset>(endpoints.assets.get(assetId!)),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    asset: data ? transformAsset(data) : null,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}

/**
 * Hook to fetch assets by type
 */
export function useAssetsByType(
  type: AssetType,
  additionalFilters?: Omit<AssetSearchFilters, 'types'>
) {
  const { assets, total, isLoading, isError, error, mutate, totalPages, page, pageSize } =
    useAssets({
      types: [type],
      ...additionalFilters,
    })

  return {
    assets,
    total,
    totalPages,
    page,
    pageSize,
    isLoading,
    isError,
    error,
    mutate,
  }
}

/**
 * Create a new asset
 */
export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const response = await post<BackendAsset>(endpoints.assets.create(), {
    name: input.name,
    type: input.type,
    criticality: input.criticality || 'medium', // Default to medium if not specified
    description: input.description,
    scope: input.scope || 'internal',
    exposure: input.exposure || 'unknown',
    tags: input.tags,
  })
  return transformAsset(response)
}

/**
 * Update an existing asset
 */
export async function updateAsset(assetId: string, input: UpdateAssetInput): Promise<Asset> {
  const response = await put<BackendAsset>(endpoints.assets.update(assetId), {
    name: input.name,
    criticality: input.criticality,
    description: input.description,
    scope: input.scope,
    exposure: input.exposure,
    tags: input.tags,
  })
  return transformAsset(response)
}

/**
 * Delete an asset
 */
export async function deleteAsset(assetId: string): Promise<void> {
  await del(endpoints.assets.delete(assetId))
}

/**
 * Bulk delete multiple assets
 * Deletes assets sequentially to avoid overwhelming the server
 */
export async function bulkDeleteAssets(assetIds: string[]): Promise<void> {
  // Delete assets in parallel with a concurrency limit
  const BATCH_SIZE = 5
  for (let i = 0; i < assetIds.length; i += BATCH_SIZE) {
    const batch = assetIds.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map((id) => del(endpoints.assets.delete(id))))
  }
}

/**
 * Hook for asset stats (uses dedicated /api/v1/assets/stats endpoint)
 * This provides comprehensive cached asset statistics with all breakdowns
 * Only fetches if user has assets:read permission
 */
export function useAssetStats() {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  // Only fetch if user has permission and tenant context
  const shouldFetch = currentTenant && canReadAssets

  const { data, error, isLoading, mutate } = useSWR<BackendAssetStats>(
    shouldFetch ? 'asset-stats' : null,
    async () => {
      // Fetch from dedicated asset stats endpoint
      const response = await get<BackendAssetStats>(endpoints.assets.stats())
      return response
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const emptyStats: AssetStatsData = {
    total: 0,
    byType: {},
    byStatus: {},
    byCriticality: {},
    byScope: {},
    byExposure: {},
    withFindings: 0,
    averageRiskScore: 0,
    totalFindings: 0,
    highRiskCount: 0,
  }

  return {
    stats: data ? transformAssetStats(data) : emptyStats,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}

// ============================================
// REPOSITORY EXTENSION HOOKS
// ============================================

/**
 * Hook to fetch an asset with its repository extension
 * Only fetches if user has assets:read permission
 */
export function useAssetWithRepository(assetId: string | null) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  // Only fetch if user has permission and tenant context
  const shouldFetch = assetId && currentTenant && canReadAssets

  const { data, error, isLoading, mutate } = useSWR<BackendAssetWithRepository>(
    shouldFetch ? ['asset-with-repository', assetId] : null,
    () => get<BackendAssetWithRepository>(endpoints.assets.getFull(assetId!)),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    asset: data ? transformAssetWithRepository(data) : null,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}

/**
 * Hook to fetch just the repository extension for an asset
 * Only fetches if user has assets:read permission
 */
export function useRepositoryExtension(assetId: string | null) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  // Only fetch if user has permission and tenant context
  const shouldFetch = assetId && currentTenant && canReadAssets

  const { data, error, isLoading, mutate } = useSWR<BackendRepositoryExtension>(
    shouldFetch ? ['repository-extension', assetId] : null,
    () => get<BackendRepositoryExtension>(endpoints.assets.getRepository(assetId!)),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    repository: data ? transformRepositoryExtension(data) : null,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}

/**
 * Hook to fetch repository assets (assets with type="repository")
 */
export function useRepositoryAssets(additionalFilters?: Omit<AssetSearchFilters, 'types'>) {
  return useAssetsByType('repository', additionalFilters)
}

/**
 * Create a repository asset (creates both asset and repository extension)
 */
export async function createRepositoryAsset(
  input: CreateRepositoryAssetInput
): Promise<AssetWithRepository> {
  const response = await post<BackendAssetWithRepository>(endpoints.assets.createRepository(), {
    // Asset fields
    name: input.name,
    criticality: input.criticality || 'medium',
    scope: input.scope || 'internal',
    exposure: input.exposure || 'unknown',
    description: input.description,
    tags: input.tags,
    // Repository extension fields
    provider: input.provider,
    external_id: input.externalId,
    repo_id: input.repoId,
    full_name: input.fullName,
    scm_organization: input.scmOrganization,
    clone_url: input.cloneUrl,
    web_url: input.webUrl,
    ssh_url: input.sshUrl,
    default_branch: input.defaultBranch,
    visibility: input.visibility || 'private',
    language: input.language,
    languages: input.languages,
    topics: input.topics,
    stars: input.stars,
    forks: input.forks,
    watchers: input.watchers,
    open_issues: input.openIssues,
    size_kb: input.sizeKb,
    scan_enabled: input.scanEnabled,
    scan_schedule: input.scanSchedule,
    repo_created_at: input.repoCreatedAt,
    repo_updated_at: input.repoUpdatedAt,
    repo_pushed_at: input.repoPushedAt,
  })
  return transformAssetWithRepository(response)
}

/**
 * Update a repository extension
 */
export async function updateRepositoryExtension(
  assetId: string,
  input: UpdateRepositoryExtensionInput
): Promise<RepositoryExtension> {
  const response = await put<BackendRepositoryExtension>(
    endpoints.assets.updateRepository(assetId),
    {
      full_name: input.fullName,
      scm_organization: input.scmOrganization,
      clone_url: input.cloneUrl,
      web_url: input.webUrl,
      ssh_url: input.sshUrl,
      default_branch: input.defaultBranch,
      visibility: input.visibility,
      language: input.language,
      languages: input.languages,
      topics: input.topics,
      stars: input.stars,
      forks: input.forks,
      watchers: input.watchers,
      open_issues: input.openIssues,
      size_kb: input.sizeKb,
      scan_enabled: input.scanEnabled,
      scan_schedule: input.scanSchedule,
      repo_created_at: input.repoCreatedAt,
      repo_updated_at: input.repoUpdatedAt,
      repo_pushed_at: input.repoPushedAt,
    }
  )
  return transformRepositoryExtension(response)
}

// ============================================
// ASSET STATUS OPERATIONS
// ============================================

/**
 * Activate an asset (set status to active)
 */
export async function activateAsset(assetId: string): Promise<Asset> {
  const response = await post<BackendAsset>(endpoints.assets.activate(assetId), {})
  return transformAsset(response)
}

/**
 * Deactivate an asset (set status to inactive)
 */
export async function deactivateAsset(assetId: string): Promise<Asset> {
  const response = await post<BackendAsset>(endpoints.assets.deactivate(assetId), {})
  return transformAsset(response)
}

/**
 * Archive an asset (set status to archived)
 */
export async function archiveAsset(assetId: string): Promise<Asset> {
  const response = await post<BackendAsset>(endpoints.assets.archive(assetId), {})
  return transformAsset(response)
}
