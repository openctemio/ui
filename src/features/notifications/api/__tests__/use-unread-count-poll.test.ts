/**
 * The unread badge is pushed over the WebSocket, so its poll is only a
 * fallback: off while the socket is connected, on while it is down, and one
 * catch-up fetch after a reconnect.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import useSWR from 'swr'
import { useWebSocket } from '@/context/websocket-provider'
import { useUnreadCountApi, UNREAD_COUNT_FALLBACK_POLL_MS } from '../use-notification-api'

const mutate = vi.fn()
vi.mock('swr', () => ({ default: vi.fn(() => ({ data: { count: 3 }, mutate })) }))
vi.mock('@/lib/api/client', () => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/context/tenant-provider', () => ({ useTenant: () => ({ currentTenant: { id: 't1' } }) }))
vi.mock('@/context/websocket-provider', () => ({ useWebSocket: vi.fn() }))

const connected = (isConnected: boolean) =>
  vi.mocked(useWebSocket).mockReturnValue({
    state: isConnected ? 'connected' : 'disconnected',
    isConnected,
    reconnect: vi.fn(),
  })

const lastRefreshInterval = () => {
  const calls = vi.mocked(useSWR).mock.calls
  return (calls[calls.length - 1][2] as { refreshInterval?: number }).refreshInterval
}

describe('useUnreadCountApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not poll while the WebSocket is connected', () => {
    connected(true)
    renderHook(() => useUnreadCountApi())
    expect(lastRefreshInterval()).toBe(0)
  })

  it('polls as a fallback while the WebSocket is down', () => {
    connected(false)
    renderHook(() => useUnreadCountApi())
    expect(lastRefreshInterval()).toBe(UNREAD_COUNT_FALLBACK_POLL_MS)
  })

  it('refetches once after a reconnect, not on the first connect', () => {
    connected(false)
    const { rerender } = renderHook(() => useUnreadCountApi())
    connected(true)
    rerender()
    expect(mutate).not.toHaveBeenCalled()
    connected(false)
    rerender()
    connected(true)
    rerender()
    expect(mutate).toHaveBeenCalledTimes(1)
  })
})
