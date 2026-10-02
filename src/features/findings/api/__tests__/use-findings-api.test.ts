/**
 * Findings API Hooks Tests
 *
 * Tests for the finding API hook exports and structure:
 * - Validates all hooks are exported
 * - Tests approval hooks (useRequestApproval, useApproveStatus, useRejectApproval)
 * - Tests basic hook structure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// ============================================
// MOCKS
// ============================================

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: undefined,
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  })),
}))

// Mock SWR mutation
vi.mock('swr/mutation', () => ({
  default: vi.fn((_key: string | null, _fetcher: unknown) => ({
    trigger: vi.fn(),
    isMutating: false,
    data: undefined,
    error: undefined,
    reset: vi.fn(),
  })),
}))

// Mock API client
vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

// Mock error handler
vi.mock('@/lib/api/error-handler', () => ({
  handleApiError: vi.fn(),
}))

// Mock tenant context
vi.mock('@/context/tenant-provider', () => ({
  useTenant: vi.fn(() => ({
    currentTenant: { id: 'tenant-123', name: 'Test Tenant' },
  })),
}))

// ============================================
// TESTS
// ============================================

describe('use-findings-api exports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // EXPORT EXISTENCE
  // ============================================

  describe('hook exports', () => {
    it('exports useFindingsApi', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.useFindingsApi).toBeDefined()
      expect(typeof mod.useFindingsApi).toBe('function')
    })

    it('exports useFindingApi', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.useFindingApi).toBeDefined()
      expect(typeof mod.useFindingApi).toBe('function')
    })

    it('exports useAssetFindingsApi', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.useAssetFindingsApi).toBeDefined()
      expect(typeof mod.useAssetFindingsApi).toBe('function')
    })

    it('exports useCreateFindingApi', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.useCreateFindingApi).toBeDefined()
      expect(typeof mod.useCreateFindingApi).toBe('function')
    })

    it('exports useUpdateFindingStatusApi', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.useUpdateFindingStatusApi).toBeDefined()
      expect(typeof mod.useUpdateFindingStatusApi).toBe('function')
    })
  })

  // ============================================
  // APPROVAL HOOKS
  // ============================================

  describe('approval hooks', () => {
    it('exports useRequestApproval', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.useRequestApproval).toBeDefined()
      expect(typeof mod.useRequestApproval).toBe('function')
    })

    it('exports useApproveStatus', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.useApproveStatus).toBeDefined()
      expect(typeof mod.useApproveStatus).toBe('function')
    })

    it('exports useRejectApproval', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.useRejectApproval).toBeDefined()
      expect(typeof mod.useRejectApproval).toBe('function')
    })

    it('useRequestApproval returns expected shape', async () => {
      const { useRequestApproval } = await import('../use-findings-api')
      const { result } = renderHook(() => useRequestApproval('finding-123'))

      expect(result.current).toHaveProperty('trigger')
      expect(result.current).toHaveProperty('isMutating')
      expect(typeof result.current.trigger).toBe('function')
      expect(result.current.isMutating).toBe(false)
    })

    it('useApproveStatus returns expected shape', async () => {
      const { useApproveStatus } = await import('../use-findings-api')
      const { result } = renderHook(() => useApproveStatus('approval-456'))

      expect(result.current).toHaveProperty('trigger')
      expect(result.current).toHaveProperty('isMutating')
      expect(typeof result.current.trigger).toBe('function')
      expect(result.current.isMutating).toBe(false)
    })

    it('useRejectApproval returns expected shape', async () => {
      const { useRejectApproval } = await import('../use-findings-api')
      const { result } = renderHook(() => useRejectApproval('approval-789'))

      expect(result.current).toHaveProperty('trigger')
      expect(result.current).toHaveProperty('isMutating')
      expect(typeof result.current.trigger).toBe('function')
      expect(result.current.isMutating).toBe(false)
    })
  })

  // ============================================
  // MUTATION HOOKS
  // ============================================

  describe('mutation hooks', () => {
    it('exports useUpdateFindingSeverityApi', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.useUpdateFindingSeverityApi).toBeDefined()
      expect(typeof mod.useUpdateFindingSeverityApi).toBe('function')
    })

    it('exports useAssignFindingApi', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.useAssignFindingApi).toBeDefined()
      expect(typeof mod.useAssignFindingApi).toBe('function')
    })
  })

  // ============================================
  // COMMENT HOOKS
  // ============================================

  describe('comment hooks', () => {
    it('exports useAddFindingCommentApi', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.useAddFindingCommentApi).toBeDefined()
      expect(typeof mod.useAddFindingCommentApi).toBe('function')
    })
  })

  // ============================================
  // STATS AND CACHE HOOKS
  // ============================================

  describe('stats and cache utilities', () => {
    it('exports useFindingStatsApi', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.useFindingStatsApi).toBeDefined()
      expect(typeof mod.useFindingStatsApi).toBe('function')
    })

    it('exports invalidateFindingsCache', async () => {
      const mod = await import('../use-findings-api')
      expect(mod.invalidateFindingsCache).toBeDefined()
      expect(typeof mod.invalidateFindingsCache).toBe('function')
    })
  })
})

describe('useFindingsApi enabled option', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes a null key (no request) while disabled, and the endpoint once enabled', async () => {
    const useSWR = (await import('swr')).default
    const { useFindingsApi } = await import('../use-findings-api')
    const { rerender } = renderHook(
      ({ enabled }) => useFindingsApi({ per_page: 100 }, { enabled }),
      {
        initialProps: { enabled: false },
      }
    )
    expect(vi.mocked(useSWR).mock.calls.at(-1)?.[0]).toBeNull()
    rerender({ enabled: true })
    expect(vi.mocked(useSWR).mock.calls.at(-1)?.[0]).toContain('per_page=100')
    // `enabled` is ours, not an SWR option
    expect(vi.mocked(useSWR).mock.calls.at(-1)?.[2]).not.toHaveProperty('enabled')
  })
})
