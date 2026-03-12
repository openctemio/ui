/**
 * RiskScoringProvider Tests
 *
 * Tests that the provider loads thresholds from API and provides them via context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import * as React from 'react'

// ============================================
// MOCKS
// ============================================

const mockSettings = {
  preset: 'banking',
  risk_levels: {
    critical_min: 85,
    high_min: 65,
    medium_min: 45,
    low_min: 25,
  },
}

vi.mock('@/context/bootstrap-provider', () => ({
  useBootstrapRiskLevels: vi.fn(() => ({
    riskLevels: mockSettings.risk_levels,
    isLoading: false,
  })),
}))

// ============================================
// TESTS
// ============================================

describe('RiskScoringProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides thresholds from API settings', async () => {
    const { RiskScoringProvider, useRiskThresholds } = await import('../risk-scoring-provider')

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(RiskScoringProvider, null, children)

    const { result } = renderHook(() => useRiskThresholds(), { wrapper })

    expect(result.current.critical_min).toBe(85)
    expect(result.current.high_min).toBe(65)
    expect(result.current.medium_min).toBe(45)
    expect(result.current.low_min).toBe(25)
  })

  it('provides full context via useRiskScoringContext', async () => {
    const { RiskScoringProvider, useRiskScoringContext } = await import('../risk-scoring-provider')

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(RiskScoringProvider, null, children)

    const { result } = renderHook(() => useRiskScoringContext(), { wrapper })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.thresholds.critical_min).toBe(85)
  })
})

describe('RiskScoringProvider with no settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back to default thresholds when settings are undefined', async () => {
    // Override the mock to return no risk levels
    const { useBootstrapRiskLevels } = await import('@/context/bootstrap-provider')
    vi.mocked(useBootstrapRiskLevels).mockReturnValue({
      riskLevels: null,
      isLoading: false,
    })

    const { RiskScoringProvider, useRiskThresholds } = await import('../risk-scoring-provider')

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(RiskScoringProvider, null, children)

    const { result } = renderHook(() => useRiskThresholds(), { wrapper })

    // Should fall back to defaults
    expect(result.current.critical_min).toBe(80)
    expect(result.current.high_min).toBe(60)
    expect(result.current.medium_min).toBe(40)
    expect(result.current.low_min).toBe(20)
  })
})
