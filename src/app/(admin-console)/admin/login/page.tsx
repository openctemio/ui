'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { adminIdPInfo, adminStartSession } from '@/features/admin-console/api/use-admin-session'
import { AdminApiError } from '@/features/admin-console/api/admin-client'
import { TotpStepForm, adminErrorMessage } from '@/features/admin-console/components/totp-step-form'
import { IdPSignInButton } from '@/features/admin-console/components/idp-sign-in-button'
import { nextFromLocation } from '@/features/admin-console/lib/console-navigation'
import { localLogoutAction } from '@/features/auth/actions/local-auth-actions'
import type { AdminIdPInfo, AdminLoginResult } from '@/features/admin-console/types'

type Phase =
  | { kind: 'starting' }
  | { kind: 'code'; step: AdminLoginResult }
  /** Not signed in, and the administrators' identity provider is available. */
  | { kind: 'choose'; idp: AdminIdPInfo }
  /** Signed in, but this account cannot open the console this way. */
  | { kind: 'refused'; message: string; idp?: AdminIdPInfo }
  | { kind: 'failed'; message: string }

/** The administrators' IdP, or null when it is not offered. */
async function enabledIdP(): Promise<AdminIdPInfo | null> {
  try {
    const info = await adminIdPInfo()
    return info.enabled ? info : null
  } catch {
    return null
  }
}

/**
 * Platform administrator sign-in (RFC-022). Two ways in:
 * - the password: the administrator signs in on the normal /login page, and
 *   this page asks for the code from their authenticator app (or enrolls one);
 * - the administrators' own identity provider, when one is configured (never an
 *   organization's): the browser goes to the IdP and comes back to
 *   /admin/login/callback.
 */
export default function AdminVerifyPage() {
  const [phase, setPhase] = useState<Phase>({ kind: 'starting' })
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  const start = useCallback(async () => {
    setPhase({ kind: 'starting' })
    try {
      setPhase({ kind: 'code', step: await adminStartSession() })
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) {
        // Not signed in: offer the IdP when there is one, else the normal
        // sign-in page brings the administrator back.
        const idp = await enabledIdP()
        if (idp) {
          setPhase({ kind: 'choose', idp })
          return
        }
        window.location.replace(`/login?redirect=${encodeURIComponent(nextFromLocation())}`)
        return
      }
      if (err instanceof AdminApiError && err.status === 403) {
        const idp = err.code === 'IDP_SIGN_IN_REQUIRED' ? await enabledIdP() : null
        setPhase({ kind: 'refused', message: err.message, idp: idp ?? undefined })
        return
      }
      setPhase({
        kind: 'failed',
        message: adminErrorMessage(err, 'The console could not be reached.'),
      })
    }
  }, [])

  useEffect(() => {
    // Once per mount: each start issues a new pending session (and, before
    // enrollment, a new secret), so a double run would show a stale QR code.
    if (started.current) return
    started.current = true
    void start()
  }, [start])

  const switchAccount = () => {
    setBusy(true)
    void localLogoutAction(`/login?redirect=${encodeURIComponent(nextFromLocation())}`)
  }

  const step = phase.kind === 'code' ? phase.step : null
  const enrolling = step?.status === 'mfa_enrollment_required'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShieldCheck className="size-5 text-muted-foreground" />
          Platform administration
        </CardTitle>
        <CardDescription>
          {phase.kind === 'refused'
            ? 'This account cannot open the admin console this way.'
            : phase.kind === 'choose'
              ? 'Sign in to administer this installation.'
              : enrolling
                ? 'Set up two-step verification. It is required for every administrator.'
                : 'Enter the 6-digit code from your authenticator app to continue.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {phase.kind === 'starting' && (
          <div
            className="flex justify-center py-6"
            role="status"
            aria-label="Checking your sign-in"
          >
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {phase.kind === 'choose' && (
          <div className="space-y-3">
            <IdPSignInButton displayName={phase.idp.display_name} next={nextFromLocation()} />
            <Button asChild variant="outline" className="w-full">
              <Link href={`/login?redirect=${encodeURIComponent(nextFromLocation())}`}>
                Sign in with a password
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Password sign-in is for break-glass (emergency) accounts when the identity provider is
              required.
            </p>
          </div>
        )}

        {(phase.kind === 'refused' || phase.kind === 'failed') && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{phase.message}</AlertDescription>
            </Alert>
            {phase.kind === 'refused' && phase.idp && (
              <IdPSignInButton displayName={phase.idp.display_name} next={nextFromLocation()} />
            )}
            {phase.kind === 'failed' && (
              <Button type="button" className="w-full" onClick={() => void start()}>
                Try again
              </Button>
            )}
            <Button
              type="button"
              variant={phase.kind === 'refused' && !phase.idp ? 'default' : 'ghost'}
              className="w-full"
              disabled={busy}
              onClick={switchAccount}
            >
              Sign in with a different account
            </Button>
          </div>
        )}

        {step && (
          <TotpStepForm
            step={step}
            disabled={busy}
            onSwitchAccount={switchAccount}
            onVerified={() => {
              // Full navigation so the new session cookies are used from the start.
              window.location.href = nextFromLocation()
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}
