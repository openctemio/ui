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
  'auth_token=tenant-access; refresh_token=signed-in-refresh; csrf_token=tenant-csrf; admin_session=console; admin_csrf=c1'

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
})
