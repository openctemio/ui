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
import {
  BarChart3,
  ShieldCheck,
  AlertOctagon,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

export default function SimulationResultsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const preventionRate = useMemo(() => {
    if (stats.findings.total === 0) return 0
    const blocked =
      (stats.findings.byStatus?.['resolved'] ?? 0) + (stats.findings.byStatus?.['mitigated'] ?? 0)
    return Math.round((blocked / stats.findings.total) * 100)
  }, [stats.findings.byStatus, stats.findings.total])

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

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Simulation Results"
          description="Review results from security simulations"
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
        title="Simulation Results"
        description="Review results from security simulations"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Prevention Rate"
          value={`${preventionRate}%`}
          icon={ShieldCheck}
          changeType={preventionRate > 70 ? 'positive' : 'negative'}
          description="Attacks blocked"
        />
        <StatsCard
          title="Detection Rate"
          value={`${detectionRate}%`}
          icon={BarChart3}
          changeType={detectionRate > 80 ? 'positive' : 'negative'}
          description="Attacks detected"
        />
        <StatsCard
          title="Total Findings"
          value={stats.findings.total}
          icon={AlertOctagon}
          description="From simulations"
        />
        <StatsCard
          title="Avg CVSS"
          value={stats.findings.averageCvss.toFixed(1)}
          icon={TrendingUp}
          changeType={stats.findings.averageCvss > 7 ? 'negative' : 'neutral'}
          description="Finding severity"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Results by Severity</CardTitle>
            <CardDescription>Simulation findings categorized by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No simulation results available
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
            <CardTitle>Results Trend</CardTitle>
            <CardDescription>Simulation finding volume over the past 7 days</CardDescription>
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
            <CardTitle>Simulation Assessment</CardTitle>
            <CardDescription>
              Analysis of simulation effectiveness and defense posture
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.findings.total === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No simulation results to analyze
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium">Prevention Rate</p>
                    <Progress value={preventionRate} className="mt-2 h-2" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {preventionRate}% of simulated attacks were prevented
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium">Detection Rate</p>
                    <Progress value={detectionRate} className="mt-2 h-2" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {detectionRate}% of simulated attacks were detected
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  {(stats.findings.bySeverity?.['critical'] ?? 0) > 0 ? (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">Critical Bypass Detection</p>
                    <p className="text-sm text-muted-foreground">
                      {(stats.findings.bySeverity?.['critical'] ?? 0) > 0
                        ? `${stats.findings.bySeverity['critical']} critical-severity bypasses were discovered. Immediate remediation is recommended.`
                        : 'No critical defense bypasses detected in simulations.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <AlertTriangle
                    className={cn(
                      'mt-0.5 h-5 w-5 shrink-0',
                      preventionRate < 70 ? 'text-yellow-500' : 'text-green-500'
                    )}
                  />
                  <div>
                    <p className="font-medium">Defense Posture</p>
                    <p className="text-sm text-muted-foreground">
                      {preventionRate < 70
                        ? 'Prevention rate is below target. Review security controls for the affected attack vectors.'
                        : 'Defense posture is strong. Continue regular simulation campaigns to maintain readiness.'}
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
