/**
 * The 2-minute permission sync is skipped while the tab is hidden; the focus
 * handler syncs once the user is back.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { PermissionProvider } from '../permission-provider'

vi.mock('../tenant-provider', () => ({ useTenant: () => ({ currentTenant: { id: 't1' } }) }))
vi.mock('../bootstrap-provider', () => ({
  useBootstrapContextSafe: () => ({
    data: { permissions: { list: ['findings:read'], version: 1 } },
    isLoading: false,
    isBootstrapped: true,
    error: null,
    refresh: async () => {},
  }),
}))

const POLL_MS = 2 * 60 * 1000
let hidden = false

describe('PermissionProvider polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    hidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 304 }))
    )
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const syncCalls = () =>
    vi.mocked(fetch).mock.calls.filter(([u]) => String(u).includes('/me/permissions/sync')).length

  it('syncs every 2 minutes while visible', async () => {
    render(<PermissionProvider>ok</PermissionProvider>)
    const before = syncCalls()
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS * 2)
    })
    expect(syncCalls() - before).toBe(2)
  })

  it('does not sync while the tab is hidden', async () => {
    render(<PermissionProvider>ok</PermissionProvider>)
    const before = syncCalls()
    hidden = true
    await act(async () => {
      vi.advanceTimersByTime(POLL_MS * 5)
    })
    expect(syncCalls() - before).toBe(0)
  })
})
