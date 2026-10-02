import { describe, it, expect } from 'vitest'
import { ApiClientError } from '@/lib/api/error-handler'
import { credentialBindError } from '../lib/credential-bind-error'

describe('credentialBindError', () => {
  it('explains a CREDENTIAL_BIND_FORBIDDEN refusal (api#674)', () => {
    const err = new ApiClientError('only an owner or admin ...', 'CREDENTIAL_BIND_FORBIDDEN', 403)
    const msg = credentialBindError(err)
    expect(msg).toMatch(/stored credential/i)
    expect(msg).toMatch(/owner or administrator/i)
  })

  it('ignores any other error', () => {
    expect(credentialBindError(new ApiClientError('nope', 'FORBIDDEN', 403))).toBeNull()
    expect(credentialBindError(new Error('boom'))).toBeNull()
    expect(credentialBindError(undefined)).toBeNull()
  })
})
