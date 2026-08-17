'use client'

/**
 * IOCs (Indicators of Compromise) management tab.
 *
 * Backed by /api/v1/iocs (list/create/get/delete — delete soft-deactivates,
 * no update endpoint). Read gated by threat_intel:read, create/delete by
 * threat_intel:write. The list endpoint has no server-side type/status filter
 * and returns no total, so both filters are applied client-side over the
 * fetched page; they live in the URL (?ioc_type=, ?ioc_status=) so a filtered
 * view is linkable.
 */

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Eye, Trash2, ShieldAlert, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  PageHeader,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  EmptyState,
  SheetBody,
  SheetDetailToolbar,
  SheetInfoRow,
} from '@/features/shared'
import { Can, Permission, usePermissions } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useUrlFilter } from '@/hooks/use-url-param'
import {
  useIOCs,
  useCreateIOC,
  useDeleteIOC,
  IOC_TYPES,
  IOC_TYPE_LABELS,
  IOC_SOURCES,
  IOC_SOURCE_LABELS,
  type IOC,
  type IOCType,
  type IOCSource,
  type CreateIOCInput,
} from '../api/use-iocs-api'

const ALL = 'all'

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

export function IOCsPanel() {
  const { can } = usePermissions()
  const canRead = can(Permission.ThreatIntelRead)

  const { data, error, isLoading, mutate } = useIOCs(canRead ? { limit: 200 } : undefined)
  const [typeFilter, setTypeFilter] = useUrlFilter('ioc_type', ALL)
  const [statusFilter, setStatusFilter] = useUrlFilter('ioc_status', ALL)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<IOC | null>(null)

  const iocs = useMemo(() => {
    let rows = data?.items ?? []
    if (typeFilter !== ALL) rows = rows.filter((i) => i.type === typeFilter)
    if (statusFilter !== ALL) {
      const wantActive = statusFilter === 'active'
      rows = rows.filter((i) => i.active === wantActive)
    }
    return rows
  }, [data, typeFilter, statusFilter])

  const selected = useMemo(
    () => (data?.items ?? []).find((i) => i.id === selectedId) ?? null,
    [data, selectedId]
  )

  const columns = useMemo<ColumnDef<IOC>[]>(
    () => [
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge variant="outline">{IOC_TYPE_LABELS[row.original.type] ?? row.original.type}</Badge>
        ),
      },
      {
        accessorKey: 'value',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Value" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs break-all">{row.original.value}</span>
        ),
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ row }) =>
          row.original.source ? (
            <Badge variant="secondary">
              {IOC_SOURCE_LABELS[row.original.source] ?? row.original.source}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: 'confidence',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Confidence" />,
        cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.confidence}%</span>,
      },
      {
        accessorKey: 'active',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.active ? 'default' : 'outline'}>
            {row.original.active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        accessorKey: 'last_seen_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last Seen" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.last_seen_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DataTableRowActions
            actions={[
              { label: 'View details', icon: Eye, onClick: () => setSelectedId(row.original.id) },
              {
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                separatorBefore: true,
                permission: Permission.ThreatIntelWrite,
                onClick: () => setDeleteTarget(row.original),
              },
            ]}
          />
        ),
      },
    ],
    []
  )

  if (!canRead) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No access to indicators"
        description="You need the View Threat Intel permission to see the IOC catalogue."
      />
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Indicators of Compromise"
        description="Tenant IOC catalogue correlated against runtime telemetry to auto-reopen findings."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {IOC_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {IOC_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Can permission={Permission.ThreatIntelWrite} mode="disable">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              Add IOC
            </Button>
          </Can>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={ShieldAlert}
          title="Failed to load indicators"
          description={getErrorMessage(error, 'Please try again.')}
        />
      ) : (
        <DataTable
          columns={columns}
          data={iocs}
          searchPlaceholder="Search indicators..."
          emptyMessage="No indicators"
          emptyDescription="Add an indicator of compromise to start correlating runtime telemetry."
          onRowClick={(row) => setSelectedId(row.id)}
        />
      )}

      <IOCDetailSheet
        ioc={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onDelete={(i) => {
          setSelectedId(null)
          setDeleteTarget(i)
        }}
      />

      <CreateIOCDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => mutate()} />

      <DeleteIOCConfirm
        ioc={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={() => {
          setDeleteTarget(null)
          mutate()
        }}
      />
    </div>
  )
}

