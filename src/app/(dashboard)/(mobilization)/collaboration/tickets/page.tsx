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
import { Ticket, CheckCircle2, Clock, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  in_progress: '#f97316',
  resolved: '#22c55e',
  closed: '#6b7280',
  accepted: '#3b82f6',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#3b82f6',
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

export default function TicketIntegrationPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const statusData = useMemo(() => {
    return Object.entries(stats.findings.byStatus).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
      color: STATUS_COLORS[name] || '#6b7280',
    }))
  }, [stats.findings.byStatus])

  const severityData = useMemo(() => {
    return Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name] || '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  const resolvedCount = useMemo(() => {
    return (stats.findings.byStatus['resolved'] || 0) + (stats.findings.byStatus['closed'] || 0)
  }, [stats.findings.byStatus])

  const openCount = useMemo(() => {
    return (stats.findings.byStatus['open'] || 0) + (stats.findings.byStatus['in_progress'] || 0)
  }, [stats.findings.byStatus])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Ticket Integration"
          description="Track remediation tickets synced with external systems"
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
        title="Ticket Integration"
        description="Track remediation tickets synced with external systems"
      />

      {/* Stats Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tickets"
          value={stats.findings.total}
          icon={Ticket}
          description="Synced with external systems"
        />
        <StatsCard
          title="Open Tickets"
          value={openCount}
          icon={Clock}
          changeType={openCount > 0 ? 'negative' : 'positive'}
          description="Awaiting remediation"
        />
        <StatsCard
          title="Resolved"
          value={resolvedCount}
          icon={CheckCircle2}
          changeType="positive"
          description="Successfully closed"
        />
        <StatsCard
          title="Overdue"
          value={stats.findings.overdue}
          icon={AlertTriangle}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
          description="Past SLA target"
        />
      </div>

      {!hasData ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Ticket className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">No Tickets Synced</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Tickets will appear here once an external ticketing system is connected.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ticket Status Distribution</CardTitle>
                <CardDescription>Current status of synced tickets</CardDescription>
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

            {/* Severity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tickets by Severity</CardTitle>
                <CardDescription>Priority distribution of tracked tickets</CardDescription>
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
          </div>

          {/* Sync Status */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Sync Overview</CardTitle>
              <CardDescription>Ticket synchronization metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: 'Resolution Rate',
                    value:
                      stats.findings.total > 0
                        ? Math.round((resolvedCount / stats.findings.total) * 100)
                        : 0,
                    icon: CheckCircle2,
                    color: 'text-green-500',
                  },
                  {
                    label: 'Sync Coverage',
                    value:
                      stats.repositories.total > 0
                        ? Math.round(
                            (stats.repositories.withFindings / stats.repositories.total) * 100
                          )
                        : 0,
                    icon: RefreshCw,
                    color: 'text-blue-500',
                  },
                  {
                    label: 'SLA Compliance',
                    value:
                      stats.findings.total > 0
                        ? Math.max(
                            0,
                            100 - Math.round((stats.findings.overdue / stats.findings.total) * 100)
                          )
                        : 100,
                    icon: ExternalLink,
                    color: 'text-purple-500',
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
