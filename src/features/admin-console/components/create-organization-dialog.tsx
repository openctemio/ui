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
import { createOrganization } from '../api/use-admin-organizations'
import { AdminApiError } from '../api/admin-client'
import type { AdminOrganization } from '../types'

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
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setSlug('')
    setSlugEdited(false)
    setOwner('')
    setDescription('')
    setError(null)
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
        description: description.trim() || undefined,
      })
      toast.success(`${org.name} created`)
      setOpen(false)
      reset()
      onCreated(org)
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
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New organization</DialogTitle>
            <DialogDescription>
              The owner must already have an account. They become the organization&apos;s owner.
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
      </DialogContent>
    </Dialog>
  )
}
