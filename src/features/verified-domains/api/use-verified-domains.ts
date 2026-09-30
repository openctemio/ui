/**
 * Verified Domains API hooks for one organization, used by the platform admin
 * console (RFC-022): /api/v1/admin/tenants/{tenantId}/sso/verified-domains.
 * Verified domains gate SSO auto-join, so they are part of SSO setup, an
 * application-administrator operation.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'

import { adminFetch, AdminApiError } from '@/features/admin-console/api/admin-client'
import type {
  CreateVerifiedDomainRequest,
  VerifiedDomain,
  VerifiedDomainListResponse,
} from '../types/verified-domain.types'

const base = (tenantId: string) => `/tenants/${tenantId}/sso/verified-domains`

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  // 4xx (e.g. 403 for a read-only admin on a write) is not worth retrying.
  shouldRetryOnError: (error: unknown) =>
    !(error instanceof AdminApiError && error.status >= 400 && error.status < 500),
}

/** List an organization's verified domains. */
export function useVerifiedDomains(tenantId: string | null, config?: SWRConfiguration) {
  return useSWR<VerifiedDomain[]>(
    tenantId ? base(tenantId) : null,
    async (p: string) => (await adminFetch<VerifiedDomainListResponse>(p)).verified_domains ?? [],
    { ...defaultConfig, ...config }
  )
}

/** Add a domain. Returns the created row incl. the DNS TXT instructions to publish. */
export function useAddVerifiedDomain(tenantId: string | null) {
  return useSWRMutation(
    tenantId ? base(tenantId) : null,
    async (p: string, { arg }: { arg: CreateVerifiedDomainRequest }) =>
      adminFetch<VerifiedDomain>(p, { method: 'POST', body: arg })
  )
}

/** Re-run verification now for a domain (id as the mutation arg). */
export function useVerifyDomain(tenantId: string | null) {
  return useSWRMutation(
    tenantId ? base(tenantId) : null,
    async (p: string, { arg }: { arg: string }) =>
      adminFetch<VerifiedDomain>(`${p}/${arg}/verify`, { method: 'POST' })
  )
}

/** Remove a domain (id as the mutation arg). */
export function useDeleteVerifiedDomain(tenantId: string | null) {
  return useSWRMutation(
    tenantId ? base(tenantId) : null,
    async (p: string, { arg }: { arg: string }) =>
      adminFetch<void>(`${p}/${arg}`, { method: 'DELETE' })
  )
}
