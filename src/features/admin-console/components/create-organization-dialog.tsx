'use client'

import { useState, type FormEvent } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
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
import { Textarea } from '@/components/ui/textarea'
import { SetupLinkResult } from '@/features/shared/components/one-time-setup-link'
import { createOrganization } from '../api/use-admin-organizations'
import { AdminApiError } from '../api/admin-client'
import type { AdminOrganization, CreatedOrganization } from '../types'

/** "Acme Corp" -> "acme-corp" (the API requires lowercase letters, digits, hyphens). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export function CreateOrganizationDialog({
  onCreated,
}: {
  onCreated: (org: AdminOrganization) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [owner, setOwner] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set when the owner's account was just created and the API returned a
  // one-time setup link: shown once, then the dialog moves on to the new org.
  const [created, setCreated] = useState<CreatedOrganization | null>(null)

  const reset = () => {
    setName('')
    setSlug('')
    setSlugEdited(false)
    setOwner('')
    setOwnerName('')
    setDescription('')
    setError(null)
    setCreated(null)
  }

  const finish = (org: AdminOrganization) => {
    setOpen(false)
    reset()
    onCreated(org)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const org = await createOrganization({
        name: name.trim(),
        slug: slug.trim(),
        owner_email: owner.trim(),
        owner_name: ownerName.trim() || undefined,
        description: description.trim() || undefined,
      })
      toast.success(`${org.name} created`)
      if (org.owner_setup?.setup_token || org.owner_setup?.email_failed) {
        // No email could be sent: show the owner's one-time link before
        // leaving. A failed send (SMTP configured) returns no link; say so.
        setCreated(org)
        return
      }
      if (org.owner_setup?.email_sent) {
        toast.success(`${owner.trim()} was emailed a link to set their password`)
      }
      finish(org)
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not create the organization')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && created) {
          finish(created)
          return
        }
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="me-2 size-4" />
          New organization
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {created?.owner_setup ? (
          <>
            <DialogHeader>
              <DialogTitle>{created.name} created</DialogTitle>
              <DialogDescription>
                An account was created for the owner, {owner.trim()}. They sign in after setting a
                password.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <SetupLinkResult outcome={created.owner_setup} email={owner.trim()} />
            </div>
            <DialogFooter>
              <Button onClick={() => finish(created)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>New organization</DialogTitle>
              <DialogDescription>
                The owner becomes the organization&apos;s first owner. If they have no account yet,
                one is created and they get a link to set their password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Name</Label>
                <Input
                  id="org-name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (!slugEdited) setSlug(slugify(e.target.value))
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Slug</Label>
                <Input
                  id="org-slug"
                  required
                  minLength={3}
                  maxLength={100}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Lowercase letters, digits and hyphens"
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true)
                    setSlug(e.target.value.toLowerCase())
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Used in URLs, including the SAML sign-in addresses.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-owner">Owner email</Label>
                <Input
                  id="org-owner"
                  type="email"
                  required
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  An existing account, or a new person (an account is created for them).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-owner-name">Owner name (optional)</Label>
                <Input
                  id="org-owner-name"
                  maxLength={255}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used only when a new account is created for the owner.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-description">Description (optional)</Label>
                <Textarea
                  id="org-description"
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="me-2 size-4 animate-spin" />}
                Create organization
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
