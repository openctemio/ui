/**
 * useSamlConfig (admin console, per organization): a 404 from the API means
 * "not configured yet" and must resolve to null (no thrown error / toast),
 * while other errors propagate. Requests are scoped to the organization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import type { PropsWithChildren } from 'react'
import { createElement } from 'react'

const mockFetch = vi.fn()
vi.mock('@/features/admin-console/api/admin-client', async () => {
  const actual = await vi.importActual<typeof import('@/features/admin-console/api/admin-client')>(
    '@/features/admin-console/api/admin-client'
  )
  return { ...actual, adminFetch: (p: string, init?: unknown) => mockFetch(p, init) }
})

import { AdminApiError } from '@/features/admin-console/api/admin-client'
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
    mockFetch.mockRejectedValueOnce(new AdminApiError('not found', 404))
    const { result } = renderHook(() => useSamlConfig('t1'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeUndefined()
  })

  it('returns the config and scopes the request to the organization', async () => {
    mockFetch.mockResolvedValueOnce({
      idp_entity_id: 'e',
      idp_sso_url: 's',
      idp_certificate: 'c',
      allowed_domains: [],
      default_role: 'member',
      auto_provision: true,
      enabled: true,
    })
    const { result } = renderHook(() => useSamlConfig('t1'), { wrapper })
    await waitFor(() => expect(result.current.data).not.toBeUndefined())
    expect(result.current.data?.enabled).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('/tenants/t1/sso/saml', undefined)
  })

  it('propagates non-404 errors', async () => {
    mockFetch.mockRejectedValueOnce(new AdminApiError('boom', 500))
    const { result } = renderHook(() => useSamlConfig('t1'), { wrapper })
    await waitFor(() => expect(result.current.error).toBeDefined())
  })

  it('does not fetch without an organization', () => {
    renderHook(() => useSamlConfig(null), { wrapper })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
