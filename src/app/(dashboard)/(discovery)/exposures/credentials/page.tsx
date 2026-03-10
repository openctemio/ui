'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from '@/components/charts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { KeyRound, AlertTriangle, GitBranch, Clock } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

const SEVERITY_BADGE_VARIANTS: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> =
  {
    critical: 'destructive',
    high: 'destructive',
    medium: 'default',
    low: 'secondary',
    info: 'outline',
  }

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const

function LoadingSkeleton() {
  return (
    <>
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
      </section>
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
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
      </section>
      <section>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <KeyRound className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No credential exposure data available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure credential scanning to monitor exposed access keys across your systems.
        </p>
      </CardContent>
    </Card>
  )
}

export default function CredentialExposuresPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const criticalCount = stats.findings.bySeverity.critical || 0

  const severityBarData = useMemo(() => {
    return SEVERITY_ORDER.map((severity) => ({
      name: SEVERITY_LABELS[severity],
      count: stats.findings.bySeverity[severity] || 0,
      fill: SEVERITY_COLORS[severity],
    })).filter((d) => d.count > 0)
  }, [stats.findings.bySeverity])

  const immediateActions = useMemo(() => {
    const total = stats.findings.total
    return SEVERITY_ORDER.filter((severity) => severity === 'critical' || severity === 'high')
      .map((severity) => {
        const count = stats.findings.bySeverity[severity] || 0
        const percentage = total > 0 ? (count / total) * 100 : 0
        return {
          severity,
          label: SEVERITY_LABELS[severity],
          count,
          percentage,
          color: SEVERITY_COLORS[severity],
          action:
            severity === 'critical'
              ? 'Rotate credentials and revoke access immediately'
              : 'Schedule credential rotation within 24 hours',
        }
      })
      .filter((item) => item.count > 0)
  }, [stats.findings.bySeverity, stats.findings.total])

  const hasData = stats.findings.total > 0
  const hasTrendData = stats.findingTrend.length > 0

  return (
    <Main>
      <PageHeader
        title="Credential Exposures"
        description="Monitor exposed credentials and access keys across your systems"
        className="mb-6"
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats Row */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Total Credential Findings"
              value={stats.findings.total}
              icon={KeyRound}
            />
            <StatsCard
              title="Critical"
              value={criticalCount}
              changeType={criticalCount > 0 ? 'negative' : 'positive'}
              change={criticalCount > 0 ? 'Rotate immediately' : 'No critical exposures'}
              icon={AlertTriangle}
            />
            <StatsCard
              title="Repositories"
              value={stats.repositories.withFindings}
              change={
                stats.repositories.total > 0 ? `of ${stats.repositories.total} total` : undefined
              }
              changeType={stats.repositories.withFindings > 0 ? 'negative' : 'positive'}
              icon={GitBranch}
            />
            <StatsCard
              title="Overdue"
              value={stats.findings.overdue}
              changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
              change={stats.findings.overdue > 0 ? 'Past remediation deadline' : 'All on track'}
              icon={Clock}
            />
          </section>

          {/* Charts Row */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Severity Breakdown Bar */}
            <Card>
              <CardHeader>
                <CardTitle>Severity Breakdown</CardTitle>
                <CardDescription>Credential findings distributed by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                {severityBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={severityBarData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                        {severityBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No severity data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Credential Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Credential Exposure Trend</CardTitle>
                <CardDescription>Tracking credential findings over time</CardDescription>
              </CardHeader>
              <CardContent>
                {hasTrendData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stats.findingTrend}>
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
                        stroke={SEVERITY_COLORS.critical}
                        fill={SEVERITY_COLORS.critical}
                        fillOpacity={0.8}
                        name="Critical"
                      />
                      <Area
                        type="monotone"
                        dataKey="high"
                        stackId="1"
                        stroke={SEVERITY_COLORS.high}
                        fill={SEVERITY_COLORS.high}
                        fillOpacity={0.8}
                        name="High"
                      />
                      <Area
                        type="monotone"
                        dataKey="medium"
                        stackId="1"
                        stroke={SEVERITY_COLORS.medium}
                        fill={SEVERITY_COLORS.medium}
                        fillOpacity={0.8}
                        name="Medium"
                      />
                      <Area
                        type="monotone"
                        dataKey="low"
                        stackId="1"
                        stroke={SEVERITY_COLORS.low}
                        fill={SEVERITY_COLORS.low}
                        fillOpacity={0.8}
                        name="Low"
                      />
                      <Area
                        type="monotone"
                        dataKey="info"
                        stackId="1"
                        stroke={SEVERITY_COLORS.info}
                        fill={SEVERITY_COLORS.info}
                        fillOpacity={0.8}
                        name="Info"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">
                      No trend data available yet. Run scans to start tracking credential exposure
                      trends.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Immediate Actions */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Immediate Actions</CardTitle>
                <CardDescription>
                  Critical and high severity credential exposures requiring urgent attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {immediateActions.length > 0 ? (
                  <div className="space-y-4">
                    {immediateActions.map((item) => (
                      <div
                        key={item.severity}
                        className="flex items-center gap-4 rounded-lg border p-4"
                      >
                        <Badge
                          variant={SEVERITY_BADGE_VARIANTS[item.severity]}
                          className="w-20 justify-center"
                        >
                          {item.label}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {item.count} {item.count === 1 ? 'credential' : 'credentials'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.action}</p>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn('h-full rounded-full transition-all')}
                              style={{
                                width: `${item.percentage}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center">
                    <p className="text-muted-foreground">
                      No critical or high severity credential exposures found
                    </p>
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
