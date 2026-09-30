'use client'

import { useState, useMemo, useCallback } from 'react'
import { csrfFetch } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import { Main } from '@/components/layout'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  MetricStrip,
  type MetricStripItem,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  RelativeTime,
  StackedCell,
  type RowAction,
} from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ColumnDef } from '@tanstack/react-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Can, Permission } from '@/lib/permissions'
import {
  Plus,
  Bell,
  RefreshCw,
  Send,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
  MessageSquare,
  History,
  Inbox,
} from 'lucide-react'
import {
  useNotificationIntegrationsApi,
  invalidateNotificationIntegrationsCache,
} from '@/features/integrations'
import type { Integration } from '@/features/integrations'
import { getErrorMessage } from '@/lib/api/error-handler'
import { ALL_NOTIFICATION_SEVERITIES } from '@/features/integrations/types/integration.types'
import {
  useTenantEventTypes,
  labelEventTypes,
  type NotificationEventTypeInfo,
  type NotificationEventCategoryInfo,
} from '@/features/integrations/api/use-event-types'
import { cn } from '@/lib/utils'
import { SEVERITY_BADGE_SOFT, type SeverityLevel } from '@/lib/severity-colors'
import { AddNotificationDialog } from '@/features/notifications/components/add-notification-dialog'
import { EditNotificationDialog } from '@/features/notifications/components/edit-notification-dialog'

// Only a problem (error) is coloured; the other states stay neutral.
const STATUS_CONFIG: Record<
  string,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: React.ReactNode
  }
