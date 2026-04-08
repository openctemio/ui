'use client'

import useSWR from 'swr'
import { get } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { usePermissions, Permission } from '@/lib/permissions'
import type { AssetRelationship } from '../types'

/**
 * Backend response format for asset relationships list
 * Matches Go handler's ListResponse[RelationshipResponse]
 */
interface BackendRelationshipResponse {
  id: string
  type: string
  source_asset_id: string
  source_asset_name: string
  source_asset_type: string
  target_asset_id: string
  target_asset_name: string
  target_asset_type: string
  description?: string
  confidence: string
  discovery_method: string
  impact_weight: number
  tags?: string[]
  created_at: string
  updated_at: string
  last_verified?: string
}

interface BackendRelationshipsListResponse {
  data: BackendRelationshipResponse[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

function transformRelationship(backend: BackendRelationshipResponse): AssetRelationship {
  return {
    id: backend.id,
    type: backend.type as AssetRelationship['type'],
    sourceAssetId: backend.source_asset_id,
    sourceAssetName: backend.source_asset_name,
    sourceAssetType: backend.source_asset_type as AssetRelationship['sourceAssetType'],
    targetAssetId: backend.target_asset_id,
    targetAssetName: backend.target_asset_name,
    targetAssetType: backend.target_asset_type as AssetRelationship['targetAssetType'],
    description: backend.description,
    confidence: backend.confidence as AssetRelationship['confidence'],
    discoveryMethod: backend.discovery_method as AssetRelationship['discoveryMethod'],
    impactWeight: backend.impact_weight,
    tags: backend.tags,
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
    lastVerified: backend.last_verified,
  }
}

/**
 * Hook to fetch asset relationships from the API
 */
export function useAssetRelationships(assetId: string | null) {
  const { can } = usePermissions()
  const canRead = can(Permission.AssetsRead)
  const shouldFetch = assetId && canRead

  const { data, error, isLoading, mutate } = useSWR<BackendRelationshipsListResponse>(
    shouldFetch ? endpoints.assets.listRelationships(assetId) : null,
    (url: string) => get<BackendRelationshipsListResponse>(url),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    relationships: data?.data?.map(transformRelationship) ?? [],
    total: data?.total ?? 0,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}
