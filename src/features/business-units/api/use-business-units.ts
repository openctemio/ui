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

export function useBusinessUnits(search?: string) {
  const params = new URLSearchParams()
  params.set('per_page', '100')
  if (search) params.set('search', search)
  return useSWR<PaginatedResponse<BusinessUnit>>(
    `/api/v1/business-units?${params.toString()}`,
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

export function useAddAssetToUnit(unitId: string) {
  return useSWRMutation(
    `/api/v1/business-units/${unitId}/assets`,
    (url: string, { arg }: { arg: { asset_id: string } }) => post(url, arg)
  )
}
