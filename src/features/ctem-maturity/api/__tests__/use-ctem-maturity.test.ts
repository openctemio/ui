/**
 * useCtemMaturity — verifies it hits the correct endpoint and no-ops
 * (null SWR key) until a tenant is selected. swr and the tenant context
 * are mocked so the hook body can be invoked as a plain function.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import useSWR from 'swr'
import { useCtemMaturity, CTEM_MATURITY_TREND_URL } from '../use-ctem-maturity'

vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: undefined, error: undefined, isLoading: false, mutate: vi.fn() })),
}))

let mockTenant: { id: string } | null = { id: 'tenant-1' }
vi.mock('@/context/tenant-provider', () => ({
  useTenant: () => ({ currentTenant: mockTenant }),
}))

const swrMock = vi.mocked(useSWR)

describe('useCtemMaturity', () => {
  beforeEach(() => {
    swrMock.mockClear()
    mockTenant = { id: 'tenant-1' }
  })

  it('calls the metrics/trend endpoint when a tenant is selected', () => {
    useCtemMaturity()
    expect(CTEM_MATURITY_TREND_URL).toBe('/api/v1/ctem-cycles/metrics/trend')
    expect(swrMock).toHaveBeenCalledTimes(1)
    expect(swrMock.mock.calls[0][0]).toBe(CTEM_MATURITY_TREND_URL)
  })

  it('passes a null key (no fetch) until a tenant is selected', () => {
    mockTenant = null
    const res = useCtemMaturity()
    expect(swrMock.mock.calls[0][0]).toBeNull()
    expect(res.isLoading).toBe(false)
  })

  it('does not retry on error so a 403 does not spin', () => {
    useCtemMaturity()
    const opts = swrMock.mock.calls[0][2] as { shouldRetryOnError?: boolean }
    expect(opts.shouldRetryOnError).toBe(false)
  })
})
