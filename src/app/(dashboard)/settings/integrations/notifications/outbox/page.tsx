'use client'

import { useState } from 'react'
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
  Inbox,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DropdownMenuSeparator,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  const [page, setPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<OutboxEntry | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  // Fetch data
  const {
    data: statsData,
    isLoading: statsLoading,
    mutate: mutateStats,
  } = useNotificationOutboxStatsApi()
  const {
    data: entriesData,
    isLoading: entriesLoading,
    mutate: mutateEntries,
  } = useNotificationOutboxApi({
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    page_size: 20,
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

  return (
    <>
      <Main>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
              <Link href="/settings/integrations/notifications">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Channels
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-xl font-semibold">Notification Queue</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Queue Health Status */}
        <QueueHealthStatus stats={stats} isLoading={statsLoading} onViewFailed={handleViewFailed} />

        {/* Only show entries section if there are actionable entries or user applied filter */}
        {(hasActionableEntries || statusFilter !== 'all') && (
          <>
            {/* Filters */}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as OutboxStatus | 'all')
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-[150px]">
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
              </div>
            </div>

            {/* Entries Table */}
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Queue Entries</CardTitle>
                <CardDescription>
                  {entriesData?.total ?? 0} entries found
                  {statusFilter !== 'all' && ` (filtered by ${statusFilter})`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {entriesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : entries.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h3 className="mt-3 font-semibold">No entries found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {statusFilter !== 'all'
                        ? `No ${statusFilter} entries in the queue`
                        : 'The notification queue is empty'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Event</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Retries</TableHead>
                            <TableHead>Scheduled</TableHead>
                            <TableHead className="w-[70px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entries.map((entry) => {
                            const StatusIcon = STATUS_ICONS[entry.status]
                            const statusConfig = OUTBOX_STATUS_CONFIG[entry.status]
                            const severityConfig = OUTBOX_SEVERITY_CONFIG[entry.severity]
                            const canRetry = entry.status === 'failed' || entry.status === 'dead'

                            return (
                              <TableRow key={entry.id}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{entry.event_type}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {entry.aggregate_type}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="max-w-[250px]">
                                          <p className="truncate font-medium">{entry.title}</p>
                                          {entry.body && (
                                            <p className="truncate text-xs text-muted-foreground">
                                              {entry.body}
                                            </p>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-[400px]">
                                        <p className="font-medium">{entry.title}</p>
                                        {entry.body && <p className="mt-1 text-sm">{entry.body}</p>}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`${severityConfig.bgColor} ${severityConfig.color}`}
                                  >
                                    {severityConfig.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <StatusIcon
                                      className={`h-4 w-4 ${statusConfig.color} ${
                                        entry.status === 'processing' ? 'animate-spin' : ''
                                      }`}
                                    />
                                    <Badge
                                      variant="outline"
                                      className={`${statusConfig.bgColor} ${statusConfig.textColor}`}
                                    >
                                      {statusConfig.label}
                                    </Badge>
                                  </div>
                                  {entry.last_error && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <p className="mt-1 max-w-[150px] truncate text-xs text-red-600">
                                            {entry.last_error}
                                          </p>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[400px]">
                                          <p className="text-sm text-red-600">{entry.last_error}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">
                                    {entry.retry_count} / {entry.max_retries}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {formatDistanceToNow(new Date(entry.scheduled_at), {
                                      addSuffix: true,
                                    })}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
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
                                          <a
                                            href={entry.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            View Source
                                          </a>
                                        </DropdownMenuItem>
                                      )}
                                      <Can permission={Permission.NotificationsWrite}>
                                        {canRetry && (
                                          <DropdownMenuItem
                                            onClick={() => handleRetry(entry)}
                                            disabled={isRetrying}
                                          >
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                            Retry
                                          </DropdownMenuItem>
                                        )}
                                      </Can>
                                      <Can permission={Permission.NotificationsDelete}>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-red-500"
                                          onClick={() => handleDeleteClick(entry)}
                                          disabled={isDeleting}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </Can>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {entriesData && entriesData.total_pages > 1 && (
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Page {entriesData.page} of {entriesData.total_pages}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(entriesData.total_pages, p + 1))}
                            disabled={page === entriesData.total_pages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Entry</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this notification entry? This action cannot be
                undone.
                {selectedEntry && (
                  <span className="mt-2 block font-medium">{selectedEntry.title}</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Main>
    </>
  )
}
