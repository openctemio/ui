/**
 * useModuleEnabled — verify per-tenant module gating with fail-open.
 *
 * The boolean it returns gates BOTH in-page feature rendering and conditional
 * SWR keys, so its edge cases (empty module list = OSS fail-open) are load-bearing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import useSWR from 'swr'
import { useModuleEnabled } from '../use-tenant-modules'

vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: undefined, error: undefined, isLoading: false, mutate: vi.fn() })),
}))
vi.mock('@/lib/api/client', () => ({ get: vi.fn() }))

function mockModules(moduleIds: string[]) {
  vi.mocked(useSWR).mockReturnValue({
    data: { module_ids: moduleIds, modules: [] },
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useSWR>)
}

describe('useModuleEnabled', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns true when the module is present in the tenant module list', () => {
    mockModules(['assets', 'branches', 'findings'])
    const { result } = renderHook(() => useModuleEnabled('branches'))
    expect(result.current).toBe(true)
  })

  it('returns false when the module is absent from a non-empty list', () => {
    mockModules(['assets', 'findings'])
    const { result } = renderHook(() => useModuleEnabled('branches'))
    expect(result.current).toBe(false)
  })

  it('fails open (returns true) when no modules are reported — OSS edition', () => {
    mockModules([])
    const { result } = renderHook(() => useModuleEnabled('branches'))
    expect(result.current).toBe(true)
  })
})
