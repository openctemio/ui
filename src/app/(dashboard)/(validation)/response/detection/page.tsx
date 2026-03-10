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
import { Eye, Shield, AlertCircle, Radar, CheckCircle2, XCircle, Info } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

export default function DetectionRulesPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const detectionRate = useMemo(() => {
    if (stats.findings.total === 0) return 0
    const detected = stats.findings.total - (stats.findings.byStatus?.['open'] ?? 0)
    return Math.round((detected / stats.findings.total) * 100)
  }, [stats.findings.total, stats.findings.byStatus])

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
      critical: point.critical,
      high: point.high,
      medium: point.medium,
      low: point.low,
      info: point.info,
    }))
  }, [stats.findingTrend])

  const undetectedCount = stats.findings.byStatus?.['open'] ?? 0

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Detection Rules"
          description="Manage and test detection rule effectiveness"
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
      <PageHeader
        title="Detection Rules"
        description="Manage and test detection rule effectiveness"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Detection Rate"
          value={`${detectionRate}%`}
          icon={Eye}
          changeType={detectionRate > 80 ? 'positive' : 'negative'}
          description="Finding detection"
        />
        <StatsCard
          title="Total Detections"
          value={stats.findings.total}
          icon={Radar}
          description="All findings"
        />
        <StatsCard
          title="Undetected"
          value={undetectedCount}
          icon={AlertCircle}
          changeType={undetectedCount > 0 ? 'negative' : 'positive'}
          description="Open findings"
        />
        <StatsCard
          title="Assets Monitored"
          value={stats.assets.total}
          icon={Shield}
          description="Under detection"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detection by Severity</CardTitle>
            <CardDescription>Findings detected across severity levels</CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No detection data available
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
            <CardTitle>Detection Trend</CardTitle>
            <CardDescription>Finding detection volume over the past 7 days</CardDescription>
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
                  <Bar dataKey="critical" fill="#ef4444" stackId="stack" name="Critical" />
                  <Bar dataKey="high" fill="#f97316" stackId="stack" name="High" />
                  <Bar dataKey="medium" fill="#eab308" stackId="stack" name="Medium" />
                  <Bar dataKey="low" fill="#3b82f6" stackId="stack" name="Low" />
                  <Bar
                    dataKey="info"
                    fill="#6b7280"
                    stackId="stack"
                    name="Info"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detection Rule Effectiveness</CardTitle>
            <CardDescription>Assessment of detection capabilities and blind spots</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.findings.total === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No detection data to analyze
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">Overall Detection Rate</p>
                  <Progress value={detectionRate} className="mt-2 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {detectionRate}% of findings are being actively detected and processed
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  {undetectedCount > 0 ? (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">Detection Gaps</p>
                    <p className="text-sm text-muted-foreground">
                      {undetectedCount > 0
                        ? `${undetectedCount} findings remain in open state without active detection rules.`
                        : 'All findings have active detection rules in place.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                  <div>
                    <p className="font-medium">Coverage Recommendation</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.repositories.withFindings > 0
                        ? `${stats.repositories.withFindings} repositories with findings should have detection rules reviewed and updated.`
                        : 'Repository detection coverage is adequate.'}
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
