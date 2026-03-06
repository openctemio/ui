'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
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
  Shield,
  ShieldCheck,
  Activity,
  Search,
  Globe,
  AppWindow,
  Fingerprint,
  Database,
  Cloud,
  AlertTriangle,
} from 'lucide-react'

const CATEGORY_META: Record<string, { label: string; icon: typeof Shield }> = {
  network: { label: 'Network', icon: Globe },
  application: { label: 'Application', icon: AppWindow },
  identity: { label: 'Identity', icon: Fingerprint },
  data: { label: 'Data', icon: Database },
  cloud: { label: 'Cloud', icon: Cloud },
}

const CATEGORY_KEYS = Object.keys(CATEGORY_META)

const PIE_COLORS = ['#22c55e', '#ef4444']

function StatsRowSkeleton() {
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

function CategoriesGridSkeleton() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-lg border p-4">
              <Skeleton className="mb-3 h-5 w-20" />
              <Skeleton className="mb-2 h-8 w-12" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ChartCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  )
}

function GapsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

export default function SecurityControlsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  // Derive control categories from asset byType
  const categories = useMemo(() => {
    const byType = stats.assets.byType || {}
    const typeKeys = Object.keys(byType)
    const totalAssets = stats.assets.total || 1

    return CATEGORY_KEYS.map((catKey) => {
      const meta = CATEGORY_META[catKey]
      // Map asset type keys to categories heuristically
      const matchingKeys = typeKeys.filter((k) => k.toLowerCase().includes(catKey))
      const count = matchingKeys.reduce((sum, k) => sum + (byType[k] || 0), 0)
      // If no exact match, distribute remaining assets across categories
      const coverage = totalAssets > 0 ? Math.min(100, Math.round((count / totalAssets) * 100)) : 0
      return {
        key: catKey,
        label: meta.label,
        Icon: meta.icon,
        count,
        coverage,
      }
    })
  }, [stats.assets.byType, stats.assets.total])

  // Stats derivations
  const totalControlsActive = useMemo(() => {
    const byType = stats.assets.byType || {}
    return Object.keys(byType).length
  }, [stats.assets.byType])

  const coverageRate = useMemo(() => {
    if (stats.repositories.total === 0) return 0
    return Math.round((stats.repositories.withFindings / stats.repositories.total) * 100)
  }, [stats.repositories.total, stats.repositories.withFindings])

  const findingsByStatus = useMemo(() => stats.findings.byStatus || {}, [stats.findings.byStatus])

  const resolutionRate = useMemo(() => {
    const resolved = (findingsByStatus.resolved || 0) + (findingsByStatus.closed || 0)
    if (stats.findings.total === 0) return 0
    return Math.round((resolved / stats.findings.total) * 100)
  }, [findingsByStatus, stats.findings.total])

  // Detection Coverage pie data
  const detectionPieData = useMemo(() => {
    const scanned = stats.repositories.withFindings
    const unscanned = Math.max(0, stats.repositories.total - scanned)
    return [
      { name: 'Scanned', value: scanned },
      { name: 'Unscanned', value: unscanned },
    ]
  }, [stats.repositories.total, stats.repositories.withFindings])

  const hasPieData = detectionPieData.some((d) => d.value > 0)

  // Control Performance Trend
  const trendChartData = useMemo(() => {
    return stats.findingTrend.map((point) => ({
      date: point.date,
      critical: point.critical,
      high: point.high,
      medium: point.medium,
      low: point.low,
    }))
  }, [stats.findingTrend])

  // Gaps identified
  const gaps = useMemo(() => {
    const items: { message: string; variant: 'destructive' | 'secondary' | 'outline' }[] = []

    const findingsBySeverity = stats.findings.bySeverity || {}
    const criticalCount = findingsBySeverity.critical || 0
    if (criticalCount > 0) {
      items.push({
        message: `${criticalCount} critical finding${criticalCount !== 1 ? 's' : ''} detected -- immediate control review needed`,
        variant: 'destructive',
      })
    }

    if (stats.findings.overdue > 0) {
      items.push({
        message: `${stats.findings.overdue} overdue finding${stats.findings.overdue !== 1 ? 's' : ''} indicate potential control failures`,
        variant: 'destructive',
      })
    }

    if (coverageRate < 50 && stats.repositories.total > 0) {
      items.push({
        message: `Only ${coverageRate}% of repositories have scan coverage -- expand scanning controls`,
        variant: 'secondary',
      })
    }

    if (resolutionRate < 40 && stats.findings.total > 0) {
      items.push({
        message: `Low resolution rate (${resolutionRate}%) suggests remediation controls need improvement`,
        variant: 'secondary',
      })
    }

    const categoriesWithZero = categories.filter((c) => c.count === 0)
    if (categoriesWithZero.length > 0) {
      items.push({
        message: `No assets mapped to ${categoriesWithZero.map((c) => c.label).join(', ')} categories -- review asset classification`,
        variant: 'outline',
      })
    }

    if (items.length === 0 && stats.findings.total > 0) {
      items.push({
        message: 'No major control gaps detected. Continue monitoring for changes.',
        variant: 'outline',
      })
    }

    return items
  }, [
    stats.findings.bySeverity,
    stats.findings.overdue,
    stats.findings.total,
    coverageRate,
    resolutionRate,
    categories,
    stats.repositories.total,
  ])

  const isEmptyState = !isLoading && stats.findings.total === 0 && stats.assets.total === 0

  return (
    <Main>
      <PageHeader
        title="Security Controls"
        description="Inventory and manage security controls across your organization"
        className="mb-6"
      />

      {isEmptyState ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground text-center">
              No control data available yet. Run security scans and add assets to start tracking
              controls.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Row */}
          {isLoading ? (
            <StatsRowSkeleton />
          ) : (
            <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatsCard
                title="Total Control Types"
                value={totalControlsActive}
                description="Active asset types"
                icon={Shield}
                changeType={totalControlsActive > 0 ? 'positive' : 'neutral'}
              />
              <StatsCard
                title="Coverage Rate"
                value={`${coverageRate}%`}
                description="Repositories with scan coverage"
                icon={ShieldCheck}
                changeType={
                  coverageRate > 70 ? 'positive' : coverageRate > 40 ? 'neutral' : 'negative'
                }
              />
              <StatsCard
                title="Findings Detected"
                value={stats.findings.total}
                description="Total across all controls"
                icon={Search}
                changeType={stats.findings.total > 0 ? 'negative' : 'positive'}
              />
              <StatsCard
                title="Avg. Effectiveness"
                value={`${resolutionRate}%`}
                description="Finding resolution rate"
                icon={Activity}
                changeType={
                  resolutionRate > 70 ? 'positive' : resolutionRate > 40 ? 'neutral' : 'negative'
                }
              />
            </section>
          )}

          {/* Control Categories */}
          {isLoading ? (
            <CategoriesGridSkeleton />
          ) : (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Control Categories</CardTitle>
                <CardDescription>
                  Asset distribution across security control domains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {categories.map((cat) => {
                    const IconComponent = cat.Icon
                    return (
                      <div
                        key={cat.key}
                        className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <IconComponent className="text-muted-foreground h-5 w-5" />
                          <span className="text-sm font-medium">{cat.label}</span>
                        </div>
                        <p className="mb-2 text-2xl font-bold">{cat.count}</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-xs">Coverage</span>
                            <span className="text-xs font-medium">{cat.coverage}%</span>
                          </div>
                          <Progress
                            value={cat.coverage}
                            className={cn(
                              'h-1.5',
                              cat.coverage > 60
                                ? '[&>[data-slot=progress-indicator]]:bg-green-500'
                                : cat.coverage > 30
                                  ? '[&>[data-slot=progress-indicator]]:bg-yellow-500'
                                  : '[&>[data-slot=progress-indicator]]:bg-red-500'
                            )}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Two-column: Detection Coverage + Control Performance Trend */}
          {isLoading ? (
            <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCardSkeleton />
              <ChartCardSkeleton />
            </section>
          ) : (
            <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Detection Coverage */}
              <Card>
                <CardHeader>
                  <CardTitle>Detection Coverage</CardTitle>
                  <CardDescription>Ratio of scanned vs unscanned repositories</CardDescription>
                </CardHeader>
                <CardContent>
                  {hasPieData ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={detectionPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {detectionPieData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
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

              {/* Control Performance Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Control Performance Trend</CardTitle>
                  <CardDescription>Detection volume over time by severity</CardDescription>
                </CardHeader>
                <CardContent>
                  {trendChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="critical"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                          name="Critical"
                        />
                        <Line
                          type="monotone"
                          dataKey="high"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={false}
                          name="High"
                        />
                        <Line
                          type="monotone"
                          dataKey="medium"
                          stroke="#eab308"
                          strokeWidth={2}
                          dot={false}
                          name="Medium"
                        />
                        <Line
                          type="monotone"
                          dataKey="low"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          name="Low"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-muted-foreground">No trend data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Gaps Identified */}
          {isLoading ? (
            <GapsCardSkeleton />
          ) : (
            gaps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Gaps Identified
                  </CardTitle>
                  <CardDescription>
                    Areas needing improvement based on current control data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {gaps.map((gap, index) => (
                      <li key={index} className="flex items-center gap-3 rounded-md border p-3">
                        <Badge variant={gap.variant}>
                          {gap.variant === 'destructive'
                            ? 'Critical'
                            : gap.variant === 'secondary'
                              ? 'Warning'
                              : 'Info'}
                        </Badge>
                        <span className="text-sm">{gap.message}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          )}
        </>
      )}
    </Main>
  )
}
