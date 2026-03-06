'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '@/components/charts'
import { cn } from '@/lib/utils'
import { ListChecks, AlertTriangle, Clock, CheckCircle, ArrowRight, CircleDot } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',
  in_progress: '#f97316',
  confirmed: '#eab308',
  resolved: '#22c55e',
  closed: '#6b7280',
  accepted: '#8b5cf6',
  false_positive: '#94a3b8',
  triaged: '#06b6d4',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

function StatsCardsSkeleton() {
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

function ChartsSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
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

export default function AllTasksPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const statusData = useMemo(() => {
    return Object.entries(stats.findings.byStatus || {}).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      value,
      fill: STATUS_COLORS[name.toLowerCase()] || '#6b7280',
    }))
  }, [stats.findings.byStatus])

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity || {}).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: SEVERITY_COLORS[name.toLowerCase()] || '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const openFindings = useMemo(() => {
    const byStatus = stats.findings.byStatus || {}
    return Object.entries(byStatus)
      .filter(([status]) => !['resolved', 'closed', 'false_positive'].includes(status))
      .reduce((sum, [, count]) => sum + count, 0)
  }, [stats.findings.byStatus])

  const criticalCount = stats.findings.bySeverity?.critical || 0
  const overdueCount = stats.findings.overdue || 0
  const totalFindings = stats.findings.total || 0
  const resolvedCount =
    (stats.findings.byStatus?.resolved || 0) + (stats.findings.byStatus?.closed || 0)
  const resolutionRate = totalFindings > 0 ? Math.round((resolvedCount / totalFindings) * 100) : 0

  const actionItems = useMemo(() => {
    const items: {
      label: string
      severity: 'critical' | 'high' | 'medium' | 'low'
      count: number
    }[] = []
    if (criticalCount > 0) {
      items.push({
        label: 'Address critical findings immediately',
        severity: 'critical',
        count: criticalCount,
      })
    }
    if (overdueCount > 0) {
      items.push({
        label: 'Resolve overdue remediation tasks',
        severity: 'high',
        count: overdueCount,
      })
    }
    const highCount = stats.findings.bySeverity?.high || 0
    if (highCount > 0) {
      items.push({ label: 'Review high severity findings', severity: 'high', count: highCount })
    }
    const mediumCount = stats.findings.bySeverity?.medium || 0
    if (mediumCount > 0) {
      items.push({
        label: 'Plan remediation for medium severity findings',
        severity: 'medium',
        count: mediumCount,
      })
    }
    const lowCount = stats.findings.bySeverity?.low || 0
    if (lowCount > 0) {
      items.push({ label: 'Schedule low priority task reviews', severity: 'low', count: lowCount })
    }
    return items
  }, [criticalCount, overdueCount, stats.findings.bySeverity])

  const severityBadgeColor: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  }

  return (
    <Main>
      <PageHeader
        title="Remediation Tasks"
        description="Manage and track remediation tasks for security findings"
      />

      {isLoading ? (
        <>
          <StatsCardsSkeleton />
          <ChartsSkeleton />
        </>
      ) : (
        <>
          <section className="mb-6 mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Open Tasks"
              value={openFindings}
              description={`${totalFindings} total findings`}
              icon={ListChecks}
            />
            <StatsCard
              title="Critical Tasks"
              value={criticalCount}
              changeType={criticalCount > 0 ? 'negative' : 'neutral'}
              change={criticalCount > 0 ? 'Requires attention' : 'None'}
              icon={AlertTriangle}
            />
            <StatsCard
              title="Overdue"
              value={overdueCount}
              changeType={overdueCount > 0 ? 'negative' : 'positive'}
              change={overdueCount > 0 ? 'Past deadline' : 'All on track'}
              icon={Clock}
            />
            <StatsCard
              title="Resolution Rate"
              value={`${resolutionRate}%`}
              changeType={
                resolutionRate >= 70 ? 'positive' : resolutionRate >= 40 ? 'neutral' : 'negative'
              }
              change={`${resolvedCount} resolved`}
              icon={CheckCircle}
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Task Status Breakdown</CardTitle>
                <CardDescription>Distribution of findings by current status</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                        {statusData.map((entry, index) => (
                          <Bar key={index} dataKey="value" fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <div className="text-center">
                      <CircleDot className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No task data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
                <CardDescription>Tasks grouped by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                {severityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={severityData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Findings" radius={[4, 4, 0, 0]}>
                        {severityData.map((entry, index) => (
                          <Bar key={index} dataKey="value" fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <div className="text-center">
                      <CircleDot className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No severity data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>Recommended actions based on current task status</CardDescription>
              </CardHeader>
              <CardContent>
                {actionItems.length > 0 ? (
                  <div className="space-y-3">
                    {actionItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', severityBadgeColor[item.severity])}
                        >
                          {item.count} {item.count === 1 ? 'finding' : 'findings'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[120px] items-center justify-center">
                    <div className="text-center">
                      <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
                      <p className="text-muted-foreground">
                        No action items - all tasks are on track
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </Main>
  )
}
