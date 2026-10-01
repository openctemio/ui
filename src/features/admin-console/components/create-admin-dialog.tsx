'use client'

import { useState, type FormEvent } from 'react'
import { Check, Copy, Loader2, Plus } from 'lucide-react'
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
import { copyToClipboard } from '@/lib/clipboard'
import { provisionAdministrator } from '../api/use-admin-users'
import { AdminApiError } from '../api/admin-client'
import type { AdminRole } from '../types'

export const ADMIN_ROLE_OPTIONS: { value: AdminRole; label: string; hint: string }[] = [
  {
    value: 'super_admin',
    label: 'Super admin',
    hint: 'Everything, including administrators and SSO',
  },
  { value: 'ops_admin', label: 'Operations admin', hint: 'Create organizations, manage scanning' },
  { value: 'readonly', label: 'Read-only admin', hint: 'View only' },
]

/**
 * Make someone a platform administrator. They sign in on the normal sign-in
 * page with their account; when the API had to create the account, its
 * temporary password is shown here once.
 */
export function CreateAdminDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<AdminRole>('readonly')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ email: string; password?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const close = () => {
    setOpen(false)
    setEmail('')
    setName('')
    setRole('readonly')
    setError(null)
    setCreated(null)
    setCopied(false)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await provisionAdministrator({ email: email.trim(), name: name.trim(), role })
      setCreated({ email: res.admin.email, password: res.temporary_password })
      onCreated()
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not create the administrator')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="me-2 size-4" />
          New administrator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Administrator added</DialogTitle>
              <DialogDescription>
                {created.password
                  ? 'A sign-in account was created. Send these details to them securely; the password is shown only once. They sign in on the normal sign-in page, change the password, and set up two-step verification when they open the console.'
                  : 'Their existing account is now an administrator. They sign in on the normal sign-in page with their own password and set up two-step verification when they open the console.'}
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 py-4 text-sm">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="min-w-0 break-all">{created.email}</dd>
              {created.password && (
                <>
                  <dt className="text-muted-foreground">Temporary password</dt>
                  <dd className="flex min-w-0 items-center gap-2">
                    <code className="min-w-0 flex-1 rounded bg-muted px-2 py-1.5 text-xs break-all select-all">
                      {created.password}
                    </code>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="Copy temporary password"
                      onClick={async () => {
                        if (created.password && (await copyToClipboard(created.password))) {
                          setCopied(true)
                        }
                      }}
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </dd>
                </>
              )}
            </dl>
            <DialogFooter>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>New administrator</DialogTitle>
              <DialogDescription>
                An administrator signs in on the normal sign-in page but belongs to no organization.
                Use an email that is not a member of any organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="adm-name">Name</Label>
                <Input
                  id="adm-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adm-email">Email</Label>
                <Input
                  id="adm-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMIN_ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ADMIN_ROLE_OPTIONS.find((o) => o.value === role)?.hint}
                </p>
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
                Create administrator
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
