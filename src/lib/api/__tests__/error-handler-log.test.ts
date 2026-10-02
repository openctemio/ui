import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  devLog: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { devLog } from '@/lib/logger'
import { ApiClientError, handleApiError, isTransientApiError } from '../error-handler'

describe('handleApiError logging', () => {
  beforeEach(() => vi.clearAllMocks())

  // A 502 while the API restarts during a deploy is retried by SWR; it must
  // not raise the dev overlay's Console Error.
  it('logs a 502 as a readable warning, not an error', () => {
    handleApiError(new ApiClientError('Bad gateway', 'BAD_GATEWAY', 502), { showToast: false })
    expect(devLog.error).not.toHaveBeenCalled()
    expect(devLog.warn).toHaveBeenCalledWith(
      '[API Error] 502 BAD_GATEWAY: Bad gateway (will retry)'
    )
  })

  it('logs a 403 as an error with status, code and message in one line', () => {
    handleApiError(new ApiClientError('Forbidden', 'FORBIDDEN', 403), { showToast: false })
    expect(devLog.warn).not.toHaveBeenCalled()
    expect(devLog.error).toHaveBeenCalledWith('[API Error] 403 FORBIDDEN: Forbidden', '')
  })

  it('keeps the HTTP status of a non-ApiClientError error', () => {
    const err = Object.assign(new Error('Not found'), { status: 404 })
    handleApiError(err, { showToast: false })
    expect(devLog.error).toHaveBeenCalledWith('[API Error] 404 UNKNOWN_ERROR: Not found', '')
  })

  it('treats 5xx, 429, network and timeout errors as transient', () => {
    expect(isTransientApiError(new ApiClientError('x', 'X', 503))).toBe(true)
    expect(isTransientApiError(new ApiClientError('x', 'X', 429))).toBe(true)
    expect(isTransientApiError(new ApiClientError('x', 'NETWORK_ERROR', 0))).toBe(true)
    expect(isTransientApiError(new ApiClientError('x', 'TIMEOUT', 408))).toBe(true)
    expect(isTransientApiError(new ApiClientError('x', 'X', 400))).toBe(false)
    expect(isTransientApiError(new ApiClientError('x', 'X', 404))).toBe(false)
  })
})
