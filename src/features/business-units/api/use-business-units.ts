'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from '@/lib/api/client'

export interface BusinessUnit {
  id: string
  name: string
  description: string
  owner_name: string
  owner_email: string
  // critical | high | medium | low (default medium)
  criticality: string
  // low | medium | high (default medium)
  risk_tolerance: string
  // Same-tenant business-unit id, or null when top-level. Send "" to clear.
  parent_id: string | null
  asset_count: number
  finding_count: number
  avg_risk_score: number
  critical_finding_count: number
  tags: string[]
  created_at: string
  updated_at: string
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}

/** Units (first 100). `enabled` false skips the request (e.g. a closed picker). */
export function useBusinessUnits(search?: string, enabled = true) {
  const params = new URLSearchParams()
  params.set('per_page', '100')
  if (search) params.set('search', search)
  return useSWR<PaginatedResponse<BusinessUnit>>(
    enabled ? `/api/v1/business-units?${params.toString()}` : null,
    get,
    { revalidateOnFocus: false }
  )
}

export function useCreateBusinessUnit() {
  return useSWRMutation(
    '/api/v1/business-units',
    (url: string, { arg }: { arg: Partial<BusinessUnit> }) => post(url, arg)
  )
}

export function useUpdateBusinessUnit() {
  return useSWRMutation(
    '/api/v1/business-units',
    (url: string, { arg }: { arg: { id: string } & Partial<BusinessUnit> }) =>
      put(`${url}/${arg.id}`, arg)
  )
}

export function useDeleteBusinessUnit(id: string) {
  return useSWRMutation(`/api/v1/business-units/${id}`, (url: string) => del(url))
}

/** Add one asset to a unit (the endpoint takes one per call; 204). */
export function addAssetToBusinessUnit(unitId: string, assetId: string): Promise<unknown> {
  return post(`/api/v1/business-units/${unitId}/assets`, { asset_id: assetId })
}

export function removeAssetFromBusinessUnit(unitId: string, assetId: string): Promise<unknown> {
  return del(`/api/v1/business-units/${unitId}/assets/${assetId}`)
}
