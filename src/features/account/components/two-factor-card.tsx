'use client'

import { useEffect, useRef, useState } from 'react'
import { KeyRound, Loader2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'
import { Skeleton } from '@/components/ui/skeleton'
import { OneTimeCodeInput, RecoveryCodesPanel, SecretKey, TotpQrCode } from '@/components/security'
import { getErrorMessage } from '@/lib/api/error-handler'
import { formatDateSafe } from '@/lib/format-date'

import {
  useDisableTwoFactor,
  useEnableTwoFactor,
  useRegenerateRecoveryCodes,
  useSetupTwoFactor,
  useTwoFactorStatus,
} from '../api/use-security'

interface TwoFactorCardProps {
  email?: string
  /** Called after 2FA is turned on: the server signed out every other session. */
  onOtherSessionsSignedOut?: () => void
}

type DialogKind = 'enable' | 'disable' | 'regenerate' | null

/**
 * Two-factor authentication section of My account → Security.
 */
export function TwoFactorCard({ email, onOtherSessionsSignedOut }: TwoFactorCardProps) {
  const { status, isLoading, mutate } = useTwoFactorStatus()
  const [dialog, setDialog] = useState<DialogKind>(null)

  const lowOnCodes = !!status?.enabled && status.recovery_codes_remaining <= 3

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Two-factor authentication
        </CardTitle>
        <CardDescription>
          Ask for a code from an authenticator app every time you sign in with your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !status ? (
          <Skeleton className="h-16 w-full" />
        ) : !status.supported ? (
          <p className="text-sm text-muted-foreground">
            You sign in through your organization&apos;s identity provider, which handles two-factor
            authentication.
          </p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{status.enabled ? 'On' : 'Off'}</span>
                {status.enabled ? (
                  <Badge variant="outline" className="border-success/40 text-success">
                    Protected
                  </Badge>
                ) : null}
                {status.required_by_organization && (
                  <Badge variant="outline">Required by your organization</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {status.enabled
                  ? `Turned on ${formatDateSafe(status.enabled_at)}. `
                  : 'Anyone with your password can sign in. '}
                {status.enabled && (
                  <span className={lowOnCodes ? 'text-warning' : undefined}>
                    {status.recovery_codes_remaining} recovery{' '}
                    {status.recovery_codes_remaining === 1 ? 'code' : 'codes'} left.
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {status.enabled ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setDialog('regenerate')}>
                    <KeyRound className="h-4 w-4" />
                    New recovery codes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDialog('disable')}
                  >
                    Turn off
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setDialog('enable')}>
                  Set up
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <EnableTwoFactorDialog
        open={dialog === 'enable'}
        email={email}
        onClose={() => {
          setDialog(null)
          mutate()
        }}
        onEnabled={() => {
          mutate()
          onOtherSessionsSignedOut?.()
        }}
      />
      <DisableTwoFactorDialog
        open={dialog === 'disable'}
        requiredByOrganization={!!status?.required_by_organization}
        onClose={() => setDialog(null)}
        onDisabled={() => {
          setDialog(null)
          mutate()
        }}
      />
      <RegenerateCodesDialog
        open={dialog === 'regenerate'}
        email={email}
        onClose={() => {
          setDialog(null)
          mutate()
        }}
      />
    </Card>
  )
}

// ---------------------------------------------------------------------------

function EnableTwoFactorDialog({
  open,
  email,
  onClose,
  onEnabled,
}: {
  open: boolean
  email?: string
  onClose: () => void
  onEnabled: () => void
}) {
  const { setupTwoFactor, isSettingUp } = useSetupTwoFactor()
  const { enableTwoFactor, isEnabling } = useEnableTwoFactor()
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [saved, setSaved] = useState(false)

  // A setup call issues a new secret and replaces the previous one: call it
  // once per opening (React StrictMode runs effects twice in development).
  const requested = useRef(false)
  useEffect(() => {
    if (!open) {
      requested.current = false
      return
    }
    if (requested.current) return
    requested.current = true
    setSetup(null)
    setCode('')
    setError(null)
    setCodes(null)
    setSaved(false)
    setupTwoFactor()
      .then((res) => setSetup({ secret: res.secret, uri: res.otpauth_uri }))
      .catch((err) => setError(getErrorMessage(err, 'Could not start two-factor setup')))
  }, [open, setupTwoFactor])

  async function confirm(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const recovery = await enableTwoFactor(code)
      setCodes(recovery)
      onEnabled()
      toast.success('Two-factor authentication is on')
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid verification code'))
      setCode('')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Once codes are shown, only the explicit "Done" closes the dialog.
        if (!o && (!codes || saved)) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {codes ? (
          <>
            <DialogHeader>
              <DialogTitle>Save your recovery codes</DialogTitle>
              <DialogDescription>
                Two-factor authentication is on, and your other sessions were signed out. Use a
                recovery code to sign in if you lose your authenticator.
              </DialogDescription>
            </DialogHeader>
            <RecoveryCodesPanel codes={codes} accountLabel={email} />
            <div className="flex items-center gap-2">
              <Checkbox
                id="enable-codes-saved"
                checked={saved}
                onCheckedChange={(v) => setSaved(v === true)}
              />
              <Label htmlFor="enable-codes-saved" className="font-normal">
                I have saved my recovery codes
              </Label>
            </div>
            <DialogFooter>
              <Button disabled={!saved} onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={confirm} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Set up two-factor authentication</DialogTitle>
              <DialogDescription>
                Scan the QR code with an authenticator app, then enter the 6-digit code it shows.
                Turning this on signs out your other sessions.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3">
              {setup ? (
                <>
                  <TotpQrCode uri={setup.uri} size={176} />
                  <SecretKey secret={setup.secret} />
                </>
              ) : isSettingUp || !error ? (
                <Skeleton className="h-44 w-44" />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="enable-code">Authentication code</Label>
              <OneTimeCodeInput
                id="enable-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={!setup || isEnabling}
                aria-invalid={!!error}
              />
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!setup || code.length !== 6 || isEnabling}>
                {isEnabling && <Loader2 className="h-4 w-4 animate-spin" />}
                Turn on
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DisableTwoFactorDialog({
  open,
  requiredByOrganization,
  onClose,
  onDisabled,
}: {
  open: boolean
  requiredByOrganization: boolean
  onClose: () => void
  onDisabled: () => void
}) {
  const { disableTwoFactor, isDisabling } = useDisableTwoFactor()
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPassword('')
      setCode('')
      setError(null)
    }
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await disableTwoFactor({ password, code: code.trim() })
      toast.success('Two-factor authentication is off')
      onDisabled()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not turn off two-factor authentication'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Turn off two-factor authentication</DialogTitle>
            <DialogDescription>
              {requiredByOrganization
                ? 'Your organization requires two-factor authentication: you will have to set it up again the next time you sign in.'
                : 'Signing in will need only your password. We will email you about this change.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disable-password">Current password</Label>
            <PasswordInput
              id="disable-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="disable-code">Authentication code or recovery code</Label>
            <Input
              id="disable-code"
              autoComplete="one-time-code"
              className="font-mono"
              placeholder="123456 or xxxxx-xxxxx"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-invalid={!!error}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!password || code.trim().length < 6 || isDisabling}
            >
              {isDisabling && <Loader2 className="h-4 w-4 animate-spin" />}
              Turn off
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RegenerateCodesDialog({
  open,
  email,
  onClose,
}: {
  open: boolean
  email?: string
  onClose: () => void
}) {
  const { regenerateRecoveryCodes, isRegenerating } = useRegenerateRecoveryCodes()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)

  useEffect(() => {
    if (open) {
      setCode('')
      setError(null)
      setCodes(null)
    }
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      setCodes(await regenerateRecoveryCodes(code))
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid verification code'))
      setCode('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {codes ? (
          <>
            <DialogHeader>
              <DialogTitle>New recovery codes</DialogTitle>
              <DialogDescription>Your old recovery codes no longer work.</DialogDescription>
            </DialogHeader>
            <RecoveryCodesPanel codes={codes} accountLabel={email} />
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Generate new recovery codes</DialogTitle>
              <DialogDescription>
                This replaces all of your recovery codes. Enter a code from your authenticator app
                to confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="regen-code">Authentication code</Label>
              <OneTimeCodeInput
                id="regen-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-invalid={!!error}
              />
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={code.length !== 6 || isRegenerating}>
                {isRegenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
