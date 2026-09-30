'use client'

import useSWR from 'swr'
import { adminFetcher } from './admin-client'
import type { AdminAuditEntry, Paged } from '../types'

export function useAdminAuditLogs(query: { page?: number; action?: string; adminEmail?: string }) {
  const q = new URLSearchParams({ page: String(query.page ?? 1), per_page: '50' })
  if (query.action?.trim()) q.set('action', query.action.trim())
  if (query.adminEmail?.trim()) q.set('admin_email', query.adminEmail.trim())
  return useSWR<Paged<AdminAuditEntry>>(`/audit-logs?${q.toString()}`, adminFetcher, {
    keepPreviousData: true,
  })
}