// ── Detail sheet ────────────────────────────────────────────────────────────
function IOCDetailSheet({
  ioc,
  open,
  onOpenChange,
  onDelete,
}: {
  ioc: IOC | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (ioc: IOC) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="[&>button]:hidden w-full gap-0 p-0 sm:max-w-lg">
        {ioc && (
          <>
            <SheetDetailToolbar
              title={IOC_TYPE_LABELS[ioc.type] ?? ioc.type}
              onClose={() => onOpenChange(false)}
              extraActions={[{ label: 'Delete', icon: Trash2, onClick: () => onDelete(ioc) }]}
            />
            <SheetBody className="space-y-6 overflow-y-auto">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{IOC_TYPE_LABELS[ioc.type] ?? ioc.type}</Badge>
                <Badge variant={ioc.active ? 'default' : 'outline'}>
                  {ioc.active ? 'Active' : 'Inactive'}
                </Badge>
                {ioc.source && (
                  <Badge variant="secondary">{IOC_SOURCE_LABELS[ioc.source] ?? ioc.source}</Badge>
                )}
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Value</p>
                <p className="font-mono text-sm break-all">{ioc.value}</p>
              </div>

              <div className="space-y-1">
                <SheetInfoRow label="Confidence">{ioc.confidence}%</SheetInfoRow>
                <SheetInfoRow label="Normalized">
                  <span className="font-mono text-xs break-all">{ioc.normalized}</span>
                </SheetInfoRow>
                {ioc.source_finding_id && (
                  <SheetInfoRow label="Source finding">
                    <span className="font-mono text-xs">{ioc.source_finding_id}</span>
                  </SheetInfoRow>
                )}
                <SheetInfoRow label="First seen">{formatDate(ioc.first_seen_at)}</SheetInfoRow>
                <SheetInfoRow label="Last seen">{formatDate(ioc.last_seen_at)}</SheetInfoRow>
              </div>
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Create dialog ───────────────────────────────────────────────────────────
function CreateIOCDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const { trigger } = useCreateIOC()
  const [submitting, setSubmitting] = useState(false)
  const [type, setType] = useState<IOCType>('ip')
  const [value, setValue] = useState('')
  const [source, setSource] = useState<IOCSource>('manual')
  const [confidence, setConfidence] = useState('75')

  const reset = () => {
    setType('ip')
    setValue('')
    setSource('manual')
    setConfidence('75')
  }

  const handleSubmit = async () => {
    if (!value.trim()) {
      toast.error('Value is required')
      return
    }
    const conf = Number(confidence)
    if (Number.isNaN(conf) || conf < 0 || conf > 100) {
      toast.error('Confidence must be between 0 and 100')
      return
    }
    const payload: CreateIOCInput = {
      type,
      value: value.trim(),
      source,
      confidence: conf,
    }
    setSubmitting(true)
    try {
      await trigger(payload)
      toast.success('Indicator added')
      reset()
      onOpenChange(false)
      onCreated()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add indicator'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Indicator</DialogTitle>
          <DialogDescription>
            Add an IOC to correlate against runtime telemetry. The value must match the selected
            type&apos;s format.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ioc-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as IOCType)}>
              <SelectTrigger id="ioc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {IOC_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ioc-value">Value *</Label>
            <Input
              id="ioc-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 203.0.113.10"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ioc-source">Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as IOCSource)}>
                <SelectTrigger id="ioc-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IOC_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {IOC_SOURCE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ioc-confidence">Confidence (0-100)</Label>
              <Input
                id="ioc-confidence"
                type="number"
                min={0}
                max={100}
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Add IOC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirm ──────────────────────────────────────────────────────────
function DeleteIOCConfirm({
  ioc,
  onOpenChange,
  onDeleted,
}: {
  ioc: IOC | null
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const { trigger } = useDeleteIOC(ioc?.id ?? '')
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    if (!ioc) return
    setDeleting(true)
    try {
      await trigger()
      toast.success('Indicator deleted')
      onDeleted()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete indicator'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ConfirmDialog
      open={!!ioc}
      onOpenChange={onOpenChange}
      title="Delete indicator?"
      desc={
        ioc
          ? `"${ioc.value}" will be deactivated. Match history is preserved for the audit trail.`
          : ''
      }
      confirmText={deleting ? 'Deleting...' : 'Delete'}
      destructive
      handleConfirm={handleConfirm}
    />
  )
}
