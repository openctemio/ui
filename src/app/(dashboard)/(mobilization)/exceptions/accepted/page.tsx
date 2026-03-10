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
import { ShieldCheck, AlertTriangle, Clock, FileCheck, CheckCircle2, XCircle } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

const STATUS_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#6b7280']

export default function AcceptedRisksPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const acceptedCount = useMemo(
    () => stats.findings.byStatus?.['accepted'] ?? 0,
    [stats.findings.byStatus]
  )

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] ?? '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const statusData = useMemo(() => {
    return Object.entries(stats.findings.byStatus).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
  }, [stats.findings.byStatus])

  const acceptedRatio = useMemo(() => {
    if (stats.findings.total === 0) return 0
    return Math.round((acceptedCount / stats.findings.total) * 100)
  }, [acceptedCount, stats.findings.total])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Accepted Risks"
          description="View findings with accepted risk exceptions"
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
        title="Accepted Risks"
        description="View findings with accepted risk exceptions"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Accepted Risks"
          value={acceptedCount}
          icon={ShieldCheck}
          description="Currently accepted"
        />
        <StatsCard
          title="Acceptance Ratio"
          value={`${acceptedRatio}%`}
          icon={FileCheck}
          description="Of total findings"
          changeType={acceptedRatio > 20 ? 'negative' : 'positive'}
        />
        <StatsCard
          title="Overdue Reviews"
          value={stats.findings.overdue}
          icon={Clock}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
          description="Past review date"
        />
        <StatsCard
          title="Avg CVSS Score"
          value={stats.findings.averageCvss.toFixed(1)}
          icon={AlertTriangle}
          changeType={stats.findings.averageCvss > 7 ? 'negative' : 'neutral'}
          description="Accepted findings"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accepted Risks by Severity</CardTitle>
            <CardDescription>
              Distribution of accepted findings across severity levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No severity data available
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
            <CardTitle>Findings by Status</CardTitle>
            <CardDescription>Current status distribution of all findings</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No status data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {statusData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk Acceptance Insights</CardTitle>
            <CardDescription>Key observations and recommended actions</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.findings.total === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No findings to analyze yet
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-medium">Acceptance Coverage</p>
                    <p className="text-sm text-muted-foreground">
                      {acceptedCount} of {stats.findings.total} findings have documented risk
                      acceptance.
                    </p>
                    <Progress value={acceptedRatio} className="mt-2 h-2" />
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  {stats.findings.overdue > 0 ? (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">Review Status</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.findings.overdue > 0
                        ? `${stats.findings.overdue} accepted risks are past their review date and require re-evaluation.`
                        : 'All accepted risks are within their review period.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <AlertTriangle
                    className={cn(
                      'mt-0.5 h-5 w-5 shrink-0',
                      stats.findings.averageCvss > 7 ? 'text-red-500' : 'text-yellow-500'
                    )}
                  />
                  <div>
                    <p className="font-medium">Severity Assessment</p>
                    <p className="text-sm text-muted-foreground">
                      Average CVSS of accepted risks is{' '}
                      <Badge variant={stats.findings.averageCvss > 7 ? 'destructive' : 'secondary'}>
                        {stats.findings.averageCvss.toFixed(1)}
                      </Badge>
                      .{' '}
                      {stats.findings.averageCvss > 7
                        ? 'Consider reviewing high-severity acceptances.'
                        : 'Risk levels are within acceptable bounds.'}
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
