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
import { Play, CheckCircle2, Clock, Activity, ArrowRight } from 'lucide-react'

export default function ActiveWorkflowsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const workflowStatusData = useMemo(() => {
    const total = stats.findings.total
    if (total === 0) return []
    const open = stats.findings.byStatus?.['open'] ?? 0
    const inProgress = stats.findings.byStatus?.['in_progress'] ?? 0
    const resolved = stats.findings.byStatus?.['resolved'] ?? 0
    const blocked = stats.findings.byStatus?.['blocked'] ?? 0
    return [
      { name: 'Running', value: inProgress, color: '#3b82f6' },
      { name: 'Completed', value: resolved, color: '#22c55e' },
      { name: 'Pending', value: open, color: '#eab308' },
      { name: 'Blocked', value: blocked, color: '#ef4444' },
    ].filter((d) => d.value > 0)
  }, [stats.findings.byStatus, stats.findings.total])

  const trendData = useMemo(() => {
    return stats.findingTrend.slice(-7).map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      critical: point.critical,
      high: point.high,
      medium: point.medium,
    }))
  }, [stats.findingTrend])

  const recentActivities = useMemo(() => {
    return stats.recentActivity.slice(0, 5)
  }, [stats.recentActivity])

  const inProgressCount = stats.findings.byStatus?.['in_progress'] ?? 0
  const completionRate = useMemo(() => {
    const resolved = stats.findings.byStatus?.['resolved'] ?? 0
    if (stats.findings.total === 0) return 0
    return Math.round((resolved / stats.findings.total) * 100)
  }, [stats.findings.byStatus, stats.findings.total])

  if (isLoading) {
    return (
      <Main>
        <PageHeader title="Active Workflows" description="Monitor running automation workflows" />
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
      <PageHeader title="Active Workflows" description="Monitor running automation workflows" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Workflows"
          value={inProgressCount}
          icon={Play}
          description="Currently running"
        />
        <StatsCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={CheckCircle2}
          changeType={completionRate > 50 ? 'positive' : 'negative'}
          description="Workflows completed"
        />
        <StatsCard
          title="Overdue Tasks"
          value={stats.findings.overdue}
          icon={Clock}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
          description="Past deadline"
        />
        <StatsCard
          title="Total Findings"
          value={stats.findings.total}
          icon={Activity}
          description="Being processed"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Status Distribution</CardTitle>
            <CardDescription>Current state of all workflow executions</CardDescription>
          </CardHeader>
          <CardContent>
            {workflowStatusData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No active workflows
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={workflowStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                  >
                    {workflowStatusData.map((entry, index) => (
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
            <CardTitle>Workflow Processing Trend</CardTitle>
            <CardDescription>Finding remediation activity over the past 7 days</CardDescription>
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
                  <Bar
                    dataKey="medium"
                    fill="#eab308"
                    stackId="stack"
                    name="Medium"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Workflow Activity</CardTitle>
            <CardDescription>Latest workflow events and status changes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No recent workflow activity
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-sm">{activity.title}</p>
                        <Badge variant="outline" className="shrink-0">
                          {activity.type}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
