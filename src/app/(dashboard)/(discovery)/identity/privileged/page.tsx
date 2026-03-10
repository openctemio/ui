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
import { Crown, ShieldAlert, AlertTriangle, Users, KeyRound, Server } from 'lucide-react'

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

export default function PrivilegedAccessPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] || '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const assetTypeData = useMemo(() => {
    return Object.entries(stats.assets.byType)
      .slice(0, 6)
      .map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        count: value,
      }))
  }, [stats.assets.byType])

  const statusData = useMemo(() => {
    return Object.entries(stats.findings.byStatus).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
      color: STATUS_COLORS[name] || '#6b7280',
    }))
  }, [stats.findings.byStatus])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Privileged Access"
          description="Monitor privileged account usage and risks"
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

  const hasData = stats.findings.total > 0 || stats.assets.total > 0

  return (
    <Main>
      <PageHeader
        title="Privileged Access"
        description="Monitor privileged account usage and risks"
      />

      {/* Stats Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Privileged Accounts"
          value={stats.assets.total}
          icon={Crown}
          description="Total monitored accounts"
        />
        <StatsCard
          title="Critical Findings"
          value={stats.findings.bySeverity['critical'] || 0}
          icon={AlertTriangle}
          changeType="negative"
          description="High-privilege risks"
        />
        <StatsCard
          title="Overdue Reviews"
          value={stats.findings.overdue}
          icon={ShieldAlert}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
          description="Past review deadline"
        />
        <StatsCard
          title="Avg CVSS Score"
          value={stats.findings.averageCvss.toFixed(1)}
          icon={KeyRound}
          description="Across privileged findings"
        />
      </div>

      {!hasData ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Crown className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">No Privileged Access Data</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Privileged access monitoring data will appear once accounts are discovered.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Asset Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Privileged Asset Types</CardTitle>
                <CardDescription>Distribution of assets with privileged access</CardDescription>
              </CardHeader>
              <CardContent>
                {assetTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={assetTypeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} />
                      <YAxis fontSize={12} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No asset type data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Severity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Severity Distribution</CardTitle>
                <CardDescription>Privileged access findings by severity</CardDescription>
              </CardHeader>
              <CardContent>
                {severityData.length > 0 ? (
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
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No severity data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Account Status Overview */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Account Risk Overview</CardTitle>
              <CardDescription>Privileged account findings by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statusData.length > 0 ? (
                  statusData.map((status) => (
                    <div key={status.name} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{status.name}</span>
                        <Badge
                          className="border-0"
                          style={{ backgroundColor: `${status.color}20`, color: status.color }}
                        >
                          {status.value}
                        </Badge>
                      </div>
                      <Progress
                        value={
                          stats.findings.total > 0 ? (status.value / stats.findings.total) * 100 : 0
                        }
                        className="h-1.5"
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex items-center justify-center py-8">
                    <div className="text-center">
                      <Server className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                      <p className="text-muted-foreground text-sm">No status data available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </Main>
  )
}
