'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { FileText, RefreshCw, Trash2 } from 'lucide-react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/features/shared/components/data-table'
import { DataTableRowActions } from '@/features/shared/components/data-table-row-actions'
import { RelativeTime } from '@/features/shared/components/relative-time'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useDeleteVerifiedDomain, useVerifyDomain } from '../api/use-verified-domains'
import type { VerifiedDomain } from '../types/verified-domain.types'
import { DnsInstructions } from './dns-instructions'
import { VerifiedDomainStatusBadge } from './verified-domain-status-badge'

function DomainActions({ domain, onChanged }: { domain: VerifiedDomain; onChanged: () => void }) {
  const [dnsOpen, setDnsOpen] = useState(false)
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
        if (domain.instructions) setDnsOpen(true)
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
    <>
      <DataTableRowActions
        actions={[
          ...(hasInstructions
            ? [{ label: 'Show DNS record', icon: FileText, onClick: () => setDnsOpen(true) }]
            : []),
          ...(domain.status !== 'verified'
            ? [
                {
                  label: isVerifying ? 'Checking…' : 'Verify now',
                  icon: RefreshCw,
                  onClick: () => void handleVerify(),
                  disabled: isVerifying,
                },
              ]
            : []),
          {
            label: 'Remove',
            icon: Trash2,
            onClick: () => setConfirmOpen(true),
            destructive: true,
            separatorBefore: true,
          },
        ]}
      />

      {domain.instructions && (
        <Dialog open={dnsOpen} onOpenChange={setDnsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>DNS record for {domain.domain}</DialogTitle>
              <DialogDescription>
                Publish this TXT record, then choose Verify now.
              </DialogDescription>
            </DialogHeader>
            <DnsInstructions instructions={domain.instructions} />
          </DialogContent>
        </Dialog>
      )}

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
    </>
  )
}

function lastActivity(domain: VerifiedDomain): { label: string; date: string } {
  if (domain.status === 'verified' && domain.verified_at) {
    return { label: 'Verified', date: domain.verified_at }
  }
  if (domain.last_checked_at) return { label: 'Last checked', date: domain.last_checked_at }
  return { label: 'Added', date: domain.created_at }
}

export function VerifiedDomainsList({
  domains,
  onChanged,
}: {
  domains: VerifiedDomain[]
  onChanged: () => void
}) {
  const columns: ColumnDef<VerifiedDomain>[] = [
    {
      accessorKey: 'domain',
      header: 'Domain',
      cell: ({ row }) => <span className="font-medium">{row.original.domain}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <VerifiedDomainStatusBadge status={row.original.status} />,
    },
    {
      id: 'activity',
      header: 'Last activity',
      accessorFn: (d) => lastActivity(d).date,
      cell: ({ row }) => {
        const { label, date } = lastActivity(row.original)
        return (
          <span className="text-sm text-muted-foreground">
            {label} <RelativeTime date={date} />
          </span>
        )
      },
    },
    {
      id: 'actions',
      enableSorting: false,
      cell: ({ row }) => <DomainActions domain={row.original} onChanged={onChanged} />,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={domains}
      getRowId={(d) => d.id}
      searchPlaceholder="Search domains..."
      showSelectionCount={false}
    />
  )
}
