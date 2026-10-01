import { afterEach, describe, expect, it, vi } from 'vitest'

describe('buildWsUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  async function build() {
    const mod = await import('@/context/websocket-provider')
    return mod.buildWsUrl()
  }

  it('uses the UI origin by default, never the API port', async () => {
    vi.stubEnv('NEXT_PUBLIC_WS_BASE_URL', '')
    vi.stubGlobal('location', { protocol: 'https:', host: 'ctem.example.com' } as Location)
    expect(await build()).toBe('wss://ctem.example.com/api/v1/ws')
  })

  it('keeps the port of a non-default UI origin and uses ws over http', async () => {
    vi.stubEnv('NEXT_PUBLIC_WS_BASE_URL', '')
    vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:3000' } as Location)
    expect(await build()).toBe('ws://localhost:3000/api/v1/ws')
  })

  it('honours an explicit WebSocket base URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_WS_BASE_URL', 'https://ws.example.com')
    expect(await build()).toBe('wss://ws.example.com/api/v1/ws')
  })
})
