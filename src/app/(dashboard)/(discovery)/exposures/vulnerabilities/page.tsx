'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
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
  AreaChart,
  Area,
} from '@/components/charts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Bug, AlertTriangle, Clock, Shield } from 'lucide-react'

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
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[350px] w-full" />
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
        <Bug className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No vulnerability data available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run vulnerability scans to discover exposures across your attack surface.
        </p>
      </CardContent>
    </Card>
  )
}

export default function VulnerabilitiesPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const criticalCount = stats.findings.bySeverity.critical || 0

  const severityPieData = useMemo(() => {
    return SEVERITY_ORDER.map((severity) => ({
      name: SEVERITY_LABELS[severity],
      value: stats.findings.bySeverity[severity] || 0,
      color: SEVERITY_COLORS[severity],
    })).filter((d) => d.value > 0)
  }, [stats.findings.bySeverity])

  const statusBarData = useMemo(() => {
    const byStatus = stats.findings.byStatus || {}
    return Object.entries(byStatus)
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [stats.findings.byStatus])

  const hasData = stats.findings.total > 0
  const hasTrendData = stats.findingTrend.length > 0

  return (
    <Main>
      <PageHeader
        title="Vulnerability Exposures"
        description="Track discovered vulnerabilities across your attack surface"
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
            <StatsCard title="Total Vulnerabilities" value={stats.findings.total} icon={Bug} />
            <StatsCard
              title="Critical"
              value={criticalCount}
              changeType={criticalCount > 0 ? 'negative' : 'positive'}
              change={criticalCount > 0 ? 'Immediate action required' : 'No critical issues'}
              icon={AlertTriangle}
            />
            <StatsCard
              title="Average CVSS"
              value={stats.findings.averageCvss.toFixed(1)}
              changeType={
                stats.findings.averageCvss > 7
                  ? 'negative'
                  : stats.findings.averageCvss > 4
                    ? 'neutral'
                    : 'positive'
              }
              change={
                stats.findings.averageCvss >= 9
                  ? 'Critical'
                  : stats.findings.averageCvss >= 7
                    ? 'High'
                    : stats.findings.averageCvss >= 4
                      ? 'Medium'
                      : 'Low'
              }
              icon={Shield}
            />
            <StatsCard
              title="Overdue"
              value={stats.findings.overdue}
              changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
              change={stats.findings.overdue > 0 ? 'Past SLA deadline' : 'All within SLA'}
              icon={Clock}
            />
          </section>

          {/* Charts Row */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Severity Distribution Pie */}
            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
                <CardDescription>
                  Breakdown of {stats.findings.total} vulnerabilities by severity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {severityPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={severityPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {severityPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No severity data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Breakdown Bar */}
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Current remediation status of all vulnerabilities</CardDescription>
              </CardHeader>
              <CardContent>
                {statusBarData.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(300, statusBarData.length * 40)}
                  >
                    <BarChart data={statusBarData} layout="vertical" barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={100}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No status data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Vulnerability Trend */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Vulnerability Trend</CardTitle>
                <CardDescription>
                  Severity distribution over time across your attack surface
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasTrendData ? (
                  <ResponsiveContainer width="100%" height={350}>
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
                  <div className="flex h-[350px] items-center justify-center">
                    <p className="text-muted-foreground">
                      No trend data available yet. Run scans to start tracking vulnerability trends.
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
