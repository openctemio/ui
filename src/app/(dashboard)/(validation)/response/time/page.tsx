'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '@/components/charts'
import { cn } from '@/lib/utils'
import { Timer, Clock, Gauge, TrendingDown, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

export default function ResponseTimePage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const slaCompliance = useMemo(() => {
    if (stats.findings.total === 0) return 100
    const onTime = stats.findings.total - stats.findings.overdue
    return Math.round((onTime / stats.findings.total) * 100)
  }, [stats.findings.total, stats.findings.overdue])

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] ?? '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const trendData = useMemo(() => {
    return stats.findingTrend.slice(-7).map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      total: point.critical + point.high + point.medium + point.low + point.info,
      critical: point.critical,
      high: point.high,
    }))
  }, [stats.findingTrend])

  const resolvedCount = stats.findings.byStatus?.['resolved'] ?? 0
  const resolutionRate = useMemo(() => {
    if (stats.findings.total === 0) return 0
    return Math.round((resolvedCount / stats.findings.total) * 100)
  }, [resolvedCount, stats.findings.total])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Response Time"
          description="Track and optimize incident response times"
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      </Main>
    )
  }

  return (
    <Main>
      <PageHeader title="Response Time" description="Track and optimize incident response times" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="SLA Compliance"
          value={`${slaCompliance}%`}
          icon={Timer}
          changeType={slaCompliance > 90 ? 'positive' : 'negative'}
          description="Within SLA targets"
        />
        <StatsCard
          title="Overdue"
          value={stats.findings.overdue}
          icon={Clock}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
          description="Past deadline"
        />
        <StatsCard
          title="Resolution Rate"
          value={`${resolutionRate}%`}
          icon={Gauge}
          changeType={resolutionRate > 50 ? 'positive' : 'negative'}
          description="Findings resolved"
        />
        <StatsCard
          title="Avg CVSS"
          value={stats.findings.averageCvss.toFixed(1)}
          icon={TrendingDown}
          changeType={stats.findings.averageCvss > 7 ? 'negative' : 'neutral'}
          description="Pending findings"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Response Load by Severity</CardTitle>
            <CardDescription>Findings requiring response across severity levels</CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No response data available
              </div>
            ) : (
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
                    paddingAngle={2}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Finding Volume</CardTitle>
            <CardDescription>Incoming findings affecting response capacity</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No trend data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#6366f1" name="Total" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Response Time Insights</CardTitle>
            <CardDescription>
              Key metrics and recommendations for response optimization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.findings.total === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No response data to analyze
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">SLA Compliance Rate</p>
                  <Progress value={slaCompliance} className="mt-2 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {slaCompliance}% of findings are being addressed within SLA targets
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  {stats.findings.overdue > 0 ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">Overdue Findings</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.findings.overdue > 0 ? (
                        <>
                          <Badge variant="destructive">{stats.findings.overdue}</Badge> findings
                          have exceeded their SLA response window. Prioritize these for immediate
                          action.
                        </>
                      ) : (
                        'All findings are being addressed within SLA timeframes.'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                  <div>
                    <p className="font-medium">Optimization Tip</p>
                    <p className="text-sm text-muted-foreground">
                      {resolutionRate < 50
                        ? 'Resolution rate is below 50%. Consider adding automated response workflows to improve throughput.'
                        : 'Response throughput is healthy. Continue monitoring for seasonal spikes.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
