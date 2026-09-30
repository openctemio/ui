'use client'

import useSWR from 'swr'
import { adminFetch, adminFetcher, AdminApiError } from './admin-client'
import type { AdminIdentity, AdminLoginResult } from '../types'

const SESSION_KEY = '/auth/validate'

/**
 * The signed-in platform admin, or null when there is no valid console
 * session (401). Other errors surface as `error`.
 */
export function useAdminSession() {
  const { data, error, isLoading, mutate } = useSWR<AdminIdentity | null>(
    SESSION_KEY,
    async (path: string) => {
      try {
        return await adminFetcher<AdminIdentity>(path)
      } catch (e) {
        if (e instanceof AdminApiError && e.status === 401) return null
        throw e
      }
    },
    { revalidateOnFocus: true, shouldRetryOnError: false }
  )
  return { admin: data ?? null, isLoading, error: error as Error | undefined, mutate }
}

/**
 * Opens the TOTP step of a console session for the account signed in on the
 * normal /login page (the API reads its refresh-token cookie). 401: not signed
 * in; 403: not a platform administrator, or signed in with SSO.
 */
export function adminStartSession() {
  return adminFetch<AdminLoginResult>('/auth/session', { method: 'POST' })
}

export function adminVerifyMFA(code: string) {
  return adminFetch<AdminIdentity>('/auth/mfa', { method: 'POST', body: { code } })
}

export function adminLogout() {
  return adminFetch<void>('/auth/logout', { method: 'POST' })
}
