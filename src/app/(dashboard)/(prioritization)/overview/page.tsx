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
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { AlertTriangle, ShieldAlert, Clock, Activity } from 'lucide-react'

// Severity colors for charts
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

function getRiskColor(score: number): string {
  if (score >= 8) return 'text-red-500'
  if (score >= 6) return 'text-orange-500'
  if (score >= 3) return 'text-yellow-500'
  return 'text-green-500'
}

function getRiskProgressColor(score: number): string {
  if (score >= 8) return '[&_[data-slot=progress-indicator]]:bg-red-500'
  if (score >= 6) return '[&_[data-slot=progress-indicator]]:bg-orange-500'
  if (score >= 3) return '[&_[data-slot=progress-indicator]]:bg-yellow-500'
  return '[&_[data-slot=progress-indicator]]:bg-green-500'
}

function getRiskLabel(score: number): string {
  if (score >= 8) return 'Critical'
  if (score >= 6) return 'High'
  if (score >= 3) return 'Medium'
  return 'Low'
}

function getRiskBadgeVariant(score: number): 'destructive' | 'secondary' | 'outline' | 'default' {
  if (score >= 8) return 'destructive'
  if (score >= 6) return 'default'
  return 'secondary'
}

// --- Skeleton Components ---

function HeroSkeleton() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Skeleton className="h-16 w-24" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  )
}

function StatsRowSkeleton() {
  return (
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
  )
}

function ChartsRowSkeleton() {
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

function BottomSkeleton() {
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

export default function RiskOverviewPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading, error } = useDashboardStats(currentTenant?.id || null)

  const isEmptyState = useMemo(() => {
    return stats.assets.total === 0 && stats.findings.total === 0 && stats.repositories.total === 0
  }, [stats])

  const severityData = useMemo(() => {
    const bySeverity = stats.findings.bySeverity || {}
    return Object.entries(bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name.toLowerCase()] || '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const statusData = useMemo(() => {
    const byStatus = stats.findings.byStatus || {}
    return Object.entries(byStatus).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      count: value,
    }))
  }, [stats.findings.byStatus])

  const assetDistribution = useMemo(() => {
    const byType = stats.assets.byType || {}
    return Object.entries(byType).map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      count,
    }))
  }, [stats.assets.byType])

  const repoCoverage = useMemo(() => {
    if (stats.repositories.total === 0) return 0
    return Math.round((stats.repositories.withFindings / stats.repositories.total) * 100)
  }, [stats.repositories])

  const riskScore = stats.assets.riskScore
  const criticalFindings = stats.findings.bySeverity?.critical || 0

  return (
    <Main>
      <PageHeader
        title="Risk Overview"
        description="Comprehensive view of your organization's exposure and risk posture"
        className="mb-6"
      />

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-yellow-500/50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-muted-foreground">Failed to load risk overview data</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <>
          <HeroSkeleton />
          <StatsRowSkeleton />
          <ChartsRowSkeleton />
          <BottomSkeleton />
        </>
      )}

      {/* Empty State */}
      {!isLoading && !error && isEmptyState && (
        <Card className="mb-6">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Configure your first scan to begin risk analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data Loaded */}
      {!isLoading && !error && !isEmptyState && (
        <>
          {/* Risk Score Hero Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Overall Risk Score</CardTitle>
              <CardDescription>
                Average risk score across all assets in your environment
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="flex items-end gap-2">
                <span className={cn('text-5xl font-bold tabular-nums', getRiskColor(riskScore))}>
                  {riskScore.toFixed(1)}
                </span>
                <span className="text-muted-foreground text-lg mb-1">/ 10</span>
              </div>
              <Progress
                value={riskScore * 10}
                className={cn('h-3 w-full max-w-md', getRiskProgressColor(riskScore))}
              />
              <Badge variant={getRiskBadgeVariant(riskScore)}>{getRiskLabel(riskScore)} Risk</Badge>
            </CardContent>
          </Card>

          {/* Stats Row */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Total Findings"
              value={stats.findings.total}
              icon={AlertTriangle}
              description={`${Object.keys(stats.findings.bySeverity).length} severity levels`}
            />
            <StatsCard
              title="Critical Findings"
              value={criticalFindings}
              icon={ShieldAlert}
              changeType={criticalFindings > 0 ? 'negative' : 'neutral'}
              change={criticalFindings > 0 ? 'Requires attention' : 'None detected'}
            />
            <StatsCard
              title="Overdue Remediation"
              value={stats.findings.overdue}
              icon={Clock}
              changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
              change={stats.findings.overdue > 0 ? 'Past SLA deadline' : 'All on track'}
            />
            <StatsCard
              title="Average CVSS"
              value={stats.findings.averageCvss.toFixed(1)}
              icon={Activity}
              changeType={stats.findings.averageCvss >= 7 ? 'negative' : 'neutral'}
              change={`${stats.findings.total} findings scored`}
            />
          </section>

          {/* Two-Column Charts */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Severity Distribution - Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
                <CardDescription>Findings breakdown by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                {severityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`severity-${index}`} fill={entry.color} />
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

            {/* Finding Status - Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Finding Status</CardTitle>
                <CardDescription>Findings grouped by current status</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
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

          {/* Bottom Row */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Asset Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Risk Distribution</CardTitle>
                <CardDescription>{stats.assets.total} total assets by type</CardDescription>
              </CardHeader>
              <CardContent>
                {assetDistribution.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(assetDistribution.length * 40, 120)}
                  >
                    <BarChart data={assetDistribution} layout="vertical" barCategoryGap="20%">
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
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[200px] items-center justify-center">
                    <p className="text-muted-foreground">No asset data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Repository Coverage */}
            <Card>
              <CardHeader>
                <CardTitle>Repository Coverage</CardTitle>
                <CardDescription>Repositories scanned with findings detected</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Repositories</span>
                    <span className="text-2xl font-bold">{stats.repositories.total}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">With Findings</span>
                    <span className="text-2xl font-bold">{stats.repositories.withFindings}</span>
                  </div>
                  <Progress value={repoCoverage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {repoCoverage}% of repositories have detected findings
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </Main>
  )
}
