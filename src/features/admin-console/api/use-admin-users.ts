'use client'

import useSWR from 'swr'
import { adminFetch, adminFetcher } from './admin-client'
import type { AdminIdentity, AdminRole, AdminUserRecord, Paged } from '../types'

/** The administrator roster (super_admin only; pass enabled=false otherwise). */
export function useAdminUsers(page = 1, enabled = true) {
  return useSWR<Paged<AdminUserRecord>>(
    enabled ? `/users?page=${page}&per_page=50` : null,
    adminFetcher
  )
}

/**
 * Make someone a platform administrator. The account with this email is
 * linked (it must not belong to any organization), or a new sign-in account is
 * created and its temporary password returned once.
 */
export function provisionAdministrator(input: { email: string; name: string; role: AdminRole }) {
  return adminFetch<{ admin: AdminIdentity; temporary_password?: string }>('/administrators', {
    method: 'POST',
    body: input,
  })
}

export function updateAdminUser(id: string, input: { role?: AdminRole; is_active?: boolean }) {
  return adminFetch<AdminUserRecord>(`/users/${id}`, { method: 'PATCH', body: input })
}

/** Remove another admin's two-step verification and end their console sessions. */
export function resetAdminCredentials(id: string) {
  return adminFetch<void>(`/users/${id}/reset-credentials`, { method: 'POST' })
}
