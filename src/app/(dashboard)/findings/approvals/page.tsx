'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { type ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import {
  Clock,
  MoreHorizontal,
  Check,
  X,
  Ban,
  Loader2,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared/components/page-header'
import { DataTable } from '@/features/shared/components/data-table/data-table'
import { DataTableColumnHeader } from '@/features/shared/components/data-table/data-table-column-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api/error-handler'
import { PermissionGate } from '@/components/permission-gate'
import { Permission } from '@/lib/permissions'

import {
  usePendingApprovals,
  useApproveStatus,
  useRejectApproval,
  useCancelApproval,
} from '@/features/findings/api/use-findings-api'
import type { ApiApproval, ApprovalStatus } from '@/features/findings/types'
import { FINDING_STATUS_CONFIG } from '@/features/findings/types'

// ============================================
// CONSTANTS
// ============================================

const APPROVAL_BADGE_STYLES: Record<ApprovalStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  approved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  canceled: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
}

const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  canceled: 'Canceled',
}

// ============================================
// HELPERS
// ============================================

function formatDate(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true })
}

function getRequestedStatusLabel(status: string): string {
  const config = FINDING_STATUS_CONFIG[status as keyof typeof FINDING_STATUS_CONFIG]
  return config?.label ?? status
}

// ============================================
// LOADING SKELETON
// ============================================

function ApprovalsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardHeader>
          </Card>
        ))}
      </div>
      {/* Table skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<string>('all')

  // Action state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<ApiApproval | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  // Fetch all approvals once, filter client-side by tab
  const { data, isLoading, error, mutate } = usePendingApprovals(1, 500)

  // Action hooks
  const { trigger: triggerApprove, isMutating: isApproving } = useApproveStatus(
    selectedApproval?.id ?? ''
  )
  const { trigger: triggerReject, isMutating: isRejecting } = useRejectApproval(
    selectedApproval?.id ?? ''
  )
  const { trigger: triggerCancel, isMutating: isCancelling } = useCancelApproval(
    selectedApproval?.id ?? ''
  )

  const allApprovals = useMemo(() => data?.data ?? [], [data?.data])

  // Compute counts from single fetch
  const counts = useMemo(() => {
    const result = { all: 0, pending: 0, approved: 0, rejected: 0, canceled: 0 }
    for (const a of allApprovals) {
      result.all++
      if (a.status in result) result[a.status as keyof typeof result]++
    }
    return result
  }, [allApprovals])

  // Filter by active tab
  const filteredApprovals = useMemo(() => {
    if (activeTab === 'all') return allApprovals
    return allApprovals.filter((a) => a.status === activeTab)
  }, [allApprovals, activeTab])

  const isInitialLoading = isLoading && !data

  // ============================================
  // ACTION HANDLERS
  // ============================================

  const handleApproveClick = useCallback((approval: ApiApproval) => {
    setSelectedApproval(approval)
    setApproveDialogOpen(true)
  }, [])

  const handleRejectClick = useCallback((approval: ApiApproval) => {
    setSelectedApproval(approval)
    setRejectionReason('')
    setRejectDialogOpen(true)
  }, [])

  const handleCancelClick = useCallback((approval: ApiApproval) => {
    setSelectedApproval(approval)
    setCancelDialogOpen(true)
  }, [])

  const handleApproveConfirm = async () => {
    if (!selectedApproval || actionInProgress) return
    setActionInProgress(selectedApproval.id)
    try {
      await triggerApprove()
      toast.success('Approval request approved', {
        description: `Finding status will be changed to ${getRequestedStatusLabel(selectedApproval.requested_status)}`,
      })
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to approve request'))
    } finally {
      setActionInProgress(null)
      setSelectedApproval(null)
      setApproveDialogOpen(false)
    }
  }

  const handleRejectConfirm = async () => {
    if (!selectedApproval || actionInProgress || !rejectionReason.trim()) return
    setActionInProgress(selectedApproval.id)
    try {
      await triggerReject({ reason: rejectionReason.trim() })
      toast.success('Approval request rejected')
      setRejectionReason('')
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reject request'))
    } finally {
      setActionInProgress(null)
      setSelectedApproval(null)
      setRejectDialogOpen(false)
    }
  }

  const handleCancelConfirm = async () => {
    if (!selectedApproval || actionInProgress) return
    setActionInProgress(selectedApproval.id)
    try {
      await triggerCancel()
      toast.success('Approval request canceled')
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to cancel request'))
    } finally {
      setActionInProgress(null)
      setSelectedApproval(null)
      setCancelDialogOpen(false)
    }
  }

  const handleRefresh = async () => {
    await mutate()
    toast.success('Approvals refreshed')
  }

  // ============================================
  // TABLE COLUMNS
  // ============================================

  const columns: ColumnDef<ApiApproval>[] = useMemo(
    () => [
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const status = row.getValue('status') as ApprovalStatus
          return (
            <Badge variant="outline" className={cn('text-xs', APPROVAL_BADGE_STYLES[status])}>
              {APPROVAL_STATUS_LABELS[status] ?? status}
            </Badge>
          )
        },
        enableSorting: true,
      },
      {
        accessorKey: 'finding_id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Finding" />,
        cell: ({ row }) => {
          const findingId = row.getValue('finding_id') as string
          return (
            <Link
              href={`/findings/${findingId}`}
              className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              {findingId.slice(0, 8)}...
            </Link>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: 'requested_status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Requested Status" />,
        cell: ({ row }) => {
          const status = row.getValue('requested_status') as string
          const config = FINDING_STATUS_CONFIG[status as keyof typeof FINDING_STATUS_CONFIG]
          return (
            <Badge
              variant="outline"
              className={cn('text-xs', config?.bgColor, config?.textColor, config?.color)}
            >
              {getRequestedStatusLabel(status)}
            </Badge>
          )
        },
        enableSorting: true,
      },
      {
        accessorKey: 'justification',
        header: 'Justification',
        cell: ({ row }) => {
          const text = row.getValue('justification') as string
          return (
            <span className="text-sm text-muted-foreground line-clamp-2 max-w-[300px]" title={text}>
              {text}
            </span>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm whitespace-nowrap">
            {formatDate(row.getValue('created_at'))}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'expires_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Expires" />,
        cell: ({ row }) => {
          const expires = row.getValue('expires_at') as string | undefined
          return (
            <span className="text-muted-foreground text-sm whitespace-nowrap">
              {expires ? formatDate(expires) : '-'}
            </span>
          )
        },
        enableSorting: true,
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
          const approval = row.original
          if (approval.status !== 'pending') return null
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  disabled={actionInProgress === approval.id}
                >
                  {actionInProgress === approval.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <PermissionGate permission={Permission.FindingsApprove}>
                  <DropdownMenuItem onClick={() => handleApproveClick(approval)}>
                    <Check className="mr-2 h-4 w-4 text-emerald-500" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRejectClick(approval)}>
                    <X className="mr-2 h-4 w-4 text-red-500" />
                    Reject
                  </DropdownMenuItem>
                </PermissionGate>
                <DropdownMenuItem onClick={() => handleCancelClick(approval)}>
                  <Ban className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [actionInProgress, handleApproveClick, handleRejectClick, handleCancelClick]
  )

  // ============================================
  // ERROR STATE (full page, like findings page)
  // ============================================

  if (error && !isLoading) {
    return (
      <Main>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Failed to load approvals</h2>
          <p className="text-muted-foreground mb-4">
            {error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={() => mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </Main>
    )
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      <Main>
        {/* Back link */}
        <div className="mb-2">
          <Link
            href="/findings"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Findings
          </Link>
        </div>

        <PageHeader
          title="Approval Requests"
          description={
            isInitialLoading
              ? 'Loading approvals...'
              : `${counts.all} total requests - ${counts.pending} pending review`
          }
        >
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </PageHeader>

        {isInitialLoading ? (
          <div className="mt-6">
            <ApprovalsLoadingSkeleton />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
              <Card className={counts.pending > 0 ? 'border-yellow-500/30' : ''}>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Pending
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl text-yellow-500">
                    {counts.pending}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approved
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl text-emerald-500">
                    {counts.approved}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5" />
                    Rejected
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl text-red-500">
                    {counts.rejected}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total</CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl">{counts.all}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Tabs + DataTable */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              {/* Scroll container with fade indicator on mobile */}
              <div className="relative sm:static">
                <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                  <TabsList className="h-auto w-max">
                    <TabsTrigger value="all" className="text-xs sm:text-sm shrink-0">
                      All ({counts.all})
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs sm:text-sm shrink-0">
                      Pending ({counts.pending})
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="text-xs sm:text-sm shrink-0">
                      Approved ({counts.approved})
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="text-xs sm:text-sm shrink-0">
                      Rejected ({counts.rejected})
                    </TabsTrigger>
                    <TabsTrigger value="canceled" className="text-xs sm:text-sm shrink-0">
                      Canceled ({counts.canceled})
                    </TabsTrigger>
                  </TabsList>
                </div>
                {/* Fade indicator for scrollable tabs on mobile */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
              </div>

              <TabsContent value={activeTab}>
                <Card className="mt-4">
                  <CardContent className="pt-6">
                    <DataTable
                      columns={columns}
                      data={filteredApprovals}
                      searchPlaceholder="Search by justification..."
                      searchKey="justification"
                      showColumnToggle={false}
                      emptyMessage="No approval requests"
                      emptyDescription={
                        activeTab === 'all'
                          ? 'There are no approval requests to review at this time.'
                          : `No ${activeTab} approval requests found.`
                      }
                      pageSize={20}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </Main>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this request?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedApproval && (
            <div className="rounded-lg border bg-muted/50 p-3 my-2">
              <p className="font-medium">
                Change to{' '}
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs ml-1',
                    FINDING_STATUS_CONFIG[
                      selectedApproval.requested_status as keyof typeof FINDING_STATUS_CONFIG
                    ]?.bgColor,
                    FINDING_STATUS_CONFIG[
                      selectedApproval.requested_status as keyof typeof FINDING_STATUS_CONFIG
                    ]?.textColor
                  )}
                >
                  {getRequestedStatusLabel(selectedApproval.requested_status)}
                </Badge>
              </p>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {selectedApproval.justification}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveConfirm} disabled={isApproving}>
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this request.</DialogDescription>
          </DialogHeader>
          {selectedApproval && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm font-medium">
                {getRequestedStatusLabel(selectedApproval.requested_status)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {selectedApproval.justification}
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
            <p className="text-xs text-muted-foreground text-right">
              {rejectionReason.length}/2000
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this approval request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Canceling...
                </>
              ) : (
                'Cancel Request'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
