'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Inbox,
  Info,
  Loader2,
  Settings,
} from 'lucide-react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  useNotificationsApi,
  useUnreadCountApi,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  invalidateNotificationsCache,
  type UserNotification,
  type NotificationListFilters,
} from '@/features/notifications/api/use-notification-api'
import {
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_LABELS,
} from '@/features/notifications/lib/notification-types'

const severityColors: Record<string, string> = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-blue-500',
  info: 'text-muted-foreground',
}

const severityBgColors: Record<string, string> = {
  critical: 'bg-red-500/10 border-red-500/20',
  high: 'bg-orange-500/10 border-orange-500/20',
  medium: 'bg-yellow-500/10 border-yellow-500/20',
  low: 'bg-blue-500/10 border-blue-500/20',
  info: 'bg-muted border-muted-foreground/10',
}

const PER_PAGE = 20

function NotificationRow({
  notification,
  onMarkAsRead,
}: {
  notification: UserNotification
  onMarkAsRead: (id: string) => void
}) {
  const Icon = NOTIFICATION_TYPE_ICONS[notification.notification_type] || Info
  const typeLabel =
    NOTIFICATION_TYPE_LABELS[notification.notification_type] || notification.notification_type

  const handleMarkAsRead = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!notification.is_read) {
      e.preventDefault()
      onMarkAsRead(notification.id)
    }
  }

  const ariaLabel = `${notification.is_read ? '' : 'Unread: '}${notification.title} - ${typeLabel} - ${notification.severity}`

  const rowContent = (
    <>
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border sm:h-9 sm:w-9',
          severityBgColors[notification.severity],
          severityColors[notification.severity]
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm leading-snug', !notification.is_read && 'font-medium')}>
            {notification.title}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
              {typeLabel}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-[10px]', severityColors[notification.severity])}
            >
              {notification.severity}
            </Badge>
          </div>
        </div>

        {notification.body && (
          <p className="text-xs text-muted-foreground line-clamp-2">{notification.body}</p>
        )}

        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      {!notification.is_read && (
        <div className="mt-2 flex-shrink-0">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
      )}
    </>
  )

  const rowClassName = cn(
    'flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 sm:gap-4 sm:p-4',
    !notification.is_read && 'border-primary/20 bg-primary/5'
  )

  if (notification.url) {
    return (
      <Link
        href={notification.url}
        className={cn(rowClassName, 'block')}
        onClick={handleMarkAsRead}
        aria-label={ariaLabel}
      >
        {rowContent}
      </Link>
    )
  }

  return (
    <div
      className={rowClassName}
      onClick={handleMarkAsRead}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleMarkAsRead(e)
      }}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
    >
      {rowContent}
    </div>
  )
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [readFilter, setReadFilter] = useState<string>('all')

  // Build server-side filters
  const filters = useMemo<NotificationListFilters>(() => {
    const f: NotificationListFilters = {}
    if (severityFilter !== 'all') f.severity = severityFilter
    if (readFilter === 'unread') f.is_read = false
    if (readFilter === 'read') f.is_read = true
    return f
  }, [severityFilter, readFilter])

  const { data, isLoading, error } = useNotificationsApi(page, PER_PAGE, filters)
  const { data: unreadData } = useUnreadCountApi()

  const notifications = data?.data ?? []
  const totalPages = data?.total_pages ?? 0
  const total = data?.total ?? 0
  const unreadCount = unreadData?.count ?? 0

  const markingRef = useRef<Set<string>>(new Set())

  const handleMarkAsRead = useCallback(async (id: string) => {
    if (markingRef.current.has(id)) return
    markingRef.current.add(id)
    try {
      await markNotificationAsRead(id)
      await invalidateNotificationsCache()
    } catch {
      // Silent fail — will retry on next poll
    } finally {
      markingRef.current.delete(id)
    }
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead()
      await invalidateNotificationsCache()
    } catch {
      // Silent fail
    }
  }, [])

  // Reset page when filters change
  const handleSeverityChange = (value: string) => {
    setSeverityFilter(value)
    setPage(1)
  }

  const handleReadFilterChange = (value: string) => {
    setReadFilter(value)
    setPage(1)
  }

  return (
    <Main>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Notifications" description="Manage your in-app notifications" />
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark all as read
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/notifications">
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">Unread</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BellOff className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{Math.max(0, total - unreadCount)}</p>
              <p className="text-xs text-muted-foreground">Read</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Inbox className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filters:
        </div>
        <Select value={severityFilter} onValueChange={handleSeverityChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={readFilter} onValueChange={handleReadFilterChange}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notification List */}
      <Card className="mt-4">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 mb-3 animate-spin opacity-30" />
              <p className="text-sm">Loading notifications...</p>
            </div>
          ) : error && !data ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm font-medium">Failed to load notifications</p>
              <p className="text-xs mt-1">Please try refreshing the page</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {severityFilter === 'all' && readFilter === 'all'
                  ? 'No notifications yet'
                  : 'No matching notifications'}
              </p>
              <p className="text-xs mt-1">
                {severityFilter === 'all' && readFilter === 'all'
                  ? 'Notifications will appear here when events occur'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="divide-y p-2 sm:p-3 space-y-2">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Main>
  )
}
