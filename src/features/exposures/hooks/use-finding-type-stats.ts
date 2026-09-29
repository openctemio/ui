'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { buildFindingStatsUrl, fetchFindingStats } from '@/features/findings/api/use-findings-api'
import type { FindingStatsResponse } from '@/features/findings/api/finding-api.types'
import { usePermissions, Permission } from '@/lib/permissions'
import type { FindingSeverity, FindingSource } from '@/lib/api/finding-types'

/**
 * Per-finding-type statistics for the Exposures sub-pages.
 *
 * The four exposure sub-pages (code / misconfigurations / secrets /
 * vulnerabilities) each show ONLY their own finding type. Every number comes
 * from ONE `GET /findings/stats?sources=…` call, which the API aggregates in a
 * single query. This replaced a walk of the whole findings list (up to 25
 * requests per page load) that tripped the per-user read rate limit.
 *
 * An API older than the `sources` filter ignores the param and answers for the
 * whole tenant. That is detected from `by_source` (see `isScopedToSources`), and
 * `scoped` is then false: the pages show the exact per-type total that
 * `by_source` still gives and say the breakdown is unavailable, rather than
 * passing tenant-wide numbers off as the type's.
 */
export interface FindingTypeStats {
  total: number
  bySeverity: Record<FindingSeverity, number>
  /** Non-zero statuses only (the API reports every status, zeros included). */
  byStatus: Record<string, number>
  /** Open findings (new, confirmed, in progress and the pentest-active states). */
  openCount: number
  /** 0-100 severity-weighted risk score derived from `bySeverity`. */
  riskScore: number
  /**
   * False when the API ignored `sources` (older server): only `total` is
   * trustworthy then, and the breakdowns are empty.
   */
  scoped: boolean
}

// Severity ordering/weights for the derived risk score. Weighting critical
// heavily guarantees the score cannot read "Low" while criticals are present.
const SEVERITY_WEIGHTS: Record<FindingSeverity, number> = {
  critical: 100,
  high: 70,
  medium: 40,
  low: 15,
  info: 0,
}

const EMPTY_SEVERITY: Record<FindingSeverity, number> = {
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  info: 0,
}

export const EMPTY_FINDING_TYPE_STATS: FindingTypeStats = {
  total: 0,
  bySeverity: EMPTY_SEVERITY,
  byStatus: {},
  openCount: 0,
  riskScore: 0,
  scoped: true,
}

export function computeRiskScore(
  bySeverity: Record<FindingSeverity, number>,
  total: number
): number {
  if (total <= 0) return 0
  let weighted = 0
  ;(Object.keys(SEVERITY_WEIGHTS) as FindingSeverity[]).forEach((sev) => {
    weighted += (bySeverity[sev] || 0) * SEVERITY_WEIGHTS[sev]
  })
  // Normalised severity-weighted average, 0-100.
  return Math.round(weighted / total)
}

/**
 * Did the server apply the `sources` filter?
 *
 * `by_source` counts a fixed subset of sources. If the filter was applied,
 * every source outside the request counts zero, and — when every requested
 * source is one `by_source` tracks — `total` equals their sum. An older API
 * that ignored the param fails one of the two checks as soon as the tenant has
 * a finding of another type; if it has none, tenant-wide and per-type numbers
 * are the same anyway.
 */
export function isScopedToSources(
  resp: Pick<FindingStatsResponse, 'total' | 'by_source'>,
  sources: readonly string[]
): boolean {
  const bySource = resp.by_source ?? {}
  const requested = new Set(sources)
  for (const [source, count] of Object.entries(bySource)) {
    if (!requested.has(source) && count > 0) return false
  }
  if (sources.every((s) => s in bySource)) {
    const sum = sources.reduce((acc, s) => acc + (bySource[s] || 0), 0)
    return sum === resp.total
  }
  return true
}

/** Map a `/findings/stats` response onto the page's shape. */
export function toFindingTypeStats(
  resp: FindingStatsResponse | undefined,
  sources: readonly string[]
): FindingTypeStats {
  if (!resp) return EMPTY_FINDING_TYPE_STATS

  if (!isScopedToSources(resp, sources)) {
    const bySource = resp.by_source ?? {}
    return {
      ...EMPTY_FINDING_TYPE_STATS,
      total: sources.reduce((acc, s) => acc + (bySource[s] || 0), 0),
      scoped: false,
    }
  }

  const sev = resp.by_severity ?? {}
  const bySeverity: Record<FindingSeverity, number> = {
    critical: sev.critical || 0,
    high: sev.high || 0,
    medium: sev.medium || 0,
    low: sev.low || 0,
    // The API reports informational findings under `none`.
    info: (sev.info || 0) + (sev.none || 0),
  }

  const byStatus: Record<string, number> = {}
  for (const [status, count] of Object.entries(resp.by_status ?? {})) {
    if (count > 0) byStatus[status] = count
  }

  const total = resp.total || 0
  return {
    total,
    bySeverity,
    byStatus,
    openCount: resp.open_count || 0,
    riskScore: computeRiskScore(bySeverity, total),
    scoped: true,
  }
}

/**
 * Counts for a specific set of sources (finding types), in one request.
 *
 * @param tenantId - tenant scope (cache key); fetch is skipped when null
 * @param sources  - finding sources to include (e.g. `['sast']`, `['iac']`)
 */
export function useFindingTypeStats(
  tenantId: string | null,
  sources: FindingSource[]
): { stats: FindingTypeStats; isLoading: boolean; error: unknown; mutate: () => void } {
  const { can } = usePermissions()
  const canReadFindings = can(Permission.FindingsRead)

  const sourcesKey = sources.join(',')
  const shouldFetch = Boolean(tenantId) && canReadFindings && sources.length > 0

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch
      ? (['finding-type-stats', tenantId, buildFindingStatsUrl({ sources })] as const)
      : null,
    ([, , url]) => fetchFindingStats(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  // sourcesKey (not the array) so a fresh array literal each render does not
  // recompute.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => toFindingTypeStats(data, sources), [data, sourcesKey])

  return {
    stats,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}
