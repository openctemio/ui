'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { fetchAllPages } from '@/lib/api/fetch-all-pages'
import { findingEndpoints } from '@/lib/api/endpoints'
import { usePermissions, Permission } from '@/lib/permissions'
import type { Finding, FindingSeverity, FindingSource } from '@/lib/api/finding-types'

/**
 * Per-finding-type statistics for the Exposures sub-pages.
 *
 * The four exposure sub-pages (code / misconfigurations / secrets /
 * vulnerabilities) each show ONLY their own finding type. The backend has no
 * per-source severity/stats endpoint (`/findings/stats` scopes by `asset_id`
 * only; `/findings/analytics/sources` returns per-source totals without a
 * severity split), so we derive the breakdown client-side from the findings
 * list endpoint, which DOES filter by `sources` server-side.
 *
 * Totals and severity/status counts are exact for realistic volumes; the walk
 * is bounded (see MAX_PAGES) so a pathologically large type truncates rather
 * than firing an unbounded request storm. `truncated` reports that case.
 */
export interface FindingTypeStats {
  total: number
  bySeverity: Record<FindingSeverity, number>
  byStatus: Record<string, number>
  /** Findings fetched for this type (used to drive the table/list). */
  findings: Finding[]
  /** 0-100 severity-weighted risk score derived from `bySeverity`. */
  riskScore: number
  /** True when the bounded walk stopped before fetching every page. */
  truncated: boolean
}

// Severity ordering/weights for the derived risk score. Weighting critical
// heavily guarantees the score cannot read "Low" while criticals are present
// (the self-contradiction Bug 2). Open findings only would be ideal, but the
// score is over ALL fetched findings of the type to stay consistent with the
// severity cards on the same page.
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

const PER_PAGE = 100 // backend max per_page for findings list
const MAX_PAGES = 25 // bound the walk (covers 2,500 findings per type)

function computeRiskScore(bySeverity: Record<FindingSeverity, number>, total: number): number {
  if (total <= 0) return 0
  let weighted = 0
  ;(Object.keys(SEVERITY_WEIGHTS) as FindingSeverity[]).forEach((sev) => {
    weighted += (bySeverity[sev] || 0) * SEVERITY_WEIGHTS[sev]
  })
  // Normalised severity-weighted average, 0-100.
  return Math.round(weighted / total)
}

/**
 * Fetch and aggregate findings for a specific set of sources (finding types).
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
    shouldFetch ? (['finding-type-stats', tenantId, sourcesKey] as const) : null,
    async () => {
      let truncated = false
      const rows = await fetchAllPages<Finding>(
        (page, perPage) => findingEndpoints.list({ sources, page, per_page: perPage }),
        {
          perPage: PER_PAGE,
          maxPages: MAX_PAGES,
          onTruncated: () => {
            truncated = true
          },
        }
      )
      return { rows, truncated }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const stats = useMemo<FindingTypeStats>(() => {
    const rows = data?.rows ?? []
    const bySeverity: Record<FindingSeverity, number> = { ...EMPTY_SEVERITY }
    const byStatus: Record<string, number> = {}

    for (const f of rows) {
      if (f.severity in bySeverity) {
        bySeverity[f.severity] += 1
      }
      byStatus[f.status] = (byStatus[f.status] || 0) + 1
    }

    const total = rows.length
    return {
      total,
      bySeverity,
      byStatus,
      findings: rows,
      riskScore: computeRiskScore(bySeverity, total),
      truncated: data?.truncated ?? false,
    }
  }, [data])

  return {
    stats,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}
