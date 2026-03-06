'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '@/components/charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Route, Server, ShieldAlert, Crosshair, Activity, AlertTriangle } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']

function getSeverityBadgeClass(severity: string) {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'high':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    case 'low':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

// --- Skeleton Components ---

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

      {/* Charts skeleton */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Risk matrix + recommendations skeleton */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-4 w-72" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  )
}

export default function AttackPathAnalysisPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const assetsAtRisk = useMemo(() => {
    const reposWithFindings = stats.repositories.withFindings
    const totalAssets = stats.assets.total
    if (totalAssets === 0) return 0
    const findingRatio =
      stats.findings.total > 0 ? Math.min(totalAssets, Math.ceil(totalAssets * 0.3)) : 0
    return Math.max(reposWithFindings, findingRatio)
  }, [stats.repositories.withFindings, stats.assets.total, stats.findings.total])

  const criticalExposure = stats.findings.bySeverity?.critical || 0
  const riskScore = stats.assets.riskScore

  const assetTypeData = useMemo(() => {
    const byType = stats.assets.byType || {}
    return Object.entries(byType).map(([name, count]) => ({
      name: capitalize(name),
      count,
    }))
  }, [stats.assets.byType])

  const exposureData = useMemo(() => {
    const bySeverity = stats.findings.bySeverity || {}
    return SEVERITY_ORDER.filter((sev) => bySeverity[sev] !== undefined).map((sev) => ({
      name: capitalize(sev),
      count: bySeverity[sev] || 0,
      fill: SEVERITY_COLORS[sev] || '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  // Risk matrix: asset types vs severity levels
  const riskMatrix = useMemo(() => {
    const byType = stats.assets.byType || {}
    const bySeverity = stats.findings.bySeverity || {}
    const assetTypes = Object.keys(byType)
    const totalFindings = stats.findings.total

    if (assetTypes.length === 0 || totalFindings === 0) return []

    const totalAssets = stats.assets.total
    return assetTypes.map((type) => {
      const assetCount = byType[type] || 0
      const assetWeight = totalAssets > 0 ? assetCount / totalAssets : 0

      const row: Record<string, string | number> = { type: capitalize(type) }
      SEVERITY_ORDER.forEach((sev) => {
        const sevCount = bySeverity[sev] || 0
        row[sev] = Math.round(sevCount * assetWeight)
      })
      row.total = SEVERITY_ORDER.reduce((sum, sev) => sum + ((row[sev] as number) || 0), 0)
      return row
    })
  }, [stats.assets.byType, stats.findings.bySeverity, stats.findings.total, stats.assets.total])

  // Derived recommendations
  const recommendations = useMemo(() => {
    const items: { message: string; severity: string }[] = []

    const bySeverity = stats.findings.bySeverity || {}
    const byType = stats.assets.byType || {}

    if (criticalExposure > 0) {
      items.push({
        message: `${criticalExposure} critical exposure point${criticalExposure !== 1 ? 's' : ''} detected -- prioritize immediate remediation to reduce attack surface`,
        severity: 'critical',
      })
    }

    const highCount = bySeverity.high || 0
    if (highCount > 0) {
      items.push({
        message: `${highCount} high-severity finding${highCount !== 1 ? 's' : ''} represent viable attack paths -- review and patch affected assets`,
        severity: 'high',
      })
    }

    if (stats.findings.overdue > 0) {
      items.push({
        message: `${stats.findings.overdue} overdue remediation${stats.findings.overdue !== 1 ? 's' : ''} increase dwell time for potential attackers`,
        severity: stats.findings.overdue > 5 ? 'high' : 'medium',
      })
    }

    // Identify the most exposed asset type
    const typeEntries = Object.entries(byType)
    if (typeEntries.length > 0) {
      const [topType, topCount] = typeEntries.reduce((max, entry) =>
        entry[1] > max[1] ? entry : max
      )
      items.push({
        message: `"${capitalize(topType)}" is the largest asset category (${topCount} assets) -- ensure comprehensive coverage for this attack surface`,
        severity: 'medium',
      })
    }

    if (stats.repositories.total > 0) {
      const pct = Math.round((stats.repositories.withFindings / stats.repositories.total) * 100)
      if (pct > 50) {
        items.push({
          message: `${pct}% of repositories contain findings -- consider implementing pre-commit security scanning`,
          severity: 'high',
        })
      } else if (pct > 0) {
        items.push({
          message: `${pct}% of repositories have detected findings -- maintain scanning cadence`,
          severity: 'low',
        })
      }
    }

    if (items.length === 0) {
      items.push({
        message:
          'No significant attack path risks identified. Continue monitoring your environment.',
        severity: 'low',
      })
    }

    return items
  }, [stats, criticalExposure])

  const isEmpty =
    !isLoading &&
    stats.assets.total === 0 &&
    stats.findings.total === 0 &&
    stats.repositories.total === 0

  return (
    <Main>
      <PageHeader
        title="Attack Path Analysis"
        description="Visualize potential attack paths through your infrastructure"
        className="mb-6"
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Route className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No data available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start scanning your infrastructure to analyze potential attack paths.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Row */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Total Assets"
              value={stats.assets.total}
              icon={Server}
              description={`${Object.keys(stats.assets.byType).length} asset types`}
            />
            <StatsCard
              title="Assets at Risk"
              value={assetsAtRisk}
              icon={AlertTriangle}
              changeType={assetsAtRisk > 0 ? 'negative' : 'positive'}
              change={
                stats.assets.total > 0
                  ? `${Math.round((assetsAtRisk / stats.assets.total) * 100)}% of total`
                  : 'None detected'
              }
            />
            <StatsCard
              title="Critical Exposure Points"
              value={criticalExposure}
              icon={Crosshair}
              changeType={criticalExposure > 0 ? 'negative' : 'positive'}
              change={criticalExposure > 0 ? 'Requires immediate action' : 'None detected'}
            />
            <StatsCard
              title="Risk Score"
              value={`${riskScore.toFixed(1)} / 10`}
              icon={Activity}
              changeType={riskScore >= 7 ? 'negative' : riskScore >= 4 ? 'neutral' : 'positive'}
              description="Overall attack surface risk"
            />
          </section>

          {/* Attack Surface Overview + Exposure Points */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Attack Surface Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Attack Surface Overview</CardTitle>
                <CardDescription>
                  Asset distribution by type across your infrastructure
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assetTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={assetTypeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        name="Assets"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No asset type data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exposure Points */}
            <Card>
              <CardHeader>
                <CardTitle>Exposure Points</CardTitle>
                <CardDescription>Potential entry points by finding severity</CardDescription>
              </CardHeader>
              <CardContent>
                {exposureData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={exposureData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Findings" radius={[4, 4, 0, 0]} barSize={40}>
                        {exposureData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No exposure data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Risk Matrix + Recommendations */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Attack Path Risk Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Attack Path Risk Matrix</CardTitle>
                <CardDescription>
                  Estimated finding distribution across asset types and severity levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                {riskMatrix.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-2 text-left font-medium text-muted-foreground">
                            Asset Type
                          </th>
                          {SEVERITY_ORDER.map((sev) => (
                            <th
                              key={sev}
                              className="pb-2 text-center font-medium"
                              style={{ color: SEVERITY_COLORS[sev] }}
                            >
                              {capitalize(sev)}
                            </th>
                          ))}
                          <th className="pb-2 text-center font-medium text-muted-foreground">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {riskMatrix.map((row) => (
                          <tr key={row.type as string} className="border-b last:border-0">
                            <td className="py-2.5 font-medium">{row.type}</td>
                            {SEVERITY_ORDER.map((sev) => {
                              const count = (row[sev] as number) || 0
                              return (
                                <td key={sev} className="py-2.5 text-center">
                                  {count > 0 ? (
                                    <span
                                      className={cn(
                                        'inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium',
                                        count > 0 &&
                                          sev === 'critical' &&
                                          'bg-red-500/10 text-red-500',
                                        count > 0 &&
                                          sev === 'high' &&
                                          'bg-orange-500/10 text-orange-500',
                                        count > 0 &&
                                          sev === 'medium' &&
                                          'bg-yellow-500/10 text-yellow-500',
                                        count > 0 &&
                                          sev === 'low' &&
                                          'bg-blue-500/10 text-blue-500',
                                        count > 0 &&
                                          sev === 'info' &&
                                          'bg-muted text-muted-foreground'
                                      )}
                                    >
                                      {count}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              )
                            })}
                            <td className="py-2.5 text-center font-medium">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex h-[250px] items-center justify-center">
                    <p className="text-muted-foreground">No data to build risk matrix</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  Recommendations
                </CardTitle>
                <CardDescription>
                  Derived insights about highest risk areas in your attack surface
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendations.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Badge
                        variant="outline"
                        className={cn('mt-0.5 shrink-0', getSeverityBadgeClass(item.severity))}
                      >
                        {item.severity}
                      </Badge>
                      <span className="text-sm">{item.message}</span>
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
