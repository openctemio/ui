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
import { Lock, AlertTriangle, GitBranch, Shield } from 'lucide-react'

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
        <Lock className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No secret exposure data available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure secret scanning to detect exposed credentials in your codebase.
        </p>
      </CardContent>
    </Card>
  )
}

export default function SecretsExposurePage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const criticalCount = stats.findings.bySeverity.critical || 0
  const scannedRepos = stats.repositories.withFindings
  const unscannedRepos = Math.max(0, stats.repositories.total - stats.repositories.withFindings)

  const repoCoverageData = useMemo(() => {
    const data = [
      { name: 'With Findings', value: scannedRepos, color: '#ef4444' },
      { name: 'Clean', value: unscannedRepos, color: '#22c55e' },
    ]
    return data.filter((d) => d.value > 0)
  }, [scannedRepos, unscannedRepos])

  const severityBarData = useMemo(() => {
    return SEVERITY_ORDER.map((severity) => ({
      name: SEVERITY_LABELS[severity],
      count: stats.findings.bySeverity[severity] || 0,
      fill: SEVERITY_COLORS[severity],
    })).filter((d) => d.count > 0)
  }, [stats.findings.bySeverity])

  const remediationPriority = useMemo(() => {
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
        title="Secret Exposures"
        description="Monitor exposed secrets and credentials in your codebase"
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
            <StatsCard title="Total Findings" value={stats.findings.total} icon={Lock} />
            <StatsCard
              title="Repositories Affected"
              value={stats.repositories.withFindings}
              change={
                stats.repositories.total > 0
                  ? `${((stats.repositories.withFindings / stats.repositories.total) * 100).toFixed(0)}% of repositories`
                  : undefined
              }
              changeType={stats.repositories.withFindings > 0 ? 'negative' : 'positive'}
              icon={GitBranch}
            />
            <StatsCard
              title="Critical Secrets"
              value={criticalCount}
              changeType={criticalCount > 0 ? 'negative' : 'positive'}
              change={criticalCount > 0 ? 'Rotate immediately' : 'No critical secrets'}
              icon={AlertTriangle}
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
            {/* Repository Coverage Pie */}
            <Card>
              <CardHeader>
                <CardTitle>Repository Coverage</CardTitle>
                <CardDescription>
                  Scan coverage across {stats.repositories.total} repositories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {repoCoverageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={repoCoverageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {repoCoverageData.map((entry, index) => (
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

            {/* Findings by Severity Bar */}
            <Card>
              <CardHeader>
                <CardTitle>Findings by Severity</CardTitle>
                <CardDescription>
                  Secret findings distributed across severity levels
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
          </section>

          {/* Remediation Priority */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Remediation Priority</CardTitle>
                <CardDescription>
                  Prioritized list of secret exposures requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {remediationPriority.map((item) => (
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
                            {item.count} {item.count === 1 ? 'secret' : 'secrets'}
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
