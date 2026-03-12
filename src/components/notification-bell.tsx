'use client'

import { useCallback } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  Bell,
  Bug,
  CheckCheck,
  CheckCircle,
  Info,
  Loader2,
  Scan,
  User,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  useNotificationsApi,
  useUnreadCountApi,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  invalidateNotificationsCache,
  type UserNotification,
} from '@/features/notifications/api/use-notification-api'
import { useTenantChannel } from '@/hooks/use-websocket'
import { useTenant } from '@/context/tenant-provider'

const severityColors: Record<string, string> = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-blue-500',
  info: 'text-muted-foreground',
}

const severityBgColors: Record<string, string> = {
  critical: 'bg-red-500/10',
  high: 'bg-orange-500/10',
  medium: 'bg-yellow-500/10',
  low: 'bg-blue-500/10',
  info: 'bg-muted',
}

const typeIcons: Record<string, typeof AlertTriangle> = {
  finding_new: Bug,
  finding_assigned: User,
  finding_status_change: CheckCircle,
  finding_comment: Info,
  finding_mention: User,
  scan_started: Scan,
  scan_completed: CheckCircle,
  scan_failed: XCircle,
  asset_new: Info,
  member_invited: User,
  member_joined: User,
  role_changed: User,
  system_alert: AlertTriangle,
}

interface NotificationItemProps {
  notification: UserNotification
  onMarkAsRead: (id: string) => void
  onClose: () => void
}

function NotificationItem({ notification, onMarkAsRead, onClose }: NotificationItemProps) {
  const Icon = typeIcons[notification.notification_type] || Info

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id)
    }
    onClose()
  }

  const content = (
    <div
      className={cn(
        'flex gap-2 p-2.5 hover:bg-muted/50 cursor-pointer transition-colors sm:gap-3 sm:p-3',
        !notification.is_read && 'bg-muted/30'
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          'mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full sm:h-7 sm:w-7',
          severityBgColors[notification.severity],
          severityColors[notification.severity]
        )}
      >
        <Icon className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
        <p
          className={cn('text-xs leading-tight sm:text-sm', !notification.is_read && 'font-medium')}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 sm:text-xs">
            {notification.body}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground sm:text-xs">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="mt-1.5 flex-shrink-0 sm:mt-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary sm:h-2 sm:w-2" />
        </div>
      )}
    </div>
  )

  if (notification.url) {
    return <Link href={notification.url}>{content}</Link>
  }

  return content
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { currentTenant } = useTenant()

  // Fetch notifications and unread count from API
  const {
    data: notificationsData,
    isLoading,
    mutate: mutateNotifications,
  } = useNotificationsApi(1, 20)
  const { data: unreadData, mutate: mutateUnreadCount } = useUnreadCountApi()

  const notifications = notificationsData?.data ?? []
  const unreadCount = unreadData?.count ?? 0

  // Subscribe to tenant-wide WebSocket channel for real-time updates
  // This catches audience=all notifications broadcast to the tenant channel
  useTenantChannel(currentTenant?.id ?? null, {
    onData: useCallback(
      (data: Record<string, unknown>) => {
        // Only revalidate when the WebSocket event is a notification
        if (data?.type === 'notification') {
          mutateNotifications()
          mutateUnreadCount()
        }
      },
      [mutateNotifications, mutateUnreadCount]
    ),
  })

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationAsRead(id)
      await invalidateNotificationsCache()
    } catch {
      // Silently fail - notification will still appear as unread
      // and will be retried on next poll
    }
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead()
      await invalidateNotificationsCache()
    } catch {
      // Silently fail
    }
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[340px] max-w-[calc(100vw-1rem)] p-0 sm:w-[380px]"
        align="end"
        sideOffset={8}
        collisionPadding={16}
      >
        <div className="flex items-center justify-between px-3 py-3 sm:px-4">
          <h4 className="text-sm font-semibold sm:text-base">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1 sm:mr-1" />
              <span className="hidden sm:inline">Mark all as read</span>
              <span className="sm:hidden">Mark read</span>
            </Button>
          )}
        </div>

        <Separator />

        <ScrollArea className="h-[320px] sm:h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground sm:py-12">
              <Loader2 className="h-8 w-8 mb-2 animate-spin opacity-30 sm:h-10 sm:w-10 sm:mb-3" />
              <p className="text-xs font-medium sm:text-sm">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground sm:py-12">
              <Bell className="h-8 w-8 mb-2 opacity-30 sm:h-10 sm:w-10 sm:mb-3" />
              <p className="text-xs font-medium sm:text-sm">No notifications</p>
              <p className="text-[11px] sm:text-xs">You are all caught up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="p-1.5 sm:p-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-xs text-muted-foreground hover:text-foreground sm:text-sm"
            size="sm"
            asChild
          >
            <Link href="/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
