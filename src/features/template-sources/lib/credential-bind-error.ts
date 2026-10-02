import { ApiClientError } from '@/lib/api/error-handler'

/** API error code when a stored credential may not be bound (api#674). */
export const CREDENTIAL_BIND_FORBIDDEN = 'CREDENTIAL_BIND_FORBIDDEN'

const CREDENTIAL_BIND_MESSAGE =
  'You cannot attach this stored credential, or change where a source that uses one points. Only an owner or administrator, or the person who stored the credential, can. Choose a credential you stored, or ask an administrator.'

/**
 * The message to show in the template source form when the API refused to
 * bind a stored credential (403 CREDENTIAL_BIND_FORBIDDEN), or null for any
 * other error.
 */
export function credentialBindError(err: unknown): string | null {
  if (err instanceof ApiClientError && err.code === CREDENTIAL_BIND_FORBIDDEN) {
    return CREDENTIAL_BIND_MESSAGE
  }
  return null
}
