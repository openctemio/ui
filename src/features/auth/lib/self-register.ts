/**
 * Self-registration rules.
 *
 * Accounts are created by administrators; people cannot sign themselves up.
 * The one exception is an invitation: someone who arrives from
 * /invitations/{token} may create their own account for the invited email
 * (the API accepts POST /auth/register with that `invitation_token` even when
 * registration is disabled). A deployment can still turn open registration on,
 * which the API reports as `registration_enabled` on GET /auth/providers.
 */

const INVITATION_PATH = /^\/invitations\/([^/?#]+)/

/** The invitation token in a `returnTo` like "/invitations/{token}", if any. */
export function invitationTokenFromReturnTo(returnTo: string | null | undefined) {
  if (!returnTo) return undefined
  return returnTo.match(INVITATION_PATH)?.[1]
}

/** True when the visitor may see "Create an account" affordances. */
export function canSelfRegister(
  registrationEnabled: boolean | undefined,
  returnTo: string | null | undefined
): boolean {
  return registrationEnabled === true || invitationTokenFromReturnTo(returnTo) !== undefined
}

/**
 * The /register link, carrying the invitation `returnTo` (so the register form
 * can send the invitation token) and the email to pre-fill.
 */
export function registerHref({
  returnTo,
  email,
}: { returnTo?: string | null; email?: string | null } = {}): string {
  const params = new URLSearchParams()
  if (returnTo && invitationTokenFromReturnTo(returnTo)) params.set('returnTo', returnTo)
  if (email) params.set('email', email)
  const qs = params.toString()
  return qs ? `/register?${qs}` : '/register'
}
