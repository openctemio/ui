'use client'

import { useState, type FormEvent } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SetupLinkResult } from '@/features/shared/components/one-time-setup-link'
import { createOrganizationUser } from '../api/use-admin-organizations'
import { AdminApiError } from '../api/admin-client'
import type { AdminCreatedOrganizationUser } from '../types'

/**
 * Create the FIRST owner of an organization that has none (RFC-022 rev. 5).
 * That is the only user the platform console may create in an organization:
 * once it has an owner, the owner and its administrators add people. The API
 * emails the set-password link when the organization can send email (and then
 * never returns it); only without email is a one-time link shown here, once.
 */
export function CreateFirstOwnerDialog({
  tenantId,
  onCreated,
}: {
  tenantId: string
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Held only in this component's state; dropped when the dialog closes.
  const [created, setCreated] = useState<AdminCreatedOrganizationUser | null>(null)

  const close = () => {
    setOpen(false)
    setEmail('')
    setName('')
    setError(null)
    setCreated(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await createOrganizationUser(tenantId, {
        email: email.trim(),
        name: name.trim(),
      })
      setCreated(res)
      onCreated()
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not create the owner')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="me-2 size-4" />
          Create first owner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Owner created</DialogTitle>
              <DialogDescription>
                {created.user?.name || created.user?.email} owns this organization once they set a
                password. They add everyone else.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <SetupLinkResult outcome={created} email={created.user?.email ?? email.trim()} />
            </div>
            <DialogFooter>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Create first owner</DialogTitle>
              <DialogDescription>
                This organization has no owner. Create the owner&apos;s account; they get a link to
                set their password, and then invite or create the organization&apos;s other users
                themselves.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-owner-name">Name</Label>
                <Input
                  id="org-owner-name"
                  required
                  maxLength={255}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-owner-email">Email</Label>
                <Input
                  id="org-owner-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="me-2 size-4 animate-spin" />}
                Create owner
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
