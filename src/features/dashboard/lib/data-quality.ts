/**
 * Data Quality scorecard — CTEM Discovery data-hygiene thresholds.
 *
 * CTEM's first stage is Scoping/Discovery, and a prioritisation program is only
 * as trustworthy as the inventory under it: an unowned asset has nobody to route
 * a fix to, a finding with no evidence can't be actioned, and a stale inventory
 * silently drops coverage. This scorecard surfaces the already-computed
 * `GET /api/v1/dashboard/data-quality` metrics against their CTEM targets.
 *
 * Every function here is a PURE mapping from a real API field to a health state,
 * so the page stays a thin renderer and the thresholds are unit-tested. Health
 * state reuses the house `CtemState` ramp from ctem-colors; `pending` marks a
 * metric whose source genuinely has no value yet (never a fabricated number).
 */

import type { CtemState } from './ctem-colors'

/** A metric whose data source hasn't produced a value yet. */
export type MetricStatus = CtemState | 'pending'

function isMissing(v: number | null | undefined): v is null | undefined {
  return v === null || v === undefined || Number.isNaN(v)
}

/** Asset owner coverage. Higher is better; CTEM target ≥ 95% (100% is the goal). */
export function ownershipState(pct: number | null | undefined): MetricStatus {
  if (isMissing(pct)) return 'pending'
  if (pct >= 95) return 'good'
  if (pct >= 75) return 'warn'
  return 'crit'
}

/** Finding evidence coverage. Higher is better; CTEM target ≥ 90%. */
export function evidenceState(pct: number | null | undefined): MetricStatus {
  if (isMissing(pct)) return 'pending'
  if (pct >= 90) return 'good'
  if (pct >= 70) return 'warn'
  return 'crit'
}

/** Inventory freshness — median observation age in hours. Lower is better;
 * CTEM target < 48h (fresh), degrading past a week. */
export function freshnessState(hours: number | null | undefined): MetricStatus {
  if (isMissing(hours)) return 'pending'
  if (hours < 48) return 'good'
  if (hours < 168) return 'warn' // one week
  return 'crit'
}

/** Stale-asset share — assets not re-observed in 30 days. Lower is better and
 * should trend down; a growing tail is coverage decay. */
export function staleState(pct: number | null | undefined): MetricStatus {
  if (isMissing(pct)) return 'pending'
  if (pct < 10) return 'good'
  if (pct < 25) return 'warn'
  return 'crit'
}

/** Format a percentage for display, or null when the metric is not measured. */
export function fmtPct(v: number | null | undefined): string | null {
  if (isMissing(v)) return null
  return `${v.toFixed(1)}%`
}

/** Format an hours value as the most readable freshness unit (h / d), or null. */
export function fmtAge(hours: number | null | undefined): string | null {
  if (isMissing(hours)) return null
  if (hours < 48) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}
