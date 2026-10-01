/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/env', () => ({
  env: {
    api: { url: 'http://api.test' },
    auth: { refreshCookieName: 'refresh_token', cookieName: 'auth_token' },
  },
}))

import { POST, GET } from '@/app/api/v1/admin/[...path]/route'

const COOKIES =
  'auth_token=tenant-access; refresh_token=signed-in-refresh; csrf_token=tenant-csrf; admin_session=console; admin_csrf=c1; admin_idp=idp-state'

function call(handler: typeof POST, method: string, path: string[]) {
  const req = new NextRequest(`http://ui.test/api/v1/admin/${path.join('/')}`, {
    method,
    headers: { cookie: COOKIES, authorization: 'Bearer tenant-access' },
  })
  return handler(req, { params: Promise.resolve({ path }) })
}

describe('admin API proxy', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  const sentCookie = () => (fetchMock.mock.calls[0][1].headers as Headers).get('Cookie') ?? ''
  const sentAuth = () => (fetchMock.mock.calls[0][1].headers as Headers).get('Authorization')

  it.each([
    ['auth', 'session'],
    ['auth', 'logout'],
  ])('forwards the /login refresh token only to %s/%s', async (...path) => {
    await call(POST, 'POST', path)
    expect(sentCookie()).toContain('refresh_token=signed-in-refresh')
    expect(sentCookie()).toContain('admin_session=console')
  })

  it('never forwards the refresh token to other admin routes', async () => {
    await call(POST, 'POST', ['tenants'])
    expect(sentCookie()).not.toContain('refresh_token')
    await call(GET, 'GET', ['auth', 'session'])
    expect((fetchMock.mock.calls[1][1].headers as Headers).get('Cookie')).not.toContain(
      'refresh_token'
    )
  })

  it('never forwards tenant credentials', async () => {
    await call(POST, 'POST', ['auth', 'session'])
    expect(sentCookie()).not.toContain('auth_token')
    expect(sentCookie()).not.toContain('csrf_token')
    expect(sentAuth()).toBeNull()
  })

  it('forwards the identity-provider sign-in cookie to the callback', async () => {
    await call(POST, 'POST', ['auth', 'idp', 'callback'])
    expect(sentCookie()).toContain('admin_idp=idp-state')
    expect(sentCookie()).not.toContain('refresh_token')
  })

  describe('client IP headers', () => {
    afterEach(() => vi.unstubAllEnvs())

    function callWithIp() {
      const req = new NextRequest('http://ui.test/api/v1/admin/tenants', {
        method: 'GET',
        headers: { 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '203.0.113.7' },
      })
      return GET(req, { params: Promise.resolve({ path: ['tenants'] }) })
    }
    const sent = () => fetchMock.mock.calls[0][1].headers as Headers

    it('drops browser-supplied forwarding headers by default', async () => {
      vi.stubEnv('TRUST_PROXY_HEADERS', '')
      await callWithIp()
      expect(sent().get('x-real-ip')).toBeNull()
      expect(sent().get('x-forwarded-for')).toBeNull()
    })

    it('forwards them when TRUST_PROXY_HEADERS=true', async () => {
      vi.stubEnv('TRUST_PROXY_HEADERS', 'true')
      await callWithIp()
      expect(sent().get('x-real-ip')).toBe('203.0.113.7')
      expect(sent().get('x-forwarded-for')).toBe('203.0.113.7')
    })
  })
})
