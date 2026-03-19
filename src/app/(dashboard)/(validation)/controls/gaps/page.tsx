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
import {
  ShieldAlert,
  ShieldOff,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

export default function ControlGapsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const controlCoverage = useMemo(() => {
    if (stats.assets.total === 0) return 0
    const protectedAssets = stats.assets.total - (stats.assets.byStatus?.['unmanaged'] ?? 0)
    return Math.round((protectedAssets / stats.assets.total) * 100)
  }, [stats.assets.total, stats.assets.byStatus])

  const gapCount = useMemo(() => {
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

  const assetTypeData = useMemo(() => {
    return Object.entries(stats.assets.byType).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
      value,
    }))
  }, [stats.assets.byType])

  const gapInsights = useMemo(() => {
    const critical = stats.findings.bySeverity?.['critical'] ?? 0
    const high = stats.findings.bySeverity?.['high'] ?? 0
    const reposWithFindings = stats.repositories.withFindings
    return [
      {
        icon: critical > 0 ? XCircle : CheckCircle2,
        iconColor: critical > 0 ? 'text-red-500' : 'text-green-500',
        title: 'Critical Control Gaps',
        text:
          critical > 0
            ? `${critical} critical findings indicate missing or ineffective security controls.`
            : 'No critical control gaps detected.',
      },
      {
        icon: high > 0 ? AlertTriangle : CheckCircle2,
        iconColor: high > 0 ? 'text-orange-500' : 'text-green-500',
        title: 'High-Priority Gaps',
        text:
          high > 0
            ? `${high} high-severity findings suggest control weaknesses that need attention.`
            : 'No high-priority gaps identified.',
      },
      {
        icon: TrendingUp,
        iconColor: 'text-blue-500',
        title: 'Repository Coverage',
        text:
          reposWithFindings > 0
            ? `${reposWithFindings} of ${stats.repositories.total} repositories have findings requiring control review.`
            : 'All repositories are clear of control gap indicators.',
      },
    ]
  }, [stats.findings.bySeverity, stats.repositories])

  if (isLoading) {
    return (
      <Main>
        <PageHeader title="Control Gaps" description="Identify gaps in security control coverage" />
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
      <PageHeader title="Control Gaps" description="Identify gaps in security control coverage" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Control Coverage"
          value={`${controlCoverage}%`}
          icon={ShieldAlert}
          changeType={controlCoverage > 80 ? 'positive' : 'negative'}
          description="Assets protected"
        />
        <StatsCard
          title="Identified Gaps"
          value={gapCount}
          icon={ShieldOff}
          changeType={gapCount > 0 ? 'negative' : 'positive'}
          description="Critical + High"
        />
        <StatsCard
          title="Risk Score"
          value={stats.assets.riskScore}
          icon={Target}
          changeType={stats.assets.riskScore > 70 ? 'negative' : 'positive'}
          description="Overall risk"
        />
        <StatsCard
          title="Overdue Remediations"
          value={stats.findings.overdue}
          icon={AlertTriangle}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'positive'}
          description="Past SLA deadline"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gaps by Severity</CardTitle>
            <CardDescription>Security control gaps categorized by finding severity</CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No gap data available
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
            <CardTitle>Gaps by Asset Type</CardTitle>
            <CardDescription>Control gap distribution across asset categories</CardDescription>
          </CardHeader>
          <CardContent>
            {assetTypeData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No asset type data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={assetTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Assets" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gap Analysis Insights</CardTitle>
            <CardDescription>Key findings and recommended control improvements</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.findings.total === 0 && stats.assets.total === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No data available for gap analysis
              </div>
            ) : (
              <div className="space-y-4">
                {gapInsights.map((insight) => (
                  <div key={insight.title} className="flex items-start gap-3 rounded-lg border p-4">
                    <insight.icon className={cn('mt-0.5 h-5 w-5 shrink-0', insight.iconColor)} />
                    <div>
                      <p className="font-medium">{insight.title}</p>
                      <p className="text-sm text-muted-foreground">{insight.text}</p>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">Control Coverage</p>
                  <Progress value={controlCoverage} className="mt-2 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {controlCoverage}% of assets have adequate security controls
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
