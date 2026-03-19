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
import { cn } from '@/lib/utils'
import { ShieldQuestion, Clock, AlertTriangle, CheckCircle2, FileX, Timer } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#3b82f6',
}

const STATUS_COLORS: Record<string, string> = {
  open: '#f97316',
  in_progress: '#3b82f6',
  resolved: '#22c55e',
  closed: '#6b7280',
  accepted: '#8b5cf6',
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

export default function PendingExceptionsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] || '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const statusData = useMemo(() => {
    return Object.entries(stats.findings.byStatus).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
      color: STATUS_COLORS[name] || '#6b7280',
    }))
  }, [stats.findings.byStatus])

  const pendingCount = useMemo(() => {
    return (stats.findings.byStatus['open'] || 0) + (stats.findings.byStatus['in_progress'] || 0)
  }, [stats.findings.byStatus])

  const approvedCount = useMemo(() => {
    return (stats.findings.byStatus['accepted'] || 0) + (stats.findings.byStatus['resolved'] || 0)
  }, [stats.findings.byStatus])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Pending Exceptions"
          description="Review pending exception requests for findings"
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

  const hasData = stats.findings.total > 0

  return (
    <Main>
      <PageHeader
        title="Pending Exceptions"
        description="Review pending exception requests for findings"
      />

      {/* Stats Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Exceptions"
          value={stats.findings.total}
          icon={ShieldQuestion}
          description="All exception requests"
        />
        <StatsCard
          title="Pending Review"
          value={pendingCount}
          icon={Clock}
          changeType={pendingCount > 0 ? 'negative' : 'positive'}
          description="Awaiting approval"
        />
        <StatsCard
          title="Overdue"
          value={stats.findings.overdue}
          icon={AlertTriangle}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
          description="Past review deadline"
        />
        <StatsCard
          title="Approved"
          value={approvedCount}
          icon={CheckCircle2}
          changeType="positive"
          description="Exceptions granted"
        />
      </div>

      {!hasData ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShieldQuestion className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">No Pending Exceptions</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Exception requests will appear here when team members request risk acceptance.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Severity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exceptions by Severity</CardTitle>
                <CardDescription>Severity distribution of exception requests</CardDescription>
              </CardHeader>
              <CardContent>
                {severityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={severityData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} />
                      <YAxis fontSize={12} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No severity data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exception Status</CardTitle>
                <CardDescription>Current review status of all requests</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center">
                    <p className="text-muted-foreground text-sm">No status data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Review Metrics */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Review Metrics</CardTitle>
              <CardDescription>Exception processing performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: 'Approval Rate',
                    value:
                      stats.findings.total > 0
                        ? Math.round((approvedCount / stats.findings.total) * 100)
                        : 0,
                    icon: CheckCircle2,
                    color: 'text-green-500',
                  },
                  {
                    label: 'Pending Rate',
                    value:
                      stats.findings.total > 0
                        ? Math.round((pendingCount / stats.findings.total) * 100)
                        : 0,
                    icon: Timer,
                    color: 'text-orange-500',
                  },
                  {
                    label: 'Overdue Rate',
                    value:
                      stats.findings.total > 0
                        ? Math.round((stats.findings.overdue / stats.findings.total) * 100)
                        : 0,
                    icon: FileX,
                    color: 'text-red-500',
                  },
                ].map((metric) => {
                  const Icon = metric.icon
                  return (
                    <div key={metric.label} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-5 w-5', metric.color)} />
                        <span className="text-sm font-medium">{metric.label}</span>
                      </div>
                      <div className="text-2xl font-bold">{metric.value}%</div>
                      <Progress value={metric.value} className="h-1.5" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </Main>
  )
}
