/**
 * useTenantModules reads the modules that /me/bootstrap already returned
 * instead of fetching /me/modules again on every page load, but still fetches
 * when there is no app shell or when someone revalidates the key after a
 * module toggle.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { get } from '@/lib/api/client'
import {
  useBootstrapContextOptional,
  type BootstrapContextValue,
} from '@/context/bootstrap-provider'
import { useTenantModules, TENANT_MODULES_KEY } from '../use-tenant-modules'

vi.mock('@/lib/api/client', () => ({ get: vi.fn() }))
vi.mock('@/context/bootstrap-provider', () => ({ useBootstrapContextOptional: vi.fn() }))

const FROM_BOOTSTRAP = { module_ids: ['assets', 'findings'], modules: [] }
const FROM_API = { module_ids: ['assets', 'findings', 'scans'], modules: [] }

function bootstrapState(over: Partial<BootstrapContextValue>): BootstrapContextValue {
  return {
    data: null,
    isLoading: false,
    error: null,
    isBootstrapped: false,
    refresh: vi.fn(),
    ...over,
  }
}

// A fresh SWR cache per test so one test's fetch does not satisfy the next.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
)

describe('useTenantModules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(get).mockResolvedValue(FROM_API)
  })

  it('uses the bootstrap modules without fetching /me/modules', async () => {
    vi.mocked(useBootstrapContextOptional).mockReturnValue(
      bootstrapState({
        isBootstrapped: true,
        data: { permissions: { list: [], version: 1 }, modules: FROM_BOOTSTRAP },
      })
    )
    const { result } = renderHook(() => useTenantModules(), { wrapper })
    expect(result.current.moduleIds).toEqual(['assets', 'findings'])
    expect(result.current.isLoading).toBe(false)
    await new Promise((r) => setTimeout(r, 20))
    expect(get).not.toHaveBeenCalled()
  })

  it('waits for bootstrap instead of racing it with a second request', async () => {
    vi.mocked(useBootstrapContextOptional).mockReturnValue(bootstrapState({ isLoading: true }))
    const { result } = renderHook(() => useTenantModules(), { wrapper })
    expect(result.current.isLoading).toBe(true)
    await new Promise((r) => setTimeout(r, 20))
    expect(get).not.toHaveBeenCalled()
  })

  it('fetches /me/modules outside the app shell', async () => {
    vi.mocked(useBootstrapContextOptional).mockReturnValue(null)
    const { result } = renderHook(() => useTenantModules(), { wrapper })
    await waitFor(() => expect(result.current.moduleIds).toEqual(['assets', 'findings', 'scans']))
    expect(get).toHaveBeenCalledWith(TENANT_MODULES_KEY)
  })

  it('fetches when bootstrap carried no modules (bootstrap failed)', async () => {
    vi.mocked(useBootstrapContextOptional).mockReturnValue(
      bootstrapState({ isBootstrapped: true, data: { permissions: { list: [], version: 0 } } })
    )
    const { result } = renderHook(() => useTenantModules(), { wrapper })
    await waitFor(() => expect(result.current.moduleIds).toEqual(['assets', 'findings', 'scans']))
  })

  it('revalidating the key after a module toggle fetches fresh data that wins over bootstrap', async () => {
    vi.mocked(useBootstrapContextOptional).mockReturnValue(
      bootstrapState({
        isBootstrapped: true,
        data: { permissions: { list: [], version: 1 }, modules: FROM_BOOTSTRAP },
      })
    )
    const { result } = renderHook(() => ({ hook: useTenantModules() }), { wrapper })
    expect(get).not.toHaveBeenCalled()
    await act(async () => {
      await result.current.hook.mutate()
    })
    expect(get).toHaveBeenCalledWith(TENANT_MODULES_KEY)
    expect(result.current.hook.moduleIds).toEqual(['assets', 'findings', 'scans'])
  })
})
