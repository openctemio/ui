'use client'

import useSWR from 'swr'
import { adminFetch, adminFetcher, AdminApiError } from './admin-client'
import type {
  AdminIdPCallbackResult,
  AdminIdPInfo,
  AdminIdentity,
  AdminLoginResult,
} from '../types'

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

/** Whether the sign-in page offers the administrators' identity provider. */
export function adminIdPInfo() {
  return adminFetch<AdminIdPInfo>('/auth/idp')
}

/**
 * Starts an identity-provider sign-in. The API sets the HttpOnly admin_idp
 * cookie the callback must present; the browser then goes to the returned URL.
 */
export function adminIdPStart() {
  return adminFetch<{ authorization_url: string }>('/auth/idp/start', { method: 'POST' })
}

/** Finishes an identity-provider sign-in with what the IdP redirected back with. */
export function adminIdPCallback(code: string, state: string) {
  return adminFetch<AdminIdPCallbackResult>('/auth/idp/callback', {
    method: 'POST',
    body: { code, state },
  })
}

/** Changes the signed-in administrator's own password; every session ends. */
export function adminChangePassword(currentPassword: string, newPassword: string) {
  return adminFetch<void>('/auth/password', {
    method: 'POST',
    body: { current_password: currentPassword, new_password: newPassword },
  })
}
