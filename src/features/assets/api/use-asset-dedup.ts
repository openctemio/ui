'use client'

import useSWR from 'swr'
import { get, post } from '@/lib/api/client'

interface DedupReview {
  id: string
  tenant_id: string
  normalized_name: string
  asset_type: string
  keep_asset_id: string
  keep_asset_name: string
  keep_finding_count: number
  merge_asset_ids: string[]
  merge_asset_names: string[]
  merge_finding_count: number
  status: string
  created_at: string
}

interface MergeLogEntry {
  id: string
  kept_asset_id: string
  kept_asset_name: string
  merged_asset_id: string | null
  merged_asset_name: string | null
  correlation_type: string
  action: string
  old_name: string | null
  new_name: string | null
  source: string
  created_at: string
}

export function useDedupReviews() {
  return useSWR<{ data: DedupReview[]; total: number }>('/api/v1/assets/dedup/reviews', get, {
    revalidateOnFocus: false,
  })
}

export function useMergeLog(limit = 50) {
  return useSWR<{ data: MergeLogEntry[]; total: number }>(
    `/api/v1/assets/dedup/merge-log?limit=${limit}`,
    get,
    { revalidateOnFocus: false }
  )
}

export async function approveDedupReview(reviewId: string) {
  return post(`/api/v1/assets/dedup/reviews/${reviewId}/approve`, {})
}

export async function rejectDedupReview(reviewId: string) {
  return post(`/api/v1/assets/dedup/reviews/${reviewId}/reject`, {})
}
