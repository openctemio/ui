'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import {
  AreaChart,
  Area,
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
import { Rss, Globe, Shield, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

const ACTIVITY_TYPE_STYLES: Record<string, string> = {
  finding: 'bg-red-500/10 text-red-500 border-red-500/20',
  scan: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  asset: 'bg-green-500/10 text-green-500 border-green-500/20',
  alert: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
}

function getFreshnessStatus(timestamp: string): {
  label: string
  color: string
  icon: 'check' | 'warning' | 'error'
} {
  const now = Date.now()
  const ts = new Date(timestamp).getTime()
  const diffMinutes = (now - ts) / (1000 * 60)

  if (diffMinutes < 60) {
    return { label: 'Live', color: 'text-green-500', icon: 'check' }
  }
  if (diffMinutes < 1440) {
    return { label: 'Recent', color: 'text-yellow-500', icon: 'warning' }
  }
  return { label: 'Stale', color: 'text-red-500', icon: 'error' }
}

function formatTimestamp(timestamp: string): string {
  const now = Date.now()
  const ts = new Date(timestamp).getTime()
  const diffMinutes = Math.floor((now - ts) / (1000 * 60))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function LoadingSkeleton() {
  return (
    <>
      {/* Stats skeleton */}
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

      {/* Timeline + Activity skeleton */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-5 w-14 rounded-md" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Correlation + Feed Health skeleton */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  )
}

export default function ThreatFeedsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const criticalCount = stats.findings.bySeverity?.critical || 0
  const sourceCount = Object.keys(stats.assets.byType || {}).length
  const repoTotal = stats.repositories.total
  const repoWithFindings = stats.repositories.withFindings
  const coverageRate = repoTotal > 0 ? Math.round((repoWithFindings / repoTotal) * 100) : 0

  const trendChartData = useMemo(() => {
    if (!stats.findingTrend || stats.findingTrend.length === 0) return []
    return stats.findingTrend.map((point) => ({
      date: point.date,
      critical: point.critical,
      high: point.high,
      medium: point.medium,
      low: point.low,
      info: point.info,
      total: point.critical + point.high + point.medium + point.low + point.info,
    }))
  }, [stats.findingTrend])

  const severityChartData = useMemo(() => {
    const bySeverity = stats.findings.bySeverity || {}
    const order = ['critical', 'high', 'medium', 'low', 'info']
    return order
      .filter((sev) => bySeverity[sev] !== undefined)
      .map((sev) => ({
        name: sev.charAt(0).toUpperCase() + sev.slice(1),
        count: bySeverity[sev] || 0,
        fill: SEVERITY_COLORS[sev] || '#6b7280',
      }))
  }, [stats.findings.bySeverity])

  const feedHealthItems = useMemo(() => {
    const activities = stats.recentActivity || []
    if (activities.length === 0) return []

    const typeMap = new Map<string, string>()
    for (const activity of activities) {
      if (!typeMap.has(activity.type)) {
        typeMap.set(activity.type, activity.timestamp)
      }
    }

    return Array.from(typeMap.entries()).map(([type, timestamp]) => {
      const status = getFreshnessStatus(timestamp)
      return {
        type,
        feedLabel: type.charAt(0).toUpperCase() + type.slice(1) + ' Feed',
        statusLabel: status.label,
        color: status.color,
        icon: status.icon,
        lastUpdate: formatTimestamp(timestamp),
      }
    })
  }, [stats.recentActivity])

  const isEmpty =
    !isLoading &&
    stats.assets.total === 0 &&
    stats.findings.total === 0 &&
    stats.repositories.total === 0

  return (
    <Main>
      <PageHeader
        title="Threat Intelligence Feeds"
        description="Monitor threat intelligence feeds and correlate with your findings"
        className="mb-6"
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Rss className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground text-center text-sm">
              No threat intelligence data available. Connect scanners and integrate feeds to get
              started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Row */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Total Findings Correlated"
              value={stats.findings.total}
              description="Across all feeds"
              icon={Rss}
            />
            <StatsCard
              title="Active Threat Sources"
              value={sourceCount}
              description="Asset type categories"
              icon={Globe}
            />
            <StatsCard
              title="Critical Alerts"
              value={criticalCount}
              description="Require immediate action"
              changeType={criticalCount > 0 ? 'negative' : 'positive'}
              icon={AlertTriangle}
            />
            <StatsCard
              title="Coverage Rate"
              value={`${coverageRate}%`}
              description={`${repoWithFindings} of ${repoTotal} repositories`}
              changeType={
                coverageRate >= 80 ? 'positive' : coverageRate >= 50 ? 'neutral' : 'negative'
              }
              icon={Shield}
            />
          </section>

          {/* Timeline + Recent Activity */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Threat Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Threat Activity Timeline
                </CardTitle>
                <CardDescription>Discovery volume over time by severity</CardDescription>
              </CardHeader>
              <CardContent>
                {trendChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendChartData}>
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
                        name="Critical"
                        stackId="1"
                        stroke={SEVERITY_COLORS.critical}
                        fill={SEVERITY_COLORS.critical}
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="high"
                        name="High"
                        stackId="1"
                        stroke={SEVERITY_COLORS.high}
                        fill={SEVERITY_COLORS.high}
                        fillOpacity={0.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="medium"
                        name="Medium"
                        stackId="1"
                        stroke={SEVERITY_COLORS.medium}
                        fill={SEVERITY_COLORS.medium}
                        fillOpacity={0.4}
                      />
                      <Area
                        type="monotone"
                        dataKey="low"
                        name="Low"
                        stackId="1"
                        stroke={SEVERITY_COLORS.low}
                        fill={SEVERITY_COLORS.low}
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No trend data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Threat Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Recent Threat Activity
                </CardTitle>
                <CardDescription>Latest threat intelligence events</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentActivity.slice(0, 8).map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            'mt-0.5 shrink-0 text-xs',
                            ACTIVITY_TYPE_STYLES[activity.type] || 'bg-muted text-muted-foreground'
                          )}
                        >
                          {activity.type}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{activity.title}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {activity.description}
                          </p>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Correlation Overview + Feed Health */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Correlation Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Correlation Overview
                </CardTitle>
                <CardDescription>
                  Findings by severity as potential threat correlation points
                </CardDescription>
              </CardHeader>
              <CardContent>
                {severityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={severityChartData}>
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
                        {severityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No correlation data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feed Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rss className="h-5 w-5" />
                  Feed Health
                </CardTitle>
                <CardDescription>Data freshness indicators</CardDescription>
              </CardHeader>
              <CardContent>
                {feedHealthItems.length > 0 ? (
                  <div className="space-y-4">
                    {feedHealthItems.map((item) => (
                      <div
                        key={item.type}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        {item.icon === 'check' && (
                          <CheckCircle2 className={cn('h-5 w-5 shrink-0', item.color)} />
                        )}
                        {item.icon === 'warning' && (
                          <AlertTriangle className={cn('h-5 w-5 shrink-0', item.color)} />
                        )}
                        {item.icon === 'error' && (
                          <XCircle className={cn('h-5 w-5 shrink-0', item.color)} />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.feedLabel}</p>
                          <p className="text-muted-foreground text-xs">Updated {item.lastUpdate}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'shrink-0 text-xs',
                            item.icon === 'check' &&
                              'border-green-500/20 bg-green-500/10 text-green-500',
                            item.icon === 'warning' &&
                              'border-yellow-500/20 bg-yellow-500/10 text-yellow-500',
                            item.icon === 'error' && 'border-red-500/20 bg-red-500/10 text-red-500'
                          )}
                        >
                          {item.statusLabel}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No feed data available</p>
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
