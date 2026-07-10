import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import useSWRMutation from 'swr/mutation'
import { useResolveRemediationCampaign } from '../use-remediation-campaigns'

vi.mock('swr', () => ({ default: vi.fn(() => ({ data: undefined, mutate: vi.fn() })) }))
vi.mock('swr/mutation', () => ({
  default: vi.fn(() => ({ trigger: vi.fn(), isMutating: false })),
}))
vi.mock('@/lib/api/client', () => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() }))

describe('useResolveRemediationCampaign', () => {
  beforeEach(() => vi.clearAllMocks())

  it('targets the campaign resolve endpoint', () => {
    renderHook(() => useResolveRemediationCampaign('camp-123'))
    const key = vi.mocked(useSWRMutation).mock.calls[0]?.[0]
    expect(key).toBe('/api/v1/remediation/campaigns/camp-123/resolve')
  })
})
