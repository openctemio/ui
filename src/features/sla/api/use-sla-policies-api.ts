/**
 * SLA Policy API Hooks
 *
 * SWR hooks for the shipped /api/v1/sla-policies backend
 * (api: internal/infra/http/routes/misc.go + handler/sla_handler.go).
 *
 * The HTTP surface exposes per-severity remediation windows only. The domain
 * entity also carries per-CTEM-priority (P0..P3) days, but those are NOT part
 * of the create/update request nor the response JSON, so they are intentionally
 * absent here — see SLAPolicyResponse in sla_handler.go.
 *
 * Tenant is derived from the JWT on the server; no tenant param is sent.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import { usePermissions, Permission } from '@/lib/permissions'

const BASE_URL = '/api/v1/sla-policies'

// ============================================
// TYPES (mirror sla_handler.go SLAPolicyResponse)
// ============================================

export interface SlaPolicy {
  id: string
  tenant_id: string
  /** Present only for per-asset override policies; empty/absent = tenant policy. */
  asset_id?: string
  name: string
  description?: string
  is_default: boolean
  critical_days: number
  high_days: number
  medium_days: number
  low_days: number
  info_days: number
  warning_threshold_pct: number
  escalation_enabled: boolean
  escalation_config?: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SlaPolicyListResponse {
  data: SlaPolicy[]
  total: number
}

/** POST body — matches CreateSLAPolicyRequest. Day fields are required 1..365. */
export interface CreateSlaPolicyInput {
  name: string
  description?: string
  is_default?: boolean
  critical_days: number
  high_days: number
  medium_days: number
  low_days: number
  info_days: number
  warning_threshold_pct: number
  escalation_enabled?: boolean
  /** Optional per-asset override; omit for a tenant-level policy. */
  asset_id?: string
}

/** PUT body — matches UpdateSLAPolicyRequest (all fields optional). */
export interface UpdateSlaPolicyInput extends Partial<CreateSlaPolicyInput> {
  is_active?: boolean
}

// ============================================
// SWR CONFIG
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  shouldRetryOnError: (error) => !(error?.statusCode >= 400 && error?.statusCode < 500),
  errorRetryCount: 3,
  dedupingInterval: 2000,
  onError: (error) => handleApiError(error, { showToast: true, logError: true }),
}

// ============================================
// READ HOOKS
// ============================================

/** List all SLA policies for the current tenant. */
export function useSlaPoliciesApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const key = currentTenant && can(Permission.SLARead) ? `${BASE_URL}/` : null
  return useSWR<SlaPolicyListResponse>(key, (url: string) => get<SlaPolicyListResponse>(url), {
    ...defaultConfig,
    ...config,
  })
}

/** Get the tenant default SLA policy. Returns 404 when none is set. */
export function useDefaultSlaPolicyApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const key = currentTenant && can(Permission.SLARead) ? `${BASE_URL}/default` : null
  return useSWR<SlaPolicy>(key, (url: string) => get<SlaPolicy>(url), {
    ...defaultConfig,
    // A missing default is an expected state, not an error to toast.
    onError: () => {},
    shouldRetryOnError: false,
    ...config,
  })
}

/** Get a single SLA policy by id. */
export function useSlaPolicyApi(id: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const key = currentTenant && id && can(Permission.SLARead) ? `${BASE_URL}/${id}` : null
  return useSWR<SlaPolicy>(key, (url: string) => get<SlaPolicy>(url), {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateSlaPolicy() {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant ? `${BASE_URL}/` : null,
    (url: string, { arg }: { arg: CreateSlaPolicyInput }) => post<SlaPolicy>(url, arg)
  )
}

export function useUpdateSlaPolicy() {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    (url: string, { arg }: { arg: { id: string } & UpdateSlaPolicyInput }) => {
      const { id, ...body } = arg
      return put<SlaPolicy>(`${url}/${id}`, body)
    }
  )
}

export function useDeleteSlaPolicy() {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    (url: string, { arg }: { arg: { id: string } }) => del<void>(`${url}/${arg.id}`)
  )
}

// ============================================
// CACHE INVALIDATION
// ============================================

/** Revalidate every SLA-policy SWR key after a mutation. */
export async function invalidateSlaPoliciesCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/sla-policies'), undefined, {
    revalidate: true,
  })
}
