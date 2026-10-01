'use client'

import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminVerifyMFA } from '../api/use-admin-session'
import { AdminApiError } from '../api/admin-client'
import { TotpQrCode } from './totp-qr-code'
import type { AdminIdentity } from '../types'

export interface TotpStep {
  status: 'mfa_required' | 'mfa_enrollment_required'
  otpauth_uri?: string
  secret?: string
}

/** Maps a console API error to a message for the sign-in pages. */
export function adminErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof AdminApiError) {
    if (e.status === 429) return 'Too many attempts. Wait a minute and try again.'
    return e.message || fallback
  }
  return fallback
}

/**
 * The console's second step (TOTP), shared by the password sign-in and the
 * identity-provider callback: enter the code, or on first use scan the QR code
 * and enter the first code to finish enrollment.
 */
export function TotpStepForm({
  step,
  onVerified,
  onSwitchAccount,
  disabled,
}: {
  step: TotpStep
  onVerified: (admin: AdminIdentity) => void
  onSwitchAccount?: () => void
  disabled?: boolean
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const enrolling = step.status === 'mfa_enrollment_required'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onVerified(await adminVerifyMFA(code.trim()))
    } catch (err) {
      setError(adminErrorMessage(err, 'Invalid or expired verification code'))
      setCode('')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
      <Button type="submit" className="w-full" disabled={busy || disabled || code.length !== 6}>
        {busy && <Loader2 className="me-2 size-4 animate-spin" />}
        {enrolling ? 'Verify and finish setup' : 'Continue'}
      </Button>
      {onSwitchAccount && (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={busy || disabled}
          onClick={onSwitchAccount}
        >
          Sign in with a different account
        </Button>
      )}
    </form>
  )
}
