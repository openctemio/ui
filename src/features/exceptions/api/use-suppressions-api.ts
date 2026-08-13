/**
 * Suppression (Exceptions) API hooks.
 *
 * SWR hooks over the `/api/v1/suppressions` backend
 * (see api `internal/infra/http/routes/scanning.go` — `registerSuppressionRoutes`).
 * Tenant is derived from the JWT token server-side; hooks gate on `currentTenant`
 * so they stay idle until a tenant is selected.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import type {
  SuppressionRule,
  SuppressionListResponse,
  SuppressionStatus,
  CreateSuppressionInput,
  UpdateSuppressionInput,
} from '../types'

const SUPPRESSIONS_URL = '/api/v1/suppressions'

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error) => {
    if (error?.statusCode >= 400 && error?.statusCode < 500) return false
    return true
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
  onError: (error) => {
    handleApiError(error, { showToast: true, logError: true })
  },
}

/**
 * List all suppression rules for the current tenant.
 * `GET /api/v1/suppressions` (optional `status` / `tool_name` query filters).
 * Filtering is done client-side by the console so tab counts stay in one fetch.
 */
export function useSuppressions(status?: SuppressionStatus) {
  const { currentTenant } = useTenant()
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  const qs = params.toString()
  return useSWR<SuppressionListResponse>(
    currentTenant ? `${SUPPRESSIONS_URL}${qs ? `?${qs}` : ''}` : null,
    get,
    defaultConfig
  )
}

/**
 * A single suppression rule. `GET /api/v1/suppressions/{id}`.
 */
export function useSuppression(id: string | undefined) {
  const { currentTenant } = useTenant()
  return useSWR<SuppressionRule>(
    currentTenant && id ? `${SUPPRESSIONS_URL}/${id}` : null,
    get,
    defaultConfig
  )
}

/**
 * Active (approved, unexpired) rules — the agent-facing view.
 * `GET /api/v1/suppressions/active` → `{ rules, count }`.
 */
export interface ActiveSuppressionRule {
  rule_id?: string
  tool_name?: string
  path_pattern?: string
  asset_id?: string | null
  expires_at?: string | null
}

export function useActiveSuppressions() {
  const { currentTenant } = useTenant()
  return useSWR<{ rules: ActiveSuppressionRule[]; count: number }>(
    currentTenant ? `${SUPPRESSIONS_URL}/active` : null,
    get,
    defaultConfig
  )
}

/** Create a suppression rule. `POST /api/v1/suppressions`. */
export function useCreateSuppression() {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant ? SUPPRESSIONS_URL : null,
    (url: string, { arg }: { arg: CreateSuppressionInput }) => post<SuppressionRule>(url, arg)
  )
}

/** Update a suppression rule. `PUT /api/v1/suppressions/{id}`. */
export function useUpdateSuppression(id: string) {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant && id ? `${SUPPRESSIONS_URL}/${id}` : null,
    (url: string, { arg }: { arg: UpdateSuppressionInput }) => put<SuppressionRule>(url, arg)
  )
}

/** Approve a pending rule. `POST /api/v1/suppressions/{id}/approve`. */
export function useApproveSuppression(id: string) {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant && id ? `${SUPPRESSIONS_URL}/${id}/approve` : null,
    (url: string) => post<SuppressionRule>(url, {})
  )
}

/** Reject a pending rule with a reason. `POST /api/v1/suppressions/{id}/reject`. */
export function useRejectSuppression(id: string) {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant && id ? `${SUPPRESSIONS_URL}/${id}/reject` : null,
    (url: string, { arg }: { arg: { reason: string } }) => post<SuppressionRule>(url, arg)
  )
}

/** Delete a suppression rule. `DELETE /api/v1/suppressions/{id}`. */
export function useDeleteSuppression(id: string) {
  const { currentTenant } = useTenant()
  return useSWRMutation(currentTenant && id ? `${SUPPRESSIONS_URL}/${id}` : null, (url: string) =>
    del(url)
  )
}
