/**
 * CTEM maturity — SWR over GET /api/v1/ctem-cycles/metrics/trend.
 *
 * The backend (api PR #436, ctemcycle.ComputeMaturity) returns a
 * TRANSPARENT maturity result: an overall 0–100 score plus the five
 * weighted components that produce it (each with its raw value, sub
 * score, weight and contribution), the per-metric trend across the
 * tenant's closed cycles, and CTEM stage coverage reported alongside
 * (deliberately NOT folded into the score).
 *
 * The interfaces below mirror the Go json tags exactly:
 *   - pkg/domain/ctemcycle/maturity.go  (MaturityBreakdown, ...)
 *   - internal/infra/http/handler/ctem_cycle_metrics_handler.go
 *     (MetricsTrend response envelope + trendSeriesPoint)
 */

'use client'

import useSWR from 'swr'
import { get } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'

/** Stable metric keys emitted in the trend series (metricKeyOrder). */
export const METRIC_KEYS = [
  'mttr_hours',
  'findings_opened',
  'findings_resolved',
  'p_class_churn',
  'validation_coverage',
  'scope_drift_size',
] as const

export type MetricKey = (typeof METRIC_KEYS)[number]

/** One (cycle, value) sample in a metric's series — handler.trendSeriesPoint. */
export interface MetricTrendPoint {
  cycle_id: string
  name: string
  closed_at: string
  value: number
}

/** One closed cycle with its latest metric values — ctemcycle.CycleMetrics. */
export interface CycleSummary {
  cycle_id: string
  name: string
  closed_at: string
  metrics: Record<string, number>
}

/** One transparent, weighted input to the composite — ctemcycle.MaturityComponent. */
export interface MaturityComponent {
  name: string
  raw_value: number
  score: number
  weight: number
  contribution: number
  detail: string
}

/** CTEM stage coverage — ctemcycle.CTEMStageCoverage. Reported, not scored. */
export interface CTEMStageCoverage {
  scoping: boolean
  discovery: boolean
  prioritization: boolean
  validation: boolean
  mobilization: boolean
  covered_count: number
}

/** The full, explainable maturity result — ctemcycle.MaturityBreakdown. */
export interface MaturityBreakdown {
  score: number
  /** null when no cycles have been analyzed yet (Go nil slice → JSON null). */
  components: MaturityComponent[] | null
  ctem_stage_coverage: CTEMStageCoverage
  cycles_analyzed: number
}

/** MetricsTrend response envelope. */
export interface CtemMaturityTrend {
  cycles_analyzed: number
  cycles: CycleSummary[]
  /** metric key → series over time (ascending by closed_at). */
  series: Partial<Record<MetricKey, MetricTrendPoint[]>>
  maturity: MaturityBreakdown
}

export const CTEM_MATURITY_TREND_URL = '/api/v1/ctem-cycles/metrics/trend'

/**
 * Fetches the tenant's CTEM maturity trend + breakdown. Skips (SWR
 * no-ops on a null key) until a tenant is selected. A 403 — the
 * ctem_cycles module is disabled for the tenant — is surfaced on
 * `error` (statusCode 403) rather than retried, so the page can render
 * a "module not enabled" state instead of spinning.
 */
export function useCtemMaturity() {
  const { currentTenant } = useTenant()
  const { data, error, isLoading, mutate } = useSWR<CtemMaturityTrend>(
    currentTenant ? CTEM_MATURITY_TREND_URL : null,
    (u: string) => get<CtemMaturityTrend>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )
  return { data, error, isLoading: currentTenant ? isLoading : false, mutate }
}
