'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  StatsCard,
  EmptyState,
  DataTable,
  SeverityBadge,
  formatRiskScore,
} from '@/features/shared'
import { PriorityClassBadge } from '@/features/findings/components/priority-class-badge'
import type { PriorityClass } from '@/features/findings/types/finding.types'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { get } from '@/lib/api/client'
import type { Severity } from '@/features/shared/types'
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
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
]

const PRIORITY_CLASSES = ['P0', 'P1', 'P2', 'P3']

// ============================================
// HELPERS
// ============================================

function PriorityChip({ value }: { value: string }) {
  const pc = value.toUpperCase()
  if (!PRIORITY_CLASSES.includes(pc)) return <Badge variant="outline">{value}</Badge>
  return <PriorityClassBadge priorityClass={pc as PriorityClass} />
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

function StatsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
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

const TOP_RISK_COLUMNS: ColumnDef<TopRisk>[] = [
  {
    accessorKey: 'title',
    enableSorting: false,
    header: 'Title',
    cell: ({ row }) => (
      <span className="block max-w-md truncate text-sm font-medium">{row.original.title}</span>
    ),
  },
  {
    accessorKey: 'severity',
    enableSorting: false,
    header: 'Severity',
    cell: ({ row }) => <SeverityBadge severity={row.original.severity.toLowerCase() as Severity} />,
  },
  {
    accessorKey: 'priority_class',
    enableSorting: false,
    header: 'Priority',
    cell: ({ row }) => <PriorityChip value={row.original.priority_class} />,
  },
  {
    accessorKey: 'asset_name',
    enableSorting: false,
    header: 'Asset',
    cell: ({ row }) => (
      <span className="block max-w-xs truncate text-sm text-muted-foreground">
        {row.original.asset_name}
      </span>
    ),
  },
  {
    accessorKey: 'epss_score',
    enableSorting: false,
    header: 'EPSS',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">{formatEpss(row.original.epss_score)}</span>
    ),
  },
  {
    accessorKey: 'is_in_kev',
    enableSorting: false,
    header: 'KEV',
    cell: ({ row }) =>
      row.original.is_in_kev ? (
        <Badge variant="destructive">KEV</Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
]

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

  return (
    <Main>
      <PageHeader
        title="Executive summary"
        description="Risk posture, remediation performance and process health at a glance."
      >
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="h-9 w-[150px]" aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Headline numbers */}
      <div className="mt-5">
        {summaryLoading ? (
          <StatsRowSkeleton count={8} />
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Risk score"
              value={summary ? formatRiskScore(summary.risk_score_current) : 'N/A'}
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
              title="Findings resolved"
              value={summary?.findings_resolved_period ?? 0}
              description={summary ? `${summary.findings_new_period} new in period` : undefined}
              icon={CheckCircle2}
            />
            <StatsCard
              title="SLA compliance"
              value={formatPercent(summary?.sla_compliance_pct)}
              description={summary ? `${summary.sla_breached} breached` : undefined}
              icon={ShieldCheck}
            />
            <StatsCard
              title="P0 open"
              value={summary?.p0_open ?? 0}
              valueClassName={summary && summary.p0_open > 0 ? 'text-destructive' : undefined}
              description={
                summary ? `${summary.p0_resolved_period} resolved this period` : undefined
              }
              icon={ShieldAlert}
            />
            {summary && (
              <>
                <StatsCard
                  title="P1 open"
                  value={summary.p1_open}
                  description={`${summary.p1_resolved_period} resolved this period`}
                  icon={AlertTriangle}
                />
                <StatsCard
                  title="Crown jewels at risk"
                  value={summary.crown_jewels_at_risk}
                  valueClassName={summary.crown_jewels_at_risk > 0 ? 'text-destructive' : undefined}
                  description="High-value assets exposed"
                  icon={Target}
                />
                <StatsCard
                  title="MTTR critical"
                  value={formatHours(summary.mttr_critical_hours)}
                  description="Mean time to remediate"
                  icon={Timer}
                />
                <StatsCard
                  title="MTTR high"
                  value={formatHours(summary.mttr_high_hours)}
                  description="Mean time to remediate"
                  icon={Clock}
                />
              </>
            )}
          </section>
        )}
      </div>

      {/* Top risks */}
      <section className="mt-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold">Top risks</h2>
          <p className="text-sm text-muted-foreground">
            Highest-priority findings that need executive attention.
          </p>
        </div>
        {summaryLoading ? (
          <div className="space-y-px overflow-hidden rounded-xl border">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-11 w-full rounded-none" />
            ))}
          </div>
        ) : summary && summary.top_risks.length > 0 ? (
          <DataTable
            columns={TOP_RISK_COLUMNS}
            data={summary.top_risks}
            showSearch={false}
            showColumnToggle={false}
            showPagination={false}
            pageSize={summary.top_risks.length}
            getRowId={(r) => r.title}
          />
        ) : (
          <EmptyState icon={ShieldCheck} title="No top risks for the selected period" />
        )}
      </section>

      {/* MTTR breakdown */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>MTTR by severity</CardTitle>
            <CardDescription>
              Average remediation time over the last 90 days
              {mttr && mttr.sample_size > 0 ? ` (n=${mttr.sample_size})` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mttrLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : mttr && Object.keys(mttr.by_severity).length > 0 ? (
              <div className="divide-y">
                {Object.entries(mttr.by_severity).map(([severity, hours]) => (
                  <div key={severity} className="flex items-center justify-between py-2.5">
                    <SeverityBadge severity={severity.toLowerCase() as Severity} />
                    <span className="text-sm font-medium tabular-nums">{formatHours(hours)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium">Overall</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatHours(mttr.overall_hours)}
                  </span>
                </div>
              </div>
            ) : (
              <EmptyState
                card={false}
                className="py-8"
                icon={Timer}
                title="Not enough data yet"
                description="MTTR appears once enough findings have been resolved."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MTTR by priority class</CardTitle>
            <CardDescription>Average remediation time per priority class (P0–P3)</CardDescription>
          </CardHeader>
          <CardContent>
            {mttrLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : mttr && Object.keys(mttr.by_priority_class).length > 0 ? (
              <div className="divide-y">
                {Object.entries(mttr.by_priority_class).map(([priority, hours]) => (
                  <div key={priority} className="flex items-center justify-between py-2.5">
                    <PriorityChip value={priority} />
                    <span className="text-sm font-medium tabular-nums">{formatHours(hours)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                card={false}
                className="py-8"
                icon={Timer}
                title="No priority class data yet"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Process metrics */}
      <section className="mt-5 space-y-3">
        <h2 className="text-base font-semibold">Process health</h2>
        {processLoading ? (
          <StatsRowSkeleton />
        ) : processMetrics ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Approval avg time"
              value={formatHours(processMetrics.approval_avg_hours)}
              description={`${processMetrics.approval_count} approvals tracked`}
              icon={Clock}
            />
            <StatsCard
              title="Stale assets"
              value={processMetrics.stale_assets.toLocaleString()}
              description={`${formatPercent(processMetrics.stale_assets_pct)} of inventory`}
              icon={CalendarClock}
            />
            <StatsCard
              title="Findings without owner"
              value={processMetrics.findings_without_owner.toLocaleString()}
              valueClassName={
                processMetrics.findings_without_owner > 0 ? 'text-destructive' : undefined
              }
              description="Need triage assignment"
              icon={FileWarning}
            />
            <StatsCard
              title="Avg time to assign"
              value={formatHours(processMetrics.avg_time_to_assign_hours)}
              description="From finding creation to owner assignment"
              icon={Users}
            />
          </div>
        ) : (
          <EmptyState icon={Users} title="No process metrics yet" />
        )}
      </section>
    </Main>
  )
}
