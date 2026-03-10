'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart,
  LineChart,
  XAxis,
  YAxis,
  Area,
  Line,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '@/components/charts'
import { AlertTriangle, ShieldAlert, Activity, Clock } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

const SEVERITY_BADGE_VARIANTS: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> =
  {
    critical: 'destructive',
    high: 'destructive',
    medium: 'default',
    low: 'secondary',
    info: 'outline',
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

function ChartSkeleton({ height = 350 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function RiskTrendsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const trendDataWithTotals = useMemo(() => {
    return stats.findingTrend.map((point) => ({
      ...point,
      total: point.critical + point.high + point.medium + point.low + point.info,
    }))
  }, [stats.findingTrend])

  const latestCounts = useMemo(() => {
    if (stats.findingTrend.length === 0) return null
    const latest = stats.findingTrend[stats.findingTrend.length - 1]
    return {
      critical: latest.critical,
      high: latest.high,
      medium: latest.medium,
      low: latest.low,
      info: latest.info,
      total: latest.critical + latest.high + latest.medium + latest.low + latest.info,
    }
  }, [stats.findingTrend])

  const hasData = stats.findingTrend.length > 0

  return (
    <Main>
      <PageHeader
        title="Risk Trends"
        description="Track how your security posture evolves over time"
      />

      {/* Stats Row */}
      {isLoading ? (
        <StatsRowSkeleton />
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard title="Total Findings" value={stats.findings.total} icon={Activity} />
          <StatsCard
            title="Critical Findings"
            value={stats.findings.bySeverity.critical || 0}
            changeType={(stats.findings.bySeverity.critical || 0) > 0 ? 'negative' : 'neutral'}
            icon={AlertTriangle}
          />
          <StatsCard
            title="Average CVSS"
            value={stats.findings.averageCvss.toFixed(1)}
            changeType={stats.findings.averageCvss > 7 ? 'negative' : 'neutral'}
            icon={ShieldAlert}
          />
          <StatsCard
            title="Overdue Findings"
            value={stats.findings.overdue}
            changeType={stats.findings.overdue > 0 ? 'negative' : 'neutral'}
            icon={Clock}
          />
        </div>
      )}

      {/* Main Stacked Area Chart */}
      {isLoading ? (
        <div className="mb-6">
          <ChartSkeleton height={400} />
        </div>
      ) : !hasData ? (
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
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={stats.findingTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
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

      {/* Secondary Line Chart + Severity Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartSkeleton height={300} />
          <TableSkeleton />
        </div>
      ) : hasData ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Total Findings Trend Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Total Findings Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendDataWithTotals}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip />
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
            </CardContent>
          </Card>

          {/* Severity Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Current Severity Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {latestCounts && (
                <div className="space-y-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 text-left text-sm font-medium text-muted-foreground">
                          Severity
                        </th>
                        <th className="py-3 text-right text-sm font-medium text-muted-foreground">
                          Count
                        </th>
                        <th className="py-3 text-right text-sm font-medium text-muted-foreground">
                          Percentage
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['critical', 'high', 'medium', 'low', 'info'] as const).map((severity) => {
                        const count = latestCounts[severity]
                        const percentage =
                          latestCounts.total > 0
                            ? ((count / latestCounts.total) * 100).toFixed(1)
                            : '0.0'
                        return (
                          <tr key={severity} className="border-b last:border-0">
                            <td className="py-3">
                              <Badge variant={SEVERITY_BADGE_VARIANTS[severity]}>
                                {severity.charAt(0).toUpperCase() + severity.slice(1)}
                              </Badge>
                            </td>
                            <td className="py-3 text-right text-sm font-medium">{count}</td>
                            <td className="py-3 text-right text-sm text-muted-foreground">
                              {percentage}%
                            </td>
                          </tr>
                        )
                      })}
                      <tr className="border-t-2">
                        <td className="py-3 text-sm font-medium">Total</td>
                        <td className="py-3 text-right text-sm font-bold">{latestCounts.total}</td>
                        <td className="py-3 text-right text-sm text-muted-foreground">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </Main>
  )
}
