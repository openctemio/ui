'use client'

import { useState, useCallback, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import {
  Plus,
  MoreHorizontal,
  Check,
  X,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared/components/page-header'
import { MetricStrip, type MetricStripItem } from '@/features/shared/components/metric-strip'
import { DataTable } from '@/features/shared/components/data-table/data-table'
import { DataTableColumnHeader } from '@/features/shared/components/data-table/data-table-column-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import { useUrlFilter } from '@/hooks/use-url-param'
import { getErrorMessage } from '@/lib/api/error-handler'
import { Can, Permission } from '@/lib/permissions'

import {
  useSuppressions,
  useApproveSuppression,
  useRejectSuppression,
  useDeleteSuppression,
  SuppressionFormDialog,
  SuppressionDetailSheet,
  SUPPRESSION_STATUS_BADGE,
  SUPPRESSION_STATUS_LABELS,
  SUPPRESSION_TYPE_BADGE,
  SUPPRESSION_TYPE_LABELS,
  suppressionScopeSummary,
  type SuppressionRule,
  type SuppressionStatus,
} from '@/features/exceptions'

// Approve action accent in the row menu. There is no success token, so the
// palette-drift gate is told to allow it here.
const MENU_APPROVE_ICON = 'text-emerald-500' // palette-ok: approve = success accent

function relative(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return formatDistanceToNow(d, { addSuffix: true })
}

type TabValue = 'all' | SuppressionStatus

function TableSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-72" />
      <div className="space-y-px overflow-hidden rounded-xl border">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-none" />
        ))}
      </div>
    </div>
  )
}

const STATUS_VALUES: TabValue[] = ['all', 'pending', 'approved', 'rejected', 'expired']

