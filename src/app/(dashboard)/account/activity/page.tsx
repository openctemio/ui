'use client'

import { useMemo, useState } from 'react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { EmptyState, ErrorState } from '@/features/shared'
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

// Filter options map to action categories (the prefix before the first dot).
const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All activity' },
  { value: 'auth', label: 'Sign-in' },
  { value: 'user', label: 'Account' },
  { value: 'settings', label: 'Settings' },
  { value: 'permission', label: 'Permissions' },
]

const PER_PAGE = 10

export default function ActivityPage() {
  const user = useUser()
  const [filter, setFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { activities, isLoading, error, mutate } = useAccountActivity(user?.id)

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
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Sign-ins and changes made with your account.</CardDescription>
          <CardAction>
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="h-8 w-36 sm:w-44" aria-label="Filter activity">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent align="end">
                {FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <ErrorState title="your activity" error={error} onRetry={() => void mutate()} />
          ) : paginatedActivities.length === 0 ? (
            <EmptyState
              icon={History}
              title="No activity"
              description={
                filter === 'all'
                  ? 'Nothing recorded for your account yet.'
                  : 'Nothing of this type.'
              }
              card={false}
            />
          ) : (
            <ul className="divide-y rounded-md border">
              {paginatedActivities.map((activity) => {
                const category = getActionCategory(activity.action)
                const Icon = CATEGORY_ICONS[category] ?? History
                const result = RESULT_DISPLAY[activity.result]

                return (
                  <li key={activity.id} className="flex items-start gap-3 p-3 sm:gap-4 sm:p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{formatAction(activity.action)}</p>
                        {result && (
                          <Badge className={`${result.bgColor} ${result.color} border-0 text-xs`}>
                            {result.label}
                          </Badge>
                        )}
                      </div>
                      {activity.message && (
                        <p className="mt-0.5 break-words text-sm text-muted-foreground">
                          {activity.message}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        {activity.actor_ip && (
                          <>
                            <span className="font-mono">{activity.actor_ip}</span>
                            <span aria-hidden>·</span>
                          </>
                        )}
                        <span title={formatDateSafe(activity.timestamp, 'PPpp')}>
                          {formatRelative(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground tabular-nums">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filteredActivities.length)}{' '}
                of {filteredActivities.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Shield />
        <AlertTitle>Something you don&apos;t recognise?</AlertTitle>
        <AlertDescription>
          <p className="text-muted-foreground">
            Change your password straight away and sign out your other devices from the Security
            tab.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}
