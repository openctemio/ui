'use client'

import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft,
  RefreshCw,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RotateCcw,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Main } from '@/components/layout'
import { ErrorState, DataTable, PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getErrorMessage } from '@/lib/api/error-handler'
import { Can, Permission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

import {
  useNotificationOutboxApi,
  useNotificationOutboxStatsApi,
  useRetryOutboxEntryApi,
  useDeleteOutboxEntryApi,
  invalidateNotificationOutboxCache,
  invalidateNotificationOutboxStatsCache,
} from '@/features/notifications/api/use-notification-outbox-api'
import {
  type OutboxEntry,
  type OutboxStatus,
  OUTBOX_STATUS_CONFIG,
  OUTBOX_SEVERITY_CONFIG,
} from '@/features/notifications/types/notification-outbox.types'

// Status icon mapping
const STATUS_ICONS: Record<OutboxStatus, React.ElementType> = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  dead: AlertTriangle,
}

// Queue Health Status component
function QueueHealthStatus({
  stats,
  isLoading,
  onViewFailed,
}: {
  stats: { pending: number; processing: number; failed: number; dead: number }
  isLoading: boolean
  onViewFailed: () => void
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <Skeleton className="h-6 w-48" />
      </div>
    )
  }

  const hasIssues = stats.failed > 0 || stats.dead > 0
  const hasPending = stats.pending > 0 || stats.processing > 0
  const isHealthy = !hasIssues && !hasPending

  if (isHealthy) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">Queue is healthy</p>
            <p className="text-sm text-green-600 dark:text-green-400">
              All notifications are being delivered normally
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Build status parts
  const parts: string[] = []
  if (stats.pending > 0) parts.push(`${stats.pending} pending`)
  if (stats.processing > 0) parts.push(`${stats.processing} processing`)
  if (stats.failed > 0) parts.push(`${stats.failed} failed`)
  if (stats.dead > 0) parts.push(`${stats.dead} dead`)

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        hasIssues
          ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
          : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {hasIssues ? (
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          ) : (
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          )}
          <div>
            <p
              className={cn(
                'font-medium',
                hasIssues
                  ? 'text-amber-800 dark:text-amber-200'
                  : 'text-blue-800 dark:text-blue-200'
              )}
            >
              {parts.join(' · ')}
            </p>
            <p
              className={cn(
                'text-sm',
                hasIssues
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-blue-600 dark:text-blue-400'
              )}
            >
              {hasIssues
                ? 'Some notifications need attention'
                : 'Notifications are being processed'}
            </p>
          </div>
        </div>
        {hasIssues && (
          <Button variant="outline" size="sm" onClick={onViewFailed}>
            View Issues
          </Button>
        )}
      </div>
    </div>
  )
}

