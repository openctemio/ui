'use client'

import useSWR from 'swr'
import { get, post } from '@/lib/api/client'
import type { ThreatModelDetail, ThreatModelSummary, ThreatScopeType } from '../types'

interface ThreatModelListResponse {
  data: ThreatModelSummary[]
  total: number
  page: number
  per_page: number
}

/** All threat models for the tenant (one per generated scope). */
export function useThreatModels() {
  const { data, error, isLoading, mutate } = useSWR<ThreatModelListResponse>(
    '/api/v1/threat-models?per_page=100',
    get,
    { revalidateOnFocus: false }
  )
  return { models: data?.data ?? [], isLoading, error, mutate }
}

/** A single threat model plus its derived threats. Pass null to skip. */
export function useThreatModel(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ThreatModelDetail>(
    id ? `/api/v1/threat-models/${id}` : null,
    get,
    { revalidateOnFocus: false }
  )
  return { model: data, isLoading: id ? isLoading : false, error, mutate }
}

/**
 * Generate (or refresh) a threat model for a scope. Mutating call — routed
 * through the shared api client so the CSRF header is attached automatically.
 * Returns the freshly generated model with its threats.
 */
export async function generateThreatModel(
  scopeType: ThreatScopeType,
  scopeRefId: string
): Promise<ThreatModelDetail> {
  return post<ThreatModelDetail>('/api/v1/threat-models/generate', {
    scope_type: scopeType,
    scope_ref_id: scopeRefId,
  })
}
