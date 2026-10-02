/**
 * setServerCookie mints the JS-readable CSRF cookie whenever a session cookie
 * is set. A user with no organization gets only the refresh cookie at login;
 * without a CSRF cookie their cookie-authenticated calls (accepting an
 * invitation via accept-with-refresh) failed with "CSRF token missing".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cookies } from 'next/headers'

import { setServerCookie } from '@/lib/cookies-server'
import { env } from '@/lib/env'
import { CSRF_COOKIE } from '@/lib/server-auth-cookies'

const jar = new Map<string, string>()
const set = vi.fn((name: string, value: string) => {
  jar.set(name, value)
})

beforeEach(() => {
  jar.clear()
  set.mockClear()
  vi.mocked(cookies).mockImplementation(
    async () =>
      ({
        get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
        set,
      }) as unknown as Awaited<ReturnType<typeof cookies>>
  )
})

const setNames = () => set.mock.calls.map((c) => c[0])

describe('setServerCookie CSRF minting', () => {
  it('mints a CSRF cookie with the refresh cookie (no-organization login)', async () => {
    await setServerCookie(env.auth.refreshCookieName, 'rt')
    expect(setNames()).toEqual([env.auth.refreshCookieName, CSRF_COOKIE])
    expect(jar.get(CSRF_COOKIE)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('mints a CSRF cookie with the access cookie', async () => {
    await setServerCookie(env.auth.cookieName, 'at')
    expect(setNames()).toEqual([env.auth.cookieName, CSRF_COOKIE])
  })

  it('keeps an existing CSRF cookie', async () => {
    jar.set(CSRF_COOKIE, 'existing')
    await setServerCookie(env.auth.refreshCookieName, 'rt')
    expect(setNames()).toEqual([env.auth.refreshCookieName])
    expect(jar.get(CSRF_COOKIE)).toBe('existing')
  })

  it('does not mint one for unrelated cookies', async () => {
    await setServerCookie(env.cookies.userInfo, '{}')
    expect(setNames()).toEqual([env.cookies.userInfo])
  })
})
