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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SetupLinkResult } from '@/features/shared/components/one-time-setup-link'
import { createOrganizationUser } from '../api/use-admin-organizations'
import { AdminApiError } from '../api/admin-client'
import type { AdminCreatedOrganizationUser, AdminOrgUserRole } from '../types'

export const ORG_USER_ROLE_OPTIONS: { value: AdminOrgUserRole; label: string; hint: string }[] = [
  { value: 'admin', label: 'Admin', hint: 'Manage members and settings' },
  { value: 'member', label: 'Member', hint: 'Work with assets, findings and scans' },
  { value: 'viewer', label: 'Viewer', hint: 'Read-only access' },
]

/**
 * Create an account in an organization from the platform console. The API
 * emails a setup link or returns a one-time link that is shown here once.
 */
export function AddOrganizationUserDialog({
  tenantId,
  onCreated,
}: {
  tenantId: string
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<AdminOrgUserRole>('member')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Held only in this component's state; dropped when the dialog closes.
  const [created, setCreated] = useState<AdminCreatedOrganizationUser | null>(null)

  const close = () => {
    setOpen(false)
    setEmail('')
    setName('')
    setRole('member')
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
        role,
      })
      setCreated(res)
      onCreated()
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not add the user')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="me-2 size-4" />
          Add user
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>User added</DialogTitle>
              <DialogDescription>
                {created.user?.name || created.user?.email} can sign in after setting a password.
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
              <DialogTitle>Add user</DialogTitle>
              <DialogDescription>
                Create an account in this organization. The person gets a link to set their
                password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-user-name">Name</Label>
                <Input
                  id="org-user-name"
                  required
                  maxLength={255}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-user-email">Email</Label>
                <Input
                  id="org-user-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-user-role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AdminOrgUserRole)}>
                  <SelectTrigger id="org-user-role" aria-label="Role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_USER_ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                        <span className="ms-2 text-xs text-muted-foreground">{o.hint}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                Add user
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
