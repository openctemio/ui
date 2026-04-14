'use client'

import useSWR, { useSWRConfig } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, patch } from '@/lib/api/client'
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

/**
 * Invalidate all suggestion-related SWR caches (list + count).
 */
function useInvalidateSuggestions() {
  const { mutate } = useSWRConfig()
  return () => {
    // Invalidate all keys matching the suggestions base URL
    mutate((key: unknown) => typeof key === 'string' && key.startsWith(BASE_URL), undefined, {
      revalidate: true,
    })
  }
}

export function useApproveSuggestion() {
  const invalidate = useInvalidateSuggestions()
  return useSWRMutation(BASE_URL, async (_url: string, { arg }: { arg: string }) => {
    const result = await post(`${BASE_URL}/${arg}/approve`, {})
    invalidate()
    return result
  })
}

export function useDismissSuggestion() {
  const invalidate = useInvalidateSuggestions()
  return useSWRMutation(BASE_URL, async (_url: string, { arg }: { arg: string }) => {
    const result = await post(`${BASE_URL}/${arg}/dismiss`, {})
    invalidate()
    return result
  })
}

export function useApproveAllSuggestions() {
  const invalidate = useInvalidateSuggestions()
  return useSWRMutation(BASE_URL, async () => {
    const result = await post(`${BASE_URL}/approve-all`, {})
    invalidate()
    return result
  })
}

export function useGenerateSuggestions() {
  const invalidate = useInvalidateSuggestions()
  return useSWRMutation(BASE_URL, async () => {
    const result = await post(`${BASE_URL}/generate`, {})
    invalidate()
    return result
  })
}

export function useUpdateSuggestionType() {
  const invalidate = useInvalidateSuggestions()
  return useSWRMutation(
    `${BASE_URL}/update-type`,
    async (_url: string, { arg }: { arg: { id: string; relationship_type: string } }) => {
      const result = await patch(`${BASE_URL}/${arg.id}/type`, {
        relationship_type: arg.relationship_type,
      })
      invalidate()
      return result
    }
  )
}

export function useApproveBatchSuggestions() {
  const invalidate = useInvalidateSuggestions()
  return useSWRMutation(BASE_URL, async (_url: string, { arg }: { arg: string[] }) => {
    const result = await post<{ count: number }>(`${BASE_URL}/approve-batch`, { ids: arg })
    invalidate()
    return result
  })
}
