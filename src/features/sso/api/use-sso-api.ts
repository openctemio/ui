/**
 * SSO identity-provider hooks.
 *
 * - Organization identity providers (Entra ID / Okta / Google Workspace) are
 *   configured by the platform administrator per organization, through the
 *   admin console (RFC-022): /api/v1/admin/tenants/{tenantId}/sso/identity-providers.
 *   There is no tenant-context variant; SSO setup is not a tenant operation.
 * - The login page reads an organization's active providers from the public
 *   /api/v1/auth/sso/providers endpoint (useTenantSSOProviders).
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'

import { get } from '@/lib/api/client'
import { adminFetch, AdminApiError } from '@/features/admin-console/api/admin-client'
import type {
  IdentityProvider,
  CreateIdentityProviderRequest,
  UpdateIdentityProviderRequest,
  SSOProviderInfo,
} from '../types/sso.types'

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error: unknown) => {
    const status =
      error instanceof AdminApiError ? error.status : (error as { statusCode?: number })?.statusCode
    return !(status && status >= 400 && status < 500)
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
}

// ============================================
// ADMIN CONSOLE (per organization)
// ============================================

const orgBase = (tenantId: string) => `/tenants/${tenantId}/sso/identity-providers`

/** An organization's identity providers. */
export function useOrgIdentityProviders(tenantId: string | null, config?: SWRConfiguration) {
  return useSWR<IdentityProvider[]>(
    tenantId ? orgBase(tenantId) : null,
    async (p: string) => {
      const res = await adminFetch<{ providers?: IdentityProvider[] }>(p)
      return res.providers ?? []
    },
    { ...defaultConfig, ...config }
  )
}

export function createOrgIdentityProvider(tenantId: string, input: CreateIdentityProviderRequest) {
  return adminFetch<IdentityProvider>(orgBase(tenantId), { method: 'POST', body: input })
}

export function updateOrgIdentityProvider(
  tenantId: string,
  id: string,
  input: UpdateIdentityProviderRequest
) {
  return adminFetch<IdentityProvider>(`${orgBase(tenantId)}/${id}`, { method: 'PUT', body: input })
}

export function deleteOrgIdentityProvider(tenantId: string, id: string) {
  return adminFetch<void>(`${orgBase(tenantId)}/${id}`, { method: 'DELETE' })
}

// ============================================
// PUBLIC HOOKS (Login page)
// ============================================

/**
 * List active SSO providers for a tenant (public, no auth required)
 */
export function useTenantSSOProviders(orgSlug: string | null, config?: SWRConfiguration) {
  const key = orgSlug ? `/api/v1/auth/sso/providers?org=${encodeURIComponent(orgSlug)}` : null

  return useSWR<SSOProviderInfo[]>(
    key,
    async (url: string) => {
      const res = await get<{ providers: SSOProviderInfo[] }>(url)
      return res.providers ?? []
    },
    {
      ...defaultConfig,
      revalidateOnFocus: false,
      ...config,
    }
  )
}
