'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '@/components/charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
} from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

type SeverityKey = 'critical' | 'high' | 'medium' | 'low' | 'info'

const SEVERITY_ORDER: SeverityKey[] = ['critical', 'high', 'medium', 'low', 'info']

function getSeverityBadgeClass(severity: string) {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'high':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    case 'low':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    case 'positive':
      return 'bg-green-500/10 text-green-500 border-green-500/20'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function StatsRowSkeleton() {
  return (
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
  )
}

function ChartCardSkeleton({ height = 350 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-60" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  )
}

function GridSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function RiskFactorsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-4 w-72" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function TrendingExposuresPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const trendData = stats.findingTrend
  const hasData = trendData.length > 0
  const hasTwoPoints = trendData.length >= 2

  // Month-over-month change
  const momChange = useMemo(() => {
    if (!hasTwoPoints) return { value: 0, type: 'neutral' as const, label: 'N/A' }
    const prev = trendData[trendData.length - 2]
    const curr = trendData[trendData.length - 1]
    const prevTotal = prev.critical + prev.high + prev.medium + prev.low + prev.info
    const currTotal = curr.critical + curr.high + curr.medium + curr.low + curr.info
    if (prevTotal === 0) return { value: 0, type: 'neutral' as const, label: 'N/A' }
    const pctChange = ((currTotal - prevTotal) / prevTotal) * 100
    const type = pctChange > 0 ? 'negative' : pctChange < 0 ? 'positive' : 'neutral'
    const sign = pctChange > 0 ? '+' : ''
    return {
      value: pctChange,
      type: type as 'positive' | 'negative' | 'neutral',
      label: `${sign}${pctChange.toFixed(1)}%`,
    }
  }, [trendData, hasTwoPoints])

  // Latest month critical count
  const latestCritical = useMemo(() => {
    if (!hasData) return 0
    return trendData[trendData.length - 1].critical
  }, [trendData, hasData])

  // Severity momentum: compare last 2 data points for each severity
  const severityMomentum = useMemo(() => {
    if (!hasTwoPoints) return null
    const prev = trendData[trendData.length - 2]
    const curr = trendData[trendData.length - 1]
    return SEVERITY_ORDER.map((key) => {
      const prevVal = prev[key]
      const currVal = curr[key]
      const diff = currVal - prevVal
      let direction: 'up' | 'down' | 'flat'
      if (diff > 0) direction = 'up'
      else if (diff < 0) direction = 'down'
      else direction = 'flat'
      return {
        severity: key,
        label: SEVERITY_LABELS[key],
        current: currVal,
        previous: prevVal,
        diff,
        direction,
      }
    })
  }, [trendData, hasTwoPoints])

  // Top risk factors
  const riskFactors = useMemo(() => {
    const factors: { message: string; severity: string }[] = []

    if (hasTwoPoints) {
      const prev = trendData[trendData.length - 2]
      const curr = trendData[trendData.length - 1]
      if (curr.critical > prev.critical) {
        factors.push({
          message: `Critical findings are trending upward (${prev.critical} to ${curr.critical})`,
          severity: 'critical',
        })
      }
      const prevTotal = prev.critical + prev.high + prev.medium + prev.low + prev.info
      const currTotal = curr.critical + curr.high + curr.medium + curr.low + curr.info
      if (currTotal < prevTotal) {
        factors.push({
          message: `Overall finding count is decreasing (${prevTotal} to ${currTotal})`,
          severity: 'positive',
        })
      }
    }

    if (stats.findings.overdue > 0) {
      factors.push({
        message: `${stats.findings.overdue} finding${stats.findings.overdue !== 1 ? 's are' : ' is'} overdue for remediation`,
        severity: stats.findings.overdue > 5 ? 'high' : 'medium',
      })
    }

    if (latestCritical > 0 && hasTwoPoints) {
      const prev = trendData[trendData.length - 2]
      if (latestCritical <= prev.critical && latestCritical > 0) {
        factors.push({
          message: `${latestCritical} critical finding${latestCritical !== 1 ? 's remain' : ' remains'} in the latest period`,
          severity: 'critical',
        })
      }
    }

    return factors
  }, [hasTwoPoints, trendData, stats.findings.overdue, latestCritical])

  const isEmpty = !isLoading && stats.findings.total === 0 && stats.findingTrend.length === 0

  return (
    <Main>
      <PageHeader
        title="Trending Exposures"
        description="Track emerging threats and vulnerability trends across your environment"
        className="mb-6"
      />

      {isLoading ? (
        <>
          <StatsRowSkeleton />
          <div className="mb-6">
            <ChartCardSkeleton height={400} />
          </div>
          <div className="mb-6">
            <GridSkeleton />
          </div>
          <RiskFactorsSkeleton />
        </>
      ) : isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground text-center text-sm">
              No trend data available yet. Run scans to start tracking exposure trends.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Row */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard title="Total Findings" value={stats.findings.total} icon={Activity} />
            <StatsCard
              title="Month-over-Month"
              value={momChange.label}
              changeType={momChange.type}
              change={momChange.value !== 0 ? momChange.label : undefined}
              icon={BarChart3}
            />
            <StatsCard
              title="Critical Trend"
              value={latestCritical}
              description="Latest period critical count"
              changeType={latestCritical > 0 ? 'negative' : 'positive'}
              icon={AlertTriangle}
            />
            <StatsCard
              title="Risk Score"
              value={`${stats.assets.riskScore.toFixed(1)} / 10`}
              changeType={
                stats.assets.riskScore >= 7
                  ? 'negative'
                  : stats.assets.riskScore >= 4
                    ? 'neutral'
                    : 'positive'
              }
              icon={Clock}
            />
          </section>

          {/* Trend Chart */}
          {!hasData ? (
            <Card className="mb-6">
              <CardContent className="flex h-[400px] items-center justify-center">
                <p className="text-muted-foreground">
                  No trend data available yet. Run scans to start tracking trends.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Finding Trends by Severity</CardTitle>
                <CardDescription>
                  Stacked area view of findings over time across all severity levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={trendData}>
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
                    <Area
                      type="monotone"
                      dataKey="critical"
                      stackId="1"
                      stroke={SEVERITY_COLORS.critical}
                      fill={SEVERITY_COLORS.critical}
                      fillOpacity={0.8}
                      name="Critical"
                    />
                    <Area
                      type="monotone"
                      dataKey="high"
                      stackId="1"
                      stroke={SEVERITY_COLORS.high}
                      fill={SEVERITY_COLORS.high}
                      fillOpacity={0.8}
                      name="High"
                    />
                    <Area
                      type="monotone"
                      dataKey="medium"
                      stackId="1"
                      stroke={SEVERITY_COLORS.medium}
                      fill={SEVERITY_COLORS.medium}
                      fillOpacity={0.8}
                      name="Medium"
                    />
                    <Area
                      type="monotone"
                      dataKey="low"
                      stackId="1"
                      stroke={SEVERITY_COLORS.low}
                      fill={SEVERITY_COLORS.low}
                      fillOpacity={0.8}
                      name="Low"
                    />
                    <Area
                      type="monotone"
                      dataKey="info"
                      stackId="1"
                      stroke={SEVERITY_COLORS.info}
                      fill={SEVERITY_COLORS.info}
                      fillOpacity={0.8}
                      name="Info"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Severity Momentum */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Severity Momentum</CardTitle>
              <CardDescription>
                Direction of each severity level based on the last two data points
              </CardDescription>
            </CardHeader>
            <CardContent>
              {severityMomentum ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {severityMomentum.map((item) => {
                    const DirectionIcon =
                      item.direction === 'up'
                        ? TrendingUp
                        : item.direction === 'down'
                          ? TrendingDown
                          : Minus
                    const dirColor =
                      item.direction === 'up'
                        ? 'text-red-500'
                        : item.direction === 'down'
                          ? 'text-green-500'
                          : 'text-muted-foreground'
                    const dirLabel =
                      item.direction === 'up'
                        ? 'Increasing'
                        : item.direction === 'down'
                          ? 'Decreasing'
                          : 'Flat'

                    return (
                      <div
                        key={item.severity}
                        className="flex flex-col items-center gap-2 rounded-lg border p-4"
                      >
                        <span
                          className="text-xs font-semibold uppercase"
                          style={{ color: SEVERITY_COLORS[item.severity] }}
                        >
                          {item.label}
                        </span>
                        <span className="text-2xl font-bold">{item.current}</span>
                        <div className={cn('flex items-center gap-1', dirColor)}>
                          <DirectionIcon className="h-4 w-4" />
                          <span className="text-xs font-medium">{dirLabel}</span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {item.diff > 0 ? '+' : ''}
                          {item.diff} from previous
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-muted-foreground text-sm">
                    Need at least two data points to show momentum trends.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Risk Factors */}
          <Card>
            <CardHeader>
              <CardTitle>Top Risk Factors</CardTitle>
              <CardDescription>Derived insights from current exposure trends</CardDescription>
            </CardHeader>
            <CardContent>
              {riskFactors.length > 0 ? (
                <div className="space-y-4">
                  {riskFactors.map((factor, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Badge
                        variant="outline"
                        className={cn('mt-0.5 shrink-0', getSeverityBadgeClass(factor.severity))}
                      >
                        {factor.severity}
                      </Badge>
                      <span className="text-sm">{factor.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No notable risk factors identified. Exposure trends appear stable.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Main>
  )
}
