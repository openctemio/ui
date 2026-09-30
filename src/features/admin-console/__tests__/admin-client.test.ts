import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { adminFetch, AdminApiError } from '../api/admin-client'

describe('adminFetch', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'admin_csrf=csrf-123; path=/'
    // A tenant CSRF cookie must never be used for admin calls.
    document.cookie = 'csrf_token=tenant-csrf; path=/'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  const ok = (body: unknown, status = 200) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status })

  it('reads go to the admin proxy without a CSRF header', async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: '1' }))
    await adminFetch('/tenants')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/admin/tenants')
    expect(init.headers['X-CSRF-Token']).toBeUndefined()
    expect(init.credentials).toBe('same-origin')
  })

  it('writes carry the admin CSRF cookie value, not the tenant one', async () => {
    fetchMock.mockResolvedValueOnce(ok({ enforced: true }))
    await adminFetch('/tenants/t1/sso/enforcement', { method: 'PUT', body: { enforced: true } })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['X-CSRF-Token']).toBe('csrf-123')
    expect(init.body).toBe(JSON.stringify({ enforced: true }))
  })

  it('returns undefined for 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(adminFetch('/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })

  it('throws AdminApiError with the API message and status', async () => {
    fetchMock.mockResolvedValueOnce(ok({ code: 'VALIDATION', message: 'cannot enforce SSO' }, 400))
    const err = (await adminFetch('/x', { method: 'PUT', body: {} }).catch(
      (e: unknown) => e
    )) as AdminApiError
    expect(err).toBeInstanceOf(AdminApiError)
    expect(err.status).toBe(400)
    expect(err.message).toBe('cannot enforce SSO')
  })
})

describe('humanizeAction', () => {
  it('reads audit actions as words, with acronyms kept', async () => {
    const { humanizeAction } = await import('../components/admin-activity-table')
    expect(humanizeAction('organization.idp_create')).toBe('Identity provider create')
    expect(humanizeAction('console.mfa_enrolled')).toBe('Two-step verification enrolled')
    expect(humanizeAction('organization.sso_enforcement')).toBe('SSO enforcement')
  })
})
