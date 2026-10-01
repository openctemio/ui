'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { adminIdPCallback } from '@/features/admin-console/api/use-admin-session'
import {
  TotpStepForm,
  adminErrorMessage,
  type TotpStep,
} from '@/features/admin-console/components/totp-step-form'
import { takeRememberedNext } from '@/features/admin-console/lib/console-navigation'

type Phase =
  { kind: 'working' } | { kind: 'code'; step: TotpStep } | { kind: 'failed'; message: string }

/**
 * Where the administrators' identity provider sends the browser back to
 * (RFC-022 revision 4). The code and state go to the API, which checks the
 * state against the cookie set when the sign-in started, so this only works in
 * the browser that started it. Unless the IdP's MFA is trusted, the console's
 * own TOTP step follows.
 */
export default function AdminIdPCallbackPage() {
  const [phase, setPhase] = useState<Phase>({ kind: 'working' })
  const [next, setNext] = useState('/admin')
  const ran = useRef(false)

  useEffect(() => {
    // The code is single use: never post it twice (React strict mode, re-renders).
    if (ran.current) return
    ran.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code') ?? ''
    const state = params.get('state') ?? ''
    const idpError = params.get('error')
    // Keep the code out of history and of any later Referer.
    window.history.replaceState(null, '', window.location.pathname)
    const target = takeRememberedNext()
    setNext(target)

    if (idpError || !code || !state) {
      setPhase({ kind: 'failed', message: 'Single sign-on was cancelled or failed.' })
      return
    }
    adminIdPCallback(code, state)
      .then((res) => {
        if (res.status === 'signed_in') {
          window.location.href = target
          return
        }
        setPhase({
          kind: 'code',
          step: { status: res.status, otpauth_uri: res.otpauth_uri, secret: res.secret },
        })
      })
      .catch((e) =>
        setPhase({ kind: 'failed', message: adminErrorMessage(e, 'Single sign-on failed') })
      )
  }, [])

  const enrolling = phase.kind === 'code' && phase.step.status === 'mfa_enrollment_required'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShieldCheck className="size-5 text-muted-foreground" />
          Platform administration
        </CardTitle>
        <CardDescription>
          {phase.kind === 'code'
            ? enrolling
              ? 'Set up two-step verification. It is required for every administrator.'
              : 'Enter the 6-digit code from your authenticator app to continue.'
            : phase.kind === 'failed'
              ? 'The sign-in did not complete.'
              : 'Completing single sign-on...'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {phase.kind === 'working' && (
          <div className="flex justify-center py-6" role="status" aria-label="Completing sign-in">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {phase.kind === 'failed' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{phase.message}</AlertDescription>
            </Alert>
            <Button asChild className="w-full">
              <Link href="/admin/login">Back to sign-in</Link>
            </Button>
          </div>
        )}
        {phase.kind === 'code' && (
          <TotpStepForm
            step={phase.step}
            onVerified={() => {
              window.location.href = next
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}
