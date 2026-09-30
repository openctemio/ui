'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUrlParam } from '@/hooks/use-url-param'
import { formatDistanceToNow } from 'date-fns'
import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  History,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Bell,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState, ErrorState, MetricStrip } from '@/features/shared'
import { SEVERITY_BADGE_SOFT, type SeverityLevel } from '@/lib/severity-colors'
import { Can, Permission } from '@/lib/permissions'
import {
  useNotificationIntegrationsApi,
  useNotificationEventsApi,
  invalidateNotificationEventsCache,
} from '@/features/integrations/api/use-integrations-api'
import type {
  NotificationEventEntry,
  NotificationEventStatus,
} from '@/features/integrations/types/integration.types'

// Status configuration
const STATUS_CONFIG: Record<
  NotificationEventStatus,
  { icon: typeof CheckCircle2; color: string; bgColor: string; label: string }
> = {
  completed: {
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/5',
    label: 'Sent',
  },
  failed: {
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/5',
    label: 'Failed',
  },
  skipped: {
    icon: MinusCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/40',
    label: 'Skipped',
  },
}

// Severity: icon here, colours from the shared severity source.
const SEVERITY_ICONS: Record<string, typeof AlertCircle> = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: Info,
}

function severityClass(severity: string): string {
  return SEVERITY_BADGE_SOFT[severity as SeverityLevel] ?? SEVERITY_BADGE_SOFT.medium
}

// Summary numbers for the selected channel
function SummaryStats({
  total,
  successCount,
  failedCount,
  isLoading,
}: {
  total: number
  successCount: number
  failedCount: number
  isLoading: boolean
}) {
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0

  return (
    <MetricStrip
      className="mb-5"
      loading={isLoading}
      items={[
        { key: 'total', label: 'Sent', value: total },
        { key: 'rate', label: 'Success rate', value: `${successRate}%` },
        { key: 'failed', label: 'Failed', value: failedCount, tone: 'danger' },
      ]}
    />
  )
}

