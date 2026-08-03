/**
 * Asset Group API Types
 *
 * Type definitions matching backend API responses for asset groups
 * Following CTEM (Continuous Threat Exposure Management) Scoping phase
 *
 * The response shapes are GENERATED from the API's OpenAPI spec; only the
 * request inputs, filters and UI unions are declared here.
 */
import type {
  ApiResponse,
  AssetGroupResponse,
  AssetGroupStatsResponse,
  GroupAssetResponse,
  GroupFindingResponse,
} from '@/lib/api/generated'

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
// API Response Types — GENERATED
//
// These are aliases into src/lib/api/generated; nothing here restates a field.
// Two corrections the generation made:
//
//   • ApiAssetGroup declared `tenant_id`, which AssetGroupResponse does not
//     carry — the tenant is implied by the caller's token, and the server
//     never returns it.
//   • ApiAssetGroupStats declared `critical_groups` and `high_risk_groups`;
//     AssetGroupStatsResponse has neither. Any UI reading them was reading
//     undefined.
//
// The list envelopes are declared inline in the spec rather than as named
// schemas, so they are reached through the path + method.
// ============================================

export type ApiAssetGroup = AssetGroupResponse
export type ApiGroupAsset = GroupAssetResponse
export type ApiGroupFinding = GroupFindingResponse
export type ApiAssetGroupStats = AssetGroupStatsResponse

export type ApiAssetGroupListResponse = ApiResponse<'/asset-groups', 'get'>
export type ApiGroupAssetsResponse = ApiResponse<'/asset-groups/{id}/assets', 'get'>
export type ApiGroupFindingsResponse = ApiResponse<'/asset-groups/{id}/findings', 'get'>

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
