'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from '@/components/charts'
import { cn } from '@/lib/utils'
import { MessageSquare, Activity, AlertTriangle, Clock, Users, FileText } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#3b82f6',
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="mt-2 h-3 w-32" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  )
}

function ActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

const ACTIVITY_TYPE_CONFIG: Record<string, { icon: typeof MessageSquare; color: string }> = {
  finding: { icon: AlertTriangle, color: 'text-red-500 bg-red-500/10' },
  scan: { icon: Activity, color: 'text-blue-500 bg-blue-500/10' },
  asset: { icon: FileText, color: 'text-green-500 bg-green-500/10' },
  default: { icon: MessageSquare, color: 'text-muted-foreground bg-muted' },
}

export default function DiscussionThreadPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] || '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const activityCount = stats.recentActivity.length
  const findingDiscussions = stats.recentActivity.filter((a) => a.type === 'finding').length

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Discussion Thread"
          description="Collaborate on findings with team discussions"
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ActivitySkeleton />
          <ChartSkeleton />
        </div>
      </Main>
    )
  }

  const hasData = activityCount > 0 || stats.findings.total > 0

  return (
    <Main>
      <PageHeader
        title="Discussion Thread"
        description="Collaborate on findings with team discussions"
      />

      {/* Stats Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Discussions"
          value={activityCount}
          icon={MessageSquare}
          description="Active discussion threads"
        />
        <StatsCard
          title="Finding Discussions"
          value={findingDiscussions}
          icon={AlertTriangle}
          description="Related to findings"
        />
        <StatsCard
          title="Total Findings"
          value={stats.findings.total}
          icon={FileText}
          description="Across all categories"
        />
        <StatsCard
          title="Overdue Items"
          value={stats.findings.overdue}
          icon={Clock}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
          description="Needing discussion"
        />
      </div>

      {!hasData ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">No Discussions Yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Discussions will appear here once team members start collaborating on findings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Recent Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>Latest discussions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentActivity.slice(0, 8).map((activity, index) => {
                      const config =
                        ACTIVITY_TYPE_CONFIG[activity.type] || ACTIVITY_TYPE_CONFIG.default
                      const Icon = config.icon
                      const timeAgo = new Date(activity.timestamp).toLocaleDateString()
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full',
                              config.color
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{activity.title}</p>
                            <p className="text-muted-foreground text-xs truncate">
                              {activity.description}
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-xs">{timeAgo}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex h-[280px] items-center justify-center">
                    <div className="text-center">
                      <Activity className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                      <p className="text-muted-foreground text-sm">No recent activity</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Severity Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Discussion Severity Breakdown</CardTitle>
                <CardDescription>Findings under discussion by severity</CardDescription>
              </CardHeader>
              <CardContent>
                {severityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No severity data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity Summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Activity Summary</CardTitle>
              <CardDescription>Discussion participation and coverage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: 'Active Threads',
                    value: activityCount,
                    pct: 100,
                    icon: MessageSquare,
                    color: 'text-blue-500',
                  },
                  {
                    label: 'Finding Coverage',
                    value: findingDiscussions,
                    pct:
                      activityCount > 0
                        ? Math.round((findingDiscussions / activityCount) * 100)
                        : 0,
                    icon: AlertTriangle,
                    color: 'text-orange-500',
                  },
                  {
                    label: 'Repository Findings',
                    value: stats.repositories.withFindings,
                    pct:
                      stats.repositories.total > 0
                        ? Math.round(
                            (stats.repositories.withFindings / stats.repositories.total) * 100
                          )
                        : 0,
                    icon: Users,
                    color: 'text-green-500',
                  },
                ].map((metric) => {
                  const Icon = metric.icon
                  return (
                    <div key={metric.label} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-5 w-5', metric.color)} />
                        <span className="text-sm font-medium">{metric.label}</span>
                      </div>
                      <div className="text-2xl font-bold">{metric.value}</div>
                      <Progress value={metric.pct} className="h-1.5" />
                      <p className="text-muted-foreground text-xs">{metric.pct}% coverage</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </Main>
  )
}
