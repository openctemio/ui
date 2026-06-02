/**
 * Account Activity API Hook
 *
 * Fetches the current user's own activity (audit) events from the dedicated
 * per-user audit endpoint, which is scoped to the requesting user.
 */

import useSWR from 'swr'
import { get } from '@/lib/api/client'
import { auditLogEndpoints } from '@/lib/api/endpoints'
import type { AuditLog, AuditLogListResponse } from '@/features/organization/types/audit.types'

/**
 * Fetch the current user's recent activity. The SWR key is null until a
 * userId is known, so we never fall back to an unscoped (all-tenant) query.
 *
 * @param userId   current user id (from the auth store)
 * @param perPage  how many recent events to load (default 100)
 */
export function useAccountActivity(userId: string | undefined, perPage = 100) {
  const key = userId
    ? `${auditLogEndpoints.userActivity(userId)}?per_page=${perPage}&sort_order=desc`
    : null

  const { data, error, isLoading, mutate } = useSWR<AuditLogListResponse>(
    key,
    (url: string) => get<AuditLogListResponse>(url),
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )

  const activities: AuditLog[] = data?.data ?? []

  return {
    activities,
    total: data?.total ?? activities.length,
    isLoading: !!userId && isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
