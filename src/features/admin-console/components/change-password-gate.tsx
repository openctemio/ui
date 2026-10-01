'use client'

import { useState, type FormEvent } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { localLogoutAction } from '@/features/auth/actions/local-auth-actions'
import { adminChangePassword } from '../api/use-admin-session'
import { adminErrorMessage } from './totp-step-form'
import type { AdminIdentity } from '../types'

/**
 * Shown instead of the console while the administrator still has the
 * temporary password they were provisioned with (bootstrap-admin or "New
 * administrator"). The API refuses every other console call until it is
 * changed. Changing it ends every session, so the administrator signs in again.
 */
export function ChangePasswordGate({ admin }: { admin: AdminIdentity }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (next !== confirm) {
      setError('The new passwords do not match.')
      return
    }
    if (next === current) {
      setError('Choose a password different from the temporary one.')
      return
    }
    setBusy(true)
    try {
      await adminChangePassword(current, next)
      toast.success('Password changed. Sign in again with your new password.')
      await localLogoutAction(`/login?redirect=${encodeURIComponent('/admin')}`)
    } catch (err) {
      setError(adminErrorMessage(err, 'The password could not be changed'))
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <KeyRound className="size-5 text-muted-foreground" />
            Change your temporary password
          </CardTitle>
          <CardDescription>
            {admin.email} was given a temporary password. Choose your own before using the console.
            You will sign in again afterwards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="pw-current">Temporary password</Label>
              <Input
                id="pw-current"
                type="password"
                autoComplete="current-password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-new">New password</Label>
              <Input
                id="pw-new"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-confirm">Confirm new password</Label>
              <Input
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="me-2 size-4 animate-spin" />}
              Change password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
