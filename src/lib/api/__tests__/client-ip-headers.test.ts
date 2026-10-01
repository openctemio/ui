import { describe, it, expect, afterEach, vi } from 'vitest'

import {
  applyClientIpHeaders,
  clientIpHeaders,
  trustProxyHeaders,
} from '@/lib/api/client-ip-headers'

const spoofed = () =>
  new Headers({
    'x-real-ip': '203.0.113.7',
    'x-forwarded-for': '203.0.113.7, 10.0.0.2',
    'user-agent': 'test',
  })

describe('trustProxyHeaders', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('is off unless TRUST_PROXY_HEADERS is exactly "true"', () => {
    expect(trustProxyHeaders(undefined)).toBe(false)
    expect(trustProxyHeaders('')).toBe(false)
    expect(trustProxyHeaders('1')).toBe(false)
    expect(trustProxyHeaders('TRUE')).toBe(false)
    expect(trustProxyHeaders('true')).toBe(true)
  })

  it('reads the env var by default', () => {
    vi.stubEnv('TRUST_PROXY_HEADERS', 'true')
    expect(trustProxyHeaders()).toBe(true)
    vi.stubEnv('TRUST_PROXY_HEADERS', 'false')
    expect(trustProxyHeaders()).toBe(false)
  })
})

describe('clientIpHeaders', () => {
  it('forwards nothing when the proxy is not trusted (a browser could spoof its IP)', () => {
    expect(clientIpHeaders(spoofed(), false)).toEqual([])
  })

  it('forwards x-real-ip and x-forwarded-for when trusted', () => {
    expect(clientIpHeaders(spoofed(), true)).toEqual([
      ['x-real-ip', '203.0.113.7'],
      ['x-forwarded-for', '203.0.113.7, 10.0.0.2'],
    ])
  })

  it('skips headers that are absent or blank', () => {
    expect(clientIpHeaders(new Headers({ 'x-forwarded-for': '  ' }), true)).toEqual([])
  })

  it('defaults to the env var: off when unset', () => {
    vi.stubEnv('TRUST_PROXY_HEADERS', '')
    expect(clientIpHeaders(spoofed())).toEqual([])
    vi.unstubAllEnvs()
  })
})

describe('applyClientIpHeaders', () => {
  it('sets only the client-IP headers on the outgoing request', () => {
    const out = new Headers({ 'content-type': 'application/json' })
    applyClientIpHeaders(out, spoofed(), true)
    expect(out.get('x-real-ip')).toBe('203.0.113.7')
    expect(out.get('x-forwarded-for')).toBe('203.0.113.7, 10.0.0.2')
    expect(out.get('user-agent')).toBeNull()
  })

  it('leaves the outgoing request untouched when untrusted', () => {
    const out = new Headers()
    applyClientIpHeaders(out, spoofed(), false)
    expect(out.get('x-real-ip')).toBeNull()
    expect(out.get('x-forwarded-for')).toBeNull()
  })
})
