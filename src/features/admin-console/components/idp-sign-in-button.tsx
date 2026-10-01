'use client'

import { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { adminIdPStart } from '../api/use-admin-session'
import { isNavigableURL, rememberNext } from '../lib/console-navigation'
import { adminErrorMessage } from './totp-step-form'

/**
 * Starts a sign-in with the administrators' identity provider (the platform
 * IdP, not an organization's). The API sets the cookie the callback needs; the
 * browser then goes to the IdP and comes back to /admin/login/callback.
 */
export function IdPSignInButton({
  displayName,
  next,
  variant = 'default',
}: {
  displayName?: string
  next: string
  variant?: 'default' | 'outline'
}) {
  const [busy, setBusy] = useState(false)

  const start = async () => {
    setBusy(true)
    try {
      const { authorization_url: url } = await adminIdPStart()
      if (!isNavigableURL(url)) throw new Error('invalid authorization URL')
      rememberNext(next)
      window.location.assign(url)
    } catch (e) {
      toast.error(adminErrorMessage(e, 'Single sign-on is unavailable. Try again.'))
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      className="w-full"
      disabled={busy}
      onClick={() => void start()}
    >
      {busy ? (
        <Loader2 className="me-2 size-4 animate-spin" />
      ) : (
        <KeyRound className="me-2 size-4" />
      )}
      Sign in with {displayName || 'single sign-on'}
    </Button>
  )
}
