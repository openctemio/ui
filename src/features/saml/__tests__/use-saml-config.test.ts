/**
 * useSamlConfig — a 404 from the API means "not configured yet" and must
 * resolve to null (no thrown error / toast), while other errors propagate.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import type { PropsWithChildren } from 'react'
import { createElement } from 'react'

const mockGet = vi.fn()
vi.mock('@/lib/api/client', () => ({
  get: (url: string) => mockGet(url),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@/context/tenant-provider', () => ({
  useTenant: () => ({ currentTenant: { id: 't1', slug: 'acme' } }),
}))

import { useSamlConfig } from '../api/use-saml-config'

function wrapper({ children }: PropsWithChildren) {
  // Disable dedupe/cache across tests.
  return createElement(
    SWRConfig,
    { value: { provider: () => new Map(), dedupingInterval: 0 } },
    children
  )
}

describe('useSamlConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resolves to null on 404 (not configured)', async () => {
    mockGet.mockRejectedValueOnce(Object.assign(new Error('not found'), { statusCode: 404 }))
    const { result } = renderHook(() => useSamlConfig(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeUndefined()
  })

  it('returns the config when present', async () => {
    mockGet.mockResolvedValueOnce({
      idp_entity_id: 'e',
      idp_sso_url: 's',
      idp_certificate: 'c',
      allowed_domains: [],
      default_role: 'member',
      auto_provision: true,
      enabled: true,
    })
    const { result } = renderHook(() => useSamlConfig(), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeUndefined())
    expect(result.current.data?.enabled).toBe(true)
  })

  it('propagates non-404 errors', async () => {
    mockGet.mockRejectedValueOnce(Object.assign(new Error('boom'), { statusCode: 500 }))
    const { result } = renderHook(() => useSamlConfig(), { wrapper })
    await waitFor(() => expect(result.current.error).toBeDefined())
  })
})
