/**
 * The notification bell listens on the signed-in user's own channel,
 * user:{tenant_id}:{user_id}. Notifications are no longer sent on the shared
 * tenant channel (every member could read them there), so subscribing to the
 * right channel is what keeps the bell live.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const subscribe = vi.fn(() => Promise.resolve())
const unsubscribe = vi.fn(() => Promise.resolve())

vi.mock('@/lib/websocket', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/websocket')>()
  return {
    ...actual,
    getWebSocketClient: () => ({ subscribe, unsubscribe }),
  }
})
vi.mock('@/context/websocket-provider', () => ({
  useWebSocket: () => ({ state: 'connected', isConnected: true, reconnect: () => {} }),
}))

import { useUserNotificationChannel } from '../use-websocket'

describe('useUserNotificationChannel', () => {
  beforeEach(() => {
    subscribe.mockClear()
    unsubscribe.mockClear()
  })

  it('subscribes to the user channel for this tenant and user', () => {
    renderHook(() => useUserNotificationChannel('tenant-1', 'user-1'))
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(subscribe).toHaveBeenCalledWith('user:tenant-1:user-1', expect.any(Function))
  })

  it('never subscribes to the tenant channel', () => {
    renderHook(() => useUserNotificationChannel('tenant-1', 'user-1'))
    const channels = subscribe.mock.calls.map((c) => (c as unknown[])[0])
    expect(channels.some((ch) => String(ch).startsWith('tenant:'))).toBe(false)
  })

  it.each([
    ['tenant', null, 'user-1'],
    ['user', 'tenant-1', undefined],
  ])('does not subscribe while the %s id is unknown', (_label, tenantId, userId) => {
    renderHook(() => useUserNotificationChannel(tenantId, userId))
    expect(subscribe).not.toHaveBeenCalled()
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useUserNotificationChannel('tenant-1', 'user-1'))
    unmount()
    expect(unsubscribe).toHaveBeenCalledWith('user:tenant-1:user-1', expect.any(Function))
  })
})
