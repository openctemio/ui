'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Clock,
  MoreHorizontal,
  Check,
  X,
  Ban,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { APPROVAL_STATUS_CONFIG, FINDING_STATUS_CONFIG } from '@/features/findings/types'

// ============================================
// STATUS BADGE STYLES
// ============================================

const APPROVAL_BADGE_STYLES: Record<ApprovalStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  approved: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
  canceled: 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30',
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true })
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function getRequestedStatusLabel(status: string): string {
  const config = FINDING_STATUS_CONFIG[status as keyof typeof FINDING_STATUS_CONFIG]
  return config?.label ?? status
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ApprovalsPage() {
  const [page, setPage] = useState(1)
  const perPage = 20

  // Action state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<ApiApproval | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  // Fetch approvals
  const { data, isLoading, error, mutate } = usePendingApprovals(page, perPage)

  // Action hooks - use selectedApproval id
  const { trigger: triggerApprove, isMutating: isApproving } = useApproveStatus(
    selectedApproval?.id ?? ''
  )
  const { trigger: triggerReject, isMutating: isRejecting } = useRejectApproval(
    selectedApproval?.id ?? ''
  )
  const { trigger: triggerCancel, isMutating: isCancelling } = useCancelApproval(
    selectedApproval?.id ?? ''
  )

  const approvals = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))

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
      toast.success('Approval request approved successfully')
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

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      <Main>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Approval Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and manage finding status change requests that require approval.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Failed to load approval requests. Please try again.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => mutate()}>
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && approvals.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">No pending approvals</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              There are no approval requests to review at this time.
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && approvals.length > 0 && (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Finding</TableHead>
                    <TableHead>Requested Status</TableHead>
                    <TableHead>Justification</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[70px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.map((approval) => (
                    <TableRow key={approval.id}>
                      {/* Status Badge */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(APPROVAL_BADGE_STYLES[approval.status])}
                        >
                          {APPROVAL_STATUS_CONFIG[approval.status]?.label ?? approval.status}
                        </Badge>
                      </TableCell>

                      {/* Finding ID (truncated, as link) */}
                      <TableCell>
                        <Link
                          href={`/findings/${approval.finding_id}`}
                          className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {truncate(approval.finding_id, 12)}
                        </Link>
                      </TableCell>

                      {/* Requested Status */}
                      <TableCell>
                        <span className="text-sm font-medium">
                          {getRequestedStatusLabel(approval.requested_status)}
                        </span>
                      </TableCell>

                      {/* Justification */}
                      <TableCell>
                        <span
                          className="text-sm text-muted-foreground"
                          title={approval.justification}
                        >
                          {truncate(approval.justification, 80)}
                        </span>
                      </TableCell>

                      {/* Created */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(approval.created_at)}
                        </span>
                      </TableCell>

                      {/* Expires */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {approval.expires_at ? formatDate(approval.expires_at) : '-'}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        {approval.status === 'pending' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
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
                                  <Check className="mr-2 h-4 w-4" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRejectClick(approval)}>
                                  <X className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              </PermissionGate>
                              <DropdownMenuItem onClick={() => handleCancelClick(approval)}>
                                <Ban className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({total} total)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Approve Confirmation Dialog */}
        <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Status Change</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this status change?
                {selectedApproval && (
                  <span className="mt-2 block">
                    The finding will be changed to{' '}
                    <strong>{getRequestedStatusLabel(selectedApproval.requested_status)}</strong>.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
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
              <DialogTitle>Reject Approval Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this approval request.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Textarea
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                {rejectionReason.length}/2000 characters
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
              <AlertDialogTitle>Cancel Approval Request</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this approval request? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancelling}>Keep Request</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelConfirm}
                disabled={isCancelling}
                className="bg-red-500 hover:bg-red-600"
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
      </Main>
    </>
  )
}
