import { describe, expect, it } from 'vitest'
// The production entry runs next to server.js in the image.
import { isApiWebSocket, buildUpgradeRequest } from '../../../server-with-ws.mjs'

function upgradeReq(url: string, rawHeaders: string[], remoteAddress = '203.0.113.9') {
  const headers: Record<string, string> = {}
  for (let i = 0; i < rawHeaders.length; i += 2)
    headers[rawHeaders[i].toLowerCase()] = rawHeaders[i + 1]
  return { url, rawHeaders, headers, socket: { remoteAddress, encrypted: false } }
}

describe('server-with-ws', () => {
  it('intercepts only the API WebSocket path', () => {
    expect(isApiWebSocket('/api/v1/ws')).toBe(true)
    expect(isApiWebSocket('/api/v1/ws?ticket=abc')).toBe(true)
    expect(isApiWebSocket('/api/v1/ws/extra')).toBe(false)
    expect(isApiWebSocket('/api/v1/wsx')).toBe(false)
    expect(isApiWebSocket('/_next/webpack-hmr')).toBe(false)
    expect(isApiWebSocket(undefined)).toBe(false)
  })

  it('forwards path, query and upgrade headers with the backend host', () => {
    const out = buildUpgradeRequest(
      upgradeReq('/api/v1/ws?ticket=t1', [
        'Host',
        'ctem.example.com',
        'Upgrade',
        'websocket',
        'Connection',
        'Upgrade',
        'Sec-WebSocket-Key',
        'k',
        'Origin',
        'https://ctem.example.com',
      ]),
      new URL('http://api:8080')
    )
    expect(out.startsWith('GET /api/v1/ws?ticket=t1 HTTP/1.1\r\nHost: api:8080\r\n')).toBe(true)
    expect(out).toContain('Upgrade: websocket\r\n')
    expect(out).toContain('Origin: https://ctem.example.com\r\n')
    expect(out).toContain('X-Forwarded-Host: ctem.example.com\r\n')
    expect(out.endsWith('\r\n\r\n')).toBe(true)
  })

  it('overwrites client-supplied forwarding headers with the real peer', () => {
    const out = buildUpgradeRequest(
      upgradeReq('/api/v1/ws', ['Host', 'h', 'X-Forwarded-For', '1.2.3.4', 'X-Real-IP', '5.6.7.8']),
      new URL('http://api:8080')
    )
    expect(out).not.toContain('1.2.3.4')
    expect(out).not.toContain('5.6.7.8')
    expect(out).toContain('X-Forwarded-For: 203.0.113.9\r\n')
    expect(out).toContain('X-Real-IP: 203.0.113.9\r\n')
  })
})
