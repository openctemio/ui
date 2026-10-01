/**
 * Second login step.
 *
 * - purpose "verify": the user has 2FA on; ask for an authenticator code or a
 *   recovery code.
 * - purpose "enroll": an organization the user belongs to requires 2FA and the
 *   user has not set it up; enroll an authenticator, show the recovery codes
 *   once, then continue.
 *
 * The challenge itself lives in an httpOnly cookie set by loginAction; this
 * component never sees it.
 */

'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { OneTimeCodeInput, RecoveryCodesPanel, SecretKey, TotpQrCode } from '@/components/security'

import {
  cancelMfaAction,
  confirmMfaEnrollmentAction,
  finishMfaEnrollmentAction,
  startMfaEnrollmentAction,
  verifyMfaAction,
  type LoginResult,
  type MfaPurpose,
} from '../actions/local-auth-actions'

interface MfaStepProps {
  purpose: MfaPurpose
  /** Called with a completed login result (session issued). */
  onDone: (result: LoginResult) => void
  /** Back to the password form, optionally with a reason to show. */
  onCancel: (message?: string) => void
}

// The challenge expired, was used up, or the cookie is gone: only a fresh
// password login helps.
const RESTART_PATTERN = /sign in again|enter your password again|expired/i

export function MfaStep({ purpose, onDone, onCancel }: MfaStepProps) {
  return purpose === 'enroll' ? (
    <EnrollStep onDone={onDone} onCancel={onCancel} />
  ) : (
    <VerifyStep onDone={onDone} onCancel={onCancel} />
  )
}

function BackButton({ onCancel }: { onCancel: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="justify-self-start px-0"
      onClick={async () => {
        await cancelMfaAction()
        onCancel()
      }}
    >
      <ArrowLeft className="h-4 w-4" />
      Back to sign in
    </Button>
  )
}

function VerifyStep({ onDone, onCancel }: Omit<MfaStepProps, 'purpose'>) {
  const [useRecovery, setUseRecovery] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canSubmit = useRecovery ? value.trim().length >= 10 : value.length === 6

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      const result = await verifyMfaAction(useRecovery ? { recoveryCode: value } : { code: value })
      if (result.success) {
        onDone(result)
        return
      }
      const msg = result.error || 'Verification failed'
      if (RESTART_PATTERN.test(msg)) {
        onCancel(msg)
        return
      }
      setError(msg)
      setValue('')
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-3" aria-label="Two-factor verification">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Two-factor authentication</h2>
        <p className="text-sm text-muted-foreground">
          {useRecovery
            ? 'Enter one of your recovery codes. Each code works once.'
            : 'Enter the 6-digit code from your authenticator app.'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mfa-code">{useRecovery ? 'Recovery code' : 'Authentication code'}</Label>
        {useRecovery ? (
          <Input
            id="mfa-code"
            autoComplete="off"
            autoFocus
            placeholder="xxxxx-xxxxx"
            className="font-mono"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isPending}
            aria-invalid={!!error}
          />
        ) : (
          <OneTimeCodeInput
            id="mfa-code"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isPending}
            aria-invalid={!!error}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <Button type="submit" disabled={!canSubmit || isPending}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        Verify
      </Button>

      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto px-0"
        onClick={() => {
          setUseRecovery((v) => !v)
          setValue('')
          setError(null)
        }}
      >
        {useRecovery ? 'Use your authenticator app instead' : 'Use a recovery code instead'}
      </Button>

      <BackButton onCancel={() => onCancel()} />
    </form>
  )
}

function EnrollStep({ onDone, onCancel }: Omit<MfaStepProps, 'purpose'>) {
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState<LoginResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Each start issues a new secret and replaces the previous one, so it must
  // run exactly once (React StrictMode runs effects twice in development).
  // onCancel is read through a ref so a new callback identity from the parent
  // never restarts enrollment.
  const started = useRef(false)
  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])
  useEffect(() => {
    if (started.current) return
    started.current = true
    startMfaEnrollmentAction().then((res) => {
      if (res.success && res.secret && res.otpauthUri) {
        setSetup({ secret: res.secret, uri: res.otpauthUri })
      } else {
        onCancelRef.current(res.error || 'Could not start two-factor setup. Please sign in again.')
      }
    })
  }, [])

  function confirm(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    setError(null)
    startTransition(async () => {
      const result = await confirmMfaEnrollmentAction(code)
      if (result.success) {
        setFinished(result)
        return
      }
      const msg = result.error || 'Verification failed'
      if (RESTART_PATTERN.test(msg)) {
        onCancel(msg)
        return
      }
      setError(msg)
      setCode('')
    })
  }

  if (finished) {
    return (
      <div className="grid gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Save your recovery codes</h2>
          <p className="text-sm text-muted-foreground">
            Two-factor authentication is on. If you lose your authenticator, a recovery code is the
            only way back into your account.
          </p>
        </div>
        <RecoveryCodesPanel
          codes={finished.recoveryCodes ?? []}
          accountLabel={finished.user?.email}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="codes-saved"
            checked={saved}
            onCheckedChange={(v) => setSaved(v === true)}
          />
          <Label htmlFor="codes-saved" className="font-normal">
            I have saved my recovery codes
          </Label>
        </div>
        <Button
          type="button"
          disabled={!saved || isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await finishMfaEnrollmentAction()
              if (result.success) {
                onDone(result)
              } else {
                onCancel(result.error)
              }
            })
          }
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={confirm} className="grid gap-4" aria-label="Set up two-factor authentication">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Set up two-factor authentication</h2>
        <p className="text-sm text-muted-foreground">
          Your organization requires two-factor authentication. Scan the QR code with an
          authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, ...), then
          enter the 6-digit code it shows.
        </p>
      </div>

      {setup ? (
        <div className="flex flex-col items-center gap-3">
          <TotpQrCode uri={setup.uri} size={176} />
          <SecretKey secret={setup.secret} />
        </div>
      ) : (
        <Skeleton className="mx-auto h-44 w-44" />
      )}

      <div className="space-y-2">
        <Label htmlFor="enroll-code">Authentication code</Label>
        <OneTimeCodeInput
          id="enroll-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={!setup || isPending}
          aria-invalid={!!error}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <Button type="submit" disabled={!setup || code.length !== 6 || isPending}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        Turn on and continue
      </Button>

      <BackButton onCancel={() => onCancel()} />
    </form>
  )
}
