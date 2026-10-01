/**
 * An organization's IP allowlist blocked this request.
 *
 * The API answers any tenant-scoped request from an IP outside the
 * organization's allowlist with `403 {code: "IP_NOT_ALLOWED"}`. That is not a
 * permission problem the user can fix by asking for a role, so it gets its own
 * message instead of the generic "you do not have permission".
 *
 * Handled in ONE place: the shared API client (`apiClient`) rewrites the error
 * message and raises a single, de-duplicated toast.
 */

import { toast } from 'sonner'

export const IP_NOT_ALLOWED_CODE = 'IP_NOT_ALLOWED'

export const IP_NOT_ALLOWED_MESSAGE =
  "Access to this organization from your network is blocked by its IP allowlist. Connect from an allowed network, or ask the organization's owner to add your IP address."

/** Stable toast id: many requests fail at once, the user should see one toast. */
const TOAST_ID = 'ip-not-allowed'

export function isIpNotAllowed(err: { statusCode?: number; code?: string } | null | undefined) {
  return !!err && err.statusCode === 403 && err.code === IP_NOT_ALLOWED_CODE
}

/** Shows the allowlist message once, however many requests were blocked. */
export function notifyIpNotAllowed(): void {
  if (typeof window === 'undefined') return
  toast.error('Blocked by IP allowlist', { id: TOAST_ID, description: IP_NOT_ALLOWED_MESSAGE })
}
