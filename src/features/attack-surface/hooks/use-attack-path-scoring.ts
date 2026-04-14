'use client'

import useSWR from 'swr'
import { useTenant } from '@/context/tenant-provider'
import { get } from '@/lib/api/client'
import { usePermissions, Permission } from '@/lib/permissions'

// ============================================
// API Response Types (snake_case from backend)
// ============================================

interface AttackPathSummaryResponse {
  total_paths: number
  entry_points: number
  reachable_assets: number
  max_depth: number
  critical_reachable: number
  crown_jewels_at_risk: number
  has_relationship_data: boolean
}

interface AttackPathScoreResponse {
  asset_id: string
  name: string
  asset_type: string
  exposure: string
  criticality: string
  risk_score: number
  is_crown_jewel: boolean
  finding_count: number
  reachable_from: number
  path_score: number
  is_entry_point: boolean
  is_protected: boolean
}

interface AttackPathScoringResponse {
  summary: AttackPathSummaryResponse
  top_assets: AttackPathScoreResponse[]
}

// ============================================
// Frontend Types (camelCase)
// ============================================

export interface AttackPathSummary {
  totalPaths: number
  entryPoints: number
  reachableAssets: number
  maxDepth: number
  criticalReachable: number
  crownJewelsAtRisk: number
  hasRelationshipData: boolean
}

export interface AttackPathScore {
  assetId: string
  name: string
  assetType: string
  exposure: string
  criticality: string
  riskScore: number
  isCrownJewel: boolean
  findingCount: number
  reachableFrom: number
  pathScore: number
  isEntryPoint: boolean
  isProtected: boolean
}

export interface AttackPathScoring {
  summary: AttackPathSummary
  topAssets: AttackPathScore[]
}

// ============================================
// Transform API response to frontend format
// ============================================

function transformResponse(data: AttackPathScoringResponse): AttackPathScoring {
  return {
    summary: {
      totalPaths: data.summary.total_paths,
      entryPoints: data.summary.entry_points,
      reachableAssets: data.summary.reachable_assets,
      maxDepth: data.summary.max_depth,
      criticalReachable: data.summary.critical_reachable,
      crownJewelsAtRisk: data.summary.crown_jewels_at_risk,
      hasRelationshipData: data.summary.has_relationship_data,
    },
    topAssets:
      data.top_assets?.map((item) => ({
        assetId: item.asset_id,
        name: item.name,
        assetType: item.asset_type,
        exposure: item.exposure,
        criticality: item.criticality,
        riskScore: item.risk_score,
        isCrownJewel: item.is_crown_jewel,
        findingCount: item.finding_count,
        reachableFrom: item.reachable_from,
        pathScore: item.path_score,
        isEntryPoint: item.is_entry_point,
        isProtected: item.is_protected,
      })) ?? [],
  }
}

// ============================================
// SWR Fetcher
// ============================================

async function fetchAttackPathScoring(url: string): Promise<AttackPathScoring> {
  const data = await get<AttackPathScoringResponse>(url)
  return transformResponse(data)
}

// ============================================
// Hook
// ============================================

export function useAttackPathScoring() {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  const shouldFetch = currentTenant && canReadAssets

  const key = shouldFetch ? '/api/v1/attack-surface/attack-paths' : null

  const { data, error, isLoading, mutate } = useSWR<AttackPathScoring>(
    key,
    fetchAttackPathScoring,
    {
      revalidateOnFocus: false,
      revalidateIfStale: true,
      dedupingInterval: 60000, // Cache for 1 minute — scoring is compute-intensive
    }
  )

  return {
    scoring: data,
    error,
    isLoading: shouldFetch ? isLoading : false,
    mutate,
  }
}
