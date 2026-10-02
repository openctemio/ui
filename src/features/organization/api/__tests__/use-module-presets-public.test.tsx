/**
 * A user creating their first team has a refresh token but no access token,
 * so the tenantless preset catalog answers 401. That 401 must not run the
 * client's refresh-then-sign-out path (it signed new users out of onboarding
 * and back to /login), so the hook fetches with skipAuth and does not retry.
 */
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'

const fetcherWithOptions = vi.fn()
vi.mock('@/lib/api/client', () => ({
  fetcher: vi.fn(),
  fetcherWithOptions: (...args: unknown[]) => fetcherWithOptions(...args),
}))
vi.mock('@/lib/websocket/client', () => ({ getWebSocketClient: vi.fn() }))

import { useModulePresetsPublic } from '../use-tenant-modules'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
)

describe('useModulePresetsPublic', () => {
  it('fetches with skipAuth so a 401 cannot sign the user out', async () => {
    fetcherWithOptions.mockResolvedValueOnce({ presets: [{ id: 'asm' }] })
    const { result } = renderHook(() => useModulePresetsPublic(), { wrapper })
    await waitFor(() => expect(result.current.presets).toHaveLength(1))
    expect(fetcherWithOptions).toHaveBeenCalledWith(
      expect.stringContaining('module-presets'),
      expect.objectContaining({ method: 'GET', skipAuth: true })
    )
  })

  it('degrades to no presets on 401, without retrying', async () => {
    fetcherWithOptions.mockReset()
    fetcherWithOptions.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    )
    const { result } = renderHook(() => useModulePresetsPublic(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.presets).toEqual([])
    expect(fetcherWithOptions).toHaveBeenCalledTimes(1)
  })
})
