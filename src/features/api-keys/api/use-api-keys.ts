/**
 * API Key hooks — SWR over /api/v1/api-keys (List/Create/Revoke/Delete).
 * Tenant is determined from the JWT token.
 */

'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, del } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'
import type { APIKey, CreateAPIKeyRequest, CreateAPIKeyResponse } from '../types/api-key.types'

const BASE_URL = '/api/v1/api-keys'

interface APIKeyListResponse {
  data: APIKey[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export function useApiKeys() {
  const { currentTenant } = useTenant()
  return useSWR<APIKeyListResponse>(
    // Same key the mutation hooks bind to, so SWR's automatic post-mutation
    // revalidation actually hits this subscription. A query string here (e.g.
    // `?per_page=100`) silently breaks that match, leaving the list stale
    // whenever a caller forgets an explicit mutate().
    currentTenant ? BASE_URL : null,
    (url: string) => get<APIKeyListResponse>(`${url}?per_page=100`)
  )
}

export function useCreateApiKey() {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    async (url: string, { arg }: { arg: CreateAPIKeyRequest }) =>
      post<CreateAPIKeyResponse>(url, arg)
  )
}

export function useRevokeApiKey() {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    async (_url: string, { arg }: { arg: string }) => post<void>(`${BASE_URL}/${arg}/revoke`, {})
  )
}

export function useDeleteApiKey() {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    async (_url: string, { arg }: { arg: string }) => del<void>(`${BASE_URL}/${arg}`)
  )
}
