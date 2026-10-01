'use client'

import { useState, type FormEvent } from 'react'
import { AlertCircle, Check, Copy, Loader2, Mail, Send, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { getErrorMessage } from '@/lib/api/error-handler'
import { copyToClipboard } from '@/lib/clipboard'

import { createTenantInvitation } from '../api/use-members'
import { RoleChecklist } from './role-checklist'

/** `${origin}/invitations/<token>`: the page the invitee opens to join. */
export function buildInvitationLink(token: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/invitations/${token}`
}

interface InviteUserDialogProps {
  tenantSlug: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after the invitation is created (refresh the invitation list). */
  onInvited?: () => void
}

/**
 * Invite someone by email. The API stores only a hash of the invitation token,
 * so the usable link exists once: in the response to this request. It is shown
 * here (the invitee may not get an email when SMTP is not configured) and never
 * again; the invitation list cannot rebuild it.
 */
export function InviteUserDialog({
  tenantSlug,
  open,
  onOpenChange,
  onInvited,
}: InviteUserDialogProps) {
  const [email, setEmail] = useState('')
  const [roleIds, setRoleIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Held only in this component's state; dropped when the dialog closes.
  const [link, setLink] = useState<{ email: string; url: string | null } | null>(null)
  const [copied, setCopied] = useState(false)

  const { roles, isLoading: rolesLoading } = useRoles({ skip: !open })

  const close = () => {
    onOpenChange(false)
    setEmail('')
    setRoleIds([])
    setError(null)
    setLink(null)
    setCopied(false)
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
      const invitation = await createTenantInvitation(tenantSlug, {
        email: email.trim(),
        role_ids: roleIds,
      })
      setLink({
        email: invitation.email || email.trim(),
        url: invitation.token ? buildInvitationLink(invitation.token) : null,
      })
      toast.success(`Invitation created for ${invitation.email || email.trim()}`)
      onInvited?.()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the invitation'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        {link ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation created</DialogTitle>
              <DialogDescription>
                {link.email} joins after opening the invitation link. When email is configured they
                also receive it by email.
              </DialogDescription>
            </DialogHeader>
            {link.url ? (
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Invitation link</p>
                  <div className="flex min-w-0 items-center gap-2">
                    <code
                      className="min-w-0 flex-1 rounded bg-muted px-2 py-1.5 font-mono text-xs break-all select-all"
                      data-testid="invitation-link"
                    >
                      {link.url}
                    </code>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="Copy invitation link"
                      onClick={async () => {
                        if (link.url && (await copyToClipboard(link.url))) setCopied(true)
                      }}
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>
                <Alert className="border-warning/40 bg-warning/10">
                  <ShieldAlert className="size-4 text-warning" />
                  <AlertTitle>Shown once</AlertTitle>
                  <AlertDescription>
                    Anyone with this link can join as {link.email}. It will not be shown again;
                    cancel the invitation and invite again if it is lost.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <Alert className="my-2">
                <Mail className="size-4" />
                <AlertTitle>Invitation emailed</AlertTitle>
                <AlertDescription>{link.email} receives the link by email.</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Invite user</DialogTitle>
              <DialogDescription>
                Invite someone by email. They join with the roles you choose.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 ps-10"
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Assign roles</Label>
                    <p className="text-xs text-muted-foreground">
                      Select roles to define permissions for this user
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
              <Button type="submit" disabled={busy || !tenantSlug || !email.trim()}>
                {busy ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="me-2 h-4 w-4" />
                )}
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
