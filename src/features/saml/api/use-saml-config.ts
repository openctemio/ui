/**
 * SAML SP config hooks for one organization, used by the platform admin
 * console (RFC-022): SWR over /api/v1/admin/tenants/{tenantId}/sso/saml.
 * SSO setup is an application-administrator operation, so there is no
 * tenant-context variant. A 404 means "not configured yet" and resolves to
 * null (no error toast).
 */

'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { adminFetch, AdminApiError } from '@/features/admin-console/api/admin-client'
import type { SamlConfig } from '../types/saml.types'

const path = (tenantId: string) => `/tenants/${tenantId}/sso/saml`

export function useSamlConfig(tenantId: string | null) {
  return useSWR<SamlConfig | null>(
    tenantId ? path(tenantId) : null,
    async (p: string) => {
      try {
        return await adminFetch<SamlConfig>(p)
      } catch (e) {
        if (e instanceof AdminApiError && e.status === 404) return null
        throw e
      }
    },
    { shouldRetryOnError: false, revalidateOnFocus: false }
  )
}

export function useSaveSamlConfig(tenantId: string | null) {
  return useSWRMutation(
    tenantId ? path(tenantId) : null,
    async (p: string, { arg }: { arg: SamlConfig }) =>
      adminFetch<SamlConfig>(p, { method: 'PUT', body: arg })
  )
}

export function useDeleteSamlConfig(tenantId: string | null) {
  return useSWRMutation(tenantId ? path(tenantId) : null, async (p: string) =>
    adminFetch<void>(p, { method: 'DELETE' })
  )
}
