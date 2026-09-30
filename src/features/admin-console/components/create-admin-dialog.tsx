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
import { createAdminUser } from '../api/use-admin-users'
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
 * Create a platform administrator. The API key is shown once: the new admin
 * uses it to set their console password, then signs in and enrolls MFA.
 */
export function CreateAdminDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<AdminRole>('readonly')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const close = () => {
    setOpen(false)
    setEmail('')
    setName('')
    setRole('readonly')
    setError(null)
    setApiKey(null)
    setCopied(false)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await createAdminUser({ email: email.trim(), name: name.trim(), role })
      setApiKey(res.api_key)
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
        {apiKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Administrator created</DialogTitle>
              <DialogDescription>
                Send this API key to them securely. It is shown only once. They use it to set their
                console password, then sign in at /admin/login and set up two-step verification.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 py-4">
              <code className="min-w-0 flex-1 rounded bg-muted px-2 py-1.5 text-xs break-all select-all">
                {apiKey}
              </code>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Copy API key"
                onClick={async () => {
                  if (await copyToClipboard(apiKey)) setCopied(true)
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>New administrator</DialogTitle>
              <DialogDescription>
                Platform administrators are separate from organization accounts.
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
