'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'

// ============================================
// TYPES
// ============================================

export interface RelationshipSuggestion {
  id: string
  source_asset_id: string
  source_asset_name: string
  source_asset_type: string
  target_asset_id: string
  target_asset_name: string
  target_asset_type: string
  relationship_type: string
  reason: string
  confidence: number
  status: 'pending' | 'approved' | 'dismissed'
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
}

interface SuggestionListResponse {
  data: RelationshipSuggestion[]
  total: number
  page: number
  per_page: number
}

interface CountResponse {
  count: number
}

// ============================================
// HOOKS
// ============================================

const BASE_URL = '/api/v1/relationships/suggestions'

export function useRelationshipSuggestions(
  status = 'pending',
  page = 1,
  perPage = 50,
  search?: string
) {
  const { currentTenant } = useTenant()
  const params = new URLSearchParams({ status, page: String(page), per_page: String(perPage) })
  if (search) params.set('search', search)
  const key = currentTenant ? `${BASE_URL}?${params.toString()}` : null

  return useSWR<SuggestionListResponse>(key, (url: string) => get<SuggestionListResponse>(url), {
    revalidateOnFocus: false,
  })
}

export function useSuggestionCount() {
  const { currentTenant } = useTenant()
  const key = currentTenant ? `${BASE_URL}/count` : null

  return useSWR<CountResponse>(key, (url: string) => get<CountResponse>(url), {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })
}

export function useApproveSuggestion() {
  return useSWRMutation(BASE_URL, async (_url: string, { arg }: { arg: string }) => {
    return post(`${BASE_URL}/${arg}/approve`, {})
  })
}

export function useDismissSuggestion() {
  return useSWRMutation(BASE_URL, async (_url: string, { arg }: { arg: string }) => {
    return post(`${BASE_URL}/${arg}/dismiss`, {})
  })
}

export function useApproveAllSuggestions() {
  return useSWRMutation(BASE_URL, async () => {
    return post(`${BASE_URL}/approve-all`, {})
  })
}

export function useGenerateSuggestions() {
  return useSWRMutation(BASE_URL, async () => {
    return post(`${BASE_URL}/generate`, {})
  })
}
