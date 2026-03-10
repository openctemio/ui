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
  Cpu,
  Download,
  FileText,
  AlertTriangle,
  Bug,
  Target,
  Shield,
  Clock,
  Server,
  GitBranch,
  Filter,
  BarChart3,
} from 'lucide-react'
import { SEVERITY_CHART_COLORS as SEVERITY_COLORS } from '@/lib/severity-colors'

function SeverityBreakdownBar({
  severity,
  count,
  total,
  color,
}: {
  severity: string
  count: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="capitalize">{severity}</span>
        </div>
        <span className="font-medium">
          {count} ({pct}%)
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
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
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
      <div className="mt-6">
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </Main>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Cpu className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-1 text-lg font-semibold">No Technical Data Available</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Technical reports will be available once findings and scan data is collected.
        </p>
      </CardContent>
    </Card>
  )
}

export default function TechnicalReportsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const severityEntries = useMemo(
    () =>
      Object.entries(stats.findings.bySeverity).sort((a, b) => {
        const order = ['critical', 'high', 'medium', 'low', 'info']
        return order.indexOf(a[0]) - order.indexOf(b[0])
      }),
    [stats.findings.bySeverity]
  )

  const assetTypeData = useMemo(
    () =>
      Object.entries(stats.assets.byType).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value,
      })),
    [stats.assets.byType]
  )

  const trendData = useMemo(
    () =>
      stats.findingTrend.map((t) => ({
        date: t.date,
        Critical: t.critical,
        High: t.high,
        Medium: t.medium,
        Low: t.low,
        Info: t.info,
      })),
    [stats.findingTrend]
  )

  const pieColors = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899']

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (stats.findings.total === 0 && stats.assets.total === 0) {
    return (
      <Main>
        <PageHeader
          title="Technical Reports"
          description="Detailed technical vulnerability assessment reports"
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
        title="Technical Reports"
        description="Detailed technical vulnerability assessment reports"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button size="sm" disabled>
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Total Findings"
          value={stats.findings.total}
          icon={Bug}
          changeType={stats.findings.total > 0 ? 'negative' : 'positive'}
          description="Across all assets"
        />
        <StatsCard
          title="Avg CVSS"
          value={stats.findings.averageCvss.toFixed(1)}
          icon={Target}
          changeType={
            stats.findings.averageCvss > 7
              ? 'negative'
              : stats.findings.averageCvss > 4
                ? 'neutral'
                : 'positive'
          }
          description="Average severity score"
        />
        <StatsCard
          title="Affected Assets"
          value={stats.assets.total}
          icon={Server}
          description="Total monitored assets"
        />
        <StatsCard
          title="Repos with Findings"
          value={stats.repositories.withFindings}
          icon={GitBranch}
          changeType={stats.repositories.withFindings > 0 ? 'negative' : 'positive'}
          description={`of ${stats.repositories.total} repositories`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Severity Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of findings across severity levels with remediation priority.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {severityEntries.map(([severity, count]) => (
                <SeverityBreakdownBar
                  key={severity}
                  severity={severity}
                  count={count}
                  total={stats.findings.total}
                  color={(SEVERITY_COLORS as Record<string, string>)[severity] || '#6b7280'}
                />
              ))}
            </div>
            {severityEntries.length === 0 && (
              <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                No severity data available
              </div>
            )}
            <div className="mt-4 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground h-4 w-4" />
                <span className="text-sm font-medium">Overdue Findings</span>
                <Badge
                  variant="outline"
                  className={cn(
                    stats.findings.overdue > 0
                      ? 'bg-red-500/10 text-red-600 border-red-500/20'
                      : 'bg-green-500/10 text-green-600 border-green-500/20'
                  )}
                >
                  {stats.findings.overdue}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Findings that have exceeded their SLA remediation deadline.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Asset Type Distribution
            </CardTitle>
            <CardDescription>Breakdown of monitored assets by type.</CardDescription>
          </CardHeader>
          <CardContent>
            {assetTypeData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {assetTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
                No asset type data available
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
              Finding Discovery Trend
            </CardTitle>
            <CardDescription>
              New findings discovered over time, broken down by severity. Use this data to identify
              patterns and measure the effectiveness of remediation efforts.
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
                  <Bar dataKey="Info" stackId="a" fill={SEVERITY_COLORS.info} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Sections
          </CardTitle>
          <CardDescription>
            Technical reports include the following sections. Customize what to include when
            generating.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: 'Vulnerability Summary',
                desc: 'Overview of all findings with severity distribution',
              },
              {
                name: 'Remediation Guidance',
                desc: 'Step-by-step fix instructions for each finding',
              },
              {
                name: 'Affected Assets',
                desc: 'Complete list of assets impacted by each vulnerability',
              },
              { name: 'CVSS Analysis', desc: 'Detailed CVSS scoring breakdown and attack vectors' },
              {
                name: 'Dependency Report',
                desc: 'Third-party library vulnerabilities and upgrade paths',
              },
              {
                name: 'Configuration Issues',
                desc: 'Security misconfigurations and hardening recommendations',
              },
            ].map((section) => (
              <div key={section.name} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Cpu className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">{section.name}</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{section.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Main>
  )
}
