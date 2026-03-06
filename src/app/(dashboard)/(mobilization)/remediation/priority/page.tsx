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
  Area,
  AreaChart,
} from '@/components/charts'
import { cn } from '@/lib/utils'
import {
  Flame,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  CircleDot,
  ShieldAlert,
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

export default function TasksByPriorityPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const criticalCount = stats.findings.bySeverity?.critical || 0
  const highCount = stats.findings.bySeverity?.high || 0
  const mediumCount = stats.findings.bySeverity?.medium || 0
  const lowCount = stats.findings.bySeverity?.low || 0
  const totalFindings = stats.findings.total || 0

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity || {})
      .filter(([name]) => name !== 'info')
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: SEVERITY_COLORS[name.toLowerCase()] || '#6b7280',
      }))
      .sort((a, b) => {
        const order = ['Critical', 'High', 'Medium', 'Low']
        return order.indexOf(a.name) - order.indexOf(b.name)
      })
  }, [stats.findings.bySeverity])

  const trendData = useMemo(() => {
    return (stats.findingTrend || []).map((point) => ({
      ...point,
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
  }, [stats.findingTrend])

  const severityPercentages = useMemo(() => {
    if (totalFindings === 0) return { critical: 0, high: 0, medium: 0, low: 0 }
    return {
      critical: Math.round((criticalCount / totalFindings) * 100),
      high: Math.round((highCount / totalFindings) * 100),
      medium: Math.round((mediumCount / totalFindings) * 100),
      low: Math.round((lowCount / totalFindings) * 100),
    }
  }, [criticalCount, highCount, mediumCount, lowCount, totalFindings])

  const priorityAssessment = useMemo(() => {
    if (totalFindings === 0) return { level: 'none', text: 'No findings to prioritize.' }
    if (criticalCount > 0)
      return {
        level: 'critical',
        text: `${criticalCount} critical ${criticalCount === 1 ? 'finding requires' : 'findings require'} immediate attention. These represent the highest risk to your organization and should be remediated within 24 hours.`,
      }
    if (highCount > 0)
      return {
        level: 'high',
        text: `${highCount} high severity ${highCount === 1 ? 'finding needs' : 'findings need'} prompt remediation. Target resolution within 72 hours to minimize exposure.`,
      }
    if (mediumCount > 0)
      return {
        level: 'medium',
        text: `${mediumCount} medium severity ${mediumCount === 1 ? 'finding should' : 'findings should'} be addressed within the current sprint. No critical or high severity issues detected.`,
      }
    return {
      level: 'low',
      text: `Only low severity findings remain. Continue monitoring and address during scheduled maintenance windows.`,
    }
  }, [totalFindings, criticalCount, highCount, mediumCount])

  const assessmentColors: Record<string, string> = {
    none: 'border-muted',
    critical: 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20',
    high: 'border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20',
    medium: 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20',
    low: 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20',
  }

  return (
    <Main>
      <PageHeader
        title="Priority Queue"
        description="View findings prioritized by severity and business impact"
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
              title="Critical Priority"
              value={criticalCount}
              changeType={criticalCount > 0 ? 'negative' : 'positive'}
              change={criticalCount > 0 ? 'Immediate action' : 'Clear'}
              icon={Flame}
            />
            <StatsCard
              title="High Priority"
              value={highCount}
              changeType={highCount > 0 ? 'negative' : 'positive'}
              change={highCount > 0 ? 'Prompt attention' : 'Clear'}
              icon={ArrowUp}
            />
            <StatsCard
              title="Medium Priority"
              value={mediumCount}
              changeType="neutral"
              change={`${severityPercentages.medium}% of total`}
              icon={AlertTriangle}
            />
            <StatsCard
              title="Low Priority"
              value={lowCount}
              changeType="neutral"
              change={`${severityPercentages.low}% of total`}
              icon={ArrowDown}
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
                <CardDescription>Findings breakdown by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                {severityData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
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
                    <div className="mt-4 space-y-2">
                      {severityData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.fill }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.value}</span>
                            <span className="text-muted-foreground">
                              (
                              {totalFindings > 0
                                ? Math.round((item.value / totalFindings) * 100)
                                : 0}
                              %)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
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

            <Card>
              <CardHeader>
                <CardTitle>Severity Trend</CardTitle>
                <CardDescription>Finding severity levels over time</CardDescription>
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
                      <p className="text-muted-foreground">No trend data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className={cn('border', assessmentColors[priorityAssessment.level])}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  <CardTitle>Priority Assessment</CardTitle>
                </div>
                <CardDescription>Current risk posture based on finding severity</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{priorityAssessment.text}</p>
                {totalFindings > 0 && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(severityPercentages).map(([severity, pct]) => (
                      <div key={severity} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize">{severity}</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress
                          value={pct}
                          className={cn(
                            'h-2',
                            severity === 'critical' && '[&>div]:bg-red-500',
                            severity === 'high' && '[&>div]:bg-orange-500',
                            severity === 'medium' && '[&>div]:bg-yellow-500',
                            severity === 'low' && '[&>div]:bg-blue-500'
                          )}
                        />
                      </div>
                    ))}
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
