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

export interface ValidationCoverage {
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
