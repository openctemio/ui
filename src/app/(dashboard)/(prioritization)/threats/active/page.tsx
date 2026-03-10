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
import {
  Flame,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ArrowRight,
  CircleAlert,
  ListChecks,
} from 'lucide-react'

// Severity colors for charts
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

// Status colors for bar chart
const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  in_progress: '#f97316',
  resolved: '#22c55e',
  closed: '#6b7280',
  accepted: '#8b5cf6',
}

// --- Skeleton Components ---

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

function BottomRowSkeleton() {
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

// --- Priority Action Item ---

interface PriorityAction {
  label: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

function PriorityActionItem({ action }: { action: PriorityAction }) {
  const badgeVariant =
    action.severity === 'critical'
      ? 'destructive'
      : action.severity === 'high'
        ? 'default'
        : 'secondary'

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="flex items-start gap-3 min-w-0">
        <CircleAlert
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0',
            action.severity === 'critical' && 'text-red-500',
            action.severity === 'high' && 'text-orange-500',
            action.severity === 'medium' && 'text-yellow-500',
            action.severity === 'low' && 'text-blue-500'
          )}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{action.label}</p>
          <p className="text-xs text-muted-foreground">{action.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={badgeVariant} className="text-xs capitalize">
          {action.severity}
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}

// --- Main Page ---

export default function ActiveThreatsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading, error } = useDashboardStats(currentTenant?.id || null)

  const isEmptyState = useMemo(() => {
    return stats.assets.total === 0 && stats.findings.total === 0 && stats.repositories.total === 0
  }, [stats])

  // Active threats = critical + high
  const criticalCount = stats.findings.bySeverity?.critical || 0
  const highCount = stats.findings.bySeverity?.high || 0
  const activeThreats = criticalCount + highCount
  const overdueCount = stats.findings.overdue

  // Severity distribution pie chart data
  const severityData = useMemo(() => {
    const bySeverity = stats.findings.bySeverity || {}
    return Object.entries(bySeverity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name.toLowerCase()] || '#6b7280',
    }))
  }, [stats.findings.bySeverity])

  // Status bar chart data
  const statusData = useMemo(() => {
    const byStatus = stats.findings.byStatus || {}
    return Object.entries(byStatus).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      count: value,
      fill: STATUS_COLORS[name.toLowerCase()] || '#3b82f6',
    }))
  }, [stats.findings.byStatus])

  // Finding trend area chart data
  const trendData = useMemo(() => {
    return (stats.findingTrend || []).map((point) => ({
      ...point,
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
  }, [stats.findingTrend])

  // Priority actions derived from stats
  const priorityActions = useMemo(() => {
    const actions: PriorityAction[] = []

    if (criticalCount > 0) {
      actions.push({
        label: `Remediate ${criticalCount} critical finding${criticalCount !== 1 ? 's' : ''}`,
        description: 'Critical findings represent the highest risk to your organization',
        severity: 'critical',
      })
    }

    if (overdueCount > 0) {
      actions.push({
        label: `Address ${overdueCount} overdue finding${overdueCount !== 1 ? 's' : ''}`,
        description: 'These findings have exceeded their SLA remediation deadline',
        severity: 'critical',
      })
    }

    if (highCount > 0) {
      actions.push({
        label: `Review ${highCount} high-severity finding${highCount !== 1 ? 's' : ''}`,
        description: 'High-severity findings should be triaged and assigned promptly',
        severity: 'high',
      })
    }

    const mediumCount = stats.findings.bySeverity?.medium || 0
    if (mediumCount > 0) {
      actions.push({
        label: `Triage ${mediumCount} medium-severity finding${mediumCount !== 1 ? 's' : ''}`,
        description: 'Schedule remediation within standard SLA windows',
        severity: 'medium',
      })
    }

    if (stats.findings.averageCvss >= 7) {
      actions.push({
        label: `Average CVSS score is ${stats.findings.averageCvss.toFixed(1)}`,
        description: 'Your environment has a high average vulnerability score',
        severity: 'high',
      })
    }

    if (actions.length === 0) {
      actions.push({
        label: 'No urgent actions required',
        description: 'Your threat landscape is currently under control',
        severity: 'low',
      })
    }

    return actions
  }, [
    criticalCount,
    highCount,
    overdueCount,
    stats.findings.bySeverity,
    stats.findings.averageCvss,
  ])

  return (
    <Main>
      <PageHeader
        title="Active Threats"
        description="Monitor active security threats targeting your organization"
        className="mb-6"
      />

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-yellow-500/50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-muted-foreground">Failed to load active threat data</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <>
          <StatsRowSkeleton />
          <ChartsRowSkeleton />
          <BottomRowSkeleton />
        </>
      )}

      {/* Empty State */}
      {!isLoading && !error && isEmptyState && (
        <Card className="mb-6">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Flame className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No threat data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Configure scanners and import findings to begin monitoring active threats.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data Loaded */}
      {!isLoading && !error && !isEmptyState && (
        <>
          {/* Stats Row */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Active Threats"
              value={activeThreats}
              icon={Flame}
              changeType={activeThreats > 0 ? 'negative' : 'positive'}
              change={activeThreats > 0 ? 'Requires attention' : 'No active threats'}
            />
            <StatsCard
              title="Critical"
              value={criticalCount}
              icon={ShieldAlert}
              changeType={criticalCount > 0 ? 'negative' : 'positive'}
              change={criticalCount > 0 ? 'Immediate action needed' : 'None detected'}
            />
            <StatsCard
              title="High"
              value={highCount}
              icon={AlertTriangle}
              changeType={highCount > 0 ? 'negative' : 'positive'}
              change={highCount > 0 ? 'Review recommended' : 'None detected'}
            />
            <StatsCard
              title="Overdue"
              value={overdueCount}
              icon={Clock}
              changeType={overdueCount > 0 ? 'negative' : 'positive'}
              change={overdueCount > 0 ? 'Past SLA deadline' : 'All on track'}
            />
          </section>

          {/* Charts Row: Severity Distribution + Threat Timeline */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Threat Severity Distribution - Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Threat Severity Distribution</CardTitle>
                <CardDescription>Active findings breakdown by severity level</CardDescription>
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

            {/* Threat Timeline - Stacked Area Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Threat Timeline</CardTitle>
                <CardDescription>Finding severity trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendData}>
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
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="high"
                        stackId="1"
                        stroke={SEVERITY_COLORS.high}
                        fill={SEVERITY_COLORS.high}
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="medium"
                        stackId="1"
                        stroke={SEVERITY_COLORS.medium}
                        fill={SEVERITY_COLORS.medium}
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="low"
                        stackId="1"
                        stroke={SEVERITY_COLORS.low}
                        fill={SEVERITY_COLORS.low}
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="info"
                        stackId="1"
                        stroke={SEVERITY_COLORS.info}
                        fill={SEVERITY_COLORS.info}
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No trend data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Bottom Row: Threat Status + Priority Actions */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Threat Status - Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Threat Status</CardTitle>
                <CardDescription>Findings grouped by current remediation status</CardDescription>
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
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32}>
                        {statusData.map((entry, index) => (
                          <Cell key={`status-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No status data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Priority Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Priority Actions
                </CardTitle>
                <CardDescription>
                  Recommended actions based on current threat landscape
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {priorityActions.map((action, index) => (
                    <PriorityActionItem key={index} action={action} />
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