export default function NotificationOutboxPage() {
  // State
  const [statusFilter, setStatusFilter] = useState<OutboxStatus | 'all'>('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const setPage = (page: number) => setPagination((p) => ({ ...p, pageIndex: page - 1 }))
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<OutboxEntry | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  // Fetch data
  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
    mutate: mutateStats,
  } = useNotificationOutboxStatsApi()
  const {
    data: entriesData,
    error: entriesError,
    isLoading: entriesLoading,
    mutate: mutateEntries,
  } = useNotificationOutboxApi({
    status: statusFilter === 'all' ? undefined : statusFilter,
    page: pagination.pageIndex + 1,
    page_size: pagination.pageSize,
  })

  // Mutations
  const { trigger: retryEntry, isMutating: isRetrying } = useRetryOutboxEntryApi(
    selectedEntry?.id || ''
  )
  const { trigger: deleteEntry, isMutating: isDeleting } = useDeleteOutboxEntryApi(
    selectedEntry?.id || ''
  )

  const entries = entriesData?.data ?? []
  const stats = statsData ?? {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    dead: 0,
    total: 0,
  }

  // Check if there are any actionable entries
  const hasActionableEntries =
    stats.pending > 0 || stats.processing > 0 || stats.failed > 0 || stats.dead > 0

  // Handlers
  const handleRefresh = async () => {
    await Promise.all([mutateStats(), mutateEntries()])
    toast.success('Data refreshed')
  }

  const handleViewFailed = () => {
    setStatusFilter('failed')
    setPage(1)
  }

  const handleRetry = async (entry: OutboxEntry) => {
    if (actionInProgress) return
    setActionInProgress(entry.id)
    setSelectedEntry(entry)

    try {
      await retryEntry()
      await invalidateNotificationOutboxCache()
      await invalidateNotificationOutboxStatsCache()
      await Promise.all([mutateStats(), mutateEntries()])
      toast.success('Entry scheduled for retry')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to retry entry'))
    } finally {
      setActionInProgress(null)
      setSelectedEntry(null)
    }
  }

  const handleDeleteClick = (entry: OutboxEntry) => {
    setSelectedEntry(entry)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedEntry || actionInProgress) return
    setActionInProgress(selectedEntry.id)

    try {
      await deleteEntry()
      await invalidateNotificationOutboxCache()
      await invalidateNotificationOutboxStatsCache()
      await Promise.all([mutateStats(), mutateEntries()])
      toast.success('Entry deleted')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete entry'))
    } finally {
      setActionInProgress(null)
      setSelectedEntry(null)
      setDeleteDialogOpen(false)
    }
  }

  // The API cannot sort the queue, so the headers are plain text. Rebuilt each
  // render: the row actions close over the latest in-flight state.
  const columns: ColumnDef<OutboxEntry>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const entry = row.original
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[250px]">
                <p className="truncate font-medium">{entry.title}</p>
                {entry.body && (
                  <p className="truncate text-xs text-muted-foreground">{entry.body}</p>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[400px]">
              <p className="font-medium">{entry.title}</p>
              {entry.body && <p className="mt-1 text-sm">{entry.body}</p>}
            </TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      accessorKey: 'event_type',
      header: 'Event',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.event_type}</span>
          <span className="text-xs text-muted-foreground">{row.original.aggregate_type}</span>
        </div>
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => {
        const severityConfig = OUTBOX_SEVERITY_CONFIG[row.original.severity]
        return (
          <Badge variant="outline" className={`${severityConfig.bgColor} ${severityConfig.color}`}>
            {severityConfig.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const entry = row.original
        const StatusIcon = STATUS_ICONS[entry.status]
        const statusConfig = OUTBOX_STATUS_CONFIG[entry.status]
        return (
          <>
            <div className="flex items-center gap-2">
              <StatusIcon
                className={cn(
                  'h-4 w-4',
                  statusConfig.color,
                  entry.status === 'processing' && 'animate-spin'
                )}
              />
              <Badge
                variant="outline"
                className={`${statusConfig.bgColor} ${statusConfig.textColor}`}
              >
                {statusConfig.label}
              </Badge>
            </div>
            {entry.last_error && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="mt-1 max-w-[150px] truncate text-xs text-destructive">
                    {entry.last_error}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[400px]">
                  <p className="text-sm">{entry.last_error}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )
      },
    },
    {
      id: 'retries',
      header: 'Retries',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.retry_count} / {row.original.max_retries}
        </span>
      ),
    },
    {
      accessorKey: 'scheduled_at',
      header: 'Scheduled',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.scheduled_at), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const entry = row.original
        const canRetry = entry.status === 'failed' || entry.status === 'dead'
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label={`Actions for ${entry.title}`}
                disabled={actionInProgress === entry.id}
              >
                {actionInProgress === entry.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {entry.url && (
                <DropdownMenuItem asChild>
                  <a href={entry.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="me-2 h-4 w-4" />
                    View source
                  </a>
                </DropdownMenuItem>
              )}
              <Can permission={Permission.NotificationsWrite}>
                {canRetry && (
                  <DropdownMenuItem onClick={() => handleRetry(entry)} disabled={isRetrying}>
                    <RotateCcw className="me-2 h-4 w-4" />
                    Retry
                  </DropdownMenuItem>
                )}
              </Can>
              <Can permission={Permission.NotificationsDelete}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDeleteClick(entry)}
                  disabled={isDeleting}
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // A failed read would otherwise render an all-zero (i.e. healthy, empty) queue
  // while the real queue may be backed up with dead entries.
  const loadError = statsError ?? entriesError
  if (loadError) {
    return (
      <Main>
        <ErrorState
          title="notification queue"
          error={loadError}
          onRetry={() => {
            void mutateStats()
            void mutateEntries()
          }}
        />
      </Main>
    )
  }

  return (
    <>
      <Main>
        {/* Header */}
        <Button variant="ghost" size="sm" asChild className="-ms-2 mb-2">
          <Link href="/settings/integrations/notifications">
            <ArrowLeft className="me-2 h-4 w-4" />
            Back to channels
          </Link>
        </Button>
        <PageHeader
          title="Notification queue"
          description="Notifications waiting to be delivered, retried or given up on."
          className="mb-6"
        >
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="me-2 h-4 w-4" />
            Refresh
          </Button>
        </PageHeader>

        {/* Queue Health Status */}
        <QueueHealthStatus stats={stats} isLoading={statsLoading} onViewFailed={handleViewFailed} />

        {/* Only show entries section if there are actionable entries or user applied filter */}
        {(hasActionableEntries || statusFilter !== 'all') && (
          <>
            <div className="mt-6">
              <DataTable
                columns={columns}
                data={entries}
                getRowId={(e) => e.id}
                isLoading={entriesLoading}
                showSearch={false}
                toolbarStart={
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value as OutboxStatus | 'all')
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className="h-9 w-[160px]" aria-label="Filter by status">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="dead">Dead</SelectItem>
                    </SelectContent>
                  </Select>
                }
                manualPagination
                rowCount={entriesData?.total ?? 0}
                pagination={pagination}
                onPaginationChange={setPagination}
                pageSize={pagination.pageSize}
                emptyMessage="No entries found"
                emptyDescription={
                  statusFilter !== 'all'
                    ? `No ${statusFilter} entries in the queue`
                    : 'The notification queue is empty'
                }
              />
            </div>
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Entry"
          desc={
            <>
              Are you sure you want to delete this notification entry? This action cannot be undone.
              {selectedEntry && (
                <span className="mt-2 block font-medium">{selectedEntry.title}</span>
              )}
            </>
          }
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
          destructive
          isLoading={isDeleting}
          handleConfirm={() => void handleDeleteConfirm()}
        />
      </Main>
    </>
  )
}
