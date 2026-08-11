import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'

const mockGet = vi.fn().mockResolvedValue([])
vi.mock('@/lib/api/client', () => ({ get: (...a: unknown[]) => mockGet(...a) }))

// Permission is granted; the point of these tests is endpoint + gating wiring.
vi.mock('@/lib/permissions', () => ({
  usePermissions: () => ({ can: () => true }),
  Permission: { DashboardRead: 'dashboard:read' },
}))

import {
  useRiskTrend,
  useExecutiveSummary,
  useScanCoverage,
  useCtemMaturityTrend,
} from '../use-ctem-dashboard'

// Fresh SWR cache per test so a null key in one test can't be served a cached hit.
function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
  )
}

describe('use-ctem-dashboard wiring', () => {
  beforeEach(() => mockGet.mockClear())

  it('fetches risk-trend with the days window when tenant is present', async () => {
    renderHook(() => useRiskTrend('t1', 90), { wrapper })
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/v1/dashboard/risk-trend?days=90')
    )
  })

  it('fetches executive-summary', async () => {
    renderHook(() => useExecutiveSummary('t1'), { wrapper })
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/v1/dashboard/executive-summary'))
  })

  it('fetches scan coverage', async () => {
    renderHook(() => useScanCoverage('t1'), { wrapper })
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/v1/scans/coverage'))
  })

  it('does not fetch when there is no tenant', async () => {
    renderHook(() => useRiskTrend(null, 90), { wrapper })
    await new Promise((r) => setTimeout(r, 20))
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('skips the module-gated maturity fetch when ctem_cycles is disabled', async () => {
    renderHook(() => useCtemMaturityTrend('t1', false), { wrapper })
    await new Promise((r) => setTimeout(r, 20))
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('fetches the maturity trend when ctem_cycles is enabled', async () => {
    renderHook(() => useCtemMaturityTrend('t1', true), { wrapper })
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/v1/ctem-cycles/metrics/trend'))
  })
})
