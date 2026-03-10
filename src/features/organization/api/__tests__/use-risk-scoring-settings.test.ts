/**
 * Risk Scoring Settings API Hooks Tests
 *
 * Tests for:
 * - useRiskScoringSettings (GET)
 * - useUpdateRiskScoring (PATCH)
 * - useRiskScoringPreview (POST)
 * - useRecalculateRiskScores (POST)
 * - useRiskScoringPresets (GET)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'

// ============================================
// MOCKS
// ============================================

const mockMutate = vi.fn()
const mockTrigger = vi.fn()

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: undefined,
    error: undefined,
    isLoading: false,
    mutate: mockMutate,
  })),
}))

vi.mock('swr/mutation', () => ({
  default: vi.fn(() => ({
    trigger: mockTrigger,
    isMutating: false,
    error: undefined,
  })),
}))

vi.mock('@/lib/api/client', () => ({
  fetcher: vi.fn(),
  fetcherWithOptions: vi.fn(),
}))

vi.mock('@/lib/api/endpoints', () => ({
  tenantEndpoints: {
    riskScoringSettings: (id: string) => `/api/v1/tenants/${id}/settings/risk-scoring`,
    riskScoringPreview: (id: string) => `/api/v1/tenants/${id}/settings/risk-scoring/preview`,
    riskScoringRecalculate: (id: string) =>
      `/api/v1/tenants/${id}/settings/risk-scoring/recalculate`,
    riskScoringPresets: (id: string) => `/api/v1/tenants/${id}/settings/risk-scoring/presets`,
  },
}))

// ============================================
// TESTS
// ============================================

describe('use-risk-scoring-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // useRiskScoringSettings
  // ============================================

  describe('useRiskScoringSettings', () => {
    it('calls useSWR with correct endpoint when tenantId is provided', async () => {
      const mod = await import('../use-risk-scoring-settings')
      renderHook(() => mod.useRiskScoringSettings('tenant-123'))

      expect(useSWR).toHaveBeenCalledWith(
        '/api/v1/tenants/tenant-123/settings/risk-scoring',
        expect.any(Function),
        expect.objectContaining({ revalidateOnFocus: false })
      )
    })

    it('passes null key when tenantId is undefined', async () => {
      const mod = await import('../use-risk-scoring-settings')
      renderHook(() => mod.useRiskScoringSettings(undefined))

      expect(useSWR).toHaveBeenCalledWith(null, expect.any(Function), expect.any(Object))
    })

    it('returns settings, isLoading, isError, error, and mutate', async () => {
      const mod = await import('../use-risk-scoring-settings')
      const { result } = renderHook(() => mod.useRiskScoringSettings('tenant-123'))

      expect(result.current).toHaveProperty('settings')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('isError')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('mutate')
    })
  })

  // ============================================
  // useUpdateRiskScoring
  // ============================================

  describe('useUpdateRiskScoring', () => {
    it('calls useSWRMutation with correct endpoint', async () => {
      const mod = await import('../use-risk-scoring-settings')
      renderHook(() => mod.useUpdateRiskScoring('tenant-123'))

      expect(useSWRMutation).toHaveBeenCalledWith(
        '/api/v1/tenants/tenant-123/settings/risk-scoring',
        expect.any(Function)
      )
    })

    it('passes null key when tenantId is undefined', async () => {
      const mod = await import('../use-risk-scoring-settings')
      renderHook(() => mod.useUpdateRiskScoring(undefined))

      expect(useSWRMutation).toHaveBeenCalledWith(null, expect.any(Function))
    })

    it('returns updateRiskScoring, isUpdating, and error', async () => {
      const mod = await import('../use-risk-scoring-settings')
      const { result } = renderHook(() => mod.useUpdateRiskScoring('tenant-123'))

      expect(result.current).toHaveProperty('updateRiskScoring')
      expect(result.current).toHaveProperty('isUpdating')
      expect(result.current).toHaveProperty('error')
    })
  })

  // ============================================
  // useRiskScoringPreview
  // ============================================

  describe('useRiskScoringPreview', () => {
    it('calls useSWRMutation with preview endpoint', async () => {
      const mod = await import('../use-risk-scoring-settings')
      renderHook(() => mod.useRiskScoringPreview('tenant-123'))

      expect(useSWRMutation).toHaveBeenCalledWith(
        '/api/v1/tenants/tenant-123/settings/risk-scoring/preview',
        expect.any(Function)
      )
    })

    it('returns previewChanges and isPreviewing', async () => {
      const mod = await import('../use-risk-scoring-settings')
      const { result } = renderHook(() => mod.useRiskScoringPreview('tenant-123'))

      expect(result.current).toHaveProperty('previewChanges')
      expect(result.current).toHaveProperty('isPreviewing')
      expect(result.current).toHaveProperty('error')
    })
  })

  // ============================================
  // useRecalculateRiskScores
  // ============================================

  describe('useRecalculateRiskScores', () => {
    it('calls useSWRMutation with recalculate endpoint', async () => {
      const mod = await import('../use-risk-scoring-settings')
      renderHook(() => mod.useRecalculateRiskScores('tenant-123'))

      expect(useSWRMutation).toHaveBeenCalledWith(
        '/api/v1/tenants/tenant-123/settings/risk-scoring/recalculate',
        expect.any(Function)
      )
    })

    it('returns recalculate, isRecalculating, and error', async () => {
      const mod = await import('../use-risk-scoring-settings')
      const { result } = renderHook(() => mod.useRecalculateRiskScores('tenant-123'))

      expect(result.current).toHaveProperty('recalculate')
      expect(result.current).toHaveProperty('isRecalculating')
      expect(result.current).toHaveProperty('error')
    })
  })

  // ============================================
  // useRiskScoringPresets
  // ============================================

  describe('useRiskScoringPresets', () => {
    it('calls useSWR with presets endpoint', async () => {
      const mod = await import('../use-risk-scoring-settings')
      renderHook(() => mod.useRiskScoringPresets('tenant-123'))

      expect(useSWR).toHaveBeenCalledWith(
        '/api/v1/tenants/tenant-123/settings/risk-scoring/presets',
        expect.any(Function),
        expect.objectContaining({ revalidateOnFocus: false })
      )
    })

    it('returns presets, isLoading, isError, and error', async () => {
      const mod = await import('../use-risk-scoring-settings')
      const { result } = renderHook(() => mod.useRiskScoringPresets('tenant-123'))

      expect(result.current).toHaveProperty('presets')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('isError')
      expect(result.current).toHaveProperty('error')
    })
  })
})
