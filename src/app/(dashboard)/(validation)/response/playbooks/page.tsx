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
import { BookOpen, FileText, ListChecks, Timer, ArrowRight } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

export default function ResponsePlaybooksPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const playbookCoverage = useMemo(() => {
    if (stats.findings.total === 0) return 0
    const covered =
      (stats.findings.byStatus?.['in_progress'] ?? 0) +
      (stats.findings.byStatus?.['resolved'] ?? 0) +
      (stats.findings.byStatus?.['mitigated'] ?? 0)
    return Math.round((covered / stats.findings.total) * 100)
  }, [stats.findings.byStatus, stats.findings.total])

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] ?? '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const statusData = useMemo(() => {
    return Object.entries(stats.findings.byStatus).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      value,
    }))
  }, [stats.findings.byStatus])

  const recentActivities = useMemo(() => {
    return stats.recentActivity.slice(0, 5)
  }, [stats.recentActivity])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Response Playbooks"
          description="View and manage incident response playbooks"
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
        title="Response Playbooks"
        description="View and manage incident response playbooks"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Playbook Coverage"
          value={`${playbookCoverage}%`}
          icon={BookOpen}
          changeType={playbookCoverage > 70 ? 'positive' : 'negative'}
          description="Findings with playbooks"
        />
        <StatsCard
          title="Total Findings"
          value={stats.findings.total}
          icon={FileText}
          description="Requiring response"
        />
        <StatsCard
          title="Overdue Responses"
          value={stats.findings.overdue}
          icon={Timer}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
          description="Past SLA deadline"
        />
        <StatsCard
          title="Active Steps"
          value={stats.findings.byStatus?.['in_progress'] ?? 0}
          icon={ListChecks}
          description="In progress"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Playbook Coverage by Severity</CardTitle>
            <CardDescription>Response playbook availability across severity levels</CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No playbook data available
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
            <CardTitle>Response Status</CardTitle>
            <CardDescription>Current response execution status distribution</CardDescription>
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
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Findings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Playbook Activity</CardTitle>
            <CardDescription>Recent playbook executions and response actions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No recent playbook activity
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{activity.title}</p>
                        <Badge variant="outline" className="shrink-0">
                          {activity.type}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">Playbook Coverage</p>
                  <Progress value={playbookCoverage} className="mt-2 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {playbookCoverage}% of findings have assigned response playbooks
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
