'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  History,
  LogIn,
  LogOut,
  Key,
  User,
  Shield,
  Smartphone,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import type { ActivityEventType, ActivityLog } from '@/features/account'
import { ACTIVITY_EVENT_LABELS } from '@/features/account'

// Mock data for demo - in production this would come from API
const mockActivityLogs: ActivityLog[] = [
  {
    id: '1',
    event_type: 'login',
    description: 'Signed in from Chrome on macOS',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'Ho Chi Minh, Vietnam',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
  },
  {
    id: '2',
    event_type: 'profile_update',
    description: 'Updated profile information',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'Ho Chi Minh, Vietnam',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: '3',
    event_type: 'password_change',
    description: 'Password changed successfully',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'Ho Chi Minh, Vietnam',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: '4',
    event_type: '2fa_enabled',
    description: 'Two-factor authentication enabled',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'Ho Chi Minh, Vietnam',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
  },
  {
    id: '5',
    event_type: 'session_revoked',
    description: 'Revoked session from iPhone',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'Ho Chi Minh, Vietnam',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
  },
  {
    id: '6',
    event_type: 'login',
    description: 'Signed in from Safari on iPhone',
    ip_address: '10.0.0.1',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    location: 'Da Nang, Vietnam',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
  },
  {
    id: '7',
    event_type: 'logout',
    description: 'Signed out',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'Ho Chi Minh, Vietnam',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
  },
]

const eventTypeIcons: Record<ActivityEventType, typeof LogIn> = {
  login: LogIn,
  logout: LogOut,
  password_change: Key,
  profile_update: User,
  '2fa_enabled': Shield,
  '2fa_disabled': Shield,
  session_revoked: Smartphone,
  api_key_created: Key,
  api_key_revoked: Key,
}

const eventTypeColors: Record<ActivityEventType, string> = {
  login: 'bg-green-500/10 text-green-500',
  logout: 'bg-gray-500/10 text-gray-500',
  password_change: 'bg-yellow-500/10 text-yellow-500',
  profile_update: 'bg-blue-500/10 text-blue-500',
  '2fa_enabled': 'bg-green-500/10 text-green-500',
  '2fa_disabled': 'bg-red-500/10 text-red-500',
  session_revoked: 'bg-orange-500/10 text-orange-500',
  api_key_created: 'bg-purple-500/10 text-purple-500',
  api_key_revoked: 'bg-red-500/10 text-red-500',
}

export default function ActivityPage() {
  const [filter, setFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const perPage = 10

  // In production, this would be a useSWR hook
  const isLoading = false
  const activities = mockActivityLogs

  // Filter activities
  const filteredActivities =
    filter === 'all' ? activities : activities.filter((a) => a.event_type === filter)

  // Paginate
  const totalPages = Math.ceil(filteredActivities.length / perPage)
  const paginatedActivities = filteredActivities.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="grid gap-6">
      {/* Header with Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Activity Log
              </CardTitle>
              <CardDescription>
                View your recent account activity and security events
              </CardDescription>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity</SelectItem>
                <SelectItem value="login">Sign In</SelectItem>
                <SelectItem value="logout">Sign Out</SelectItem>
                <SelectItem value="password_change">Password Change</SelectItem>
                <SelectItem value="profile_update">Profile Update</SelectItem>
                <SelectItem value="2fa_enabled">2FA Enabled</SelectItem>
                <SelectItem value="2fa_disabled">2FA Disabled</SelectItem>
                <SelectItem value="session_revoked">Session Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : paginatedActivities.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No activity found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedActivities.map((activity) => {
                const Icon = eventTypeIcons[activity.event_type]
                const colorClass = eventTypeColors[activity.event_type]

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${colorClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{ACTIVITY_EVENT_LABELS[activity.event_type]}</p>
                        <Badge variant="outline" className="text-xs">
                          {activity.event_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{activity.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{activity.ip_address}</span>
                        {activity.location && (
                          <>
                            <span>•</span>
                            <span>{activity.location}</span>
                          </>
                        )}
                        <span>•</span>
                        <span title={format(new Date(activity.created_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1} to{' '}
                {Math.min(page * perPage, filteredActivities.length)} of {filteredActivities.length}{' '}
                activities
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium">Security Tip</p>
              <p className="text-sm text-muted-foreground mt-1">
                Review your activity regularly to detect unauthorized access. If you see any
                suspicious activity, change your password immediately and contact support.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
