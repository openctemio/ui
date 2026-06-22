/**
 * SCIM token hooks — SWR over /api/v1/scim-tokens (List/Create/Revoke).
 * Tenant is determined from the JWT token. Revoke uses DELETE (the backend
 * marks the token revoked rather than removing the row).
 */

'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, del } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'
import type {
  CreateScimTokenRequest,
  CreateScimTokenResponse,
  ScimTokenListResponse,
} from '../types/scim-token.types'

const BASE_URL = '/api/v1/scim-tokens'

export function useScimTokens() {
  const { currentTenant } = useTenant()
  return useSWR<ScimTokenListResponse>(currentTenant ? BASE_URL : null, (url: string) =>
    get<ScimTokenListResponse>(url)
  )
}

export function useCreateScimToken() {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    async (url: string, { arg }: { arg: CreateScimTokenRequest }) =>
      post<CreateScimTokenResponse>(url, arg)
  )
}

export function useRevokeScimToken() {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    async (_url: string, { arg }: { arg: string }) => del<void>(`${BASE_URL}/${arg}`)
  )
}
