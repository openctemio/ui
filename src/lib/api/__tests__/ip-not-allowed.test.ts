import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const toastError = vi.fn()
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }))

import { get } from '@/lib/api/client'
import { ApiClientError, handleApiError } from '@/lib/api/error-handler'
import { IP_NOT_ALLOWED_MESSAGE, isIpNotAllowed } from '@/lib/api/ip-not-allowed'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('IP allowlist block (403 IP_NOT_ALLOWED)', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    toastError.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('isIpNotAllowed matches only a 403 with that code', () => {
    expect(isIpNotAllowed({ statusCode: 403, code: 'IP_NOT_ALLOWED' })).toBe(true)
    expect(isIpNotAllowed({ statusCode: 403, code: 'FORBIDDEN' })).toBe(false)
    expect(isIpNotAllowed({ statusCode: 400, code: 'IP_NOT_ALLOWED' })).toBe(false)
    expect(isIpNotAllowed(undefined)).toBe(false)
  })

  it('the API client replaces the message and toasts once (de-duplicated by id)', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(403, { code: 'IP_NOT_ALLOWED', message: 'ip not allowed' })
    )

    const err = await get('/api/v1/assets').catch((e: unknown) => e)
    await get('/api/v1/findings').catch(() => undefined)

    expect(err).toBeInstanceOf(ApiClientError)
    expect((err as ApiClientError).code).toBe('IP_NOT_ALLOWED')
    expect((err as ApiClientError).statusCode).toBe(403)
    expect((err as ApiClientError).message).toBe(IP_NOT_ALLOWED_MESSAGE)
    expect(toastError).toHaveBeenCalledTimes(2)
    // Same toast id each time, so sonner shows a single toast.
    const ids = toastError.mock.calls.map((c) => (c[1] as { id: string }).id)
    expect(new Set(ids).size).toBe(1)
  })

  it('a normal 403 keeps the server message and raises no allowlist toast', async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { code: 'FORBIDDEN', message: 'nope' }))
    const err = (await get('/api/v1/assets').catch((e: unknown) => e)) as ApiClientError
    expect(err.message).toBe('nope')
    expect(toastError).not.toHaveBeenCalled()
  })

  it('handleApiError uses the same de-duplicated toast', () => {
    handleApiError(new ApiClientError('x', 'IP_NOT_ALLOWED', 403), { logError: false })
    expect(toastError).toHaveBeenCalledWith(
      'Blocked by IP allowlist',
      expect.objectContaining({ id: 'ip-not-allowed', description: IP_NOT_ALLOWED_MESSAGE })
    )
  })
})
