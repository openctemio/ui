/**
 * Verified Domains API hooks.
 *
 * SWR read + mutations for tenant-scoped domain-ownership verification.
 * Mutations go through the shared api client (`@/lib/api/client`) so CSRF
 * headers are attached automatically.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'

import { del, get, post } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'
import type {
  CreateVerifiedDomainRequest,
  VerifiedDomain,
  VerifiedDomainListResponse,
} from '../types/verified-domain.types'

const BASE_URL = '/api/v1/settings/verified-domains'

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  // 4xx (e.g. 403 for non-admins) is not worth retrying.
  shouldRetryOnError: (error: { statusCode?: number }) => {
    if (error?.statusCode && error.statusCode >= 400 && error.statusCode < 500) return false
    return true
  },
}

/** List verified domains for the current tenant. Keyed null until a tenant exists. */
export function useVerifiedDomains(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant ? BASE_URL : null

  return useSWR<VerifiedDomain[]>(
    key,
    async (url: string) => {
      const res = await get<VerifiedDomainListResponse>(url)
      return res.verified_domains ?? []
    },
    { ...defaultConfig, ...config }
  )
}

/** Add a domain. Returns the created row incl. the DNS TXT instructions to publish. */
export function useAddVerifiedDomain() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    async (url: string, { arg }: { arg: CreateVerifiedDomainRequest }) =>
      post<VerifiedDomain>(url, arg)
  )
}

/** Re-run verification now for a domain (id as the mutation arg). Returns the updated row. */
export function useVerifyDomain() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    async (_url: string, { arg }: { arg: string }) =>
      post<VerifiedDomain>(`${BASE_URL}/${arg}/verify`)
  )
}

/** Remove a domain (id as the mutation arg). */
export function useDeleteVerifiedDomain() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    async (_url: string, { arg }: { arg: string }) => del<void>(`${BASE_URL}/${arg}`)
  )
}
