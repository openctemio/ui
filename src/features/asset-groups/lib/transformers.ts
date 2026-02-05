/**
 * Asset Group Transformers
 *
 * Utilities for transforming between API types (snake_case) and frontend types (camelCase)
 */

import type { AssetGroup, CreateAssetGroupInput, UpdateAssetGroupInput } from '../types'
import type {
  ApiAssetGroup,
  CreateAssetGroupApiInput,
  CreateAssetInGroupApiInput,
  UpdateAssetGroupApiInput,
  ApiGroupAsset,
  ApiGroupFinding,
} from '../api'
import type { GroupAsset, GroupFinding } from '../lib/mock-data'

// ============================================
// API Response -> Frontend Type
// ============================================

/**
 * Transform API AssetGroup to frontend AssetGroup
 */
export function transformApiAssetGroup(api: ApiAssetGroup): AssetGroup {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    environment: api.environment,
    criticality: api.criticality,

    // Business Context
    businessUnit: api.business_unit,
    owner: api.owner,
    ownerEmail: api.owner_email,
    tags: api.tags,

    // Asset counts
    assetCount: api.asset_count,
    domainCount: api.domain_count,
    websiteCount: api.website_count,
    serviceCount: api.service_count,
    repositoryCount: api.repository_count,
    projectCount: api.repository_count, // @deprecated, same as repositoryCount
    cloudCount: api.cloud_count,
    credentialCount: api.credential_count,

    // Risk metrics
    riskScore: api.risk_score,
    findingCount: api.finding_count,

    // Timestamps
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }
}

/**
 * Transform API GroupAsset to frontend GroupAsset
 * Note: API may have more asset types than the mock GroupAsset type supports
 */
export function transformApiGroupAsset(api: ApiGroupAsset): GroupAsset {
  // Map API asset types to frontend GroupAsset types
  const typeMap: Record<string, GroupAsset['type']> = {
    domain: 'domain',
    website: 'website',
    api: 'api',
    host: 'host',
    cloud: 'cloud',
    database: 'database',
    repository: 'repository',
    // Map additional types to closest match
    container: 'cloud',
    network: 'host',
    certificate: 'domain',
    identity: 'host',
    secret: 'database',
    other: 'host',
  }

  return {
    id: api.id,
    name: api.name,
    type: typeMap[api.type] || 'host',
    status: api.status,
    riskScore: api.risk_score,
    findingCount: api.finding_count,
    lastSeen: api.last_seen,
  }
}

/**
 * Transform API GroupFinding to frontend GroupFinding
 * Note: API may have more status types than the mock GroupFinding type supports
 */
export function transformApiGroupFinding(api: ApiGroupFinding): GroupFinding {
  // Map API finding statuses to frontend GroupFinding statuses
  const statusMap: Record<string, GroupFinding['status']> = {
    open: 'open',
    in_progress: 'in_progress',
    resolved: 'resolved',
    // Map additional statuses to closest match
    accepted: 'resolved',
    false_positive: 'resolved',
  }

  return {
    id: api.id,
    title: api.title,
    severity: api.severity,
    status: statusMap[api.status] || 'open',
    assetName: api.asset_name,
    discoveredAt: api.discovered_at,
  }
}

// ============================================
// Frontend Type -> API Input
// ============================================

/**
 * Transform frontend CreateAssetGroupInput to API input
 */
export function transformCreateAssetGroupInput(input: CreateAssetGroupInput): CreateAssetGroupApiInput {
  return {
    name: input.name,
    description: input.description,
    environment: input.environment,
    criticality: input.criticality,

    // Business Context
    business_unit: input.businessUnit,
    owner: input.owner,
    owner_email: input.ownerEmail,
    tags: input.tags,

    // Assets
    existing_asset_ids: input.existingAssetIds,
    new_assets: input.newAssets?.map((asset) => ({
      type: asset.type as CreateAssetInGroupApiInput['type'],
      name: asset.name,
      description: asset.description,
      tags: asset.tags,
    })),
  }
}

/**
 * Transform frontend UpdateAssetGroupInput to API input
 */
export function transformUpdateAssetGroupInput(input: UpdateAssetGroupInput): UpdateAssetGroupApiInput {
  return {
    name: input.name,
    description: input.description,
    environment: input.environment,
    criticality: input.criticality,

    // Business Context
    business_unit: input.businessUnit,
    owner: input.owner,
    owner_email: input.ownerEmail,
    tags: input.tags,
  }
}

// ============================================
// List Transformers
// ============================================

/**
 * Transform API AssetGroup list to frontend list
 */
export function transformApiAssetGroups(apiList: ApiAssetGroup[]): AssetGroup[] {
  return apiList.map(transformApiAssetGroup)
}

/**
 * Transform API GroupAsset list to frontend list
 */
export function transformApiGroupAssets(apiList: ApiGroupAsset[]): GroupAsset[] {
  return apiList.map(transformApiGroupAsset)
}

/**
 * Transform API GroupFinding list to frontend list
 */
export function transformApiGroupFindings(apiList: ApiGroupFinding[]): GroupFinding[] {
  return apiList.map(transformApiGroupFinding)
}
