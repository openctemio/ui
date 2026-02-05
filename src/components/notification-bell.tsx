'use client'

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

// Types
interface UserNotification {
  id: string
  notification_type: string
  title: string
  body?: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  icon?: string
  resource_type?: string
  resource_id?: string
  url?: string
  is_read: boolean
  created_at: string
}

// Mock data - will be replaced with API calls
const mockNotifications: UserNotification[] = [
  {
    id: '1',
    notification_type: 'finding_new',
    title: 'Critical SQL Injection vulnerability found',
    body: 'Detected in api-server.example.com - Immediate action required',
    severity: 'critical',
    url: '/findings',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
  },
  {
    id: '2',
    notification_type: 'scan_completed',
    title: 'Weekly Security Scan completed',
    body: 'Found 3 new vulnerabilities, 12 assets scanned',
    severity: 'info',
    url: '/scans',
    is_read: false,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
  },
  {
    id: '3',
    notification_type: 'finding_assigned',
    title: 'Finding assigned to you',
    body: 'XSS vulnerability in login page needs your attention',
    severity: 'high',
    url: '/findings',
    is_read: false,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
  },
  {
    id: '4',
    notification_type: 'finding_status_change',
    title: 'Finding marked as resolved',
    body: 'CSRF vulnerability has been fixed and verified',
    severity: 'medium',
    url: '/findings',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: '5',
    notification_type: 'scan_failed',
    title: 'Scan failed: Connection timeout',
    body: 'Unable to reach target: staging.example.com',
    severity: 'high',
    url: '/scans',
    is_read: true,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
]

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
  const [notifications, setNotifications] = useState(mockNotifications)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

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
          {notifications.length === 0 ? (
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
            <Link href="/insights/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
