'use client'

import useSWR from 'swr'
import { adminFetch, adminFetcher } from './admin-client'
import type {
  CreateTargetMappingInput,
  Paged,
  TargetMapping,
  TargetMappingStats,
  UpdateTargetMappingInput,
} from '../types'

const BASE = '/target-mappings'

export interface TargetMappingQuery {
  targetType?: string
  assetType?: string
  /** 'active' | 'inactive'; anything else lists both. */
  status?: string
  page?: number
  perPage?: number
}

export function targetMappingListPath({
  targetType,
  assetType,
  status,
  page = 1,
  perPage = 50,
}: TargetMappingQuery): string {
  const q = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (targetType) q.set('target_type', targetType)
  if (assetType) q.set('asset_type', assetType)
  if (status === 'active') q.set('is_active', 'true')
  if (status === 'inactive') q.set('is_active', 'false')
  return `${BASE}?${q.toString()}`
}

/** Mappings ordered by priority, then target type, then asset type (API order). */
export function useTargetMappings(query: TargetMappingQuery) {
  return useSWR<Paged<TargetMapping>>(targetMappingListPath(query), adminFetcher, {
    keepPreviousData: true,
  })
}

export function useTargetMappingStats() {
  return useSWR<TargetMappingStats>(`${BASE}/stats`, adminFetcher)
}

/**
 * The existing mapping for a pair, if any: the pair is unique, so the create
 * dialog uses this to say so before submitting.
 */
export function useExistingTargetMapping(targetType: string, assetType: string) {
  const key =
    targetType && assetType
      ? targetMappingListPath({ targetType, assetType, page: 1, perPage: 1 })
      : null
  const { data } = useSWR<Paged<TargetMapping>>(key, adminFetcher)
  return data?.data[0]
}

/** ops_admin+. */
export function createTargetMapping(input: CreateTargetMappingInput) {
  return adminFetch<TargetMapping>(BASE, { method: 'POST', body: input })
}

/** ops_admin+. */
export function updateTargetMapping(id: string, input: UpdateTargetMappingInput) {
  return adminFetch<TargetMapping>(`${BASE}/${id}`, { method: 'PATCH', body: input })
}

/** super_admin only. */
export function deleteTargetMapping(id: string) {
  return adminFetch<void>(`${BASE}/${id}`, { method: 'DELETE' })
}
