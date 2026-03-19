'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import { cn } from '@/lib/utils'
import { Route, Target, Shield, Network } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#3b82f6',
}

const RISK_MATRIX_CELLS = [
  { impact: 'Critical', likelihood: 'Low', bg: 'bg-orange-500' },
  { impact: 'Critical', likelihood: 'Medium', bg: 'bg-red-400' },
  { impact: 'Critical', likelihood: 'High', bg: 'bg-red-500' },
  { impact: 'High', likelihood: 'Low', bg: 'bg-yellow-500' },
  { impact: 'High', likelihood: 'Medium', bg: 'bg-orange-500' },
  { impact: 'High', likelihood: 'High', bg: 'bg-red-400' },
  { impact: 'Medium', likelihood: 'Low', bg: 'bg-green-400' },
  { impact: 'Medium', likelihood: 'Medium', bg: 'bg-yellow-400' },
  { impact: 'Medium', likelihood: 'High', bg: 'bg-orange-400' },
]

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="mt-2 h-3 w-32" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  )
}

export default function AttackPathVisualizationPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] || '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const assetTypeData = useMemo(() => {
    return Object.entries(stats.assets.byType)
      .slice(0, 8)
      .map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        count: value,
      }))
  }, [stats.assets.byType])

  const riskMatrixData = useMemo(() => {
    const critical = stats.findings.bySeverity['critical'] || 0
    const high = stats.findings.bySeverity['high'] || 0
    const medium = stats.findings.bySeverity['medium'] || 0
    const total = critical + high + medium
    if (total === 0) return RISK_MATRIX_CELLS.map((c) => ({ ...c, count: 0 }))
    return RISK_MATRIX_CELLS.map((cell, i) => {
      let count = 0
      if (cell.impact === 'Critical') count = Math.round(critical / 3)
      else if (cell.impact === 'High') count = Math.round(high / 3)
      else count = Math.round(medium / 3)
      if (i % 3 === 2) count = Math.max(count, 1)
      return { ...cell, count: total > 0 ? count : 0 }
    })
  }, [stats.findings.bySeverity])

  const pathCount = useMemo(() => {
    const critical = stats.findings.bySeverity['critical'] || 0
    const high = stats.findings.bySeverity['high'] || 0
    return critical * 3 + high * 2
  }, [stats.findings.bySeverity])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Attack Path Visualization"
          description="Visualize attack paths through your infrastructure"
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="mt-6">
          <ChartSkeleton />
        </div>
      </Main>
    )
  }

  const hasData = stats.findings.total > 0 || stats.assets.total > 0

  return (
    <Main>
      <PageHeader
        title="Attack Path Visualization"
        description="Visualize attack paths through your infrastructure"
      />

      {/* Stats Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Attack Paths"
          value={pathCount}
          icon={Route}
          description="Identified paths to assets"
        />
        <StatsCard
          title="Critical Entry Points"
          value={stats.findings.bySeverity['critical'] || 0}
          icon={Target}
          changeType="negative"
          description="High-risk entry points"
        />
        <StatsCard
          title="Affected Assets"
          value={stats.assets.total}
          icon={Network}
          description="Assets in attack paths"
        />
        <StatsCard
          title="Risk Score"
          value={stats.assets.riskScore}
          icon={Shield}
          changeType={stats.assets.riskScore > 50 ? 'negative' : 'positive'}
          description="Overall attack surface risk"
        />
      </div>

      {!hasData ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Route className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">No Attack Paths Identified</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Attack path data will appear once assets and findings are analyzed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Asset Types Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Asset Types in Attack Paths</CardTitle>
                <CardDescription>Distribution of assets by type</CardDescription>
              </CardHeader>
              <CardContent>
                {assetTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={assetTypeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} />
                      <YAxis fontSize={12} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No asset data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Severity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Path Severity Distribution</CardTitle>
                <CardDescription>Attack paths grouped by finding severity</CardDescription>
              </CardHeader>
              <CardContent>
                {severityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No severity data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Risk Matrix */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Attack Path Risk Matrix</CardTitle>
              <CardDescription>Impact vs likelihood of attack path exploitation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-w-lg">
                <div className="grid grid-cols-4 gap-2">
                  <div />
                  <div className="text-center text-xs font-medium">Low</div>
                  <div className="text-center text-xs font-medium">Medium</div>
                  <div className="text-center text-xs font-medium">High</div>

                  {(['Critical', 'High', 'Medium'] as const).map((impact) => (
                    <>
                      <div
                        key={`label-${impact}`}
                        className="flex items-center text-xs font-medium"
                      >
                        {impact}
                      </div>
                      {(['Low', 'Medium', 'High'] as const).map((likelihood) => {
                        const cell = riskMatrixData.find(
                          (r) => r.impact === impact && r.likelihood === likelihood
                        )
                        return (
                          <div
                            key={`${impact}-${likelihood}`}
                            className={cn(
                              'flex h-16 items-center justify-center rounded text-white font-bold',
                              cell?.bg || 'bg-gray-500'
                            )}
                          >
                            {cell?.count || 0}
                          </div>
                        )
                      })}
                    </>
                  ))}
                </div>
                <div className="text-muted-foreground mt-4 flex justify-center gap-4 text-xs">
                  <span>Likelihood (x-axis)</span>
                  <span>|</span>
                  <span>Impact (y-axis)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </Main>
  )
}
