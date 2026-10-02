import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/cookies-server', () => ({ setServerCookie: vi.fn() }))

import { getSSOAuthorizeUrl, handleSSOCallback } from '@/features/sso/actions/sso-auth-actions'
import type { SSOProviderType } from '@/features/sso/types/sso.types'

import {
  getOAuthAuthorizationUrl,
  handleOAuthCallback,
  type SocialProvider,
} from './social-auth-actions'

// Server Action arguments are client-controlled: an off-list provider must be
// rejected before it reaches a backend URL path or a log line.
describe('auth server actions reject unknown providers', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const bad = ['../../admin/users', 'google\n[INFO] forged', 'facebook'] as const

  it.each(bad)('social authorize: %j', async (p) => {
    const r = await getOAuthAuthorizationUrl(p as unknown as SocialProvider)
    expect(r).toEqual({ success: false, error: 'Unsupported sign-in provider' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(bad)('social callback: %j', async (p) => {
    const r = await handleOAuthCallback(p as unknown as SocialProvider, 'code', 'state')
    expect(r).toEqual({ success: false, error: 'Unsupported sign-in provider' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(bad)('sso authorize: %j', async (p) => {
    const r = await getSSOAuthorizeUrl(p as unknown as SSOProviderType, 'acme')
    expect(r).toEqual({ success: false, error: 'Unsupported identity provider' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(bad)('sso callback: %j', async (p) => {
    const r = await handleSSOCallback(p as unknown as SSOProviderType, 'code', 'state')
    expect(r).toEqual({ success: false, error: 'Unsupported identity provider' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allowed provider still reaches the backend', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ authorization_url: 'https://idp/x', state: 's' }), {
        status: 200,
      })
    )
    const r = await getOAuthAuthorizationUrl('github')
    expect(r.success).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