> = {
  connected: {
    label: 'Connected',
    variant: 'default',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  disconnected: {
    label: 'Disconnected',
    variant: 'secondary',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  error: {
    label: 'Error',
    variant: 'destructive',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  pending: {
    label: 'Pending',
    variant: 'outline',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
}

const PROVIDER_LABELS: Record<string, string> = {
  slack: 'Slack',
  teams: 'Microsoft Teams',
  telegram: 'Telegram',
  webhook: 'Webhook',
  email: 'Email',
}

function ProviderIcon({ provider, className }: { provider: string; className?: string }) {
  switch (provider) {
    case 'slack':
      return <MessageSquare className={cn('text-[#4A154B]', className)} />
    case 'teams':
      return <MessageSquare className={cn('text-[#6264A7]', className)} />
    case 'telegram':
      return <Send className={cn('text-[#0088cc]', className)} />
    case 'webhook':
    case 'email':
      return <Bell className={cn('text-muted-foreground', className)} />
    default:
      return <Bell className={className} />
  }
}

/**
 * Group a channel's enabled event type identifiers into labelled category
 * buckets, using the catalog the API returned.
 *
 * Identifiers with no catalog entry are kept under an "Other" bucket rather
 * than dropped. The previous implementation did a `.find()` against a
 * hardcoded array and skipped anything it did not recognise, so a channel
 * routing `sla_breach` displayed as though it routed nothing — the display
 * silently disagreed with what the backend would deliver.
 */
function summarizeEventTypes(
  enabled: string[],
  catalog: NotificationEventTypeInfo[],
  categories: NotificationEventCategoryInfo[]
): { category: string; label: string; labels: string[] }[] {
  const labelled = labelEventTypes(enabled, catalog)
  const byCategory = new Map<string, string[]>()
  for (const { label, category } of labelled) {
    const bucket = byCategory.get(category)
    if (bucket) {
      bucket.push(label)
    } else {
      byCategory.set(category, [label])
    }
  }

  const categoryLabels = new Map(categories.map((c) => [c.category, c.label]))
  return Array.from(byCategory.entries()).map(([category, labels]) => ({
    category,
    label: categoryLabels.get(category) ?? (category === 'unknown' ? 'Other' : category),
    labels,
  }))
}

export default function NotificationIntegrationsPage() {
  const router = useRouter()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const { data: integrationsData, error, isLoading, mutate } = useNotificationIntegrationsApi()

  // The event-type catalog is served by the API from the same registry the
  // notification outbox routes on. Nothing about it is hardcoded here — see
  // use-event-types.ts for why.
  const {
    eventTypes: eventTypeCatalog,
    categories: eventCategories,
    defaultEnabled: defaultEventTypes,
    totalCount: eventTypeCount,
  } = useTenantEventTypes()

  // Handle the API response format
  const integrations = useMemo(() => {
    if (!integrationsData) return []
    return integrationsData.data ?? []
  }, [integrationsData])

  // Calculate stats
  const stats = useMemo(() => {
    const total = integrations.length
    const connected = integrations.filter((i) => i.status === 'connected').length
    const errorCount = integrations.filter((i) => i.status === 'error').length
    return { total, connected, error: errorCount }
  }, [integrations])

  const handleRefresh = useCallback(async () => {
    setActionInProgress('refresh')
    try {
      await invalidateNotificationIntegrationsCache()
      await mutate()
      toast.success('Integrations refreshed')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to refresh integrations'))
    } finally {
      setActionInProgress(null)
    }
  }, [mutate])

  const handleTestNotification = useCallback(async (integration: Integration) => {
    setActionInProgress(integration.id)
    try {
      const response = await csrfFetch(`/api/v1/integrations/${integration.id}/test-notification`, {
        method: 'POST',
      })

      // Handle rate limit (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const seconds = retryAfter ? parseInt(retryAfter, 10) : 60
        toast.error(`Rate limit exceeded. Please wait ${seconds} seconds before trying again.`)
        return
      }

      if (!response.ok) throw new Error('Test failed')
      const result = await response.json()
      if (result.success) {
        toast.success(`Test notification sent to "${integration.name}"`)
      } else {
        toast.error(result.error || 'Test notification failed')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to send test notification'))
    } finally {
      setActionInProgress(null)
    }
  }, [])

  const handleDelete = useCallback(async () => {
    if (!selectedIntegration) return
    setActionInProgress(selectedIntegration.id)
    try {
      const response = await csrfFetch(`/api/v1/integrations/${selectedIntegration.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Delete failed')
      toast.success(`Integration "${selectedIntegration.name}" deleted`)
      await invalidateNotificationIntegrationsCache()
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete integration'))
    } finally {
      setDeleteDialogOpen(false)
      setSelectedIntegration(null)
      setActionInProgress(null)
    }
  }, [selectedIntegration, mutate])

  const handleDeleteClick = useCallback((integration: Integration) => {
    setSelectedIntegration(integration)
    setDeleteDialogOpen(true)
  }, [])

  const handleEditClick = useCallback((integration: Integration) => {
    setSelectedIntegration(integration)
    setEditDialogOpen(true)
  }, [])

  const columns = useMemo<ColumnDef<Integration>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Channel" />,
        cell: ({ row }) => {
          const integration = row.original
          // Channel name / chat id live in integration.metadata now — the
          // notification_extension.channel_name getter is hardcoded to "" on
          // the API, so the old read here always rendered nothing.
          const meta = integration.metadata as Record<string, unknown> | undefined
          const channelName = (meta?.channel_name as string) || (meta?.chat_id as string) || ''
          return (
            <div className="flex items-center gap-3">
              <ProviderIcon provider={integration.provider} className="h-5 w-5 shrink-0" />
              <StackedCell
                primary={integration.name}
                secondary={channelName ? `#${channelName}` : undefined}
              />
            </div>
          )
        },
      },
      {
        accessorKey: 'provider',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Provider" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {PROVIDER_LABELS[row.original.provider] || row.original.provider}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const integration = row.original
          const statusConfig = STATUS_CONFIG[integration.status] || STATUS_CONFIG.pending
          return (
            <div className="space-y-1">
              <Badge variant={statusConfig.variant} className="gap-1">
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
              {integration.status_message && integration.status === 'error' && (
                <p
                  className="max-w-[250px] text-xs text-destructive"
                  title={integration.status_message}
                >
                  {integration.status_message}
                </p>
              )}
            </div>
          )
        },
      },
      {
        id: 'severity_filters',
        header: 'Severity filters',
        enableSorting: false,
        cell: ({ row }) => {
          const ext = row.original.notification_extension
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex gap-1 flex-wrap cursor-default">
                    {(() => {
                      // null/undefined means no filter = all severities
                      // empty array also means all severities
                      // 5+ severities (accounting for legacy data missing 'medium') = all severities
                      const severities = ext?.enabled_severities
                      const isAllSeverities =
                        !severities ||
                        severities.length === 0 ||
                        severities.length >= ALL_NOTIFICATION_SEVERITIES.length - 1
                      if (isAllSeverities) {
                        return <span className="text-xs text-muted-foreground">All severities</span>
                      }
                      // Show max 3 severity badges, then "+N more"
                      const maxShow = 3
                      const shown = severities.slice(0, maxShow)
                      const remaining = severities.length - maxShow
                      return (
                        <>
                          {shown.map((sev) => {
                            const colorClass =
                              SEVERITY_BADGE_SOFT[
                                (sev === 'none' ? 'info' : sev) as SeverityLevel
                              ] || ''
                            const config = ALL_NOTIFICATION_SEVERITIES.find((s) => s.value === sev)
                            return (
                              <Badge
                                key={sev}
                                variant="outline"
                                className={cn('text-xs', colorClass)}
                              >
                                {config?.label || sev}
                              </Badge>
                            )
                          })}
                          {remaining > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              +{remaining}
                            </Badge>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs font-medium mb-1">Severity filters:</p>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const severities = ext?.enabled_severities
                      const isAllSeverities =
                        !severities ||
                        severities.length === 0 ||
                        severities.length >= ALL_NOTIFICATION_SEVERITIES.length - 1
                      if (isAllSeverities) {
                        // Show actual list of all severities
                        return ALL_NOTIFICATION_SEVERITIES.map((s) => s.label).join(', ')
                      }
                      return severities
                        .map((sev) => {
                          const config = ALL_NOTIFICATION_SEVERITIES.find((s) => s.value === sev)
                          return config?.label || sev
                        })
                        .join(', ')
                    })()}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        },
      },
      {
        id: 'event_types',
        header: 'Event types',
        enableSorting: false,
        cell: ({ row }) => {
          const ext = row.original.notification_extension
          const enabled = ext?.enabled_event_types ?? defaultEventTypes
          // "All events" only when the catalog has actually loaded — otherwise
          // eventTypeCount is 0 and every channel would claim to route
          // everything.
          const isAll =
            enabled.length === 0 || (eventTypeCount > 0 && enabled.length === eventTypeCount)
          const groups = summarizeEventTypes(enabled, eventTypeCatalog, eventCategories)

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex gap-1 flex-wrap cursor-default">
                    {isAll ? (
                      <span className="text-xs text-muted-foreground">All events</span>
                    ) : groups.length > 0 && groups.length <= 2 ? (
                      groups.map((g) => (
                        <Badge
                          key={g.category}
                          variant="outline"
                          className="text-xs bg-primary/10 text-primary border-primary/20"
                        >
                          {g.label.replace(' Events', '')} ({g.labels.length})
                        </Badge>
                      ))
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs bg-primary/10 text-primary border-primary/20"
                      >
                        {enabled.length} event types
                      </Badge>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px]">
                  <p className="text-xs font-medium mb-1">Event types:</p>
                  {isAll ? (
                    <p className="text-xs text-muted-foreground">All event types enabled</p>
                  ) : (
                    groups.map((g) => (
                      <div key={g.category} className="mb-1 last:mb-0">
                        <span className="text-xs font-medium">{g.label}:</span>
                        <span className="text-xs text-muted-foreground ms-1">
                          {g.labels.join(', ')}
                        </span>
                      </div>
                    ))
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        },
      },
      {
        accessorKey: 'last_sync_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last used" />,
        cell: ({ row }) => <RelativeTime date={row.original.last_sync_at} />,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const integration = row.original
          const actions: RowAction[] = [
            {
              label: 'Send test',
              icon: Send,
              onClick: () => void handleTestNotification(integration),
            },
            {
              label: 'Edit',
              icon: Pencil,
              onClick: () => handleEditClick(integration),
              permission: Permission.NotificationsWrite,
            },
            {
              label: 'View events',
              icon: History,
              onClick: () =>
                router.push(
                  `/settings/integrations/notifications/history?integration=${integration.id}`
                ),
            },
            {
              label: 'Delete',
              icon: Trash2,
              onClick: () => handleDeleteClick(integration),
              destructive: true,
              separatorBefore: true,
              permission: Permission.NotificationsDelete,
            },
          ]
          return <DataTableRowActions actions={actions} />
        },
      },
    ],
    [
      router,
      handleTestNotification,
      handleEditClick,
      handleDeleteClick,
      eventTypeCatalog,
      eventCategories,
      defaultEventTypes,
      eventTypeCount,
    ]
  )

  const metrics: MetricStripItem[] = [
    { key: 'total', label: 'Channels', value: stats.total },
    { key: 'connected', label: 'Connected', value: stats.connected },
    { key: 'error', label: 'Errors', value: stats.error, tone: 'danger' },
  ]

  return (
    <>
      <Main>
        <PageHeader
          title="Notification channels"
          description="Send security alerts to Slack, Microsoft Teams, Telegram and custom webhooks."
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/settings/integrations/notifications/history')}
          >
            <History className="me-2 h-4 w-4" />
            View events
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/settings/integrations/notifications/outbox')}
          >
            <Inbox className="me-2 h-4 w-4" />
            Queue
          </Button>
          <Can permission={Permission.NotificationsWrite}>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              Add channel
            </Button>
          </Can>
        </PageHeader>

        {error ? (
          <div className="mt-5">
            <ErrorState title="notification channels" error={error} onRetry={() => void mutate()} />
          </div>
        ) : (
          <>
            <MetricStrip className="mt-5" loading={isLoading} items={metrics} />

            <div className="mt-5">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full max-w-sm" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : integrations.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="No notification channels"
                  description="Add Slack, Microsoft Teams, Telegram, or webhook integrations to receive security alerts."
                  action={
                    <Can permission={Permission.NotificationsWrite}>
                      <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                        <Plus className="me-2 h-4 w-4" />
                        Add channel
                      </Button>
                    </Can>
                  }
                />
              ) : (
                <DataTable
                  columns={columns}
                  data={integrations}
                  getRowId={(i) => i.id}
                  searchPlaceholder="Search channels..."
                  showSelectionCount={false}
                  toolbarEnd={
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="Refresh"
                      title="Refresh"
                      onClick={handleRefresh}
                      disabled={actionInProgress === 'refresh'}
                    >
                      {actionInProgress === 'refresh' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  }
                  emptyMessage="No channels match your search"
                />
              )}
            </div>
          </>
        )}
      </Main>

      {/* Dialogs */}
      <AddNotificationDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={async () => {
          await invalidateNotificationIntegrationsCache()
          await mutate()
        }}
      />

      {selectedIntegration && (
        <EditNotificationDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          integration={selectedIntegration}
          onSuccess={async () => {
            await invalidateNotificationIntegrationsCache()
            await mutate()
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete notification channel"
        desc={
          <>
            Are you sure you want to delete <strong>{selectedIntegration?.name}</strong>? You will
            no longer receive notifications through this channel.
          </>
        }
        confirmText="Delete"
        destructive
        handleConfirm={() => void handleDelete()}
      />
    </>
  )
}
