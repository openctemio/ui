/**
 * SSO Identity Provider API Hooks
 *
 * SWR hooks for managing tenant-scoped SSO identity providers
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'

import { get, post, put, del } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'
import type {
  IdentityProvider,
  CreateIdentityProviderRequest,
  UpdateIdentityProviderRequest,
  SSOProviderInfo,
} from '../types/sso.types'

// ============================================
// CONFIG
// ============================================

const BASE_URL = '/api/v1/settings/identity-providers'

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error: { statusCode?: number }) => {
    if (error?.statusCode && error.statusCode >= 400 && error.statusCode < 500) return false
    return true
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
}

// ============================================
// ADMIN HOOKS (Settings page)
// ============================================

/**
 * List all identity providers for the current tenant (admin)
 */
export function useIdentityProvidersApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant ? BASE_URL : null

  return useSWR<IdentityProvider[]>(
    key,
    async (url: string) => {
      const res = await get<{ providers: IdentityProvider[] }>(url)
      return res.providers ?? []
    },
    {
      ...defaultConfig,
      ...config,
    }
  )
}

/**
 * Get a single identity provider by ID
 */
export function useIdentityProviderApi(id: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant && id ? `${BASE_URL}/${id}` : null

  return useSWR<IdentityProvider>(key, (url: string) => get<IdentityProvider>(url), {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Create a new identity provider
 */
export function useCreateIdentityProviderApi() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    async (url: string, { arg }: { arg: CreateIdentityProviderRequest }) => {
      return post<IdentityProvider>(url, arg)
    }
  )
}

/**
 * Update an identity provider
 */
export function useUpdateIdentityProviderApi(id: string | null) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && id ? `${BASE_URL}/${id}` : null,
    async (url: string, { arg }: { arg: UpdateIdentityProviderRequest }) => {
      return put<IdentityProvider>(url, arg)
    }
  )
}

/**
 * Delete an identity provider
 */
export function useDeleteIdentityProviderApi(id: string | null) {
  const { currentTenant } = useTenant()

  return useSWRMutation(currentTenant && id ? `${BASE_URL}/${id}` : null, async (url: string) => {
    return del<void>(url)
  })
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

// ============================================
// CACHE INVALIDATION
// ============================================

export async function invalidateIdentityProvidersCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/identity-providers'), undefined, {
    revalidate: true,
  })
}
