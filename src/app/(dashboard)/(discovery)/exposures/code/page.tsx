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
import { FileCode, AlertTriangle, Flame, GitBranch } from 'lucide-react'

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
        <FileCode className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No code vulnerability data available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure static analysis scanners to detect code-level security vulnerabilities.
        </p>
      </CardContent>
    </Card>
  )
}

export default function CodeVulnerabilitiesPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const criticalCount = stats.findings.bySeverity.critical || 0
  const highCount = stats.findings.bySeverity.high || 0

  const severityPieData = useMemo(() => {
    return SEVERITY_ORDER.map((severity) => ({
      name: SEVERITY_LABELS[severity],
      value: stats.findings.bySeverity[severity] || 0,
      color: SEVERITY_COLORS[severity],
    })).filter((d) => d.value > 0)
  }, [stats.findings.bySeverity])

  const topRepos = useMemo(() => {
    const byType = stats.assets.byType || {}
    return Object.entries(byType)
      .map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [stats.assets.byType])

  const hasData = stats.findings.total > 0
  const hasTrendData = stats.findingTrend.length > 0

  return (
    <Main>
      <PageHeader
        title="Code Vulnerabilities"
        description="Track code-level security vulnerabilities from static analysis"
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
            <StatsCard title="Total Code Findings" value={stats.findings.total} icon={FileCode} />
            <StatsCard
              title="Critical"
              value={criticalCount}
              changeType={criticalCount > 0 ? 'negative' : 'positive'}
              change={criticalCount > 0 ? 'Fix immediately' : 'No critical findings'}
              icon={AlertTriangle}
            />
            <StatsCard
              title="High"
              value={highCount}
              changeType={highCount > 0 ? 'negative' : 'positive'}
              change={
                stats.findings.total > 0
                  ? `${((highCount / stats.findings.total) * 100).toFixed(0)}% of total`
                  : undefined
              }
              icon={Flame}
            />
            <StatsCard
              title="Repositories Scanned"
              value={stats.repositories.withFindings}
              change={
                stats.repositories.total > 0 ? `of ${stats.repositories.total} total` : undefined
              }
              changeType="neutral"
              icon={GitBranch}
            />
          </section>

          {/* Charts Row */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Severity Distribution Pie */}
            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
                <CardDescription>
                  Code findings across {stats.findings.total} total issues
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

            {/* Code Finding Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Code Finding Trend</CardTitle>
                <CardDescription>
                  Severity counts over time from static analysis scans
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasTrendData ? (
                  <ResponsiveContainer width="100%" height={300}>
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
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">
                      No trend data available yet. Run SAST scans to start tracking trends.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Top Affected Repositories */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Top Affected Repositories</CardTitle>
                <CardDescription>
                  Repositories with the most code-level findings by asset type
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topRepos.length > 0 ? (
                  <div className="space-y-4">
                    {topRepos.map((repo, index) => {
                      const maxCount = topRepos[0]?.count || 1
                      const percentage = (repo.count / maxCount) * 100
                      return (
                        <div
                          key={repo.name}
                          className="flex items-center gap-4 rounded-lg border p-4"
                        >
                          <Badge variant="outline" className="w-8 justify-center">
                            {index + 1}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="truncate text-sm font-medium">{repo.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {repo.count} {repo.count === 1 ? 'finding' : 'findings'}
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn('h-full rounded-full transition-all')}
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: '#8b5cf6',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center">
                    <p className="text-muted-foreground">No repository data available</p>
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
