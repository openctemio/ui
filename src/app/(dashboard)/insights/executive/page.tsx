'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { get } from '@/lib/api/client'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Users,
  FileWarning,
  CalendarClock,
  Activity,
  Target,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface TopRisk {
  title: string
  severity: string
  priority_class: string
  asset_name: string
  epss_score?: number
  is_in_kev: boolean
}

interface ExecutiveSummary {
  period: string
  risk_score_current: number
  risk_score_change: number
  findings_total: number
  findings_resolved_period: number
  findings_new_period: number
  p0_open: number
  p0_resolved_period: number
  p1_open: number
  p1_resolved_period: number
  sla_compliance_pct: number
  sla_breached: number
  mttr_critical_hours: number
  mttr_high_hours: number
  crown_jewels_at_risk: number
  top_risks: TopRisk[]
}

interface MTTRAnalytics {
  by_severity: Record<string, number>
  by_priority_class: Record<string, number>
  overall_hours: number
  sample_size: number
}

interface ProcessMetrics {
  approval_avg_hours: number
  approval_count: number
  stale_assets: number
  stale_assets_pct: number
  findings_without_owner: number
  avg_time_to_assign_hours: number
}

type Period = '30' | '90' | '365'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '365', label: '1y' },
]

// ============================================
// HELPERS
// ============================================

function getSeverityBadgeClass(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'high':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    case 'low':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    case 'info':
      return 'bg-muted text-muted-foreground border-muted-foreground/20'
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/20'
  }
}

function getPriorityClassBadgeClass(priorityClass: string): string {
  switch (priorityClass.toUpperCase()) {
    case 'P0':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'P1':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    case 'P2':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    case 'P3':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/20'
  }
}

