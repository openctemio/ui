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
import { Bell, Send, Mail, Activity, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

export default function NotificationInsightsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const notificationVolume = useMemo(() => {
    return stats.findings.total + stats.findings.overdue
  }, [stats.findings.total, stats.findings.overdue])

  const criticalAlerts = useMemo(() => {
    return (
      (stats.findings.bySeverity?.['critical'] ?? 0) + (stats.findings.bySeverity?.['high'] ?? 0)
    )
  }, [stats.findings.bySeverity])

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
      total: point.critical + point.high + point.medium + point.low + point.info,
      critical: point.critical,
      high: point.high,
    }))
  }, [stats.findingTrend])

  const recentActivities = useMemo(() => {
    return stats.recentActivity.slice(0, 6)
  }, [stats.recentActivity])

  const deliveryRate = useMemo(() => {
    if (stats.findings.total === 0) return 100
    const processed = stats.findings.total - (stats.findings.byStatus?.['open'] ?? 0)
    return Math.round((processed / stats.findings.total) * 100)
  }, [stats.findings.total, stats.findings.byStatus])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Notification Insights"
          description="Track notification delivery and engagement metrics"
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
        title="Notification Insights"
        description="Track notification delivery and engagement metrics"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Notification Volume"
          value={notificationVolume}
          icon={Bell}
          description="Total notifications"
        />
        <StatsCard
          title="Delivery Rate"
          value={`${deliveryRate}%`}
          icon={Send}
          changeType={deliveryRate > 95 ? 'positive' : 'negative'}
          description="Successfully sent"
        />
        <StatsCard
          title="Critical Alerts"
          value={criticalAlerts}
          icon={Mail}
          changeType={criticalAlerts > 0 ? 'negative' : 'positive'}
          description="High priority"
        />
        <StatsCard
          title="Active Sources"
          value={stats.repositories.total + stats.assets.total}
          icon={Activity}
          description="Generating alerts"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notifications by Severity</CardTitle>
            <CardDescription>Alert distribution across severity levels</CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No notification data available
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
            <CardTitle>Notification Volume Trend</CardTitle>
            <CardDescription>Alert volume over the past 7 days</CardDescription>
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
                  <Bar dataKey="total" fill="#6366f1" name="Total Alerts" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Notification Activity</CardTitle>
            <CardDescription>Latest notification events and delivery status</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No recent notification activity
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{activity.title}</p>
                        <Badge variant="outline" className="shrink-0">
                          {activity.type}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">Delivery Rate</p>
                  <Progress value={deliveryRate} className="mt-2 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {deliveryRate}% of notifications were successfully delivered
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