// History item component
function HistoryItem({ entry }: { entry: NotificationEventEntry }) {
  // Get the first send result for this integration (already filtered by backend)
  const sendResult = entry.send_results?.[0]

  // Use the send result status if available (success/failed), otherwise fall back to event status
  const integrationStatus =
    sendResult?.status === 'success'
      ? 'completed'
      : sendResult?.status === 'failed'
        ? 'failed'
        : entry.status

  const statusConfig =
    STATUS_CONFIG[integrationStatus as NotificationEventStatus] || STATUS_CONFIG.completed
  const severityBadge = severityClass(entry.severity)
  const StatusIcon = statusConfig.icon
  const SeverityIcon = SEVERITY_ICONS[entry.severity] ?? AlertTriangle

  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-lg border transition-colors',
        statusConfig.bgColor
      )}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <StatusIcon className={cn('h-5 w-5', statusConfig.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header: Title, Severity, Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{entry.title}</h4>
            {entry.body && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{entry.body}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className={cn('text-xs', severityBadge)}>
              <SeverityIcon className="h-3 w-3 me-1" />
              {entry.severity}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        {/* Error message if failed */}
        {sendResult?.status === 'failed' && sendResult?.error && (
          <div className="rounded bg-destructive/10 px-2 py-1 text-sm text-destructive">
            <span className="font-medium">Error:</span> {sendResult.error}
          </div>
        )}

        {/* Footer: Time, URL, Message ID */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(entry.processed_at), { addSuffix: true })}</span>
          {entry.url && (
            <>
              <span className="text-muted-foreground/50">|</span>
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline text-primary"
              >
                View Link
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
          {sendResult?.message_id && (
            <>
              <span className="text-muted-foreground/50">|</span>
              <span className="font-mono opacity-60">
                ID:{' '}
                {sendResult.message_id.length > 12
                  ? `${sendResult.message_id.slice(0, 12)}...`
                  : sendResult.message_id}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// History list component with Load More pagination
const PAGE_SIZE = 20

function HistoryList({
  integrationId,
  onStatsChange,
}: {
  integrationId: string
  onStatsChange: (stats: {
    total: number
    success: number
    failed: number
    isLoading: boolean
  }) => void
}) {
  const [allEntries, setAllEntries] = useState<NotificationEventEntry[]>([])
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  // Track which integration the current entries belong to
  const loadedForIdRef = useRef<string>('')

  const { data, error, isLoading, mutate } = useNotificationEventsApi(integrationId, {
    limit: PAGE_SIZE,
    offset,
  })

  // Reset offset when integration changes (before SWR fetches)
  useEffect(() => {
    if (loadedForIdRef.current !== integrationId) {
      setAllEntries([])
      setOffset(0)
      setTotal(0)
    }
  }, [integrationId])

  // Update entries when data changes
  useEffect(() => {
    if (data) {
      setTotal(data.total)
      // Check if this is data for the current integration
      if (loadedForIdRef.current !== integrationId) {
        // Different integration - replace all entries
        setAllEntries(data.data)
        loadedForIdRef.current = integrationId
      } else if (offset === 0) {
        // Same integration, initial load or refresh - replace entries
        setAllEntries(data.data)
      } else {
        // Same integration, load more - append entries (avoid duplicates)
        setAllEntries((prev) => {
          const existingIds = new Set(prev.map((e) => e.id))
          const newEntries = data.data.filter((e) => !existingIds.has(e.id))
          return [...prev, ...newEntries]
        })
      }
      setIsLoadingMore(false)
    }
  }, [data, offset, integrationId])

  // Calculate and report stats
  const stats = useMemo(() => {
    const successCount = allEntries.filter((h) => {
      const sr = h.send_results?.[0]
      return sr?.status === 'success'
    }).length
    const failedCount = allEntries.filter((h) => {
      const sr = h.send_results?.[0]
      return sr?.status === 'failed'
    }).length
    return { total, success: successCount, failed: failedCount, isLoading }
  }, [allEntries, total, isLoading])

  useEffect(() => {
    onStatsChange(stats)
  }, [stats, onStatsChange])

  const handleRefresh = useCallback(async () => {
    setOffset(0)
    setAllEntries([])
    await invalidateNotificationEventsCache(integrationId)
    mutate()
    toast.success('Notifications refreshed')
  }, [integrationId, mutate])

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true)
    setOffset((prev) => prev + PAGE_SIZE)
  }, [])

  if (isLoading && allEntries.length === 0) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (error && allEntries.length === 0) {
    return <ErrorState title="notifications" error={error} onRetry={handleRefresh} />
  }

  if (allEntries.length === 0) {
    return (
      <EmptyState
        card={false}
        icon={History}
        title="No notifications sent yet"
        description="Send a test notification to see it here"
      />
    )
  }

  const hasMore = allEntries.length < total

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Showing: <span className="font-medium text-foreground">{allEntries.length}</span>
            {total > 0 && <span className="text-muted-foreground"> of {total}</span>}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 me-2" />
          Refresh
        </Button>
      </div>

      {/* History list */}
      <ScrollArea className="h-[450px] pe-4">
        <div className="space-y-3">
          {allEntries.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} />
          ))}

          {/* Load More button */}
          {hasMore && (
            <div className="pt-4 pb-2 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore || isLoading}
              >
                {isLoadingMore || isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>Load more ({total - allEntries.length} remaining)</>
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function HistoryContent() {
  const router = useRouter()
  const initialId = useUrlParam('integration') || ''

  const [selectedId, setSelectedId] = useState(initialId)
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, isLoading: true })

  const { data: integrationsData, isLoading: loadingIntegrations } =
    useNotificationIntegrationsApi()
  const integrations = useMemo(() => integrationsData?.data ?? [], [integrationsData?.data])

  // Auto-select first integration if none selected and integrations are available
  useEffect(() => {
    if (!selectedId && integrations.length > 0 && !loadingIntegrations) {
      setSelectedId(integrations[0].id)
    }
  }, [selectedId, integrations, loadingIntegrations])

  // Find selected integration
  const selectedIntegration = integrations.find((i) => i.id === selectedId)

  const handleStatsChange = useCallback(
    (newStats: { total: number; success: number; failed: number; isLoading: boolean }) => {
      setStats(newStats)
    },
    []
  )

  return (
    <>
      {/* Header row with back button and channel selector */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 -ms-2"
            onClick={() => router.push('/settings/integrations/notifications')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notification events</h1>
          </div>
        </div>

        {/* Channel selector inline */}
        <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto">
          <span className="text-sm text-muted-foreground">Channel</span>
          {loadingIntegrations ? (
            <Skeleton className="h-9 w-[200px]" />
          ) : integrations.length === 0 ? (
            <Can permission={Permission.NotificationsWrite}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/settings/integrations/notifications')}
              >
                Add channel
              </Button>
            </Can>
          ) : (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full min-w-0 sm:w-[220px]">
                <SelectValue placeholder="Select channel..." />
              </SelectTrigger>
              <SelectContent>
                {integrations.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    <div className="flex items-center gap-2">
                      <span>{i.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {i.provider}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Summary Stats - only show when integration is selected */}
      {selectedId && (
        <SummaryStats
          total={stats.total}
          successCount={stats.success}
          failedCount={stats.failed}
          isLoading={stats.isLoading}
        />
      )}

      {/* Events Log Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Events log
            {selectedIntegration && (
              <Badge variant="secondary" className="ms-2 font-normal">
                {selectedIntegration.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedId ? (
            <EmptyState
              card={false}
              icon={Bell}
              title="Select a channel to view its notification events"
            />
          ) : (
            <HistoryList integrationId={selectedId} onStatsChange={handleStatsChange} />
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default function NotificationHistoryPage() {
  return (
    <>
      <Main>
        <HistoryContent />
      </Main>
    </>
  )
}
