'use client'

import { useState } from 'react'
import { Key, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'
import { getErrorMessage } from '@/lib/api/error-handler'

import { useChangePassword } from '../api/use-security'

const EMPTY = { current_password: '', new_password: '', confirm_password: '' }

interface PasswordCardProps {
  /** false for accounts that sign in through an identity provider */
  isLocalAccount: boolean
  /** Called after a change: the server signed out every other session. */
  onChanged?: () => void
}

export function PasswordCard({ isLocalAccount, onChanged }: PasswordCardProps) {
  const { changePassword, isChanging } = useChangePassword()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.new_password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (form.new_password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }
    try {
      await changePassword(form)
      setOpen(false)
      setForm(EMPTY)
      toast.success('Password changed. Your other sessions were signed out.')
      onChanged?.()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to change password'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Password
        </CardTitle>
        <CardDescription>
          {isLocalAccount
            ? 'Changing your password signs out every other session.'
            : 'You sign in through your organization’s identity provider; change your password there.'}
        </CardDescription>
      </CardHeader>
      {isLocalAccount && (
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Change password
          </Button>
        </CardContent>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) {
            setForm(EMPTY)
            setError('')
          }
        }}
      >
        <DialogContent>
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Change password</DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new one. Your other sessions will be signed
                out.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">At least 8 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isChanging || !form.current_password}>
                {isChanging && <Loader2 className="h-4 w-4 animate-spin" />}
                Change password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
