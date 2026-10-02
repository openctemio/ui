/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/version/web-build-info', () => ({
  resolveWebBuildInfo: vi.fn(async () => ({
    version: 'v0.8.0-dev',
    commit: '4d2f4b02',
    channel: 'development',
  })),
}))

import { GET } from '../route'

const call = (cookie?: string) =>
  GET(
    new NextRequest('http://ui.test/api/version', {
      headers: cookie ? { cookie } : undefined,
    })
  )

describe('GET /api/version', () => {
  it('refuses an anonymous caller', async () => {
    const res = await call()
    expect(res.status).toBe(401)
  })

  it.each([
    ['the app session', 'auth_token=a'],
    ['a refresh-only app session', 'refresh_token=r'],
    ['the admin console session', 'admin_session=s'],
  ])('answers %s with the web build', async (_, cookie) => {
    const res = await call(cookie)
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    await expect(res.json()).resolves.toEqual({
      version: 'v0.8.0-dev',
      commit: '4d2f4b02',
      channel: 'development',
    })
  })
})