function formatHours(hours: number | undefined | null): string {
  if (hours === undefined || hours === null || Number.isNaN(hours)) return 'N/A'
  if (hours < 1) return `${(hours * 60).toFixed(0)}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  const days = hours / 24
  return `${days.toFixed(1)}d`
}

function formatPercent(pct: number | undefined | null): string {
  if (pct === undefined || pct === null || Number.isNaN(pct)) return 'N/A'
  return `${pct.toFixed(1)}%`
}

function formatEpss(score: number | undefined | null): string {
  if (score === undefined || score === null || Number.isNaN(score)) return 'N/A'
  return `${(score * 100).toFixed(2)}%`
}

// ============================================
// SKELETONS
// ============================================

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

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-60" />
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

// ============================================
// PAGE COMPONENT
// ============================================

export default function ExecutiveSummaryPage() {
  const { currentTenant } = useTenant()
  const [period, setPeriod] = useState<Period>('30')

  const tenantReady = !!currentTenant?.id

  const { data: summary, isLoading: summaryLoading } = useSWR<ExecutiveSummary>(
    tenantReady ? `/api/v1/dashboard/executive-summary?days=${period}` : null,
    get,
    { revalidateOnFocus: false }
  )

  // MTTR is fixed at 90 days for trend stability
  const { data: mttr, isLoading: mttrLoading } = useSWR<MTTRAnalytics>(
    tenantReady ? '/api/v1/dashboard/mttr-analytics?days=90' : null,
    get,
    { revalidateOnFocus: false }
  )

  // Process metrics fixed at 90 days
  const { data: processMetrics, isLoading: processLoading } = useSWR<ProcessMetrics>(
    tenantReady ? '/api/v1/dashboard/process-metrics?days=90' : null,
    get,
    { revalidateOnFocus: false }
  )

  const riskChangeType: 'positive' | 'negative' | 'neutral' = !summary
    ? 'neutral'
    : summary.risk_score_change > 0
      ? 'negative'
      : summary.risk_score_change < 0
        ? 'positive'
        : 'neutral'

  const slaChangeType: 'positive' | 'negative' | 'neutral' = !summary
    ? 'neutral'
    : summary.sla_compliance_pct >= 90
      ? 'positive'
      : summary.sla_compliance_pct >= 70
        ? 'neutral'
        : 'negative'

  const p0ChangeType: 'positive' | 'negative' | 'neutral' = !summary
    ? 'neutral'
    : summary.p0_open === 0
      ? 'positive'
      : summary.p0_open > 5
        ? 'negative'
        : 'neutral'

  return (
    <Main>
      <PageHeader
        title="Executive Summary"
        description="High-level view of risk posture, remediation performance, and process health"
        className="mb-6"
      >
        <div className="flex items-center gap-2 rounded-md border bg-card p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(opt.value)}
              className="h-7 px-3"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      {/* Top stat cards */}
      {summaryLoading ? (
        <StatsRowSkeleton />
      ) : (
        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            title="Risk Score"
            value={summary ? `${summary.risk_score_current.toFixed(1)} / 10` : 'N/A'}
            change={
              summary && summary.risk_score_change !== 0
                ? `${summary.risk_score_change > 0 ? '+' : ''}${summary.risk_score_change.toFixed(1)}`
                : undefined
            }
            changeType={riskChangeType}
            description={summary ? 'vs previous period' : undefined}
            icon={Activity}
          />
          <StatsCard
            title="Findings Resolved"
            value={summary?.findings_resolved_period ?? 0}
            description={summary ? `${summary.findings_new_period} new in period` : undefined}
            changeType={
              summary && summary.findings_resolved_period >= summary.findings_new_period
                ? 'positive'
                : 'negative'
            }
            icon={CheckCircle2}
          />
          <StatsCard
            title="SLA Compliance"
            value={formatPercent(summary?.sla_compliance_pct)}
            description={summary ? `${summary.sla_breached} breached` : undefined}
            changeType={slaChangeType}
            icon={ShieldCheck}
          />
          <StatsCard
            title="P0 Open"
            value={summary?.p0_open ?? 0}
            description={summary ? `${summary.p0_resolved_period} resolved this period` : undefined}
            changeType={p0ChangeType}
            icon={ShieldAlert}
          />
        </section>
      )}

      {/* Secondary metrics */}
      {summary && (
        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">P1 Open</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.p1_open}</div>
              <p className="text-xs text-muted-foreground">
                {summary.p1_resolved_period} resolved this period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Crown Jewels at Risk</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'text-2xl font-bold',
                  summary.crown_jewels_at_risk > 0 && 'text-red-500'
                )}
              >
                {summary.crown_jewels_at_risk}
              </div>
              <p className="text-xs text-muted-foreground">High-value assets exposed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">MTTR Critical</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatHours(summary.mttr_critical_hours)}</div>
              <p className="text-xs text-muted-foreground">Mean time to remediate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">MTTR High</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatHours(summary.mttr_high_hours)}</div>
              <p className="text-xs text-muted-foreground">Mean time to remediate</p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Top Risks Table */}
      {summaryLoading ? (
        <div className="mb-6">
          <TableSkeleton />
        </div>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Top Risks</CardTitle>
            <CardDescription>
              Highest priority findings requiring executive attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary && summary.top_risks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">EPSS</TableHead>
                    <TableHead>KEV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.top_risks.map((risk, idx) => (
                    <TableRow key={`${risk.title}-${idx}`}>
                      <TableCell className="max-w-md truncate font-medium">{risk.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('capitalize', getSeverityBadgeClass(risk.severity))}
                        >
                          {risk.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-mono font-bold',
                            getPriorityClassBadgeClass(risk.priority_class)
                          )}
                        >
                          {risk.priority_class}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {risk.asset_name}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatEpss(risk.epss_score)}
                      </TableCell>
                      <TableCell>
                        {risk.is_in_kev ? (
                          <Badge
                            variant="outline"
                            className="bg-red-500/10 text-red-500 border-red-500/20"
                          >
                            KEV
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <ShieldCheck className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No top risks for the selected period.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MTTR breakdown */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>MTTR by Severity</CardTitle>
            <CardDescription>
              Average remediation time across the last 90 days
              {mttr && mttr.sample_size > 0 ? ` (n=${mttr.sample_size})` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mttrLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : mttr && Object.keys(mttr.by_severity).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(mttr.by_severity).map(([severity, hours]) => (
                  <div
                    key={severity}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <Badge
                      variant="outline"
                      className={cn('capitalize', getSeverityBadgeClass(severity))}
                    >
                      {severity}
                    </Badge>
                    <span className="font-mono text-sm font-medium">{formatHours(hours)}</span>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-medium">Overall</span>
                  <span className="font-mono text-sm font-bold">
                    {formatHours(mttr.overall_hours)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Not enough resolved findings to calculate MTTR.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MTTR by Priority Class</CardTitle>
            <CardDescription>Average remediation time per priority bucket (P0–P3)</CardDescription>
          </CardHeader>
          <CardContent>
            {mttrLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : mttr && Object.keys(mttr.by_priority_class).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(mttr.by_priority_class).map(([priority, hours]) => (
                  <div
                    key={priority}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <Badge
                      variant="outline"
                      className={cn('font-mono font-bold', getPriorityClassBadgeClass(priority))}
                    >
                      {priority}
                    </Badge>
                    <span className="font-mono text-sm font-medium">{formatHours(hours)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No priority class data yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Process Metrics */}
      {processLoading ? (
        <StatsRowSkeleton />
      ) : processMetrics ? (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approval Avg Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatHours(processMetrics.approval_avg_hours)}
              </div>
              <p className="text-xs text-muted-foreground">
                {processMetrics.approval_count} approvals tracked
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Stale Assets</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {processMetrics.stale_assets.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatPercent(processMetrics.stale_assets_pct)} of inventory
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Findings Without Owner</CardTitle>
              <FileWarning className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'text-2xl font-bold',
                  processMetrics.findings_without_owner > 0 && 'text-orange-500'
                )}
              >
                {processMetrics.findings_without_owner.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Need triage assignment</p>
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Time to Assign</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatHours(processMetrics.avg_time_to_assign_hours)}
              </div>
              <p className="text-xs text-muted-foreground">
                Mean time from finding creation to owner assignment
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </Main>
  )
}
