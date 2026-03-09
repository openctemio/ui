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
import { Settings2, Globe, Layers, Filter, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

const TYPE_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f97316', '#ef4444', '#eab308']

export default function ScopeConfigurationPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const managedRatio = useMemo(() => {
    if (stats.assets.total === 0) return 0
    const unmanaged = stats.assets.byStatus?.['unmanaged'] ?? 0
    return Math.round(((stats.assets.total - unmanaged) / stats.assets.total) * 100)
  }, [stats.assets.total, stats.assets.byStatus])

  const assetTypeData = useMemo(() => {
    return Object.entries(stats.assets.byType).map(([name, value], index) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      value,
      color: TYPE_COLORS[index % TYPE_COLORS.length],
    }))
  }, [stats.assets.byType])

  const assetStatusData = useMemo(() => {
    return Object.entries(stats.assets.byStatus).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      value,
    }))
  }, [stats.assets.byStatus])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Scope Configuration"
          description="Configure asset scoping rules and boundaries"
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      </Main>
    )
  }

  return (
    <Main>
      <PageHeader
        title="Scope Configuration"
        description="Configure asset scoping rules and boundaries"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Assets"
          value={stats.assets.total}
          icon={Globe}
          description="In scope"
        />
        <StatsCard
          title="Asset Types"
          value={Object.keys(stats.assets.byType).length}
          icon={Layers}
          description="Distinct categories"
        />
        <StatsCard
          title="Managed Ratio"
          value={`${managedRatio}%`}
          icon={Settings2}
          changeType={managedRatio > 80 ? 'positive' : 'negative'}
          description="Of total assets"
        />
        <StatsCard
          title="Risk Score"
          value={stats.assets.riskScore}
          icon={Filter}
          changeType={stats.assets.riskScore > 70 ? 'negative' : 'positive'}
          description="Overall risk"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scope by Asset Type</CardTitle>
            <CardDescription>Distribution of scoped assets across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {assetTypeData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No asset types configured
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={assetTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                  >
                    {assetTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Status Distribution</CardTitle>
            <CardDescription>Current management status of scoped assets</CardDescription>
          </CardHeader>
          <CardContent>
            {assetStatusData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No status data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={assetStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Assets" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Scope Configuration Insights</CardTitle>
            <CardDescription>Recommendations for optimizing scope boundaries</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.assets.total === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No assets in scope. Add assets to begin configuration.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">Scope Completeness</p>
                  <Progress value={managedRatio} className="mt-2 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {managedRatio}% of assets are actively managed within scope
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  {managedRatio < 80 ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">Scope Completeness</p>
                    <p className="text-sm text-muted-foreground">
                      {managedRatio < 80
                        ? `${100 - managedRatio}% of assets are unmanaged. Review scope rules to improve scope completeness.`
                        : 'Asset scope completeness is above target threshold.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                  <div>
                    <p className="font-medium">Repository Integration</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.repositories.total > 0
                        ? `${stats.repositories.total} repositories are linked. ${stats.repositories.withFindings} have active findings within scope.`
                        : 'Connect repositories to expand scope for code assets.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
