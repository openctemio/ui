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
} from '@/components/charts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Settings2, AlertTriangle, Server, Shield } from 'lucide-react'

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

const ASSET_TYPE_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1']

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
              {[1, 2, 3, 4, 5].map((i) => (
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
        <Settings2 className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No misconfiguration data available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run configuration scans to identify infrastructure and application misconfigurations.
        </p>
      </CardContent>
    </Card>
  )
}

export default function MisconfigurationsPage() {
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

  const assetTypeData = useMemo(() => {
    const byType = stats.assets.byType || {}
    return Object.entries(byType)
      .map(([type, count], index) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
        value: count,
        color: ASSET_TYPE_COLORS[index % ASSET_TYPE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [stats.assets.byType])

  const priorityFixes = useMemo(() => {
    const total = stats.findings.total
    return SEVERITY_ORDER.map((severity) => {
      const count = stats.findings.bySeverity[severity] || 0
      const percentage = total > 0 ? (count / total) * 100 : 0
      return {
        severity,
        label: SEVERITY_LABELS[severity],
        count,
        percentage,
        color: SEVERITY_COLORS[severity],
      }
    }).filter((item) => item.count > 0)
  }, [stats.findings.bySeverity, stats.findings.total])

  const hasData = stats.findings.total > 0

  return (
    <Main>
      <PageHeader
        title="Misconfiguration Exposures"
        description="Identify infrastructure and application misconfigurations"
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
            <StatsCard title="Total Findings" value={stats.findings.total} icon={Settings2} />
            <StatsCard
              title="Critical Misconfigs"
              value={criticalCount}
              changeType={criticalCount > 0 ? 'negative' : 'positive'}
              change={criticalCount > 0 ? 'Immediate remediation needed' : 'No critical issues'}
              icon={AlertTriangle}
            />
            <StatsCard
              title="Asset Coverage"
              value={stats.assets.total}
              change={`${Object.keys(stats.assets.byType).length} asset types monitored`}
              changeType="neutral"
              icon={Server}
            />
            <StatsCard
              title="Risk Score"
              value={stats.assets.riskScore.toFixed(0)}
              changeType={
                stats.assets.riskScore > 70
                  ? 'negative'
                  : stats.assets.riskScore > 40
                    ? 'neutral'
                    : 'positive'
              }
              change={
                stats.assets.riskScore > 70
                  ? 'High risk'
                  : stats.assets.riskScore > 40
                    ? 'Medium risk'
                    : 'Low risk'
              }
              icon={Shield}
            />
          </section>

          {/* Charts Row */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Findings by Severity Bar */}
            <Card>
              <CardHeader>
                <CardTitle>Findings by Severity</CardTitle>
                <CardDescription>
                  Misconfiguration findings distributed by severity level
                </CardDescription>
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

            {/* Asset Type Distribution Pie */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Type Distribution</CardTitle>
                <CardDescription>
                  Affected assets by type across {stats.assets.total} total assets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assetTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={assetTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {assetTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No asset type data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Priority Fixes */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Priority Fixes</CardTitle>
                <CardDescription>
                  Misconfigurations ranked by severity for prioritized remediation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {priorityFixes.map((item) => (
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
                            {item.count}{' '}
                            {item.count === 1 ? 'misconfiguration' : 'misconfigurations'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
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
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </Main>
  )
}
