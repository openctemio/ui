'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  Crown,
  Download,
  FileText,
  Shield,
  AlertTriangle,
  TrendingUp,
  Target,
  BarChart3,
  Gauge,
  Activity,
  Clock,
} from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#2563eb',
  info: '#6b7280',
}

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  in_progress: '#f59e0b',
  resolved: '#22c55e',
  closed: '#6b7280',
  accepted: '#8b5cf6',
}

function RiskGauge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-red-600'
    if (s >= 60) return 'text-orange-500'
    if (s >= 40) return 'text-yellow-500'
    return 'text-green-500'
  }
  const getLabel = (s: number) => {
    if (s >= 80) return 'Critical'
    if (s >= 60) return 'High'
    if (s >= 40) return 'Medium'
    return 'Low'
  }

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className={cn('text-5xl font-bold', getColor(score))}>{score}</div>
      <div className={cn('mt-1 text-sm font-semibold', getColor(score))}>
        {getLabel(score)} Risk
      </div>
      <Progress value={score} className="mt-3 h-2 w-32" />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
      <div className="mt-6">
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </Main>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Crown className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-1 text-lg font-semibold">No Data Available</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Executive reports will appear once assets and findings data is available.
        </p>
      </CardContent>
    </Card>
  )
}

export default function ExecutiveReportsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const severityData = useMemo(
    () =>
      Object.entries(stats.findings.bySeverity).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: SEVERITY_COLORS[name] || '#6b7280',
      })),
    [stats.findings.bySeverity]
  )

  const statusData = useMemo(
    () =>
      Object.entries(stats.findings.byStatus).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value,
        fill: STATUS_COLORS[name] || '#6b7280',
      })),
    [stats.findings.byStatus]
  )

  const trendData = useMemo(
    () =>
      stats.findingTrend.map((t) => ({
        date: t.date,
        Critical: t.critical,
        High: t.high,
        Medium: t.medium,
        Low: t.low,
      })),
    [stats.findingTrend]
  )

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (stats.findings.total === 0 && stats.assets.total === 0) {
    return (
      <Main>
        <PageHeader
          title="Executive Reports"
          description="High-level security posture reports for leadership"
        />
        <div className="mt-6">
          <EmptyState />
        </div>
      </Main>
    )
  }

  return (
    <Main>
      <PageHeader
        title="Executive Reports"
        description="High-level security posture reports for leadership"
      >
        <div className="flex items-center gap-2">
          <Button size="sm" disabled>
            <FileText className="mr-2 h-4 w-4" />
            Generate PDF
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Risk Score"
          value={stats.assets.riskScore}
          icon={Gauge}
          changeType={
            stats.assets.riskScore > 70
              ? 'negative'
              : stats.assets.riskScore > 40
                ? 'neutral'
                : 'positive'
          }
          description="Portfolio risk level"
        />
        <StatsCard
          title="Total Assets"
          value={stats.assets.total}
          icon={Shield}
          description="Monitored assets"
        />
        <StatsCard
          title="Open Findings"
          value={stats.findings.total}
          icon={AlertTriangle}
          changeType={stats.findings.total > 0 ? 'negative' : 'positive'}
          description="Requiring attention"
        />
        <StatsCard
          title="Overdue"
          value={stats.findings.overdue}
          icon={Clock}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
          description="Past SLA deadline"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Risk Posture
            </CardTitle>
            <CardDescription>Current overall risk assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskGauge score={stats.assets.riskScore} />
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg CVSS Score</span>
                <span className="font-medium">{stats.findings.averageCvss.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repos with Findings</span>
                <span className="font-medium">
                  {stats.repositories.withFindings} / {stats.repositories.total}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Findings by Severity
            </CardTitle>
            <CardDescription>Distribution across severity levels</CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-muted-foreground flex h-52 items-center justify-center text-sm">
                No severity data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Remediation Status
            </CardTitle>
            <CardDescription>Finding resolution progress</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-muted-foreground flex h-52 items-center justify-center text-sm">
                No status data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {trendData.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Finding Trends
            </CardTitle>
            <CardDescription>
              Severity distribution over time. Tracks discovery of new findings by severity level.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Critical" stackId="a" fill={SEVERITY_COLORS.critical} />
                  <Bar dataKey="High" stackId="a" fill={SEVERITY_COLORS.high} />
                  <Bar dataKey="Medium" stackId="a" fill={SEVERITY_COLORS.medium} />
                  <Bar dataKey="Low" stackId="a" fill={SEVERITY_COLORS.low} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Key Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                priority: 'High',
                text: 'Address critical and high severity findings to reduce risk score',
                metric: `${(stats.findings.bySeverity['critical'] || 0) + (stats.findings.bySeverity['high'] || 0)} findings`,
              },
              {
                priority: 'High',
                text: 'Resolve overdue findings before SLA breach impacts compliance',
                metric: `${stats.findings.overdue} overdue`,
              },
              {
                priority: 'Medium',
                text: 'Expand scanning coverage to repositories without findings data',
                metric: `${stats.repositories.total - stats.repositories.withFindings} unscanned`,
              },
            ].map((rec, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                <Badge
                  variant="outline"
                  className={cn(
                    'mt-0.5 shrink-0',
                    rec.priority === 'High'
                      ? 'bg-red-500/10 text-red-600 border-red-500/20'
                      : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                  )}
                >
                  {rec.priority}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm">{rec.text}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{rec.metric}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Main>
  )
}
