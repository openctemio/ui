'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from '@/components/charts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Gauge, Shield, CheckCircle, XCircle, TrendingUp, AlertTriangle } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']

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

function DetectionCardSkeleton() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="mt-2 h-4 w-32" />
      </CardContent>
    </Card>
  )
}

function ChartsRowSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RecommendationsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

export default function ControlEffectivenessPage() {
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
    return Math.max(0, stats.findings.total - resolvedCount)
  }, [stats.findings.total, resolvedCount])

  const detectionRate = useMemo(() => {
    if (stats.findings.total === 0) return 0
    return Math.round((resolvedCount / stats.findings.total) * 100)
  }, [resolvedCount, stats.findings.total])

  const overdueRate = useMemo(() => {
    if (stats.findings.total === 0) return 0
    return Math.round((stats.findings.overdue / stats.findings.total) * 100)
  }, [stats.findings.overdue, stats.findings.total])

  const severityChartData = useMemo(() => {
    return SEVERITY_ORDER.filter((sev) => (findingsBySeverity[sev] || 0) > 0).map((sev) => {
      const total = findingsBySeverity[sev] || 0
      // Estimate resolved per severity proportionally
      const resolvedRatio = stats.findings.total > 0 ? resolvedCount / stats.findings.total : 0
      const estimatedResolved = Math.round(total * resolvedRatio)
      return {
        name: sev.charAt(0).toUpperCase() + sev.slice(1),
        open: total - estimatedResolved,
        resolved: estimatedResolved,
        fill: SEVERITY_COLORS[sev],
      }
    })
  }, [findingsBySeverity, resolvedCount, stats.findings.total])

  const trendChartData = useMemo(() => {
    return stats.findingTrend.map((point) => ({
      date: point.date,
      total: point.critical + point.high + point.medium + point.low + point.info,
    }))
  }, [stats.findingTrend])

  const recommendations = useMemo(() => {
    const items: { message: string; variant: 'critical' | 'high' | 'low' }[] = []

    if (stats.findings.overdue > 0) {
      items.push({
        message: `Address ${stats.findings.overdue} overdue finding${
          stats.findings.overdue !== 1 ? 's' : ''
        } to improve SLA compliance`,
        variant: 'critical',
      })
    }

    const criticalCount = findingsBySeverity.critical || 0
    if (criticalCount > 0) {
      items.push({
        message: `${criticalCount} critical finding${
          criticalCount !== 1 ? 's' : ''
        } need${criticalCount === 1 ? 's' : ''} immediate remediation`,
        variant: 'critical',
      })
    }

    if (detectionRate < 50 && stats.findings.total > 0) {
      items.push({
        message: 'Detection rate is below 50% - review scanning coverage',
        variant: 'high',
      })
    }

    if (detectionRate > 80 && stats.findings.total > 0) {
      items.push({
        message: 'Strong detection rate - continue current scanning schedule',
        variant: 'low',
      })
    }

    return items
  }, [stats.findings.overdue, findingsBySeverity, detectionRate, stats.findings.total])

  const isEmptyState = !isLoading && stats.findings.total === 0 && stats.assets.total === 0

  const detectionColor = useMemo(() => {
    if (detectionRate > 80) return 'text-green-600'
    if (detectionRate > 60) return 'text-yellow-600'
    if (detectionRate > 40) return 'text-orange-600'
    return 'text-red-600'
  }, [detectionRate])

  const progressClassName = useMemo(() => {
    if (detectionRate > 80) return '[&>[data-slot=progress-indicator]]:bg-green-500'
    if (detectionRate > 60) return '[&>[data-slot=progress-indicator]]:bg-yellow-500'
    if (detectionRate > 40) return '[&>[data-slot=progress-indicator]]:bg-orange-500'
    return '[&>[data-slot=progress-indicator]]:bg-red-500'
  }, [detectionRate])

  const badgeVariantMap: Record<string, 'destructive' | 'secondary' | 'outline'> = {
    critical: 'destructive',
    high: 'secondary',
    low: 'outline',
  }

  return (
    <Main>
      <PageHeader
        title="Control Effectiveness"
        description="Measure and track the effectiveness of your security controls"
        className="mb-6"
      />

      {isEmptyState ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              No control data available yet. Run security scans to start measuring effectiveness.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Row */}
          {isLoading ? (
            <StatsRowSkeleton />
          ) : (
            <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatsCard
                title="Detection Rate"
                value={`${detectionRate}%`}
                description="Resolved / total findings"
                icon={Gauge}
                changeType={
                  detectionRate > 60 ? 'positive' : detectionRate > 40 ? 'neutral' : 'negative'
                }
              />
              <StatsCard
                title="Open Findings"
                value={openCount}
                description="Require attention"
                icon={XCircle}
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
                title="Overdue Rate"
                value={`${overdueRate}%`}
                change={
                  stats.findings.overdue > 0 ? `${stats.findings.overdue} overdue` : undefined
                }
                description={stats.findings.overdue === 0 ? 'None overdue' : undefined}
                icon={AlertTriangle}
                changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
              />
            </section>
          )}

          {/* Detection Effectiveness Card */}
          {isLoading ? (
            <DetectionCardSkeleton />
          ) : (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Detection Effectiveness</CardTitle>
                <CardDescription>Overall resolution rate across all findings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Progress value={detectionRate} className={cn('h-4', progressClassName)} />
                  </div>
                  <span className={cn('text-2xl font-bold tabular-nums', detectionColor)}>
                    {detectionRate}%
                  </span>
                </div>
                <p className="text-muted-foreground mt-2 text-sm">
                  {resolvedCount} of {stats.findings.total} findings resolved
                </p>
              </CardContent>
            </Card>
          )}

          {/* Two-column charts */}
          {isLoading ? (
            <ChartsRowSkeleton />
          ) : (
            <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Resolution by Severity */}
              <Card>
                <CardHeader>
                  <CardTitle>Resolution by Severity</CardTitle>
                  <CardDescription>Resolved vs open findings per severity level</CardDescription>
                </CardHeader>
                <CardContent>
                  {severityChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={severityChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="name"
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
                        <Bar
                          dataKey="resolved"
                          stackId="a"
                          fill="#22c55e"
                          name="Resolved"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="open"
                          stackId="a"
                          fill="#ef4444"
                          name="Open"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-muted-foreground">No severity data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Control Performance Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Control Performance Trend</CardTitle>
                  <CardDescription>Total findings count over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {trendChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendChartData}>
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
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          name="Total Findings"
                        />
                      </LineChart>
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

          {/* Recommendations */}
          {isLoading ? (
            <RecommendationsCardSkeleton />
          ) : (
            recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                  <CardDescription>Actionable insights based on current data</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <li key={index} className="flex items-center gap-3 rounded-md border p-3">
                        <Badge variant={badgeVariantMap[rec.variant]}>{rec.variant}</Badge>
                        <span className="text-sm">{rec.message}</span>
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
