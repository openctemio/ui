/**
 * Scan Coverage API Hooks
 *
 * SWR hook for RFC-007 license-aware rolling scan coverage observability.
 * Backed by GET /api/v1/scans/coverage (scans:read).
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { get } from './client'
import { useTenant } from '@/context/tenant-provider'

/** Coverage summary for the tenant's scannable estate. Mirrors the API's
 * scancoverage.CoverageStats JSON. */
export interface ScanCoverageStats {
  window_days: number
  total_scannable: number
  never_scanned: number
  covered_in_window: number
  stale: number
  critical_never_scanned: number
  critical_uncovered: number
  oldest_dispatched_at?: string
  coverage_percent: number
}

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
}

async function fetchCoverage(url: string): Promise<ScanCoverageStats> {
  return get<ScanCoverageStats>(url)
}

/**
 * useScanCoverage returns the rolling-coverage summary for the current tenant.
 * windowDays is the freshness window (default 30). Returns null key (no fetch)
 * until a tenant is selected.
 */
export function useScanCoverage(windowDays = 30, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant ? `/api/v1/scans/coverage?window_days=${windowDays}` : null
  return useSWR<ScanCoverageStats>(key, fetchCoverage, {
    ...defaultConfig,
    ...config,
  })
}
