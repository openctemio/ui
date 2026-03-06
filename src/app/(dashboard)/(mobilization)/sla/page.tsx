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
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from '@/components/charts'
import { cn } from '@/lib/utils'
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Clock,
  CircleDot,
  Target,
} from 'lucide-react'

const SLA_TARGETS = [
  {
    severity: 'Critical',
    target: '24 hours',
    description: 'Must be remediated within 1 day of discovery',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  {
    severity: 'High',
    target: '72 hours',
    description: 'Must be remediated within 3 days of discovery',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  {
    severity: 'Medium',
    target: '7 days',
    description: 'Must be remediated within 1 week of discovery',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  {
    severity: 'Low',
    target: '30 days',
    description: 'Must be remediated within 1 month of discovery',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
]

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
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
    </div>
  )
}

export default function SLAManagementPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const overdueCount = stats.findings.overdue || 0
  const totalFindings = stats.findings.total || 0
  const averageCvss = stats.findings.averageCvss || 0

  const complianceRate = useMemo(() => {
    if (totalFindings === 0) return 100
    return Math.round(((totalFindings - overdueCount) / totalFindings) * 100)
  }, [totalFindings, overdueCount])

  const onTrackCount = totalFindings - overdueCount

  const complianceColor = useMemo(() => {
    if (complianceRate >= 90) return 'text-green-500'
    if (complianceRate >= 70) return 'text-yellow-500'
    return 'text-red-500'
  }, [complianceRate])

  const complianceProgressColor = useMemo(() => {
    if (complianceRate >= 90) return '[&>div]:bg-green-500'
    if (complianceRate >= 70) return '[&>div]:bg-yellow-500'
    return '[&>div]:bg-red-500'
  }, [complianceRate])

  const complianceLabel = useMemo(() => {
    if (complianceRate >= 90) return 'Excellent - Meeting SLA targets'
    if (complianceRate >= 70) return 'Needs improvement - Some SLA violations'
    return 'Critical - Significant SLA breaches'
  }, [complianceRate])

  const trendData = useMemo(() => {
    return (stats.findingTrend || []).map((point) => {
      const total = point.critical + point.high + point.medium + point.low + point.info
      return {
        date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total,
        critical: point.critical,
        high: point.high,
        medium: point.medium,
        low: point.low,
      }
    })
  }, [stats.findingTrend])

  const severityComplianceData = useMemo(() => {
    const bySeverity = stats.findings.bySeverity || {}
    const severities = ['critical', 'high', 'medium', 'low']
    return severities
      .filter((s) => (bySeverity[s] || 0) > 0)
      .map((severity) => {
        const count = bySeverity[severity] || 0
        const estimatedOverdue =
          totalFindings > 0 ? Math.round(count * (overdueCount / totalFindings)) : 0
        const compliant = count - estimatedOverdue
        return {
          name: severity.charAt(0).toUpperCase() + severity.slice(1),
          compliant: Math.max(compliant, 0),
          overdue: estimatedOverdue,
          total: count,
        }
      })
  }, [stats.findings.bySeverity, totalFindings, overdueCount])

  return (
    <Main>
      <PageHeader
        title="SLA Compliance"
        description="Monitor service level agreement compliance for finding remediation"
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
              title="SLA Compliance Rate"
              value={`${complianceRate}%`}
              changeType={
                complianceRate >= 90 ? 'positive' : complianceRate >= 70 ? 'neutral' : 'negative'
              }
              change={complianceLabel}
              icon={ShieldCheck}
            />
            <StatsCard
              title="Overdue Violations"
              value={overdueCount}
              changeType={overdueCount > 0 ? 'negative' : 'positive'}
              change={overdueCount > 0 ? 'SLA breaches' : 'No violations'}
              icon={AlertTriangle}
            />
            <StatsCard
              title="On-Track"
              value={onTrackCount}
              changeType="positive"
              change="Within SLA"
              icon={CheckCircle}
            />
            <StatsCard
              title="Average CVSS"
              value={averageCvss.toFixed(1)}
              changeType={averageCvss > 7 ? 'negative' : averageCvss > 4 ? 'neutral' : 'positive'}
              change={
                averageCvss > 7 ? 'High risk' : averageCvss > 4 ? 'Moderate risk' : 'Low risk'
              }
              icon={Target}
            />
          </section>

          <section className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Overall SLA Compliance</CardTitle>
                <CardDescription>{complianceLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {onTrackCount} of {totalFindings} findings within SLA
                    </span>
                    <span className={cn('text-3xl font-bold', complianceColor)}>
                      {complianceRate}%
                    </span>
                  </div>
                  <Progress value={complianceRate} className={cn('h-4', complianceProgressColor)} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <div className="flex gap-4">
                      <span className="text-red-500">Below 70%: Critical</span>
                      <span className="text-yellow-500">70-90%: Warning</span>
                      <span className="text-green-500">Above 90%: Target</span>
                    </div>
                    <span>100%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>SLA Targets by Severity</CardTitle>
                <CardDescription>Remediation timelines for each severity level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {SLA_TARGETS.map((target) => (
                    <div
                      key={target.severity}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-3',
                        target.bgColor,
                        target.borderColor
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className={cn('h-4 w-4', target.color)} />
                        <div>
                          <p className="text-sm font-medium">{target.severity}</p>
                          <p className="text-xs text-muted-foreground">{target.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-sm font-bold', target.color)}>
                        {target.target}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {severityComplianceData.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Compliance by Severity</CardTitle>
                  <CardDescription>On-track vs overdue findings per severity level</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={severityComplianceData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="compliant"
                        name="On Track"
                        stackId="a"
                        fill="#22c55e"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="overdue"
                        name="Overdue"
                        stackId="a"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Compliance by Severity</CardTitle>
                  <CardDescription>On-track vs overdue findings per severity level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-[300px] items-center justify-center">
                    <div className="text-center">
                      <CircleDot className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No findings data available</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Compliance Trajectory</CardTitle>
                <CardDescription>
                  Finding volume trend - lower counts indicate improving compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="critical"
                        stackId="1"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.8}
                        name="Critical"
                      />
                      <Area
                        type="monotone"
                        dataKey="high"
                        stackId="1"
                        stroke="#f97316"
                        fill="#f97316"
                        fillOpacity={0.8}
                        name="High"
                      />
                      <Area
                        type="monotone"
                        dataKey="medium"
                        stackId="1"
                        stroke="#eab308"
                        fill="#eab308"
                        fillOpacity={0.8}
                        name="Medium"
                      />
                      <Area
                        type="monotone"
                        dataKey="low"
                        stackId="1"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.8}
                        name="Low"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No trend data available yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Trend data will appear as findings are tracked over time
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
