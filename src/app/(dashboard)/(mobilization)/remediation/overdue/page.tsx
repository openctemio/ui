'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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
import {
  Timer,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  CircleDot,
  Target,
} from 'lucide-react'

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

function ContentSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function OverdueTasksPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const overdueCount = stats.findings.overdue || 0
  const totalFindings = stats.findings.total || 0
  const criticalCount = stats.findings.bySeverity?.critical || 0

  const overdueRate = useMemo(() => {
    if (totalFindings === 0) return 0
    return Math.round((overdueCount / totalFindings) * 100)
  }, [overdueCount, totalFindings])

  const estimatedCriticalOverdue = useMemo(() => {
    if (totalFindings === 0 || overdueCount === 0) return 0
    const ratio = overdueCount / totalFindings
    return Math.round(criticalCount * ratio)
  }, [criticalCount, overdueCount, totalFindings])

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity || {})
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: SEVERITY_COLORS[name.toLowerCase()] || '#6b7280',
      }))
      .sort((a, b) => b.value - a.value)
  }, [stats.findings.bySeverity])

  const overdueRateColor = useMemo(() => {
    if (overdueRate > 30) return 'text-red-500'
    if (overdueRate > 10) return 'text-yellow-500'
    return 'text-green-500'
  }, [overdueRate])

  const overdueProgressColor = useMemo(() => {
    if (overdueRate > 30) return '[&>div]:bg-red-500'
    if (overdueRate > 10) return '[&>div]:bg-yellow-500'
    return '[&>div]:bg-green-500'
  }, [overdueRate])

  const overdueStatusLabel = useMemo(() => {
    if (overdueRate > 30) return 'High risk - Immediate action required'
    if (overdueRate > 10) return 'Moderate risk - Review remediation timeline'
    if (overdueRate > 0) return 'Low risk - Minor overdue items'
    return 'On track - No overdue findings'
  }, [overdueRate])

  const actionItems = useMemo(() => {
    const items: { label: string; priority: string; color: string }[] = []
    if (estimatedCriticalOverdue > 0) {
      items.push({
        label: `Escalate ${estimatedCriticalOverdue} estimated critical overdue ${estimatedCriticalOverdue === 1 ? 'finding' : 'findings'} to leadership`,
        priority: 'Critical',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      })
    }
    if (overdueCount > 0) {
      items.push({
        label: 'Review and update remediation deadlines for overdue items',
        priority: 'High',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      })
      items.push({
        label: 'Identify blockers preventing timely remediation',
        priority: 'High',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      })
      items.push({
        label: 'Reassign overdue tasks if current owners are unavailable',
        priority: 'Medium',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      })
    }
    if (overdueRate > 20) {
      items.push({
        label: 'Review SLA policies and adjust remediation timelines',
        priority: 'Medium',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      })
    }
    return items
  }, [estimatedCriticalOverdue, overdueCount, overdueRate])

  return (
    <Main>
      <PageHeader
        title="Overdue Remediation"
        description="Track findings that have exceeded their remediation deadline"
      />

      {isLoading ? (
        <div className="mt-6">
          <StatsCardsSkeleton />
          <ContentSkeleton />
        </div>
      ) : (
        <>
          <section className="mb-6 mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Total Overdue"
              value={overdueCount}
              changeType={overdueCount > 0 ? 'negative' : 'positive'}
              change={overdueCount > 0 ? 'Past deadline' : 'All on time'}
              icon={Timer}
            />
            <StatsCard
              title="Critical Overdue"
              value={estimatedCriticalOverdue}
              changeType={estimatedCriticalOverdue > 0 ? 'negative' : 'positive'}
              change={estimatedCriticalOverdue > 0 ? 'Estimated' : 'None'}
              icon={AlertTriangle}
            />
            <StatsCard
              title="Overdue Rate"
              value={`${overdueRate}%`}
              changeType={overdueRate > 30 ? 'negative' : overdueRate > 10 ? 'neutral' : 'positive'}
              change={overdueStatusLabel}
              icon={Clock}
            />
            <StatsCard
              title="Total Findings"
              value={totalFindings}
              description={`${totalFindings - overdueCount} on track`}
              icon={Target}
            />
          </section>

          <section className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Overdue Rate</CardTitle>
                <CardDescription>{overdueStatusLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {overdueCount} of {totalFindings} findings overdue
                    </span>
                    <span className={cn('text-2xl font-bold', overdueRateColor)}>
                      {overdueRate}%
                    </span>
                  </div>
                  <Progress value={overdueRate} className={cn('h-4', overdueProgressColor)} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span
                      className={cn(
                        'font-medium',
                        overdueRate <= 10 && 'text-green-500',
                        overdueRate > 10 && overdueRate <= 30 && 'text-yellow-500',
                        overdueRate > 30 && 'text-red-500'
                      )}
                    >
                      Target: below 10%
                    </span>
                    <span>100%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Findings by Severity</CardTitle>
                <CardDescription>
                  All findings distribution - overdue items span across severities
                </CardDescription>
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
                      <p className="text-muted-foreground">No findings data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>Recommended actions to reduce overdue remediation</CardDescription>
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
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <Badge variant="outline" className={cn('shrink-0 text-xs', item.color)}>
                          {item.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[250px] items-center justify-center">
                    <div className="text-center">
                      <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
                      <p className="font-medium">No Overdue Findings</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        All remediation tasks are within their deadlines
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
