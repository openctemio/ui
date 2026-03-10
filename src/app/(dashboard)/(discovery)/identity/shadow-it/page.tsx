'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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
import { EyeOff, AlertTriangle, Shield, Cloud, MonitorSmartphone, Search } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#3b82f6',
}

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  in_progress: '#f97316',
  resolved: '#22c55e',
  closed: '#6b7280',
  accepted: '#3b82f6',
}

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

export default function ShadowITPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const assetDistribution = useMemo(() => {
    return Object.entries(stats.assets.byType).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
      color:
        SEVERITY_COLORS[
          Object.keys(SEVERITY_COLORS)[
            Math.abs(name.charCodeAt(0)) % Object.keys(SEVERITY_COLORS).length
          ]
        ] || '#6366f1',
    }))
  }, [stats.assets.byType])

  const statusBreakdown = useMemo(() => {
    return Object.entries(stats.assets.byStatus).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      count: value,
    }))
  }, [stats.assets.byStatus])

  const coverageScore = useMemo(() => {
    if (stats.assets.total === 0) return 0
    const monitored = stats.assets.byStatus['active'] || stats.assets.byStatus['monitored'] || 0
    return Math.round((monitored / stats.assets.total) * 100)
  }, [stats.assets])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Shadow IT Discovery"
          description="Identify unauthorized applications and services"
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
      </Main>
    )
  }

  const hasData = stats.assets.total > 0

  return (
    <Main>
      <PageHeader
        title="Shadow IT Discovery"
        description="Identify unauthorized applications and services"
      />

      {/* Stats Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Discovered Assets"
          value={stats.assets.total}
          icon={Search}
          description="Total discovered services"
        />
        <StatsCard
          title="Unmanaged Assets"
          value={stats.findings.total}
          icon={EyeOff}
          changeType={stats.findings.total > 0 ? 'negative' : 'positive'}
          description="Require investigation"
        />
        <StatsCard
          title="Coverage Score"
          value={`${coverageScore}%`}
          icon={Shield}
          description="Of assets monitored"
        />
        <StatsCard
          title="Risk Score"
          value={stats.assets.riskScore}
          icon={AlertTriangle}
          changeType={stats.assets.riskScore > 50 ? 'negative' : 'positive'}
          description="Shadow IT risk index"
        />
      </div>

      {!hasData ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <EyeOff className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">No Shadow IT Detected</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Shadow IT discovery data will appear once asset scanning is configured.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Asset Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Asset Distribution</CardTitle>
                <CardDescription>Discovered assets by type</CardDescription>
              </CardHeader>
              <CardContent>
                {assetDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={assetDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {assetDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No distribution data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Asset Status</CardTitle>
                <CardDescription>Current status of discovered assets</CardDescription>
              </CardHeader>
              <CardContent>
                {statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={statusBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} />
                      <YAxis fontSize={12} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No status data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coverage Gaps */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Coverage Gaps</CardTitle>
              <CardDescription>Areas with limited monitoring coverage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: 'Cloud Services', icon: Cloud, pct: coverageScore },
                  {
                    label: 'SaaS Applications',
                    icon: MonitorSmartphone,
                    pct: Math.max(0, coverageScore - 15),
                  },
                  { label: 'On-Premise', icon: Shield, pct: Math.min(100, coverageScore + 10) },
                ].map((gap) => {
                  const Icon = gap.icon
                  return (
                    <div key={gap.label} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon className="text-muted-foreground h-5 w-5" />
                        <span className="text-sm font-medium">{gap.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{gap.pct}%</span>
                        <Badge
                          className={cn(
                            'border-0',
                            gap.pct >= 80
                              ? 'bg-green-500/20 text-green-500'
                              : gap.pct >= 50
                                ? 'bg-yellow-500/20 text-yellow-500'
                                : 'bg-red-500/20 text-red-500'
                          )}
                        >
                          {gap.pct >= 80 ? 'Good' : gap.pct >= 50 ? 'Fair' : 'Low'}
                        </Badge>
                      </div>
                      <Progress value={gap.pct} className="h-1.5" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </Main>
  )
}
