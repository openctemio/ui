'use client'

import useSWR from 'swr'
import { get } from '@/lib/api/client'

// ============================================
// Types
// ============================================

export interface FindingGroupStats {
  total: number
  open: number
  in_progress: number
  fix_applied: number
  resolved: number
  affected_assets: number
  resolved_assets: number
  progress_pct: number
}

export interface FindingGroup {
  group_key: string
  group_type: string
  label: string
  severity: string
  metadata: Record<string, unknown>
  stats: FindingGroupStats
}

export interface FindingGroupsResponse {
  data: FindingGroup[]
  pagination: {
    total: number
    page: number
    per_page: number
  }
}

export interface RelatedCVE {
  cve_id: string
  title: string
  severity: string
  finding_count: number
}

export interface RelatedCVEsResponse {
  source_cve: string
  related_cves: RelatedCVE[]
}

export type GroupByDimension =
  | 'cve_id'
  | 'asset_id'
  | 'owner_id'
  | 'component_id'
  | 'severity'
  | 'source'
  | 'finding_type'

export interface FindingGroupsFilters {
  group_by: GroupByDimension
  severities?: string
  statuses?: string
  sources?: string
  cve_ids?: string
  asset_tags?: string
  page?: number
  per_page?: number
}

// ============================================
// Hooks
// ============================================

function buildGroupsUrl(filters: FindingGroupsFilters): string {
  const params = new URLSearchParams()
  params.set('group_by', filters.group_by)
  if (filters.severities) params.set('severities', filters.severities)
  if (filters.statuses) params.set('statuses', filters.statuses)
  if (filters.sources) params.set('sources', filters.sources)
  if (filters.cve_ids) params.set('cve_ids', filters.cve_ids)
  if (filters.asset_tags) params.set('asset_tags', filters.asset_tags)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))
  return `/api/v1/findings/groups?${params.toString()}`
}

export function useFindingGroups(filters: FindingGroupsFilters) {
  const url = buildGroupsUrl(filters)

  return useSWR<FindingGroupsResponse>(url, (u: string) => get<FindingGroupsResponse>(u), {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30s stale-while-revalidate
  })
}

export function useRelatedCVEs(cveId: string | null, assetTags?: string) {
  const url = cveId
    ? `/api/v1/findings/related-cves/${encodeURIComponent(cveId)}${assetTags ? `?asset_tags=${assetTags}` : ''}`
    : null

  return useSWR<RelatedCVEsResponse>(url, (u: string) => get<RelatedCVEsResponse>(u), {
    revalidateOnFocus: false,
  })
}

export function usePendingVerificationCount() {
  const { data } = useFindingGroups({
    group_by: 'cve_id',
    statuses: 'fix_applied',
    per_page: 1,
  })

  return data?.pagination?.total ?? 0
}
