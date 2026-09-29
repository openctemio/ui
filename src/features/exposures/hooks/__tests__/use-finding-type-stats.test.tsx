import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'
import type { FindingStatsResponse } from '@/features/findings/api/finding-api.types'

const mockGet = vi.fn()
vi.mock('@/lib/api/client', () => ({
  get: (...a: unknown[]) => mockGet(...a),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

let canRead = true
vi.mock('@/lib/permissions', () => ({
  usePermissions: () => ({ can: () => canRead }),
  Permission: { FindingsRead: 'findings:read' },
}))

vi.mock('@/context/tenant-provider', () => ({
  useTenant: () => ({ currentTenant: { id: 't1' } }),
}))

import {
  isScopedToSources,
  toFindingTypeStats,
  useFindingTypeStats,
} from '../use-finding-type-stats'

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
  )
}

// What the API returns: every tracked source and status is present, zeros included.
function statsResponse(over: Partial<FindingStatsResponse> = {}): FindingStatsResponse {
  return {
    total: 7,
    by_severity: { critical: 2, high: 3, medium: 1, low: 0, none: 1 },
    by_status: { new: 4, confirmed: 1, in_progress: 0, resolved: 2, false_positive: 0 },
    by_source: { sast: 0, dast: 0, sca: 0, secret: 7, iac: 0, container: 0, manual: 0 },
    open_count: 5,
    resolved_count: 2,
    kev_open: 1,
    epss_high_open: 0,
    sla_breached: 1,
    ...over,
  }
}

describe('useFindingTypeStats', () => {
  beforeEach(() => {
    mockGet.mockReset()
    canRead = true
  })

  it('makes exactly one /findings/stats request scoped by sources', async () => {
    mockGet.mockResolvedValue(statsResponse())
    const { result } = renderHook(() => useFindingTypeStats('t1', ['secret']), { wrapper })

    await waitFor(() => expect(result.current.stats.total).toBe(7))
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(mockGet).toHaveBeenCalledWith('/api/v1/findings/stats?sources=secret')
    // Nothing walks the findings list any more.
    expect(mockGet.mock.calls.some(([url]) => String(url).startsWith('/api/v1/findings?'))).toBe(
      false
    )
  })

  it('maps counts, drops zero statuses and folds `none` into info', async () => {
    mockGet.mockResolvedValue(statsResponse())
    const { result } = renderHook(() => useFindingTypeStats('t1', ['secret']), { wrapper })

    await waitFor(() => expect(result.current.stats.total).toBe(7))
    const { stats } = result.current
    expect(stats.scoped).toBe(true)
    expect(stats.bySeverity).toEqual({ critical: 2, high: 3, medium: 1, low: 0, info: 1 })
    expect(stats.byStatus).toEqual({ new: 4, confirmed: 1, resolved: 2 })
    expect(stats.openCount).toBe(5)
    // (2*100 + 3*70 + 1*40) / 7 = 64.28…
    expect(stats.riskScore).toBe(64)
  })

  it('joins several sources into one comma list', async () => {
    mockGet.mockResolvedValue(
      statsResponse({
        total: 3,
        by_source: { sca: 2, dast: 1, sast: 0, secret: 0, iac: 0 },
      })
    )
    renderHook(() => useFindingTypeStats('t1', ['sca', 'dast', 'bug_bounty']), { wrapper })
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/v1/findings/stats?sources=sca%2Cdast%2Cbug_bounty')
    )
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('does not fetch without a tenant or without findings:read', async () => {
    renderHook(() => useFindingTypeStats(null, ['secret']), { wrapper })
    canRead = false
    const { result } = renderHook(() => useFindingTypeStats('t1', ['secret']), { wrapper })
    await new Promise((r) => setTimeout(r, 20))
    expect(mockGet).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.stats.total).toBe(0)
  })

  it('degrades when an older API ignores `sources` (tenant-wide answer)', async () => {
    // Tenant has 10 findings: 3 secret, 7 sca. An API without the filter
    // answers for all 10.
    mockGet.mockResolvedValue(
      statsResponse({
        total: 10,
        by_severity: { critical: 6, high: 4 },
        by_source: { secret: 3, sca: 7, sast: 0 },
      })
    )
    const { result } = renderHook(() => useFindingTypeStats('t1', ['secret']), { wrapper })

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.stats.scoped).toBe(false))
    const { stats } = result.current
    // Exact per-type total from by_source, no tenant-wide breakdown passed off as the type's.
    expect(stats.total).toBe(3)
    expect(stats.bySeverity.critical).toBe(0)
    expect(stats.byStatus).toEqual({})
    expect(stats.riskScore).toBe(0)
  })
})

describe('isScopedToSources', () => {
  it('is true when only requested sources count and they sum to total', () => {
    expect(isScopedToSources({ total: 5, by_source: { iac: 5, sast: 0 } }, ['iac'])).toBe(true)
  })

  it('is false when a non-requested source has findings', () => {
    expect(isScopedToSources({ total: 5, by_source: { iac: 4, sast: 1 } }, ['iac'])).toBe(false)
  })

  it('is false when the total exceeds the requested sources (untracked source leaked)', () => {
    // e.g. cspm findings, which by_source does not break out.
    expect(isScopedToSources({ total: 9, by_source: { iac: 5, sast: 0 } }, ['iac'])).toBe(false)
  })

  it('does not require the sum when a requested source is untracked by by_source', () => {
    // bug_bounty is not in by_source, so total can legitimately exceed the sum.
    expect(
      isScopedToSources({ total: 6, by_source: { sca: 4, sast: 0 } }, ['sca', 'bug_bounty'])
    ).toBe(true)
  })

  it('treats an empty tenant as scoped', () => {
    expect(isScopedToSources({ total: 0, by_source: {} }, ['secret'])).toBe(true)
  })
})

describe('toFindingTypeStats', () => {
  it('returns empty stats while there is no response', () => {
    expect(toFindingTypeStats(undefined, ['secret'])).toMatchObject({ total: 0, scoped: true })
  })

  it('tolerates the fail-closed empty response (null maps)', () => {
    const resp = {
      total: 0,
      by_severity: null,
      by_status: null,
      by_source: null,
      open_count: 0,
      resolved_count: 0,
    } as unknown as FindingStatsResponse
    expect(toFindingTypeStats(resp, ['secret'])).toMatchObject({
      total: 0,
      byStatus: {},
      scoped: true,
    })
  })
})
