'use client'

import { useState, type FormEvent } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { adminLogin, adminVerifyMFA } from '@/features/admin-console/api/use-admin-session'
import { AdminApiError } from '@/features/admin-console/api/admin-client'
import { TotpQrCode } from '@/features/admin-console/components/totp-qr-code'
import type { AdminLoginResult } from '@/features/admin-console/types'

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof AdminApiError) {
    if (e.status === 429) return 'Too many attempts. Wait a minute and try again.'
    return e.message || fallback
  }
  return fallback
}

/** Only same-origin console paths are allowed as the post-login target. */
function nextPath(): string {
  if (typeof window === 'undefined') return '/admin'
  const next = new URLSearchParams(window.location.search).get('next') ?? ''
  return next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin'
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<AdminLoginResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setStep(await adminLogin(email.trim(), password))
      setPassword('')
    } catch (err) {
      setError(errorMessage(err, 'Invalid email or password'))
    } finally {
      setBusy(false)
    }
  }

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

  const restart = () => {
    setStep(null)
    setCode('')
    setError(null)
  }

  const enrolling = step?.status === 'mfa_enrollment_required'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShieldCheck className="size-5 text-muted-foreground" />
          Platform administration
        </CardTitle>
        <CardDescription>
          {step === null
            ? 'Sign in with your administrator account. This is separate from organization accounts.'
            : enrolling
              ? 'Set up two-step verification. It is required for every administrator.'
              : 'Enter the 6-digit code from your authenticator app.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === null ? (
          <form onSubmit={submitPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="me-2 size-4 animate-spin" />}
              Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-4">
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
              {enrolling ? 'Verify and finish setup' : 'Sign in'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={restart}>
              Use a different account
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
