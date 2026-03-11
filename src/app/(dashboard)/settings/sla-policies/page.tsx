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
import { Timer, Clock, AlertTriangle, Target, CheckCircle2, XCircle } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

const SLA_TARGETS: Record<string, string> = {
  critical: '24 hours',
  high: '72 hours',
  medium: '14 days',
  low: '30 days',
  info: '90 days',
}

export default function SLAPoliciesPage() {
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
      critical: point.critical,
      high: point.high,
      medium: point.medium,
      low: point.low,
    }))
  }, [stats.findingTrend])

  const slaPolicies = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([severity, count]) => ({
      severity: severity.charAt(0).toUpperCase() + severity.slice(1),
      count,
      target: SLA_TARGETS[severity] ?? 'N/A',
      overdue:
        severity === 'critical' || severity === 'high'
          ? Math.round(stats.findings.overdue * (count / Math.max(stats.findings.total, 1)))
          : 0,
      color: SEVERITY_COLORS[severity] ?? '#6b7280',
    }))
  }, [stats.findings.bySeverity, stats.findings.overdue, stats.findings.total])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="SLA Policies"
          description="Configure service level agreement policies for remediation"
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
        title="SLA Policies"
        description="Configure service level agreement policies for remediation"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="SLA Compliance"
          value={`${slaCompliance}%`}
          icon={Timer}
          changeType={slaCompliance > 90 ? 'positive' : 'negative'}
          description="Within SLA targets"
        />
        <StatsCard
          title="Overdue Findings"
          value={stats.findings.overdue}
          icon={Clock}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
          description="Past SLA deadline"
        />
        <StatsCard
          title="Total Findings"
          value={stats.findings.total}
          icon={Target}
          description="Under SLA tracking"
        />
        <StatsCard
          title="Avg CVSS"
          value={stats.findings.averageCvss.toFixed(1)}
          icon={AlertTriangle}
          changeType={stats.findings.averageCvss > 7 ? 'negative' : 'neutral'}
          description="Average severity"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SLA Load by Severity</CardTitle>
            <CardDescription>Findings under SLA tracking by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No SLA data available
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
            <CardTitle>Daily Finding Intake</CardTitle>
            <CardDescription>
              New findings affecting SLA timelines over the past 7 days
            </CardDescription>
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
                  <Bar dataKey="critical" fill="#ef4444" name="Critical" />
                  <Bar dataKey="high" fill="#f97316" name="High" />
                  <Bar dataKey="medium" fill="#eab308" name="Medium" />
                  <Bar dataKey="low" fill="#3b82f6" name="Low" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>SLA Policy Overview</CardTitle>
            <CardDescription>Current SLA targets and compliance status by severity</CardDescription>
          </CardHeader>
          <CardContent>
            {slaPolicies.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No SLA policies configured
              </div>
            ) : (
              <div className="space-y-3">
                {slaPolicies.map((policy) => (
                  <div
                    key={policy.severity}
                    className="flex items-center gap-4 rounded-lg border p-4"
                  >
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: policy.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{policy.severity}</p>
                        <Badge variant="outline">{policy.target}</Badge>
                        <Badge variant="secondary">{policy.count} findings</Badge>
                      </div>
                      {policy.overdue > 0 && (
                        <p className="mt-1 text-sm text-red-500">{policy.overdue} overdue</p>
                      )}
                    </div>
                    {policy.overdue > 0 ? (
                      <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                    )}
                  </div>
                ))}
                <div className="mt-4 rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">Overall SLA Compliance</p>
                  <Progress value={slaCompliance} className="mt-2 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {slaCompliance}% of findings are being remediated within SLA targets
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
