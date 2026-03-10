'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import {
  PieChart,
  BarChart,
  Pie,
  Bar,
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
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  PieChart as PieChartIcon,
  Shield,
  Target,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  inactive: '#6b7280',
  decommissioned: '#ef4444',
  archived: '#eab308',
  pending: '#3b82f6',
  unknown: '#a855f7',
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status.toLowerCase()] || '#6b7280'
}

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

      {/* Bottom cards skeleton */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
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
        <PieChartIcon className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No assets discovered yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add assets to start coverage analysis.
        </p>
      </CardContent>
    </Card>
  )
}

export default function CoveragePage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const scannedRepos = stats.repositories.withFindings
  const totalRepos = stats.repositories.total
  const unscannedRepos = totalRepos - scannedRepos
  const coveragePercent = totalRepos > 0 ? Math.round((scannedRepos / totalRepos) * 100) : 0

  const coveragePieData = useMemo(() => {
    return [
      { name: 'Scanned', value: scannedRepos, color: '#22c55e' },
      { name: 'Not Scanned', value: unscannedRepos, color: '#ef4444' },
    ].filter((d) => d.value > 0)
  }, [scannedRepos, unscannedRepos])

  const assetsByType = useMemo(() => {
    const byType = stats.assets.byType || {}
    return Object.entries(byType)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [stats.assets.byType])

  const assetsByStatus = useMemo(() => {
    const byStatus = stats.assets.byStatus || {}
    return Object.entries(byStatus)
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
        count,
        color: getStatusColor(status),
      }))
      .sort((a, b) => b.count - a.count)
  }, [stats.assets.byStatus])

  const coverageGaps = useMemo(() => {
    const gaps: { label: string; severity: 'warning' | 'info' }[] = []
    if (unscannedRepos > 0) {
      gaps.push({
        label: `${unscannedRepos} ${unscannedRepos === 1 ? 'repository has' : 'repositories have'} not been scanned`,
        severity: 'warning',
      })
    }
    const byType = stats.assets.byType || {}
    for (const [type, count] of Object.entries(byType)) {
      if (count === 0) {
        const label = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
        gaps.push({
          label: `${label} assets have no findings coverage`,
          severity: 'info',
        })
      }
    }
    return gaps
  }, [unscannedRepos, stats.assets.byType])

  return (
    <Main>
      <PageHeader
        title="Coverage Analytics"
        description="Analyze scan coverage across your assets and identify monitoring gaps"
        className="mb-6"
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : stats.assets.total === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats Row */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Total Assets"
              value={stats.assets.total}
              change={
                Object.keys(stats.assets.byType).length > 0
                  ? `${Object.keys(stats.assets.byType).length} types`
                  : 'No data'
              }
              changeType="neutral"
              icon={Shield}
            />
            <StatsCard
              title="Repository Coverage"
              value={`${coveragePercent}%`}
              change={`${scannedRepos} of ${totalRepos} repos`}
              changeType={coveragePercent >= 80 ? 'positive' : coveragePercent >= 50 ? 'neutral' : 'negative'}
              icon={Target}
            />
            <StatsCard
              title="Scanned Repositories"
              value={scannedRepos}
              change={totalRepos > 0 ? `${coveragePercent}% coverage` : 'No repos'}
              changeType={scannedRepos > 0 ? 'positive' : 'neutral'}
              icon={CheckCircle}
            />
            <StatsCard
              title="Unscanned Repositories"
              value={unscannedRepos}
              change={
                unscannedRepos > 0 ? 'Needs attention' : 'All scanned'
              }
              changeType={unscannedRepos > 0 ? 'negative' : 'positive'}
              icon={Eye}
            />
          </section>

          {/* Two-column Charts */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Scan Coverage Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Scan Coverage</CardTitle>
                <CardDescription>
                  Repository scanning status ({scannedRepos} of {totalRepos} scanned)
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
                          <Cell key={`cell-${index}`} fill={entry.color} />
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

            {/* Assets by Type - Horizontal Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Assets by Type</CardTitle>
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
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No asset type data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Asset Status Distribution & Coverage Gaps */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Asset Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Status Distribution</CardTitle>
                <CardDescription>Assets grouped by current status</CardDescription>
              </CardHeader>
              <CardContent>
                {assetsByStatus.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(250, assetsByStatus.length * 40)}
                  >
                    <BarChart data={assetsByStatus} layout="vertical" barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={120}
                      />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                        {assetsByStatus.map((entry, index) => (
                          <Cell key={`status-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[250px] items-center justify-center">
                    <p className="text-muted-foreground">No status data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coverage Gaps */}
            <Card>
              <CardHeader>
                <CardTitle>Coverage Gaps</CardTitle>
                <CardDescription>Identified gaps in scan coverage</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Overall coverage */}
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Repository Coverage</span>
                    <span
                      className={cn(
                        'text-sm font-bold',
                        coveragePercent >= 80
                          ? 'text-green-500'
                          : coveragePercent >= 50
                            ? 'text-yellow-500'
                            : 'text-red-500'
                      )}
                    >
                      {coveragePercent}%
                    </span>
                  </div>
                  <Progress value={coveragePercent} className="h-2" />
                </div>

                {/* Gap items */}
                {coverageGaps.length > 0 ? (
                  <div className="space-y-3">
                    {coverageGaps.map((gap, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-lg border p-3"
                      >
                        {gap.severity === 'warning' ? (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        ) : (
                          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{gap.label}</p>
                        </div>
                        <Badge
                          variant={gap.severity === 'warning' ? 'destructive' : 'secondary'}
                          className="shrink-0"
                        >
                          {gap.severity === 'warning' ? 'Warning' : 'Info'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="mb-2 h-8 w-8 text-green-500" />
                    <p className="text-sm font-medium">No coverage gaps detected</p>
                    <p className="text-xs text-muted-foreground">
                      All repositories are being scanned
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
