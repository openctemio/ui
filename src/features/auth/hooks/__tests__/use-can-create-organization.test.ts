import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

let swr: { data?: { tenant_creation_mode?: string }; error?: unknown; isLoading: boolean }
vi.mock('../../api/use-auth-providers', () => ({ useAuthProviders: () => swr }))

import { useCanCreateOrganization } from '../use-can-create-organization'

const run = () => renderHook(() => useCanCreateOrganization()).result.current

describe('useCanCreateOrganization', () => {
  beforeEach(() => {
    swr = { isLoading: false }
  })

  it('offers nothing while the policy loads', () => {
    swr = { isLoading: true }
    expect(run()).toEqual({ canCreate: false, isLoading: true })
  })

  it('follows the server policy', () => {
    swr = { isLoading: false, data: { tenant_creation_mode: 'admin_only' } }
    expect(run().canCreate).toBe(false)
    swr = { isLoading: false, data: { tenant_creation_mode: 'self_service' } }
    expect(run().canCreate).toBe(true)
  })

  it('treats a rate-limited answer as still loading, not as self-service', () => {
    swr = { isLoading: false, error: { statusCode: 429 } }
    expect(run()).toEqual({ canCreate: false, isLoading: true })
  })

  it('offers creation when the policy cannot be fetched for another reason', () => {
    swr = { isLoading: false, error: { statusCode: 500 } }
    expect(run()).toEqual({ canCreate: true, isLoading: false })
  })
})
