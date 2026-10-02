import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  devLog: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { devLog } from '@/lib/logger'
import { WebSocketClient } from '../client'

describe('WebSocketClient ticket fetch failure', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  // A 502 while the API restarts must not surface as a console error (the Next
  // dev overlay shows those); it is retried with backoff.
  it('warns and schedules a reconnect instead of logging an error', async () => {
    const fetchTicket = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('ws-token fetch failed: 502'))
    const states: string[] = []
    const client = new WebSocketClient({
      url: 'ws://localhost/ws',
      fetchTicket,
      initialReconnectDelay: 1000,
      onStateChange: (s) => states.push(s),
    })

    client.connect()
    await vi.waitFor(() => expect(fetchTicket).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(states).toContain('reconnecting'))

    expect(devLog.error).not.toHaveBeenCalled()
    expect(devLog.warn).toHaveBeenCalledWith(
      '[WebSocket] Failed to fetch ticket, will retry:',
      expect.any(Error)
    )

    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchTicket).toHaveBeenCalledTimes(2)

    client.disconnect()
  })
})
