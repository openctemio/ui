'use client'

import useSWR from 'swr'
import { get } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'
import { Permission, usePermissions } from '@/lib/permissions'
import type { CtemCycleStatus } from '@/features/cycles'

/**
 * GET /api/v1/scoping/summary (api#716): every count the Scoping overview and
 * the dashboard's Scoping tile need, in one tenant-scoped call (assets:read,
 * no module gate). Definitions: api docs/architecture/scoping-overview.md.
 */
export interface ScopingSummary {
  /** The active cycle, else the latest in review, else the latest in planning. */
  active_cycle: null | {
    id: string
    name: string
    status: CtemCycleStatus
    start_date: string | null
    end_date: string | null
    objectives: number
    success_criteria: number
    in_scope_services: number
    exclusions: number
    threat_scenarios: number
    scope_assets: number
    attacker_profiles: number
  }
  crown_jewels: { total: number; with_owner: number }
  business_services: { total: number; with_assets: number }
  business_units: { total: number }
  assets: { total: number; in_business_unit: number }
  boundary: { targets: number; exclusions: number }
  attacker_profiles: { total: number }
  threat_models: { total: number; crown_jewels_covered: number }
  cycles: { total: number }
}

export const SCOPING_SUMMARY_URL = '/api/v1/scoping/summary'

export function useScopingSummary(enabled = true) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const ready = enabled && !!currentTenant && can(Permission.AssetsRead)
  return useSWR<ScopingSummary>(
    ready ? [SCOPING_SUMMARY_URL, currentTenant!.id] : null,
    ([url]: [string]) => get<ScopingSummary>(url),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
}
