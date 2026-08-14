/**
 * Program Health — CTEM-playbook OUTCOME metrics.
 *
 * These are the metrics the ctem.org getting-started guide tells a program to
 * lead with: did exposure actually go down, did the important things get fixed
 * in time, is the inventory owned. They are deliberately NOT the vanity/volume
 * numbers (total findings, scans, tickets) — those measure activity, not value.
 *
 * Every function here is a PURE mapping from a real API field to a value + a
 * health state, so the page stays a thin renderer and the thresholds are
 * unit-tested. Health state reuses the house `CtemState` ramp from ctem-colors.
 *
 * P0 ↔ P1 mapping: the guide numbers priority P1–P4 (P1 = most urgent).
 * OpenCTEM numbers priority classes P0–P3 (P0 = most urgent). So the guide's
 * "P1" outcomes map onto OpenCTEM's **P0** class throughout this file.
 */

import type { CtemState } from './ctem-colors'

/** A metric with no wired data source yet (e.g. validation downgrade %). */
export type MetricStatus = CtemState | 'pending'

/** Percent of the most-urgent class that has been remediated in the period.
 * Guide metric: "P1 remediated / total", target > 90%. Proxy uses the P0
 * class: resolved / (open + resolved) over the window. Returns null when there
 * is nothing in the class (no denominator → not measurable, not "0%"). */
export function remediationCompletionPct(open: number, resolved: number): number | null {
  const denom = open + resolved
  if (denom <= 0) return null
  return (resolved / denom) * 100
}

/** Higher is better. Target ≥ 90%. */
export function remediationCompletionState(pct: number | null): MetricStatus {
  if (pct === null) return 'pending'
  if (pct >= 90) return 'good'
  if (pct >= 70) return 'warn'
  return 'crit'
}

/** Convert MTTR hours to days for the "discovery → remediation" metric. */
export function hoursToDays(hours: number | null | undefined): number | null {
  if (hours === null || hours === undefined || Number.isNaN(hours) || hours <= 0) return null
  return hours / 24
}

/** Lower is better. Guide target < 14 days for the P1 (=P0) class. */
export function remediationTimeState(days: number | null): MetricStatus {
  if (days === null) return 'pending'
  if (days < 14) return 'good'
  if (days < 30) return 'warn'
  return 'crit'
}

/** In-scope assets with an assigned owner. Higher is better; guide target 100%. */
export function ownerCoverageState(pct: number | null | undefined): MetricStatus {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return 'pending'
  if (pct >= 95) return 'good'
  if (pct >= 75) return 'warn'
  return 'crit'
}

/** Remediation re-open (regression) rate. Lower is better; guide target < 20%. */
export function reopenRateState(pct: number | null | undefined): MetricStatus {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return 'pending'
  if (pct < 20) return 'good'
  if (pct < 35) return 'warn'
  return 'crit'
}

/** SLA compliance. Higher is better; healthy program ≥ 90%. */
export function slaComplianceState(pct: number | null | undefined): MetricStatus {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return 'pending'
  if (pct >= 90) return 'good'
  if (pct >= 70) return 'warn'
  return 'crit'
}

/** Direction of the open-exposure count across the trend window.
 * Guide: exposure count should trend DOWN after ~day 60. `delta = last - first`
 * of the open-findings series. Negative (fewer open now) is good. */
export function exposureTrendDelta(series: number[]): number | null {
  if (series.length < 2) return null
  return series[series.length - 1] - series[0]
}

/** Lower/negative delta is better (exposure shrinking). */
export function exposureTrendState(delta: number | null): MetricStatus {
  if (delta === null) return 'pending'
  if (delta < 0) return 'good'
  if (delta === 0) return 'warn'
  return 'crit'
}
