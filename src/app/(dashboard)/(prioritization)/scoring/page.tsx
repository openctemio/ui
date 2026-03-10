'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '@/components/charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Gauge, Shield, AlertTriangle, Target, TrendingUp } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

const SCORING_FACTORS = [
  {
    name: 'CVSS Score',
    weight: 40,
    description: 'Base vulnerability severity from the Common Vulnerability Scoring System',
  },
  {
    name: 'Severity Distribution',
    weight: 30,
    description: 'Proportion of critical and high severity findings across the portfolio',
  },
  {
    name: 'Asset Criticality',
    weight: 20,
    description: 'Business importance and exposure level of affected assets',
  },
  {
    name: 'Exposure Window',
    weight: 10,
    description: 'Duration findings remain open and overdue for remediation',
  },
]

function getSeverityBadgeClass(severity: string) {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'high':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    case 'low':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function getCvssRiskLabel(cvss: number): { label: string; severity: string } {
  if (cvss >= 9) return { label: 'critical', severity: 'critical' }
  if (cvss >= 7) return { label: 'high', severity: 'high' }
  if (cvss >= 4) return { label: 'moderate', severity: 'medium' }
  return { label: 'low', severity: 'low' }
}

function LoadingSkeleton() {
  return (
    <>
      {/* Stats row skeleton */}
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

      {/* Methodology + Chart skeleton */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </section>

      {/* Risk factors skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-4 w-72" />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}

export default function ExposureScoringPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const criticalCount = stats.findings.bySeverity?.critical || 0
  const highCount = stats.findings.bySeverity?.high || 0
  const overdueCount = stats.findings.overdue
  const averageCvss = stats.findings.averageCvss
  const riskScore = stats.assets.riskScore
  const repoTotal = stats.repositories.total
  const repoWithFindings = stats.repositories.withFindings

  const severityChartData = useMemo(() => {
    const bySeverity = stats.findings.bySeverity || {}
    const order = ['critical', 'high', 'medium', 'low', 'info']
    return order
      .filter((sev) => bySeverity[sev] !== undefined)
      .map((sev) => ({
        name: sev.charAt(0).toUpperCase() + sev.slice(1),
        count: bySeverity[sev] || 0,
        fill: SEVERITY_COLORS[sev] || '#6b7280',
      }))
  }, [stats.findings.bySeverity])

  const riskFactors = useMemo(() => {
    const factors: { message: string; severity: string }[] = []

    if (criticalCount > 0) {
      factors.push({
        message: `${criticalCount} critical finding${criticalCount !== 1 ? 's' : ''} require${criticalCount === 1 ? 's' : ''} immediate attention`,
        severity: 'critical',
      })
    }

    if (overdueCount > 0) {
      factors.push({
        message: `${overdueCount} finding${overdueCount !== 1 ? 's' : ''} ${overdueCount === 1 ? 'is' : 'are'} overdue for remediation`,
        severity: overdueCount > 5 ? 'high' : 'medium',
      })
    }

    if (stats.findings.total > 0) {
      const { label, severity } = getCvssRiskLabel(averageCvss)
      factors.push({
        message: `Average CVSS of ${averageCvss.toFixed(1)} indicates ${label} risk`,
        severity,
      })
    }

    if (repoTotal > 0) {
      const pct = Math.round((repoWithFindings / repoTotal) * 100)
      factors.push({
        message: `${pct}% of repositories have findings`,
        severity: pct > 50 ? 'high' : pct > 25 ? 'medium' : 'low',
      })
    }

    return factors
  }, [criticalCount, overdueCount, averageCvss, repoTotal, repoWithFindings, stats.findings.total])

  const isEmpty =
    !isLoading &&
    stats.assets.total === 0 &&
    stats.findings.total === 0 &&
    stats.repositories.total === 0

  return (
    <Main>
      <PageHeader
        title="Exposure Scoring"
        description="Risk scoring combining CVSS, severity distribution, and asset criticality"
        className="mb-6"
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Gauge className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground text-center text-sm">
              No scoring data available. Start scanning to generate risk scores.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Row */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Risk Score"
              value={`${riskScore.toFixed(1)} / 10`}
              description="Overall exposure risk"
              changeType={riskScore >= 7 ? 'negative' : riskScore >= 4 ? 'neutral' : 'positive'}
              icon={Gauge}
            />
            <StatsCard
              title="Average CVSS"
              value={averageCvss.toFixed(1)}
              description={`${stats.findings.total} total findings`}
              changeType={averageCvss >= 7 ? 'negative' : 'neutral'}
              icon={Shield}
            />
            <StatsCard
              title="Critical Exposure"
              value={criticalCount}
              description={highCount > 0 ? `${highCount} high severity` : 'No high severity'}
              changeType={criticalCount > 0 ? 'negative' : 'positive'}
              icon={AlertTriangle}
            />
            <StatsCard
              title="Overdue Items"
              value={overdueCount}
              description="Past remediation deadline"
              changeType={overdueCount > 0 ? 'negative' : 'positive'}
              icon={Target}
            />
          </section>

          {/* Methodology + Chart */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Scoring Methodology */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Scoring Methodology
                </CardTitle>
                <CardDescription>
                  How the exposure risk score is calculated from multiple factors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {SCORING_FACTORS.map((factor) => (
                  <div key={factor.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{factor.name}</span>
                      <span className="text-muted-foreground text-sm">{factor.weight}%</span>
                    </div>
                    <Progress value={factor.weight} className="h-2" />
                    <p className="text-muted-foreground text-xs">{factor.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Severity Scoring Impact */}
            <Card>
              <CardHeader>
                <CardTitle>Severity Scoring Impact</CardTitle>
                <CardDescription>
                  How each severity level contributes to the overall score
                </CardDescription>
              </CardHeader>
              <CardContent>
                {severityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={severityChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Findings" radius={[4, 4, 0, 0]} barSize={40}>
                        {severityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">No severity data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Risk Factors */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Factors</CardTitle>
              <CardDescription>
                Current risk factors derived from your exposure data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {riskFactors.length > 0 ? (
                <div className="space-y-4">
                  {riskFactors.map((factor, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Badge
                        variant="outline"
                        className={cn('mt-0.5 shrink-0', getSeverityBadgeClass(factor.severity))}
                      >
                        {factor.severity}
                      </Badge>
                      <span className="text-sm">{factor.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No risk factors identified. Your exposure posture looks good.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Main>
  )
}
