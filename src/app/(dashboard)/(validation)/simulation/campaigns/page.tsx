'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Crosshair, Play, Target, Shield, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

export default function SimulationCampaignsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const assetCoverage = useMemo(() => {
    if (stats.assets.total === 0) return 0
    const managed = stats.assets.total - (stats.assets.byStatus?.['unmanaged'] ?? 0)
    return Math.round((managed / stats.assets.total) * 100)
  }, [stats.assets.total, stats.assets.byStatus])

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] ?? '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const trendData = useMemo(() => {
    return stats.findingTrend.slice(-7).map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      critical: point.critical,
      high: point.high,
      medium: point.medium,
      low: point.low,
    }))
  }, [stats.findingTrend])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Simulation Campaigns"
          description="Manage security simulation and testing campaigns"
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
        title="Simulation Campaigns"
        description="Manage security simulation and testing campaigns"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Target Assets"
          value={stats.assets.total}
          icon={Crosshair}
          description="In simulation scope"
        />
        <StatsCard
          title="Findings Detected"
          value={stats.findings.total}
          icon={Target}
          description="From simulations"
        />
        <StatsCard
          title="Asset Coverage"
          value={`${assetCoverage}%`}
          icon={Shield}
          changeType={assetCoverage > 80 ? 'positive' : 'negative'}
          description="Managed assets"
        />
        <StatsCard
          title="Risk Score"
          value={stats.assets.riskScore}
          icon={Play}
          changeType={stats.assets.riskScore > 70 ? 'negative' : 'positive'}
          description="Overall risk"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Findings by Severity</CardTitle>
            <CardDescription>Simulation-discovered findings across severity levels</CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No simulation data available
              </div>
            ) : (
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
                    paddingAngle={2}
                  >
                    {severityData.map((entry, index) => (
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
            <CardTitle>Campaign Activity Trend</CardTitle>
            <CardDescription>Simulation findings over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No trend data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="critical" fill="#ef4444" stackId="stack" name="Critical" />
                  <Bar dataKey="high" fill="#f97316" stackId="stack" name="High" />
                  <Bar dataKey="medium" fill="#eab308" stackId="stack" name="Medium" />
                  <Bar
                    dataKey="low"
                    fill="#3b82f6"
                    stackId="stack"
                    name="Low"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Campaign Insights</CardTitle>
            <CardDescription>Key observations from recent simulation campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.findings.total === 0 && stats.assets.total === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No campaign data to analyze
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">Simulation Asset Coverage</p>
                  <Progress value={assetCoverage} className="mt-2 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {assetCoverage}% of assets are included in simulation campaigns
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  {(stats.findings.bySeverity?.['critical'] ?? 0) > 0 ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">Critical Findings</p>
                    <p className="text-sm text-muted-foreground">
                      {(stats.findings.bySeverity?.['critical'] ?? 0) > 0
                        ? `${stats.findings.bySeverity['critical']} critical findings discovered through simulations require immediate attention.`
                        : 'No critical findings from simulation campaigns.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                  <div>
                    <p className="font-medium">Next Steps</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.repositories.withFindings > 0
                        ? `${stats.repositories.withFindings} repositories have simulation-discovered findings. Schedule targeted campaigns for uncovered asset types.`
                        : 'Consider expanding simulation scope to cover additional attack vectors and asset types.'}
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
