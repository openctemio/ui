'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

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
import { getErrorMessage } from '@/lib/api/error-handler'
import { useAddVerifiedDomain } from '../api/use-verified-domains'
import type { VerifiedDomain } from '../types/verified-domain.types'
import { DnsInstructions } from './dns-instructions'

/**
 * Add-domain dialog. Phase 1 collects the domain; on a successful create it
 * switches to phase 2 and shows the DNS TXT record to publish. Closing the
 * dialog triggers `onAdded` so the parent can revalidate the list.
 */
export function AddDomainDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [domain, setDomain] = useState('')
  const [created, setCreated] = useState<VerifiedDomain | null>(null)
  const { trigger: add, isMutating } = useAddVerifiedDomain()

  const reset = () => {
    setDomain('')
    setCreated(null)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      // If a domain was created during this session, refresh the list on close.
      if (created) onAdded()
      reset()
    }
  }

  const handleSubmit = async () => {
    const trimmed = domain.trim().toLowerCase()
    if (!trimmed) return
    try {
      const result = await add({ domain: trimmed })
      setCreated(result)
      onAdded()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to add domain'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="me-1.5 h-4 w-4" />
          Add domain
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Verify {created.domain}</DialogTitle>
              <DialogDescription>
                Publish this DNS TXT record to prove you own the domain, then verify it.
              </DialogDescription>
            </DialogHeader>
            {created.instructions ? (
              <DnsInstructions instructions={created.instructions} />
            ) : (
              <p className="text-muted-foreground text-sm">
                No verification record was returned. Reopen the domain from the list to retry.
              </p>
            )}
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add a verified domain</DialogTitle>
              <DialogDescription>
                Enter a domain you own. Shared/consumer domains (like gmail.com) cannot be verified.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleSubmit()
              }}
              className="space-y-2"
            >
              <Label htmlFor="verified-domain-input">Domain</Label>
              <Input
                id="verified-domain-input"
                value={domain}
                autoFocus
                placeholder="acme.com"
                onChange={(e) => setDomain(e.target.value)}
              />
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isMutating || !domain.trim()}>
                {isMutating ? 'Adding…' : 'Add'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
