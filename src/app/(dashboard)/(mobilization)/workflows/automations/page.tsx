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
import { Zap, Settings, TrendingUp, Target, AlertTriangle, Info } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

export default function WorkflowAutomationsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const automationCoverage = useMemo(() => {
    if (stats.findings.total === 0) return 0
    const automated =
      (stats.findings.byStatus?.['in_progress'] ?? 0) + (stats.findings.byStatus?.['resolved'] ?? 0)
    return Math.round((automated / stats.findings.total) * 100)
  }, [stats.findings.byStatus, stats.findings.total])

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
      critical: point.critical,
      high: point.high,
      medium: point.medium,
      low: point.low,
    }))
  }, [stats.findingTrend])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="Workflow Automations"
          description="Configure automated response workflows"
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
        title="Workflow Automations"
        description="Configure automated response workflows"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Automation Coverage"
          value={`${automationCoverage}%`}
          icon={Zap}
          changeType={automationCoverage > 50 ? 'positive' : 'negative'}
          description="Findings automated"
        />
        <StatsCard
          title="Total Findings"
          value={stats.findings.total}
          icon={Target}
          description="Across all sources"
        />
        <StatsCard
          title="Avg CVSS"
          value={stats.findings.averageCvss.toFixed(1)}
          icon={TrendingUp}
          changeType={stats.findings.averageCvss > 7 ? 'negative' : 'neutral'}
          description="Average severity"
        />
        <StatsCard
          title="Asset Coverage"
          value={stats.assets.total}
          icon={Settings}
          description="Monitored assets"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Automation Targets by Severity</CardTitle>
            <CardDescription>Finding severity distribution for automation rules</CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No findings data available
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
            <CardTitle>Automation Processing Trend</CardTitle>
            <CardDescription>Findings processed by severity over time</CardDescription>
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
                  <Bar dataKey="critical" fill="#ef4444" name="Critical" />
                  <Bar dataKey="high" fill="#f97316" name="High" />
                  <Bar dataKey="medium" fill="#eab308" name="Medium" />
                  <Bar dataKey="low" fill="#3b82f6" name="Low" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Automation Recommendations</CardTitle>
            <CardDescription>Suggestions to improve workflow automation coverage</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.findings.total === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No data available for recommendations
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
                  <div className="flex-1">
                    <p className="font-medium">Automation Coverage</p>
                    <p className="text-sm text-muted-foreground">
                      {automationCoverage}% of findings have automated responses configured.
                    </p>
                    <Progress value={automationCoverage} className="mt-2 h-2" />
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <AlertTriangle
                    className={cn(
                      'mt-0.5 h-5 w-5 shrink-0',
                      (stats.findings.bySeverity?.['critical'] ?? 0) > 0
                        ? 'text-red-500'
                        : 'text-green-500'
                    )}
                  />
                  <div>
                    <p className="font-medium">Critical Finding Automation</p>
                    <p className="text-sm text-muted-foreground">
                      {(stats.findings.bySeverity?.['critical'] ?? 0) > 0
                        ? `${stats.findings.bySeverity['critical']} critical findings should have automated response workflows.`
                        : 'No critical findings require automation.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                  <div>
                    <p className="font-medium">Recommended Actions</p>
                    <p className="text-sm text-muted-foreground">
                      Create automation rules for recurring finding patterns to reduce manual triage
                      time and improve mean time to remediation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