export default function ExceptionsPage() {
  // The status filter lives in the URL so a filtered view survives reload and
  // can be shared (e.g. a link straight to the pending-approval queue).
  const [statusParam, setStatusParam] = useUrlFilter('status', 'all')
  const activeTab: TabValue = (STATUS_VALUES as string[]).includes(statusParam)
    ? (statusParam as TabValue)
    : 'all'
  const toggleStatus = (status: TabValue) =>
    setStatusParam(activeTab === status || status === 'all' ? 'all' : status)

  const { data, isLoading, error, mutate } = useSuppressions()

  // Selection + dialog state
  const [selectedRule, setSelectedRule] = useState<SuppressionRule | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editRule, setEditRule] = useState<SuppressionRule | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // Mutation hooks bound to the currently-selected rule
  const { trigger: triggerApprove, isMutating: isApproving } = useApproveSuppression(
    selectedRule?.id ?? ''
  )
  const { trigger: triggerReject, isMutating: isRejecting } = useRejectSuppression(
    selectedRule?.id ?? ''
  )
  const { trigger: triggerDelete, isMutating: isDeleting } = useDeleteSuppression(
    selectedRule?.id ?? ''
  )

  const allRules = useMemo(() => data?.data ?? [], [data?.data])

  const counts = useMemo(() => {
    const result = { all: 0, pending: 0, approved: 0, rejected: 0, expired: 0 }
    for (const r of allRules) {
      result.all++
      if (r.status in result) result[r.status as keyof typeof result]++
    }
    return result
  }, [allRules])

  const filteredRules = useMemo(() => {
    if (activeTab === 'all') return allRules
    return allRules.filter((r) => r.status === activeTab)
  }, [allRules, activeTab])

  const isInitialLoading = isLoading && !data

  // ── Action openers ────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setEditRule(null)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((rule: SuppressionRule) => {
    setDetailOpen(false)
    setEditRule(rule)
    setFormOpen(true)
  }, [])

  const openApprove = useCallback((rule: SuppressionRule) => {
    setSelectedRule(rule)
    setApproveOpen(true)
  }, [])

  const openReject = useCallback((rule: SuppressionRule) => {
    setSelectedRule(rule)
    setRejectionReason('')
    setRejectOpen(true)
  }, [])

  const openDelete = useCallback((rule: SuppressionRule) => {
    setSelectedRule(rule)
    setDeleteOpen(true)
  }, [])

  const openDetail = useCallback((rule: SuppressionRule) => {
    setSelectedRule(rule)
    setDetailOpen(true)
  }, [])

  // ── Action confirmers ─────────────────────────────────────────────
  const confirmApprove = async () => {
    if (!selectedRule) return
    try {
      await triggerApprove()
      toast.success('Suppression rule approved')
      setDetailOpen(false)
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to approve rule'))
    } finally {
      setApproveOpen(false)
    }
  }

  const confirmReject = async () => {
    if (!selectedRule || !rejectionReason.trim()) return
    try {
      await triggerReject({ reason: rejectionReason.trim() })
      toast.success('Suppression rule rejected')
      setDetailOpen(false)
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reject rule'))
    } finally {
      setRejectOpen(false)
    }
  }

  const confirmDelete = async () => {
    if (!selectedRule) return
    try {
      await triggerDelete()
      toast.success('Suppression rule deleted')
      setDetailOpen(false)
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete rule'))
    } finally {
      setDeleteOpen(false)
    }
  }

  const handleRefresh = async () => {
    await mutate()
    toast.success('Suppressions refreshed')
  }

  // ── Columns ───────────────────────────────────────────────────────
  const columns: ColumnDef<SuppressionRule>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div className="max-w-[240px]">
            <p className="font-medium text-sm truncate">{row.original.name}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {suppressionScopeSummary(row.original)}
            </p>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'suppression_type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => {
          const t = row.original.suppression_type
          return (
            <Badge variant="outline" className={cn('text-xs', SUPPRESSION_TYPE_BADGE[t])}>
              {SUPPRESSION_TYPE_LABELS[t]}
            </Badge>
          )
        },
        enableSorting: true,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const s = row.original.status
          return (
            <Badge variant="outline" className={cn('text-xs', SUPPRESSION_STATUS_BADGE[s])}>
              {SUPPRESSION_STATUS_LABELS[s]}
            </Badge>
          )
        },
        enableSorting: true,
      },
      {
        accessorKey: 'requested_by',
        header: () => <span className="whitespace-nowrap">Requested by</span>,
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground">
            {row.original.requested_by.slice(0, 8)}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'expires_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Expires" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {row.original.expires_at ? relative(row.original.expires_at) : 'Never'}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {relative(row.original.created_at)}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
          const rule = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {rule.status === 'pending' && (
                  <Can permission={Permission.SuppressionsApprove}>
                    <DropdownMenuItem onClick={() => openApprove(rule)}>
                      <Check className={cn('me-2 h-4 w-4', MENU_APPROVE_ICON)} />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openReject(rule)}>
                      <X className="me-2 h-4 w-4 text-destructive" />
                      Reject
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </Can>
                )}
                <Can permission={Permission.SuppressionsWrite}>
                  <DropdownMenuItem onClick={() => openEdit(rule)}>
                    <Pencil className="me-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </Can>
                <Can permission={Permission.SuppressionsDelete}>
                  <DropdownMenuItem className="text-destructive" onClick={() => openDelete(rule)}>
                    <Trash2 className="me-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </Can>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [openApprove, openReject, openEdit, openDelete]
  )

  const metrics: MetricStripItem[] = [
    {
      key: 'pending',
      label: 'Pending approval',
      value: counts.pending,
      onClick: () => toggleStatus('pending'),
      active: activeTab === 'pending',
    },
    {
      key: 'approved',
      label: 'Approved',
      value: counts.approved,
      onClick: () => toggleStatus('approved'),
      active: activeTab === 'approved',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: counts.rejected,
      onClick: () => toggleStatus('rejected'),
      active: activeTab === 'rejected',
    },
    {
      key: 'expired',
      label: 'Expired',
      value: counts.expired,
      onClick: () => toggleStatus('expired'),
      active: activeTab === 'expired',
    },
    {
      key: 'all',
      label: 'All rules',
      value: counts.all,
      onClick: () => toggleStatus('all'),
      active: activeTab === 'all',
    },
  ]

  return (
    <>
      <Main>
        <PageHeader
          title="Exceptions"
          description="Suppression rules that hide false positives and accepted risks, with an approval step."
        >
          <Can permission={Permission.SuppressionsWrite}>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 sm:me-2" />
              <span className="hidden sm:inline">New rule</span>
            </Button>
          </Can>
        </PageHeader>

        <MetricStrip className="mt-5" loading={isInitialLoading} items={metrics} />

        <div className="mt-5">
          {error && !isLoading ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load suppression rules</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>{error?.message || 'An unexpected error occurred'}</span>
                <Button variant="outline" size="sm" onClick={() => mutate()}>
                  <RefreshCw className="me-2 h-4 w-4" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : isInitialLoading ? (
            <TableSkeleton />
          ) : (
            <DataTable
              columns={columns}
              data={filteredRules}
              searchPlaceholder="Search by name..."
              searchKey="name"
              showColumnToggle={false}
              onRowClick={openDetail}
              toolbarEnd={
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  aria-label="Refresh"
                  title="Refresh"
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                </Button>
              }
              emptyMessage="No suppression rules"
              emptyDescription={
                activeTab === 'all'
                  ? 'Create a rule to suppress false positives or accepted risks.'
                  : `No ${activeTab} suppression rules.`
              }
              pageSize={20}
            />
          )}
        </div>
      </Main>

      {/* Detail sheet */}
      <SuppressionDetailSheet
        rule={selectedRule}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
        onApprove={openApprove}
        onReject={openReject}
        onDelete={openDelete}
      />

      {/* Create / edit dialog */}
      <SuppressionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        rule={editRule}
        onSuccess={() => mutate()}
      />

      {/* Approve confirm */}
      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve suppression rule"
        desc={
          selectedRule
            ? `Approve "${selectedRule.name}"? Matching findings will be suppressed while this rule is active.`
            : ''
        }
        confirmText={
          isApproving ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              Approving...
            </>
          ) : (
            'Approve'
          )
        }
        isLoading={isApproving}
        handleConfirm={confirmApprove}
      />

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject suppression rule</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this rule.</DialogDescription>
          </DialogHeader>
          {selectedRule && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm font-medium">{selectedRule.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {suppressionScopeSummary(selectedRule)}
              </p>
            </div>
          )}
          <div className="grid gap-2">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-end">{rejectionReason.length}/2000</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={isRejecting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete suppression rule"
        desc={selectedRule ? `Delete "${selectedRule.name}"? This cannot be undone.` : ''}
        destructive
        cancelBtnText="Keep rule"
        confirmText={
          isDeleting ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            'Delete'
          )
        }
        isLoading={isDeleting}
        handleConfirm={confirmDelete}
      />
    </>
  )
}
