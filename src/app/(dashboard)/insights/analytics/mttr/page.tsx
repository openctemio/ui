'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '@/components/charts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Timer,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
} from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
}

const SEVERITY_TARGETS: Record<string, { hours: number; label: string }> = {
  critical: { hours: 24, label: '24h' },
  high: { hours: 72, label: '72h' },
  medium: { hours: 168, label: '1 week' },
  low: { hours: 720, label: '30 days' },
}

function LoadingSkeleton() {
  return (
    <>
      {/* Stats row skeleton */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
      </section>

      {/* MTTR by Severity skeleton */}
      <section className="mb-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </section>

      {/* Bottom row skeleton */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Timer className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No remediation data available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run scans and resolve findings to start tracking MTTR metrics.
        </p>
      </CardContent>
    </Card>
  )
}

export default function MTTRPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const openFindings =
    stats.findings.total -
    (stats.findings.byStatus.resolved || 0) -
    (stats.findings.byStatus.closed || 0)
  const resolvedFindings =
    (stats.findings.byStatus.resolved || 0) + (stats.findings.byStatus.closed || 0)
  const overdueCount = stats.findings.overdue
  const overdueRatio = stats.findings.total > 0 ? overdueCount / stats.findings.total : 0
  const mttrEstimate = overdueRatio > 0.5 ? 'High' : 'Moderate'

  const severityMttrData = useMemo(() => {
    const severities = ['critical', 'high', 'medium', 'low'] as const
    return severities.map((severity) => {
      const target = SEVERITY_TARGETS[severity].hours
      // Derive actual estimate from overdue ratio: higher overdue ratio means slower remediation
      const actualMultiplier = 1 + overdueRatio * 1.5
      const actual = Math.round(target * actualMultiplier)
      const count = stats.findings.bySeverity[severity] || 0
      return {
        severity: severity.charAt(0).toUpperCase() + severity.slice(1),
        target,
        actual,
        count,
        targetLabel: SEVERITY_TARGETS[severity].label,
        color: SEVERITY_COLORS[severity],
      }
    })
  }, [stats.findings.bySeverity, overdueRatio])

  const trendData = useMemo(() => {
    return stats.findingTrend.map((point) => ({
      date: point.date,
      total: point.critical + point.high + point.medium + point.low + point.info,
    }))
  }, [stats.findingTrend])

  const trendDirection = useMemo(() => {
    if (trendData.length < 2) return 'stable'
    const recent = trendData[trendData.length - 1].total
    const previous = trendData[trendData.length - 2].total
    if (recent < previous) return 'improving'
    if (recent > previous) return 'degrading'
    return 'stable'
  }, [trendData])

  const overduePercent =
    stats.findings.total > 0 ? Math.round((overdueCount / stats.findings.total) * 100) : 0

  const slaCompliance = 100 - overduePercent

  const hasData = stats.findings.total > 0

  return (
    <Main>
      <PageHeader
        title="MTTR Analytics"
        description="Track mean time to remediate findings across severity levels"
        className="mb-6"
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats Row */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Estimated MTTR"
              value={mttrEstimate}
              change={overdueRatio > 0.5 ? 'Above target' : 'Within target'}
              changeType={overdueRatio > 0.5 ? 'negative' : 'positive'}
              icon={Timer}
            />
            <StatsCard
              title="Open Findings"
              value={openFindings}
              change={`${stats.findings.total} total`}
              changeType={openFindings > 0 ? 'negative' : 'positive'}
              icon={AlertTriangle}
            />
            <StatsCard
              title="Resolved"
              value={resolvedFindings}
              change={
                stats.findings.total > 0
                  ? `${Math.round((resolvedFindings / stats.findings.total) * 100)}% resolution rate`
                  : 'No data'
              }
              changeType={resolvedFindings > 0 ? 'positive' : 'neutral'}
              icon={CheckCircle}
            />
            <StatsCard
              title="Overdue"
              value={overdueCount}
              change={`${overduePercent}% of total`}
              changeType={overdueCount > 0 ? 'negative' : 'positive'}
              icon={Clock}
            />
          </section>

          {/* MTTR by Severity */}
          <section className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>MTTR by Severity</CardTitle>
                <CardDescription>
                  Target vs estimated actual remediation time per severity level (hours)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {severityMttrData.map((item) => {
                    const maxHours = Math.max(item.target, item.actual)
                    const targetPercent = maxHours > 0 ? (item.target / maxHours) * 100 : 0
                    const actualPercent = maxHours > 0 ? (item.actual / maxHours) * 100 : 0
                    const isOverTarget = item.actual > item.target

                    return (
                      <div key={item.severity} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm font-medium">{item.severity}</span>
                            <span className="text-xs text-muted-foreground">
                              ({item.count} findings)
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground">
                              Target: {item.targetLabel}
                            </span>
                            <span
                              className={cn(
                                'font-medium',
                                isOverTarget ? 'text-red-500' : 'text-green-500'
                              )}
                            >
                              Actual: {item.actual}h
                            </span>
                          </div>
                        </div>
                        {/* Target bar */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-xs text-muted-foreground">Target</span>
                            <div className="flex-1">
                              <Progress value={targetPercent} className="h-2" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-xs text-muted-foreground">Actual</span>
                            <div className="flex-1">
                              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    isOverTarget ? 'bg-red-500' : 'bg-green-500'
                                  )}
                                  style={{ width: `${actualPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Resolution Trend + Performance Indicators */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Resolution Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Resolution Trend</CardTitle>
                <CardDescription>
                  Total finding counts over time across all severities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Total Findings"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No trend data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Indicators</CardTitle>
                <CardDescription>Key metrics for remediation effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Overdue Rate */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Overdue Rate</p>
                        <p className="text-xs text-muted-foreground">
                          Percentage of findings past their SLA
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        overduePercent > 50
                          ? 'destructive'
                          : overduePercent > 20
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {overduePercent}%
                    </Badge>
                  </div>

                  {/* Remediation Velocity */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      {trendDirection === 'improving' ? (
                        <TrendingDown className="h-5 w-5 text-green-500" />
                      ) : trendDirection === 'degrading' ? (
                        <TrendingUp className="h-5 w-5 text-red-500" />
                      ) : (
                        <Minus className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">Remediation Velocity</p>
                        <p className="text-xs text-muted-foreground">
                          Trend direction based on recent data
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        trendDirection === 'improving'
                          ? 'secondary'
                          : trendDirection === 'degrading'
                            ? 'destructive'
                            : 'outline'
                      }
                    >
                      {trendDirection === 'improving'
                        ? 'Improving'
                        : trendDirection === 'degrading'
                          ? 'Degrading'
                          : 'Stable'}
                    </Badge>
                  </div>

                  {/* SLA Compliance */}
                  <div className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">SLA Compliance</p>
                          <p className="text-xs text-muted-foreground">
                            Estimated compliance based on overdue ratio
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-bold',
                          slaCompliance >= 80
                            ? 'text-green-500'
                            : slaCompliance >= 50
                              ? 'text-yellow-500'
                              : 'text-red-500'
                        )}
                      >
                        {slaCompliance}%
                      </span>
                    </div>
                    <Progress value={slaCompliance} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </Main>
  )
}
