/**
 * Asset Group API Types
 *
 * Type definitions matching backend API responses for asset groups
 * Following CTEM (Continuous Threat Exposure Management) Scoping phase
 */

// ============================================
// Common Types
// ============================================

export type Environment = 'production' | 'staging' | 'development' | 'testing'

export type Criticality = 'critical' | 'high' | 'medium' | 'low'

export type AssetType =
  | 'domain'
  | 'website'
  | 'api'
  | 'host'
  | 'cloud'
  | 'database'
  | 'repository'
  | 'container'
  | 'network'
  | 'certificate'
  | 'identity'
  | 'secret'
  | 'other'

// ============================================
// API Response Types
// ============================================

/**
 * Asset Group entity from API
 */
export interface ApiAssetGroup {
  id: string
  tenant_id: string
  name: string
  description?: string
  environment: Environment
  criticality: Criticality

  // Business Context (CTEM Scoping)
  business_unit?: string
  owner?: string
  owner_email?: string
  tags?: string[]

  // Asset counts
  asset_count: number
  domain_count: number
  website_count: number
  service_count: number
  repository_count: number
  cloud_count: number
  credential_count: number

  // Risk metrics
  risk_score: number
  finding_count: number

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * Asset within a group (lightweight)
 */
export interface ApiGroupAsset {
  id: string
  name: string
  type: AssetType
  status: 'active' | 'inactive' | 'monitoring'
  risk_score: number
  finding_count: number
  last_seen: string
}

/**
 * Finding associated with a group
 */
export interface ApiGroupFinding {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  status: 'open' | 'in_progress' | 'resolved' | 'accepted' | 'false_positive'
  asset_id: string
  asset_name: string
  discovered_at: string
}

// ============================================
// List Response Types
// ============================================

export interface PaginationLinks {
  first?: string
  prev?: string
  next?: string
  last?: string
}

export interface ApiAssetGroupListResponse {
  data: ApiAssetGroup[]
  total: number
  page: number
  per_page: number
  total_pages: number
  links?: PaginationLinks
}

export interface ApiGroupAssetsResponse {
  data: ApiGroupAsset[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiGroupFindingsResponse {
  data: ApiGroupFinding[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ============================================
// Input Types
// ============================================

/**
 * Input for creating a new asset group
 */
export interface CreateAssetGroupApiInput {
  name: string
  description?: string
  environment: Environment
  criticality: Criticality

  // Business Context (CTEM Scoping)
  business_unit?: string
  owner?: string
  owner_email?: string
  tags?: string[]

  // Assets to add during creation
  existing_asset_ids?: string[]
  new_assets?: CreateAssetInGroupApiInput[]
}

/**
 * Input for creating a new asset within a group
 */
export interface CreateAssetInGroupApiInput {
  type: AssetType
  name: string
  description?: string
  tags?: string[]
}

/**
 * Input for updating an asset group
 */
export interface UpdateAssetGroupApiInput {
  name?: string
  description?: string
  environment?: Environment
  criticality?: Criticality

  // Business Context (CTEM Scoping)
  business_unit?: string
  owner?: string
  owner_email?: string
  tags?: string[]
}

/**
 * Input for adding assets to a group
 */
export interface AddAssetsToGroupApiInput {
  asset_ids: string[]
}

/**
 * Input for removing assets from a group
 */
export interface RemoveAssetsFromGroupApiInput {
  asset_ids: string[]
}

/**
 * Input for moving assets between groups
 */
export interface MoveAssetsApiInput {
  source_group_id: string
  target_group_id: string
  asset_ids: string[]
}

// ============================================
// Filter Types
// ============================================

export interface AssetGroupApiFilters {
  environments?: Environment[]
  criticalities?: Criticality[]
  business_unit?: string
  owner?: string
  tags?: string[]
  has_findings?: boolean
  min_risk_score?: number
  max_risk_score?: number
  search?: string
  page?: number
  per_page?: number
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'risk_score' | 'asset_count'
  sort_order?: 'asc' | 'desc'
}

export interface GroupAssetsApiFilters {
  types?: AssetType[]
  search?: string
  page?: number
  per_page?: number
}

// ============================================
// Stats Types
// ============================================

export interface ApiAssetGroupStats {
  total: number
  by_environment: Record<Environment, number>
  by_criticality: Record<Criticality, number>
  total_assets: number
  total_findings: number
  average_risk_score: number
  critical_groups: number
  high_risk_groups: number
}

// ============================================
// Bulk Operation Types
// ============================================

export interface BulkUpdateGroupsApiInput {
  group_ids: string[]
  update: {
    environment?: Environment
    criticality?: Criticality
    business_unit?: string
    owner?: string
    owner_email?: string
    add_tags?: string[]
    remove_tags?: string[]
  }
}

export interface BulkDeleteGroupsApiInput {
  group_ids: string[]
}

export interface BulkOperationResponse {
  success: boolean
  affected_count: number
  failed_ids?: string[]
  errors?: Record<string, string>
}
