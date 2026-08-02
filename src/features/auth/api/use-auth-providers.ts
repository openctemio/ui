/**
 * Auth Providers API Hook
 *
 * Fetches which social OAuth providers the backend actually has configured,
 * so the login page only renders buttons that will work (no dead affordances).
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'

import { get } from '@/lib/api/client'

// ============================================
// TYPES
// ============================================

export interface AuthProvidersResponse {
  /** Which social OAuth providers are configured on the backend */
  social: {
    microsoft: boolean
    google: boolean
    github: boolean
  }
  /** Whether the global SSO_ENTRA_* env fallback is enabled */
  sso_env_entra_enabled: boolean
}

// ============================================
// CONFIG
// ============================================

const URL = '/api/v1/auth/providers'

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  // Public endpoint; don't hammer it on 4xx
  shouldRetryOnError: (error: { statusCode?: number }) => {
    if (error?.statusCode && error.statusCode >= 400 && error.statusCode < 500) return false
    return true
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 60_000,
}

// ============================================
// HOOK
// ============================================

/**
 * Fetch configured auth providers (public, no auth required).
 * Consumers should render social buttons only for providers reported `true`.
 */
export function useAuthProviders(config?: SWRConfiguration) {
  return useSWR<AuthProvidersResponse>(URL, (url: string) => get<AuthProvidersResponse>(url), {
    ...defaultConfig,
    ...config,
  })
}
