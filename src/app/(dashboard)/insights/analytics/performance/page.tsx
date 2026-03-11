'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import {
  BarChart,
  PieChart,
  Bar,
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
import {
  Gauge,
  Server,
  GitBranch,
  Layers,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
} from 'lucide-react'

const TYPE_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#22c55e',
  '#eab308',
  '#ef4444',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
]

function LoadingSkeleton() {
  return (
    <>
      {/* Stats row skeleton */}
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

      {/* Charts row skeleton */}
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

      {/* Bottom row skeleton */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Gauge className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No scan data available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run scans to start monitoring performance metrics.
        </p>
      </CardContent>
    </Card>
  )
}

export default function ScanPerformancePage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const assetTypeCount = Object.keys(stats.assets.byType || {}).length
  const totalRepos = stats.repositories.total
  const scannedRepos = stats.repositories.withFindings
  const unscannedRepos = totalRepos - scannedRepos
  const coveragePercent = totalRepos > 0 ? Math.round((scannedRepos / totalRepos) * 100) : 0

  const assetsByType = useMemo(() => {
    const byType = stats.assets.byType || {}
    return Object.entries(byType)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [stats.assets.byType])

  const coveragePieData = useMemo(() => {
    return [
      { name: 'Scanned', value: scannedRepos, color: '#22c55e' },
      { name: 'Not Scanned', value: unscannedRepos, color: '#ef4444' },
    ].filter((d) => d.value > 0)
  }, [scannedRepos, unscannedRepos])

  const findingTrendTotals = useMemo(() => {
    return stats.findingTrend.map((point) => ({
      date: point.date,
      total: point.critical + point.high + point.medium + point.low + point.info,
    }))
  }, [stats.findingTrend])

  const recommendations = useMemo(() => {
    const items: { label: string; severity: 'warning' | 'critical' | 'info' }[] = []

    if (unscannedRepos > 0) {
      items.push({
        label: `${unscannedRepos} ${unscannedRepos === 1 ? 'repository needs' : 'repositories need'} scanning configuration`,
        severity: 'warning',
      })
    }

    if (stats.assets.riskScore > 7) {
      items.push({
        label: 'High risk score detected - prioritize critical findings',
        severity: 'critical',
      })
    }

    const byType = stats.assets.byType || {}
    const findingsByType = stats.findings.bySeverity || {}
    const hasFindingsData = Object.values(findingsByType).reduce((sum, count) => sum + count, 0) > 0

    if (hasFindingsData) {
      for (const [type] of Object.entries(byType)) {
        const label = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
        items.push({
          label: `${label} assets may need additional scanner coverage`,
          severity: 'info',
        })
      }
    }

    return items
  }, [unscannedRepos, stats.assets.riskScore, stats.assets.byType, stats.findings.bySeverity])

  return (
    <Main>
      <PageHeader
        title="Scan Performance"
        description="Monitor scan execution metrics and identify optimization opportunities"
        className="mb-6"
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : stats.assets.total === 0 && totalRepos === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats Row */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard title="Total Assets Monitored" value={stats.assets.total} icon={Server} />
            <StatsCard
              title="Repository Coverage"
              value={`${coveragePercent}%`}
              change={`${scannedRepos} of ${totalRepos} repos`}
              changeType={
                coveragePercent >= 80 ? 'positive' : coveragePercent >= 50 ? 'neutral' : 'negative'
              }
              icon={GitBranch}
            />
            <StatsCard
              title="Asset Types Tracked"
              value={assetTypeCount}
              change={assetTypeCount > 0 ? `${assetTypeCount} distinct types` : 'No types'}
              changeType="neutral"
              icon={Layers}
            />
            <StatsCard
              title="Risk Score"
              value={stats.assets.riskScore.toFixed(1)}
              changeType={
                stats.assets.riskScore > 7
                  ? 'negative'
                  : stats.assets.riskScore > 4
                    ? 'neutral'
                    : 'positive'
              }
              change={
                stats.assets.riskScore > 7
                  ? 'High risk'
                  : stats.assets.riskScore > 4
                    ? 'Medium risk'
                    : 'Low risk'
              }
              icon={ShieldAlert}
            />
          </section>

          {/* Asset Distribution + Repository Scan Coverage */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Asset Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Distribution</CardTitle>
                <CardDescription>
                  Distribution of {stats.assets.total} assets across types
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assetsByType.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(300, assetsByType.length * 40)}
                  >
                    <BarChart data={assetsByType} layout="vertical" barCategoryGap="20%">
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
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                        {assetsByType.map((_entry, index) => (
                          <Cell
                            key={`type-cell-${index}`}
                            fill={TYPE_COLORS[index % TYPE_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No asset type data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Repository Scan Coverage */}
            <Card>
              <CardHeader>
                <CardTitle>Repository Scan Coverage</CardTitle>
                <CardDescription>
                  {scannedRepos} of {totalRepos} repositories scanned
                </CardDescription>
              </CardHeader>
              <CardContent>
                {totalRepos > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={coveragePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {coveragePieData.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No repository data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Finding Discovery Rate + Optimization Recommendations */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Finding Discovery Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Finding Discovery Rate</CardTitle>
                <CardDescription>Total findings discovered per month</CardDescription>
              </CardHeader>
              <CardContent>
                {findingTrendTotals.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={findingTrendTotals}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar
                        dataKey="total"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                        name="Findings"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No trend data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Optimization Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
                <CardDescription>Actionable items to improve scan performance</CardDescription>
              </CardHeader>
              <CardContent>
                {recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {recommendations.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
                        {item.severity === 'critical' ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        ) : item.severity === 'warning' ? (
                          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                        ) : (
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">{item.label}</p>
                        </div>
                        <Badge
                          variant={
                            item.severity === 'critical'
                              ? 'destructive'
                              : item.severity === 'warning'
                                ? 'default'
                                : 'secondary'
                          }
                          className="shrink-0"
                        >
                          {item.severity === 'critical'
                            ? 'Critical'
                            : item.severity === 'warning'
                              ? 'Warning'
                              : 'Info'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="mb-2 h-8 w-8 text-green-500" />
                    <p className="text-sm font-medium">No recommendations at this time</p>
                    <p className="text-xs text-muted-foreground">
                      All scans are performing optimally
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
