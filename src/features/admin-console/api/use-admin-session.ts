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

export function adminLogin(email: string, password: string) {
  return adminFetch<AdminLoginResult>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export function adminVerifyMFA(code: string) {
  return adminFetch<AdminIdentity>('/auth/mfa', { method: 'POST', body: { code } })
}

export function adminLogout() {
  return adminFetch<void>('/auth/logout', { method: 'POST' })
}
