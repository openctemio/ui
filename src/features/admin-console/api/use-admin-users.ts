'use client'

import useSWR from 'swr'
import { adminFetch, adminFetcher } from './admin-client'
import type { AdminRole, AdminUserRecord, Paged } from '../types'

/** The administrator roster (super_admin only; pass enabled=false otherwise). */
export function useAdminUsers(page = 1, enabled = true) {
  return useSWR<Paged<AdminUserRecord>>(
    enabled ? `/users?page=${page}&per_page=50` : null,
    adminFetcher
  )
}

export function createAdminUser(input: { email: string; name: string; role: AdminRole }) {
  return adminFetch<{ admin: AdminUserRecord; api_key: string }>('/users', {
    method: 'POST',
    body: input,
  })
}

export function updateAdminUser(id: string, input: { role?: AdminRole; is_active?: boolean }) {
  return adminFetch<AdminUserRecord>(`/users/${id}`, { method: 'PATCH', body: input })
}

/** Remove another admin's password and MFA and end their sessions. */
export function resetAdminCredentials(id: string) {
  return adminFetch<void>(`/users/${id}/reset-credentials`, { method: 'POST' })
}
