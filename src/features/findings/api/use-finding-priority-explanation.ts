/**
 * Finding Priority-Explanation Hook
 *
 * Read-only SWR hook for
 *   GET /api/v1/findings/{id}/priority-explanation
 *
 * The endpoint returns the factors + decision behind a finding's priority
 * class (reachability, EPSS, KEV, asset criticality, compensating controls),
 * so an operator can see WHY a finding landed in its P-class. It 404s when the
 * explainer is not wired or the finding has no explanation — the hook treats
 * that as "unavailable" (no data, no retry, no toast) so the caller can degrade
 * gracefully.
 *
 * Response shape mirrors `app/finding.PriorityExplanation` on the backend.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { get } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'

// ============================================
// TYPES (mirror backend PriorityExplanation JSON)
// ============================================

/** The classifier inputs plus the two derived gates the rules act on. */
export interface PriorityFactors {
  severity: string
  cve_id?: string
  epss_score?: number
  epss_percentile?: number
  is_in_kev: boolean
  is_reachable: boolean
  is_internet_accessible: boolean
  is_network_accessible: boolean
  on_open_threat_path: boolean
  reachable_from_count: number
  asset_criticality?: string
  asset_exposure?: string
  asset_is_crown_jewel: boolean
  is_protected: boolean
  /** Compensating-control reduction, already expressed as a percentage (0-100). */
  control_reduction_pct: number
  reachable: boolean
  critical_asset: boolean
}

/** Read-only breakdown of why a finding holds its priority class. */
export interface PriorityExplanation {
  finding_id: string
  priority_class: string
  reason: string
  /** "auto" (default classifier) | "rule" (tenant override matched). */
  source: string
  rule_name?: string
  factors: PriorityFactors
}

// ============================================
// SWR CONFIG
// ============================================

// The explanation is supplementary, not critical: don't retry client errors
// (a 404 just means "unavailable"), and never toast.
const config: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error) => {
    if (error?.statusCode >= 400 && error?.statusCode < 500) return false
    return true
  },
  errorRetryCount: 2,
  dedupingInterval: 5000,
  onError: (error) => {
    handleApiError(error, { showToast: false, logError: true })
  },
}

// ============================================
// HOOK
// ============================================

/**
 * Fetch the priority explanation for a finding. Returns `explanation: null`
 * (not an error) when the endpoint has nothing to show, so the UI can hide the
 * panel rather than crash.
 */
export function useFindingPriorityExplanation(
  findingId: string | null | undefined,
  swrConfig?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key =
    currentTenant && findingId ? `/api/v1/findings/${findingId}/priority-explanation` : null

  const { data, error, isLoading, mutate } = useSWR<PriorityExplanation>(
    key,
    (url: string) => get<PriorityExplanation>(url),
    { ...config, ...swrConfig }
  )

  return {
    explanation: data ?? null,
    isLoading,
    error,
    mutate,
  }
}
