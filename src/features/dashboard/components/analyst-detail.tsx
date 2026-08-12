'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from '@/components/charts'
import { SEVERITY_CHART_COLORS as SEVERITY_COLORS } from '@/lib/severity-colors'
import { ActivityItem } from './activity-item'
import type { DashboardStats } from '../hooks/use-dashboard-stats'

interface AnalystDetailProps {
  stats: DashboardStats
  isLoading?: boolean
}

/**
 * The analyst-detail layer — the four charts that lived on the old dashboard
 * (Findings Trend, Severity donut, Asset Distribution, Recent Activity),
 * retained unchanged in spirit and moved below the CTEM action story.
 */
export function AnalystDetail({ stats, isLoading }: AnalystDetailProps) {
  const findingsBySeverity = stats.findings.bySeverity || {}
  const assetsByType = stats.assets.byType || {}

  const severityData = Object.entries(findingsBySeverity).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: (SEVERITY_COLORS as Record<string, string>)[name.toLowerCase()] || SEVERITY_COLORS.info,
  }))

  const assetDistribution = Object.entries(assetsByType)
    .map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      count,
    }))
    .sort((a, b) => b.count - a.count)

  if (isLoading) {
    return (
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Skeleton className="col-span-1 h-[340px] lg:col-span-4" />
        <Skeleton className="col-span-1 h-[340px] lg:col-span-3" />
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold tracking-tight">Analyst detail</h2>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        {/* Findings Trend */}
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Findings Trend</CardTitle>
            <CardDescription>Security findings over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.findingTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.findingTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
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
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">No findings trend data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
            <CardDescription>Findings by severity level</CardDescription>
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
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">No findings data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:h-[420px]">
        {/* Asset Distribution */}
        <Card className="flex h-full min-h-[380px] flex-col">
          <CardHeader>
            <CardTitle>Asset Distribution</CardTitle>
            <CardDescription>{stats.assets.total} total assets by type</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            {assetDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetDistribution} barCategoryGap="15%">
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip />
                  <Bar dataKey="count" fill={SEVERITY_COLORS.low} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center">
                <p className="text-muted-foreground">No asset data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="flex h-full flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0">
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest security events and updates</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto">
            {stats.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivity.slice(0, 10).map((activity, index) => (
                  <ActivityItem
                    key={index}
                    icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                    title={activity.title}
                    description={activity.description}
                    time={new Date(activity.timestamp).toLocaleDateString()}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
