'use client'

import { useState, type FormEvent } from 'react'
import { AlertCircle, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { useRoles } from '@/features/access-control/api/use-roles'
import { SetupLinkResult } from '@/features/shared/components/one-time-setup-link'
import { getErrorMessage } from '@/lib/api/error-handler'

import { createTenantUser } from '../api/use-members'
import { MAX_ROLES_PER_USER, type CreatedTenantUser } from '../types/member.types'
import { RoleChecklist } from './role-checklist'

interface AddUserDialogProps {
  tenantSlug: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after the account is created (refresh the member list). */
  onCreated?: () => void
}

/**
 * Create an account for someone directly (no self-registration). The API either
 * emails them a setup link or returns a one-time link that is shown here once.
 */
export function AddUserDialog({ tenantSlug, open, onOpenChange, onCreated }: AddUserDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roleIds, setRoleIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Held only in this component's state; dropped when the dialog closes.
  const [created, setCreated] = useState<CreatedTenantUser | null>(null)

  const { roles, isLoading: rolesLoading } = useRoles({ skip: !open })

  const close = () => {
    onOpenChange(false)
    setName('')
    setEmail('')
    setRoleIds([])
    setError(null)
    setCreated(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!tenantSlug) return
    if (roleIds.length === 0) {
      setError('Select at least one role.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await createTenantUser(tenantSlug, {
        email: email.trim(),
        name: name.trim(),
        role_ids: roleIds,
      })
      setCreated(res)
      toast.success(`Account created for ${res.user?.email ?? email.trim()}`)
      onCreated?.()
    } catch (err) {
      // 400 (validation, e.g. email domain not allowed), 403 (granting a role
      // you do not hold), 409 (account exists — invite instead): show the
      // server's message where the admin is looking.
      setError(getErrorMessage(err, 'Could not create the user'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-lg">
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
                Create an account for someone in your organization. They get a link to set their
                password.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="add-user-name">Name</Label>
                  <Input
                    id="add-user-name"
                    required
                    maxLength={255}
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-user-email">Email</Label>
                  <Input
                    id="add-user-email"
                    type="email"
                    required
                    autoComplete="off"
                    placeholder="colleague@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Assign roles</Label>
                    <p className="text-xs text-muted-foreground">
                      Roles define what this user can do (up to {MAX_ROLES_PER_USER}).
                    </p>
                  </div>
                  {roleIds.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {roleIds.length} selected
                    </Badge>
                  )}
                </div>
                <RoleChecklist
                  roles={roles}
                  selected={roleIds}
                  onChange={setRoleIds}
                  loading={rolesLoading}
                  disabled={busy}
                  max={MAX_ROLES_PER_USER}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !tenantSlug}>
                {busy ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="me-2 h-4 w-4" />
                )}
                Add user
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
