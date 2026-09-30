'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { adminStartSession, adminVerifyMFA } from '@/features/admin-console/api/use-admin-session'
import { AdminApiError } from '@/features/admin-console/api/admin-client'
import { TotpQrCode } from '@/features/admin-console/components/totp-qr-code'
import { localLogoutAction } from '@/features/auth/actions/local-auth-actions'
import type { AdminLoginResult } from '@/features/admin-console/types'

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof AdminApiError) {
    if (e.status === 429) return 'Too many attempts. Wait a minute and try again.'
    return e.message || fallback
  }
  return fallback
}

/** Only same-origin console paths are allowed as the post-verification target. */
function nextPath(): string {
  if (typeof window === 'undefined') return '/admin'
  const next = new URLSearchParams(window.location.search).get('next') ?? ''
  return (next === '/admin' || next.startsWith('/admin/')) && !next.startsWith('//')
    ? next
    : '/admin'
}

type Phase =
  | { kind: 'starting' }
  | { kind: 'code'; step: AdminLoginResult }
  /** Signed in, but this account cannot open the console. */
  | { kind: 'refused'; message: string }
  | { kind: 'failed'; message: string }

/**
 * Second step of the platform administrator sign-in (RFC-022). The
 * administrator signs in on the normal /login page; this page then asks for
 * the code from their authenticator app (or enrolls one on first use) and
 * opens the console session.
 */
export default function AdminVerifyPage() {
  const [phase, setPhase] = useState<Phase>({ kind: 'starting' })
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  const start = useCallback(async () => {
    setPhase({ kind: 'starting' })
    setError(null)
    try {
      setPhase({ kind: 'code', step: await adminStartSession() })
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) {
        // Not signed in: the normal sign-in page brings the administrator back.
        window.location.replace(`/login?redirect=${encodeURIComponent(nextPath())}`)
        return
      }
      if (err instanceof AdminApiError && err.status === 403) {
        setPhase({ kind: 'refused', message: err.message })
        return
      }
      setPhase({ kind: 'failed', message: errorMessage(err, 'The console could not be reached.') })
    }
  }, [])

  useEffect(() => {
    // Once per mount: each start issues a new pending session (and, before
    // enrollment, a new secret), so a double run would show a stale QR code.
    if (started.current) return
    started.current = true
    void start()
  }, [start])

  const submitCode = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await adminVerifyMFA(code.trim())
      // Full navigation so the new session cookies are used from the start.
      window.location.href = nextPath()
    } catch (err) {
      setError(errorMessage(err, 'Invalid or expired verification code'))
      setCode('')
      setBusy(false)
    }
  }

  const switchAccount = () => {
    setBusy(true)
    void localLogoutAction(`/login?redirect=${encodeURIComponent(nextPath())}`)
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
            ? 'This account cannot open the admin console.'
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

        {(phase.kind === 'refused' || phase.kind === 'failed') && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{phase.message}</AlertDescription>
            </Alert>
            {phase.kind === 'failed' && (
              <Button type="button" className="w-full" onClick={() => void start()}>
                Try again
              </Button>
            )}
            <Button
              type="button"
              variant={phase.kind === 'refused' ? 'default' : 'ghost'}
              className="w-full"
              disabled={busy}
              onClick={switchAccount}
            >
              Sign in with a different account
            </Button>
          </div>
        )}

        {step && (
          <form onSubmit={submitCode} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {enrolling && step.otpauth_uri && (
              <div className="space-y-3">
                <ol className="list-decimal space-y-1 ps-5 text-sm text-muted-foreground">
                  <li>
                    Open an authenticator app (Google Authenticator, Microsoft Authenticator,
                    1Password...).
                  </li>
                  <li>Scan this code, or enter the setup key by hand.</li>
                  <li>Enter the 6-digit code it shows.</li>
                </ol>
                <div className="flex justify-center">
                  <TotpQrCode uri={step.otpauth_uri} />
                </div>
                {step.secret && (
                  <div className="space-y-1 text-center">
                    <p className="text-xs text-muted-foreground">Setup key</p>
                    <code className="block rounded bg-muted px-2 py-1 text-sm tracking-wider break-all select-all">
                      {step.secret.match(/.{1,4}/g)?.join(' ')}
                    </code>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="admin-code">Verification code</Label>
              <Input
                id="admin-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-lg tracking-[0.5em] tabular-nums"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
              {busy && <Loader2 className="me-2 size-4 animate-spin" />}
              {enrolling ? 'Verify and finish setup' : 'Continue'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={switchAccount}
            >
              Sign in with a different account
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
