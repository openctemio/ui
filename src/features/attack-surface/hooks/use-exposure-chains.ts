'use client'

import useSWR from 'swr'
import { useTenant } from '@/context/tenant-provider'
import { get } from '@/lib/api/client'
import { usePermissions, Permission } from '@/lib/permissions'

// ============================================
// API Response Types (snake_case from backend)
// ============================================

interface ExposureChainSummaryResponse {
  entry_points: number
  targets_at_risk: number
  total_chains: number
  has_relationship_data: boolean
}

interface ChainHopResponse {
  asset_id: string
  name: string
  asset_type: string
  exposure: string
}

interface ExposureChainResponse {
  entry_point_id: string
  entry_point_name: string
  target_id: string
  target_name: string
  target_criticality: string
  is_crown_jewel: boolean
  hops: ChainHopResponse[]
  length: number
  reachable_from_entry_points: number
  kev_count: number
  critical_count: number
  score: number
}

interface ExposureChainsResponse {
  summary: ExposureChainSummaryResponse
  chains: ExposureChainResponse[]
}

// ============================================
// Frontend Types (camelCase)
// ============================================

export interface ExposureChainSummary {
  entryPoints: number
  targetsAtRisk: number
  totalChains: number
  hasRelationshipData: boolean
}

export interface ChainHop {
  assetId: string
  name: string
  assetType: string
  exposure: string
}

export interface ExposureChain {
  entryPointId: string
  entryPointName: string
  targetId: string
  targetName: string
  targetCriticality: string
  isCrownJewel: boolean
  hops: ChainHop[]
  length: number
  reachableFromEntryPoints: number
  kevCount: number
  criticalCount: number
  score: number
}

export interface ExposureChains {
  summary: ExposureChainSummary
  chains: ExposureChain[]
}

// ============================================
// Transform API response to frontend format
// ============================================

function transformResponse(data: ExposureChainsResponse): ExposureChains {
  return {
    summary: {
      entryPoints: data.summary.entry_points,
      targetsAtRisk: data.summary.targets_at_risk,
      totalChains: data.summary.total_chains,
      hasRelationshipData: data.summary.has_relationship_data,
    },
    chains:
      data.chains?.map((c) => ({
        entryPointId: c.entry_point_id,
        entryPointName: c.entry_point_name,
        targetId: c.target_id,
        targetName: c.target_name,
        targetCriticality: c.target_criticality,
        isCrownJewel: c.is_crown_jewel,
        hops:
          c.hops?.map((h) => ({
            assetId: h.asset_id,
            name: h.name,
            assetType: h.asset_type,
            exposure: h.exposure,
          })) ?? [],
        length: c.length,
        reachableFromEntryPoints: c.reachable_from_entry_points,
        kevCount: c.kev_count,
        criticalCount: c.critical_count,
        score: c.score,
      })) ?? [],
  }
}

// ============================================
// SWR Fetcher
// ============================================

async function fetchExposureChains(url: string): Promise<ExposureChains> {
  const data = await get<ExposureChainsResponse>(url)
  return transformResponse(data)
}

// ============================================
// Hook
// ============================================

export function useExposureChains() {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  const shouldFetch = currentTenant && canReadAssets

  const key = shouldFetch ? '/api/v1/attack-surface/exposure-chains' : null

  const { data, error, isLoading, mutate } = useSWR<ExposureChains>(key, fetchExposureChains, {
    revalidateOnFocus: false,
    revalidateIfStale: true,
    dedupingInterval: 60000, // Cache for 1 minute — chain analysis is compute-intensive
  })

  return {
    chains: data,
    error,
    isLoading: shouldFetch ? isLoading : false,
    mutate,
  }
}
