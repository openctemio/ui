'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from '@/components/charts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { CheckCircle, Clock, AlertTriangle, Target, TrendingUp, BarChart3 } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  in_progress: '#f59e0b',
  resolved: '#22c55e',
  closed: '#6b7280',
  accepted: '#8b5cf6',
  false_positive: '#a3a3a3',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  accepted: 'Accepted',
  false_positive: 'False Positive',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

// --- Skeleton Components ---

function HeroCardSkeleton() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <Skeleton className="h-6 w-full" />
          </div>
          <Skeleton className="h-12 w-20" />
        </div>
        <Skeleton className="mt-3 h-4 w-40" />
      </CardContent>
    </Card>
  )
}

function StatsRowSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  )
}

function ActionItemsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

// --- Main Page ---

export default function ProgressTrackingPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const findingsByStatus = useMemo(() => stats.findings.byStatus || {}, [stats.findings.byStatus])
  const findingsBySeverity = useMemo(
    () => stats.findings.bySeverity || {},
    [stats.findings.bySeverity]
  )

  const resolvedCount = useMemo(() => {
    return (findingsByStatus.resolved || 0) + (findingsByStatus.closed || 0)
  }, [findingsByStatus])

  const openCount = useMemo(() => {
    return findingsByStatus.open || 0
  }, [findingsByStatus])

  const resolutionRate = useMemo(() => {
    if (stats.findings.total === 0) return 0
    return Math.round((resolvedCount / stats.findings.total) * 100)
  }, [resolvedCount, stats.findings.total])

  const progressColor = useMemo(() => {
    if (resolutionRate > 70) return 'text-green-600'
    if (resolutionRate > 40) return 'text-yellow-600'
    return 'text-red-600'
  }, [resolutionRate])

  const progressBarClassName = useMemo(() => {
    if (resolutionRate > 70) return '[&>[data-slot=progress-indicator]]:bg-green-500'
    if (resolutionRate > 40) return '[&>[data-slot=progress-indicator]]:bg-yellow-500'
    return '[&>[data-slot=progress-indicator]]:bg-red-500'
  }, [resolutionRate])

  // Status breakdown chart data
  const statusChartData = useMemo(() => {
    const statuses = Object.keys(STATUS_LABELS)
    return statuses
      .filter((status) => (findingsByStatus[status] || 0) > 0)
      .map((status) => ({
        name: STATUS_LABELS[status] || status,
        count: findingsByStatus[status] || 0,
        fill: STATUS_COLORS[status] || '#6b7280',
      }))
  }, [findingsByStatus])

  // Finding trend area chart data
  const trendChartData = useMemo(() => {
    return stats.findingTrend.map((point) => ({
      date: point.date,
      critical: point.critical,
      high: point.high,
      medium: point.medium,
      low: point.low,
      info: point.info,
      total: point.critical + point.high + point.medium + point.low + point.info,
    }))
  }, [stats.findingTrend])

  // Action items
  const actionItems = useMemo(() => {
    const items: { message: string; variant: 'destructive' | 'secondary' | 'outline' }[] = []

    if (stats.findings.overdue > 0) {
      items.push({
        message: `${stats.findings.overdue} overdue finding${stats.findings.overdue !== 1 ? 's' : ''} require immediate attention`,
        variant: 'destructive',
      })
    }

    const criticalCount = findingsBySeverity.critical || 0
    const highCount = findingsBySeverity.high || 0
    if (criticalCount > 0 || highCount > 0) {
      const parts: string[] = []
      if (criticalCount > 0) parts.push(`${criticalCount} critical`)
      if (highCount > 0) parts.push(`${highCount} high`)
      items.push({
        message: `${parts.join(' and ')} severity finding${criticalCount + highCount !== 1 ? 's' : ''} need remediation`,
        variant: criticalCount > 0 ? 'destructive' : 'secondary',
      })
    }

    if (stats.findings.total > 0) {
      if (resolutionRate >= 70) {
        items.push({
          message: `Strong remediation progress at ${resolutionRate}%. Continue current efforts to close remaining findings.`,
          variant: 'outline',
        })
      } else if (resolutionRate >= 40) {
        items.push({
          message: `Remediation progress at ${resolutionRate}%. Increase focus on resolving open findings to improve overall posture.`,
          variant: 'secondary',
        })
      } else {
        items.push({
          message: `Remediation progress is low at ${resolutionRate}%. Prioritize critical and high severity findings for immediate action.`,
          variant: 'destructive',
        })
      }
    }

    return items
  }, [stats.findings.overdue, findingsBySeverity, resolutionRate, stats.findings.total])

  const isEmptyState = !isLoading && stats.findings.total === 0 && stats.assets.total === 0

  return (
    <Main>
      <PageHeader
        title="Remediation Progress"
        description="Track the overall progress of security finding remediation across your organization"
        className="mb-6"
      />

      {isEmptyState ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground text-center">
              No remediation data available yet. Import findings to start tracking progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 1. Overall Progress Hero Card */}
          {isLoading ? (
            <HeroCardSkeleton />
          ) : (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Overall Remediation Progress
                </CardTitle>
                <CardDescription>
                  Resolution rate across all findings in your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <Progress
                      value={resolutionRate}
                      className={cn('h-6 rounded-lg', progressBarClassName)}
                    />
                  </div>
                  <span className={cn('text-4xl font-bold tabular-nums', progressColor)}>
                    {resolutionRate}%
                  </span>
                </div>
                <p className="text-muted-foreground mt-3 text-sm">
                  {resolvedCount} of {stats.findings.total} finding
                  {stats.findings.total !== 1 ? 's' : ''} resolved
                </p>
              </CardContent>
            </Card>
          )}

          {/* 2. Stats Row */}
          {isLoading ? (
            <StatsRowSkeleton />
          ) : (
            <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatsCard
                title="Open Findings"
                value={openCount}
                description="Awaiting remediation"
                icon={AlertTriangle}
                changeType={openCount > 0 ? 'negative' : 'positive'}
              />
              <StatsCard
                title="Resolved Findings"
                value={resolvedCount}
                description="Successfully remediated"
                icon={CheckCircle}
                changeType={resolvedCount > 0 ? 'positive' : 'neutral'}
              />
              <StatsCard
                title="Overdue Items"
                value={stats.findings.overdue}
                description="Past SLA deadline"
                icon={Clock}
                changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
              />
              <StatsCard
                title="Resolution Rate"
                value={`${resolutionRate}%`}
                description="Resolved / total findings"
                icon={TrendingUp}
                changeType={
                  resolutionRate > 70 ? 'positive' : resolutionRate > 40 ? 'neutral' : 'negative'
                }
              />
            </section>
          )}

          {/* 3 & 4. Charts Row */}
          {isLoading ? (
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCardSkeleton />
              <ChartCardSkeleton />
            </div>
          ) : (
            <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* 3. Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Status Breakdown
                  </CardTitle>
                  <CardDescription>Distribution of findings by current status</CardDescription>
                </CardHeader>
                <CardContent>
                  {statusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={statusChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          width={90}
                        />
                        <Tooltip />
                        <Bar dataKey="count" name="Findings" radius={[0, 4, 4, 0]}>
                          {statusChartData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-muted-foreground">No status data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 4. Remediation Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Remediation Timeline
                  </CardTitle>
                  <CardDescription>Finding severity trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {trendChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="critical"
                          stackId="1"
                          stroke={SEVERITY_COLORS.critical}
                          fill={SEVERITY_COLORS.critical}
                          fillOpacity={0.6}
                          name="Critical"
                        />
                        <Area
                          type="monotone"
                          dataKey="high"
                          stackId="1"
                          stroke={SEVERITY_COLORS.high}
                          fill={SEVERITY_COLORS.high}
                          fillOpacity={0.6}
                          name="High"
                        />
                        <Area
                          type="monotone"
                          dataKey="medium"
                          stackId="1"
                          stroke={SEVERITY_COLORS.medium}
                          fill={SEVERITY_COLORS.medium}
                          fillOpacity={0.6}
                          name="Medium"
                        />
                        <Area
                          type="monotone"
                          dataKey="low"
                          stackId="1"
                          stroke={SEVERITY_COLORS.low}
                          fill={SEVERITY_COLORS.low}
                          fillOpacity={0.6}
                          name="Low"
                        />
                        <Area
                          type="monotone"
                          dataKey="info"
                          stackId="1"
                          stroke={SEVERITY_COLORS.info}
                          fill={SEVERITY_COLORS.info}
                          fillOpacity={0.6}
                          name="Info"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-muted-foreground">No trend data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {/* 5. Action Items */}
          {isLoading ? (
            <ActionItemsSkeleton />
          ) : (
            actionItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Action Items
                  </CardTitle>
                  <CardDescription>
                    Priority items requiring attention based on current remediation data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {actionItems.map((item, index) => (
                      <li key={index} className="flex items-center gap-3 rounded-md border p-3">
                        <Badge variant={item.variant}>
                          {item.variant === 'destructive'
                            ? 'Critical'
                            : item.variant === 'secondary'
                              ? 'Warning'
                              : 'Info'}
                        </Badge>
                        <span className="text-sm">{item.message}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          )}
        </>
      )}
    </Main>
  )
}
