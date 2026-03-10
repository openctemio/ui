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
import {
  XCircle,
  Filter,
  TrendingDown,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

export default function FalsePositivesPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const falsePositiveCount = useMemo(
    () => stats.findings.byStatus?.['false_positive'] ?? 0,
    [stats.findings.byStatus]
  )

  const fpRate = useMemo(() => {
    if (stats.findings.total === 0) return 0
    return Math.round((falsePositiveCount / stats.findings.total) * 100)
  }, [falsePositiveCount, stats.findings.total])

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
    }))
  }, [stats.findingTrend])

  if (isLoading) {
    return (
      <Main>
        <PageHeader
          title="False Positives"
          description="Manage findings marked as false positives"
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
      <PageHeader title="False Positives" description="Manage findings marked as false positives" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="False Positives"
          value={falsePositiveCount}
          icon={XCircle}
          description="Total marked"
        />
        <StatsCard
          title="FP Rate"
          value={`${fpRate}%`}
          icon={Filter}
          changeType={fpRate > 30 ? 'negative' : 'positive'}
          description="Of all findings"
        />
        <StatsCard
          title="True Findings"
          value={stats.findings.total - falsePositiveCount}
          icon={BarChart3}
          description="Confirmed findings"
        />
        <StatsCard
          title="Noise Reduction"
          value={`${fpRate}%`}
          icon={TrendingDown}
          changeType="positive"
          description="Filtered out"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>False Positives by Severity</CardTitle>
            <CardDescription>
              Severity breakdown of findings marked as false positives
            </CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No false positive data available
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
            <CardTitle>Finding Volume Trend</CardTitle>
            <CardDescription>Total findings over the past 7 days</CardDescription>
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
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total Findings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>False Positive Management Insights</CardTitle>
            <CardDescription>
              Analysis and recommended actions for false positive reduction
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.findings.total === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No findings data to analyze
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium">False Positive Rate</p>
                    <p className="text-sm text-muted-foreground">
                      {fpRate}% of findings are marked as false positives.
                      {fpRate > 30
                        ? ' Consider tuning scanner rules to reduce noise.'
                        : ' Rate is within acceptable thresholds.'}
                    </p>
                    <Progress value={fpRate} className="mt-2 h-2" />
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  <div>
                    <p className="font-medium">Suppression Patterns</p>
                    <p className="text-sm text-muted-foreground">
                      Review recurring false positives to create auto-suppression rules and improve
                      scanner accuracy over time.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <AlertTriangle
                    className={cn(
                      'mt-0.5 h-5 w-5 shrink-0',
                      fpRate > 30 ? 'text-yellow-500' : 'text-green-500'
                    )}
                  />
                  <div>
                    <p className="font-medium">Revalidation Needed</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.findings.overdue > 0 ? (
                        <>
                          <Badge variant="destructive">{stats.findings.overdue}</Badge> false
                          positive markings should be reviewed for revalidation.
                        </>
                      ) : (
                        'All false positive markings are up to date.'
                      )}
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
