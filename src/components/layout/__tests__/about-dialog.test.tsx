import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SWRConfig } from 'swr'

import type { BuildVersions } from '@/hooks/use-build-versions'

const versions = vi.hoisted(() => ({
  current: { web: undefined, api: undefined } as BuildVersions,
}))
const hookCalls = vi.hoisted(() => [] as unknown[][])

vi.mock('@/hooks/use-build-versions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/use-build-versions')>()
  return {
    ...actual,
    useBuildVersions: (...args: unknown[]) => {
      hookCalls.push(args)
      return versions.current
    },
  }
})

const get = vi.hoisted(() => vi.fn())
const adminFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api/client', () => ({ get }))
vi.mock('@/features/admin-console/api/admin-client', () => ({ adminFetch }))

import { AboutDialog } from '../about-dialog'

function renderAbout(shell: 'app' | 'admin' = 'app') {
  render(<AboutDialog open onOpenChange={() => {}} shell={shell} />)
  return screen.getByRole('dialog', { name: 'About OpenCTEM' })
}

describe('AboutDialog', () => {
  beforeEach(() => {
    hookCalls.length = 0
  })

  it('shows a placeholder for each row while loading', () => {
    versions.current = { web: undefined, api: undefined }
    const dialog = renderAbout()
    expect(within(dialog).getByTestId('about-ui-version')).toContainElement(
      within(dialog).getAllByLabelText('Loading version')[0]
    )
    expect(within(dialog).getAllByLabelText('Loading version')).toHaveLength(2)
  })

  it('shows a development build as "<tag>-dev (commit)" with its qualifier', () => {
    versions.current = {
      web: { version: 'v0.8.0-dev', commit: '4d2f4b02', channel: 'development' },
      api: { version: 'v0.8.0-dev', commit: 'a0a14db0', channel: 'development' },
    }
    const dialog = renderAbout()
    const web = within(dialog).getByTestId('about-ui-version')
    expect(web).toHaveTextContent('v0.8.0-dev(4d2f4b02)')
    expect(within(web).getByText('(4d2f4b02)')).toHaveClass('font-mono')
    expect(within(dialog).getByTestId('about-ui-version-channel')).toHaveTextContent(
      'Development build'
    )
    expect(within(dialog).getByTestId('about-api-version')).toHaveTextContent(
      'v0.8.0-dev(a0a14db0)'
    )
    expect(within(dialog).getByText('Web app')).toBeInTheDocument()
    expect(within(dialog).getByText('API')).toBeInTheDocument()
  })

  it('labels a release build and hides an unknown commit', () => {
    versions.current = {
      web: { version: 'v0.9.0', commit: 'unknown', channel: 'release' },
      api: { version: 'v0.9.0', commit: '01234567', channel: 'release' },
    }
    const dialog = renderAbout()
    expect(within(dialog).getByTestId('about-ui-version')).toHaveTextContent(/^v0\.9\.0Release$/)
    expect(within(dialog).getByTestId('about-api-version-channel')).toHaveTextContent('Release')
  })

  it('says "unavailable" for a row that could not be read, and still renders the rest', () => {
    versions.current = {
      web: { version: 'v0.8.0-dev', commit: '4d2f4b02', channel: 'development' },
      api: null,
    }
    const dialog = renderAbout()
    expect(within(dialog).getByTestId('about-api-version')).toHaveTextContent('unavailable')
    expect(within(dialog).getByTestId('about-ui-version')).toHaveTextContent('v0.8.0-dev')
    expect(within(dialog).getByRole('link', { name: /Documentation/ })).toBeInTheDocument()
  })

  it('passes its shell to the version hook (the admin console uses its own session)', () => {
    versions.current = { web: null, api: null }
    renderAbout('admin')
    expect(hookCalls.at(-1)).toEqual(['admin', true])
  })
})

describe('useBuildVersions', () => {
  // The real hook (the mock above re-exports it under its own name too).
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
  )
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    get.mockReset()
    adminFetch.mockReset()
    fetchMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  async function useReal() {
    const mod = await vi.importActual<typeof import('@/hooks/use-build-versions')>(
      '@/hooks/use-build-versions'
    )
    return mod.useBuildVersions
  }

  it('reads the web build from /api/version and the API build from /api/v1/version', async () => {
    const useBuildVersions = await useReal()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ version: 'v0.8.0-dev', commit: '4d2f4b02', channel: 'development' })
      )
    )
    get.mockResolvedValue({
      version: 'v0.8.0-dev',
      commit: 'a0a14db0fa94ae10536af636b77baa8b90ee0547',
      build_time: '2026-10-02T03:00:00Z',
      channel: 'development',
    })
    const { result } = renderHook(() => useBuildVersions('app', true), { wrapper })
    await waitFor(() => expect(result.current.api).toBeTruthy())
    await waitFor(() => expect(result.current.web).toBeTruthy())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/version')
    expect(get).toHaveBeenCalledWith('/api/v1/version')
    expect(adminFetch).not.toHaveBeenCalled()
    expect(result.current.api).toEqual({
      version: 'v0.8.0-dev',
      commit: 'a0a14db0',
      channel: 'development',
      build_time: '2026-10-02T03:00:00Z',
    })
  })

  it('uses the console session in the admin shell', async () => {
    const useBuildVersions = await useReal()
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }))
    adminFetch.mockResolvedValue({ version: 'v0.9.0', commit: '01234567', channel: 'release' })
    const { result } = renderHook(() => useBuildVersions('admin', true), { wrapper })
    await waitFor(() => expect(result.current.api).toBeTruthy())
    expect(adminFetch).toHaveBeenCalledWith('/version')
    expect(get).not.toHaveBeenCalled()
  })

  it('resolves failures to null (or the baked-in release version), never throws', async () => {
    const useBuildVersions = await useReal()
    fetchMock.mockRejectedValue(new Error('offline'))
    get.mockRejectedValue(new Error('404'))
    const { result } = renderHook(() => useBuildVersions('app', true), { wrapper })
    await waitFor(() => expect(result.current.api).toBeNull())
    await waitFor(() => expect(result.current.web).toBeNull())

    vi.stubEnv('NEXT_PUBLIC_APP_VERSION', 'v0.9.0')
    vi.stubEnv('NEXT_PUBLIC_APP_COMMIT', '0123456789abcdef')
    const second = renderHook(() => useBuildVersions('app', true), { wrapper })
    await waitFor(() =>
      expect(second.result.current.web).toEqual({
        version: 'v0.9.0',
        commit: '01234567',
        channel: 'release',
      })
    )
  })

  it('fetches nothing while the dialog is closed', async () => {
    const useBuildVersions = await useReal()
    renderHook(() => useBuildVersions('app', false), { wrapper })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(get).not.toHaveBeenCalled()
  })
})
