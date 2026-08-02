/**
 * Remediation groups API hooks — verify SWR keys / resolve URL construction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { useRemediationGroups, useResolveRemediationGroup } from '../use-remediation-groups'

vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: undefined, error: undefined, isLoading: false, mutate: vi.fn() })),
}))
vi.mock('swr/mutation', () => ({
  default: vi.fn(() => ({
    trigger: vi.fn(),
    isMutating: false,
    data: undefined,
    error: undefined,
    reset: vi.fn(),
  })),
}))
vi.mock('@/lib/api/client', () => ({ get: vi.fn(), post: vi.fn() }))

describe('remediation-groups api hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('useRemediationGroups fetches the groups endpoint', () => {
    renderHook(() => useRemediationGroups())
    const key = vi.mocked(useSWR).mock.calls[0]?.[0]
    expect(key).toBe('/api/v1/findings/remediation-groups')
  })

  it('useResolveRemediationGroup URL-encodes the key in the resolve path', () => {
    renderHook(() => useResolveRemediationGroup('sol:a b/c'))
    const key = vi.mocked(useSWRMutation).mock.calls[0]?.[0]
    expect(key).toBe('/api/v1/findings/remediation-groups/sol%3Aa%20b%2Fc/resolve')
  })
})
