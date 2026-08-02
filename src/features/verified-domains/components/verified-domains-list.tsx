'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, RefreshCw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RelativeTime } from '@/features/shared/components/relative-time'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useDeleteVerifiedDomain, useVerifyDomain } from '../api/use-verified-domains'
import type { VerifiedDomain } from '../types/verified-domain.types'
import { DnsInstructions } from './dns-instructions'
import { VerifiedDomainStatusBadge } from './verified-domain-status-badge'

function DomainRow({ domain, onChanged }: { domain: VerifiedDomain; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { trigger: verify, isMutating: isVerifying } = useVerifyDomain()
  const { trigger: remove, isMutating: isDeleting } = useDeleteVerifiedDomain()

  const hasInstructions = domain.status !== 'verified' && !!domain.instructions

  const handleVerify = async () => {
    try {
      const updated = await verify(domain.id)
      onChanged()
      if (updated.status === 'verified') {
        toast.success(`${domain.domain} verified`)
      } else {
        toast.info(`Still pending — the TXT record for ${domain.domain} was not found yet.`)
        setExpanded(true)
      }
    } catch (e) {
      toast.error(getErrorMessage(e, 'Verification failed'))
    }
  }

  const handleDelete = async () => {
    try {
      await remove(domain.id)
      toast.success(`${domain.domain} removed`)
      setConfirmOpen(false)
      onChanged()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to remove domain'))
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {hasInstructions ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={expanded ? 'Hide DNS record' : 'Show DNS record'}
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
              >
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
                />
              </Button>
            ) : (
              <span className="w-9" aria-hidden />
            )}
            <div>
              <p className="font-medium">{domain.domain}</p>
              <p className="text-muted-foreground text-xs">
                {domain.status === 'verified' && domain.verified_at ? (
                  <>
                    Verified <RelativeTime date={domain.verified_at} className="text-xs" />
                  </>
                ) : domain.last_checked_at ? (
                  <>
                    Last checked <RelativeTime date={domain.last_checked_at} className="text-xs" />
                  </>
                ) : (
                  <>
                    Added <RelativeTime date={domain.created_at} className="text-xs" />
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <VerifiedDomainStatusBadge status={domain.status} />
            {domain.status !== 'verified' && (
              <Button size="sm" variant="outline" onClick={handleVerify} disabled={isVerifying}>
                <RefreshCw className={cn('me-1.5 h-3.5 w-3.5', isVerifying && 'animate-spin')} />
                {isVerifying ? 'Checking…' : 'Verify now'}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Remove ${domain.domain}`}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {expanded && domain.instructions && <DnsInstructions instructions={domain.instructions} />}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        title={`Remove ${domain.domain}?`}
        desc="This domain will no longer gate SSO auto-join. You can add and re-verify it again later."
        confirmText="Remove"
        isLoading={isDeleting}
        handleConfirm={handleDelete}
      />
    </Card>
  )
}

export function VerifiedDomainsList({
  domains,
  onChanged,
}: {
  domains: VerifiedDomain[]
  onChanged: () => void
}) {
  return (
    <div className="space-y-3">
      {domains.map((domain) => (
        <DomainRow key={domain.id} domain={domain} onChanged={onChanged} />
      ))}
    </div>
  )
}
