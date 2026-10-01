/**
 * Validation coverage KPI — SWR over GET /api/v1/validation/coverage.
 * Per-severity: how many findings have >=1 validation evidence record.
 */

'use client'

import useSWR from 'swr'
import { get } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'

export interface SeverityCoverage {
  severity: string
  total: number
  validated: number
  pct: number
}

/** One priority class: closed findings, and how many have validation evidence. */
export interface PriorityCoverage {
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  total: number
  validated: number
}

export interface ValidationCoverage {
  /**
   * The CTEM cycle's definition (closed findings with validation evidence),
   * tenant-wide. Absent from APIs older than api#658.
   */
  by_priority?: PriorityCoverage[]
  p0_p1_total?: number
  p0_p1_validated?: number
  by_severity: SeverityCoverage[]
  total: number
  validated: number
  overall_pct: number
}

const URL = '/api/v1/validation/coverage'

export function useValidationCoverage() {
  const { currentTenant } = useTenant()
  return useSWR<ValidationCoverage>(
    currentTenant ? URL : null,
    (u: string) => get<ValidationCoverage>(u),
    { revalidateOnFocus: false }
  )
}
