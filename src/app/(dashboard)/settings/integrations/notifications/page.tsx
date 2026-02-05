'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Can, Permission } from '@/lib/permissions'
import {
  Plus,
  Bell,
  RefreshCw,
  MoreHorizontal,
  Send,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
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
import {
  ALL_NOTIFICATION_EVENT_TYPES,
  ALL_NOTIFICATION_SEVERITIES,
  DEFAULT_ENABLED_EVENT_TYPES,
  EVENT_CATEGORY_LABELS,
  type NotificationEventCategory,
} from '@/features/integrations/types/integration.types'
import { cn } from '@/lib/utils'
import { AddNotificationDialog } from '@/features/notifications/components/add-notification-dialog'
import { EditNotificationDialog } from '@/features/notifications/components/edit-notification-dialog'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  connected: {
    label: 'Connected',
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  disconnected: {
    label: 'Disconnected',
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  error: {
    label: 'Error',
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  pending: {
    label: 'Pending',
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
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

const PROVIDER_COLORS: Record<string, string> = {
  slack: 'bg-[#4A154B]/10',
  teams: 'bg-[#6264A7]/10',
  telegram: 'bg-[#0088cc]/10',
  webhook: 'bg-gray-500/10',
  email: 'bg-blue-500/10',
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
      return <Bell className={cn('text-gray-500', className)} />
    case 'email':
      return <Bell className={cn('text-blue-500', className)} />
    default:
      return <Bell className={className} />
  }
}

export default function NotificationIntegrationsPage() {
  const router = useRouter()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const { data: integrationsData, error, isLoading, mutate } = useNotificationIntegrationsApi()

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
      const response = await fetch(`/api/v1/integrations/${integration.id}/test-notification`, {
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
      const response = await fetch(`/api/v1/integrations/${selectedIntegration.id}`, {
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

  const handleDeleteClick = (integration: Integration) => {
    setSelectedIntegration(integration)
    setDeleteDialogOpen(true)
  }

  const handleEditClick = (integration: Integration) => {
    setSelectedIntegration(integration)
    setEditDialogOpen(true)
  }

  // Error state
  if (error) {
    return (
      <>
        <Main>
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Failed to load notification integrations</h2>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <Main>
        {/* Breadcrumb */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/settings/integrations')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Integrations
          </Button>
        </div>

        <PageHeader
          title="Notification Integrations"
          description="Manage notification channels for Slack, Microsoft Teams, Telegram, and custom webhooks"
        >
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/settings/integrations/notifications/history')}
            >
              <History className="mr-2 h-4 w-4" />
              View Events
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/settings/integrations/notifications/outbox')}
            >
              <Inbox className="mr-2 h-4 w-4" />
              Queue
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={actionInProgress === 'refresh'}
            >
              {actionInProgress === 'refresh' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Can permission={Permission.NotificationsWrite}>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Channel
              </Button>
            </Can>
          </div>
        </PageHeader>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Total Channels
              </CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? <Skeleton className="h-9 w-12" /> : stats.total}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Connected
              </CardDescription>
              <CardTitle className="text-3xl text-green-500">
                {isLoading ? <Skeleton className="h-9 w-12" /> : stats.connected}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Errors
              </CardDescription>
              <CardTitle className="text-3xl text-red-500">
                {isLoading ? <Skeleton className="h-9 w-12" /> : stats.error}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Integrations Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Channels
            </CardTitle>
            <CardDescription>
              Configure where to send security alerts and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : integrations.length === 0 ? (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Notification Channels</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Add Slack, Microsoft Teams, Telegram, or webhook integrations to receive security
                  alerts.
                </p>
                <Can permission={Permission.NotificationsWrite}>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Channel
                  </Button>
                </Can>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Severity Filters</TableHead>
                      <TableHead>Event Types</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrations.map((integration) => {
                      const statusConfig =
                        STATUS_CONFIG[integration.status] || STATUS_CONFIG.pending
                      const ext = integration.notification_extension
                      return (
                        <TableRow key={integration.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex h-10 w-10 items-center justify-center rounded-lg',
                                  PROVIDER_COLORS[integration.provider] || 'bg-gray-100'
                                )}
                              >
                                <ProviderIcon provider={integration.provider} className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium">{integration.name}</p>
                                {ext?.channel_name && (
                                  <p className="text-xs text-muted-foreground">
                                    #{ext.channel_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {PROVIDER_LABELS[integration.provider] || integration.provider}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant="outline" className={cn('gap-1', statusConfig.color)}>
                                {statusConfig.icon}
                                {statusConfig.label}
                              </Badge>
                              {integration.status_message && integration.status === 'error' && (
                                <p
                                  className="text-xs text-red-500 max-w-[250px]"
                                  title={integration.status_message}
                                >
                                  {integration.status_message}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
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
                                        return (
                                          <span className="text-xs text-muted-foreground">
                                            All severities
                                          </span>
                                        )
                                      }
                                      // Show max 3 severity badges, then "+N more"
                                      const maxShow = 3
                                      const shown = severities.slice(0, maxShow)
                                      const remaining = severities.length - maxShow
                                      return (
                                        <>
                                          {shown.map((sev) => {
                                            const colorClass =
                                              {
                                                critical:
                                                  'bg-red-500/10 text-red-600 border-red-200',
                                                high: 'bg-orange-500/10 text-orange-600 border-orange-200',
                                                medium:
                                                  'bg-yellow-500/10 text-yellow-600 border-yellow-200',
                                                low: 'bg-blue-500/10 text-blue-600 border-blue-200',
                                                info: 'bg-gray-500/10 text-gray-600 border-gray-200',
                                                none: 'bg-gray-200/10 text-gray-400 border-gray-200',
                                              }[sev] ||
                                              'bg-gray-500/10 text-gray-600 border-gray-200'
                                            const config = ALL_NOTIFICATION_SEVERITIES.find(
                                              (s) => s.value === sev
                                            )
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
                                            <Badge
                                              variant="outline"
                                              className="text-xs bg-gray-100 text-gray-600 border-gray-200"
                                            >
                                              +{remaining}
                                            </Badge>
                                          )}
                                        </>
                                      )
                                    })()}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[200px]">
                                  <p className="text-xs font-medium mb-1">Severity Filters:</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(() => {
                                      const severities = ext?.enabled_severities
                                      const isAllSeverities =
                                        !severities ||
                                        severities.length === 0 ||
                                        severities.length >= ALL_NOTIFICATION_SEVERITIES.length - 1
                                      if (isAllSeverities) {
                                        // Show actual list of all severities
                                        return ALL_NOTIFICATION_SEVERITIES.map((s) => s.label).join(
                                          ', '
                                        )
                                      }
                                      return severities
                                        .map((sev) => {
                                          const config = ALL_NOTIFICATION_SEVERITIES.find(
                                            (s) => s.value === sev
                                          )
                                          return config?.label || sev
                                        })
                                        .join(', ')
                                    })()}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex gap-1 flex-wrap cursor-default">
                                    {(() => {
                                      const eventTypes =
                                        ext?.enabled_event_types ?? DEFAULT_ENABLED_EVENT_TYPES
                                      if (
                                        eventTypes.length === 0 ||
                                        eventTypes.length === ALL_NOTIFICATION_EVENT_TYPES.length
                                      ) {
                                        return (
                                          <span className="text-xs text-muted-foreground">
                                            All events
                                          </span>
                                        )
                                      }
                                      // Group by category and show summary
                                      const byCategory = new Map<
                                        NotificationEventCategory,
                                        string[]
                                      >()
                                      eventTypes.forEach((et) => {
                                        const config = ALL_NOTIFICATION_EVENT_TYPES.find(
                                          (t) => t.value === et
                                        )
                                        if (config) {
                                          const cat = config.category
                                          if (!byCategory.has(cat)) byCategory.set(cat, [])
                                          byCategory.get(cat)!.push(config.label)
                                        }
                                      })
                                      // Show category badges with count
                                      const categories = Array.from(byCategory.entries())
                                      if (categories.length <= 2) {
                                        // Show category names with count
                                        return categories.map(([cat, items]) => (
                                          <Badge
                                            key={cat}
                                            variant="outline"
                                            className="text-xs bg-purple-500/10 text-purple-600 border-purple-200"
                                          >
                                            {EVENT_CATEGORY_LABELS[cat].replace(' Events', '')} (
                                            {items.length})
                                          </Badge>
                                        ))
                                      }
                                      // Show total count
                                      return (
                                        <Badge
                                          variant="outline"
                                          className="text-xs bg-purple-500/10 text-purple-600 border-purple-200"
                                        >
                                          {eventTypes.length} event types
                                        </Badge>
                                      )
                                    })()}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[280px]">
                                  <p className="text-xs font-medium mb-1">Event Types:</p>
                                  {(() => {
                                    const eventTypes =
                                      ext?.enabled_event_types ?? DEFAULT_ENABLED_EVENT_TYPES
                                    if (
                                      eventTypes.length === 0 ||
                                      eventTypes.length === ALL_NOTIFICATION_EVENT_TYPES.length
                                    ) {
                                      return (
                                        <p className="text-xs text-muted-foreground">
                                          All event types enabled
                                        </p>
                                      )
                                    }
                                    // Group by category for tooltip
                                    const byCategory = new Map<
                                      NotificationEventCategory,
                                      string[]
                                    >()
                                    eventTypes.forEach((et) => {
                                      const config = ALL_NOTIFICATION_EVENT_TYPES.find(
                                        (t) => t.value === et
                                      )
                                      if (config) {
                                        const cat = config.category
                                        if (!byCategory.has(cat)) byCategory.set(cat, [])
                                        byCategory.get(cat)!.push(config.label)
                                      }
                                    })
                                    return Array.from(byCategory.entries()).map(([cat, items]) => (
                                      <div key={cat} className="mb-1 last:mb-0">
                                        <span className="text-xs font-medium">
                                          {EVENT_CATEGORY_LABELS[cat]}:
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-1">
                                          {items.join(', ')}
                                        </span>
                                      </div>
                                    ))
                                  })()}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {integration.last_sync_at
                                ? new Date(integration.last_sync_at).toLocaleDateString()
                                : 'Never'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  disabled={actionInProgress === integration.id}
                                >
                                  {actionInProgress === integration.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleTestNotification(integration)}
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  Send Test
                                </DropdownMenuItem>
                                <Can permission={Permission.NotificationsWrite}>
                                  <DropdownMenuItem onClick={() => handleEditClick(integration)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                </Can>
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/settings/integrations/notifications/history?integration=${integration.id}`
                                    )
                                  }
                                >
                                  <History className="mr-2 h-4 w-4" />
                                  View Events
                                </DropdownMenuItem>
                                <Can permission={Permission.NotificationsDelete}>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-500"
                                    onClick={() => handleDeleteClick(integration)}
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
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Bell className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-blue-500 mb-1">Real-time Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  Configure notification channels to receive instant alerts when critical
                  vulnerabilities are discovered or when security findings need immediate attention.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification Channel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedIntegration?.name}</strong>? You will
              no longer receive notifications through this channel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
