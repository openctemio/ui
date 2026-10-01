'use client'

import { useAuthProviders } from '../api/use-auth-providers'
import { canSelfRegister, invitationTokenFromReturnTo } from '../lib/self-register'

export interface CanSelfRegister {
  /** Show sign-up affordances (open registration, or an invitation). */
  canRegister: boolean
  /** The visitor came from an invitation link: sign-up allowed regardless. */
  viaInvitation: boolean
  /** The provider list is still loading and there is no invitation. */
  isLoading: boolean
}

/**
 * Whether this visitor may create their own account. Every link to /register
 * goes through this, so "registration disabled" hides them all.
 *
 * Fails closed: while loading or on error, sign-up is not offered (unless the
 * visitor holds an invitation, which does not depend on the server flag).
 */
export function useCanSelfRegister(returnTo: string | null | undefined): CanSelfRegister {
  const viaInvitation = invitationTokenFromReturnTo(returnTo) !== undefined
  const { data, isLoading } = useAuthProviders()
  return {
    canRegister: canSelfRegister(data?.registration_enabled, returnTo),
    viaInvitation,
    isLoading: !viaInvitation && isLoading && !data,
  }
}
