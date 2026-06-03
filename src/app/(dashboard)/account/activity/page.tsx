'use client'

import { useMemo, useState } from 'react'
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
  Key,
  User,
  Shield,
  Users,
  Building,
  Mail,
  Settings,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { formatRelative, formatDateSafe } from '@/lib/format-date'
import { useUser } from '@/stores/auth-store'
import { useAccountActivity } from '@/features/account'
import {
  getActionCategory,
  formatAction,
  RESULT_DISPLAY,
} from '@/features/organization/types/audit.types'

// Icon per action category (action looks like "auth.login", "user.updated", …)
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  auth: Key,
  user: User,
  member: Users,
  invitation: Mail,
  tenant: Building,
  settings: Settings,
  permission: Shield,
  other: History,
}

const CATEGORY_COLORS: Record<string, string> = {
  auth: 'bg-green-500/10 text-green-500',
  user: 'bg-blue-500/10 text-blue-500',
  member: 'bg-purple-500/10 text-purple-500',
  invitation: 'bg-cyan-500/10 text-cyan-500',
  tenant: 'bg-indigo-500/10 text-indigo-500',
  settings: 'bg-yellow-500/10 text-yellow-500',
  permission: 'bg-orange-500/10 text-orange-500',
  other: 'bg-muted text-muted-foreground',
}

// Filter options map to action categories (the prefix before the first dot).
const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Activity' },
  { value: 'auth', label: 'Authentication' },
  { value: 'user', label: 'Account' },
  { value: 'settings', label: 'Settings' },
  { value: 'permission', label: 'Permissions' },
]

const PER_PAGE = 10

export default function ActivityPage() {
  const user = useUser()
  const [filter, setFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { activities, isLoading } = useAccountActivity(user?.id)

  // Filter by action category, then paginate client-side.
  const filteredActivities = useMemo(
    () =>
      filter === 'all'
        ? activities
        : activities.filter((a) => getActionCategory(a.action) === filter),
    [activities, filter]
  )

  const totalPages = Math.ceil(filteredActivities.length / PER_PAGE)
  const paginatedActivities = filteredActivities.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setPage(1)
  }

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
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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
                const category = getActionCategory(activity.action)
                const Icon = CATEGORY_ICONS[category] ?? History
                const colorClass = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other
                const result = RESULT_DISPLAY[activity.result]

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
                        <p className="font-medium">{formatAction(activity.action)}</p>
                        {result && (
                          <Badge className={`${result.bgColor} ${result.color} border-0 text-xs`}>
                            {result.label}
                          </Badge>
                        )}
                      </div>
                      {activity.message && (
                        <p className="text-sm text-muted-foreground mt-0.5">{activity.message}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {activity.actor_ip && <span>{activity.actor_ip}</span>}
                        {activity.actor_ip && <span>•</span>}
                        <span title={formatDateSafe(activity.timestamp, 'PPpp')}>
                          {formatRelative(activity.timestamp)}
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
                Showing {(page - 1) * PER_PAGE + 1} to{' '}
                {Math.min(page * PER_PAGE, filteredActivities.length)} of{' '}
                {filteredActivities.length} activities
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
