/**
 * Program Health — CTEM-playbook OUTCOME scorecard.
 *
 * Reports the metrics the ctem.org getting-started guide tells a program to
 * lead with (did exposure go down, did the urgent things get fixed in time, is
 * the inventory owned) — deliberately separated from the activity/volume
 * numbers (total findings / scans / tickets) that measure motion, not value.
 *
 * Every metric is grounded in a real dashboard endpoint. Where the guide asks
 * for something OpenCTEM does not yet measure (validation downgrade % — the
 * validation executor is deferred) the card renders "Not yet measured" rather
 * than a fabricated number.
 *
 * P0 ↔ P1 note: the guide numbers priority P1–P4; OpenCTEM numbers P0–P3. The
 * guide's most-urgent class ("P1") maps onto OpenCTEM's **P0** here.
 */

'use client'

import { useMemo, useState } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState } from '@/features/shared'
import { useTenant } from '@/context/tenant-provider'
import { usePermissions, Permission } from '@/lib/permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from '@/components/charts'
import { SEVERITY_CHART_COLORS } from '@/lib/severity-colors'
import {
  CHART_TOOLTIP_PROPS,
  STATE_TEXT,
  STATE_BADGE_SOFT,
  type CtemState,
} from '../lib/ctem-colors'
import {
  useExecutiveSummary,
  useMttrAnalytics,
  useDataQuality,
  useRiskTrend,
} from '../hooks/use-ctem-dashboard'
import {
  type MetricStatus,
  remediationCompletionPct,
  remediationCompletionState,
  hoursToDays,
  remediationTimeState,
  ownerCoverageState,
  reopenRateState,
  slaComplianceState,
  exposureTrendDelta,
  exposureTrendState,
} from '../lib/program-health'
import {
  Target,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Lock,
  type LucideIcon,
} from 'lucide-react'

// ============================================
// TYPES / CONSTANTS
// ============================================

type Period = '30' | '90' | '365'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '365', label: '1y' },
]

interface OutcomeMetric {
  id: string
  label: string
  /** What the metric actually measures (one line). */
  measures: string
  /** Formatted current value, or null for "not yet measured". */
  display: string | null
  /** The guide's target. */
  target: string
  status: MetricStatus
  /** Real data source, or the deferral reason for a pending metric. */
  source: string
  /** Optional extra context (e.g. the P0↔P1 mapping). */
  hint?: string
}

const STATUS_META: Record<MetricStatus, { label: string; icon: LucideIcon }> = {
  good: { label: 'On track', icon: CheckCircle2 },
  warn: { label: 'Watch', icon: AlertTriangle },
  crit: { label: 'Off track', icon: XCircle },
  pending: { label: 'Not measured', icon: MinusCircle },
}

// ============================================
// HELPERS
// ============================================

function fmtPct(v: number | null | undefined): string | null {
  if (v === null || v === undefined || Number.isNaN(v)) return null
  return `${v.toFixed(1)}%`
}

function fmtDays(v: number | null): string | null {
  if (v === null) return null
  return `${v.toFixed(1)}d`
}

function stateTextClass(status: MetricStatus): string {
  return status === 'pending' ? 'text-muted-foreground' : STATE_TEXT[status as CtemState]
}

function statusBadgeClass(status: MetricStatus): string {
  return status === 'pending'
    ? 'bg-muted text-muted-foreground border-border'
    : STATE_BADGE_SOFT[status as CtemState]
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatusPill({ status }: { status: MetricStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={cn('gap-1', statusBadgeClass(status))}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  )
}

function MetricCard({ metric }: { metric: OutcomeMetric }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
          <CardDescription className="mt-1 text-xs">{metric.measures}</CardDescription>
        </div>
        <StatusPill status={metric.status} />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end">
        <div className={cn('text-3xl font-bold tabular-nums', stateTextClass(metric.status))}>
          {metric.display ?? '—'}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Target: <span className="font-medium text-foreground">{metric.target}</span>
        </p>
        {metric.hint && <p className="mt-2 text-[11px] text-muted-foreground">{metric.hint}</p>}
        <p className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
          {metric.status === 'pending' ? 'Source: ' : 'From: '}
          {metric.source}
        </p>
      </CardContent>
    </Card>
  )
}

function ScorecardSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-8 w-20" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

// ============================================
// PAGE
// ============================================

export function ProgramHealthView() {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const [period, setPeriod] = useState<Period>('90')

  const tenantId = currentTenant?.id ?? null
  const canRead = can(Permission.DashboardRead)

  const { data: summary, isLoading: summaryLoading } = useExecutiveSummary(tenantId)
  const { data: mttr, isLoading: mttrLoading } = useMttrAnalytics(tenantId)
  const { data: quality, isLoading: qualityLoading } = useDataQuality(tenantId)
  const { data: riskTrend, isLoading: trendLoading } = useRiskTrend(tenantId, Number(period))

  const loading = summaryLoading || mttrLoading || qualityLoading

  const openSeries = useMemo(() => (riskTrend ?? []).map((p) => p.findings_open), [riskTrend])
  const trendDelta = exposureTrendDelta(openSeries)

  const metrics = useMemo<OutcomeMetric[]>(() => {
    // 1. Most-urgent-class remediation completion (guide "P1 remediated/total").
    const completion = summary
      ? remediationCompletionPct(summary.p0_open, summary.p0_resolved_period)
      : null
    // 2. Time discovery → remediation for the urgent class (MTTR proxy).
    const p0Days = mttr ? hoursToDays(mttr.by_priority_class?.P0) : null
    // 4/5. Regression (re-open / rediscovery).
    const reopenPct = summary?.regression_rate_pct
    const rediscovered = summary?.regression_count

    return [
      {
        id: 'remediation-completion',
        label: 'P1 remediation completion',
        measures: 'Urgent-class findings remediated ÷ total in the period',
        display: fmtPct(completion),
        target: '> 90%',
        status: remediationCompletionState(completion),
        source: 'executive-summary (p0_resolved_period ÷ p0_open + p0_resolved_period)',
        hint: 'OpenCTEM P0 = the guide’s P1 (most-urgent class).',
      },
      {
        id: 'remediation-time',
        label: 'Time to remediate (P1)',
        measures: 'Discovery → remediation for the urgent class',
        display: fmtDays(p0Days),
        target: '< 14 days',
        status: remediationTimeState(p0Days),
        source: 'mttr-analytics by_priority_class.P0 (mean/MTTR proxy for median)',
        hint: 'Proxy: MTTR (mean), not true median — median not yet exposed by the API.',
      },
      {
        id: 'owner-coverage',
        label: 'Asset owner coverage',
        measures: 'In-scope assets with an assigned owner',
        display: fmtPct(quality?.asset_ownership_pct),
        target: '100%',
        status: ownerCoverageState(quality?.asset_ownership_pct),
        source: 'data-quality (asset_ownership_pct)',
      },
      {
        id: 'reopen-rate',
        label: 'Remediation re-open rate',
        measures: 'Resolved findings that regressed / reopened',
        display: fmtPct(reopenPct),
        target: '< 20%',
        status: reopenRateState(reopenPct),
        source: 'executive-summary (regression_rate_pct)',
      },
      {
        id: 'rediscovered',
        label: 'P1s rediscovered in scope',
        measures: 'Urgent findings that came back after being fixed',
        display: rediscovered === undefined ? null : String(rediscovered),
        target: '→ 0',
        status:
          rediscovered === undefined
            ? 'pending'
            : rediscovered >= 4
              ? 'crit'
              : rediscovered >= 1
                ? 'warn'
                : 'good',
        source: 'executive-summary (regression_count — the 000199 regression trigger)',
      },
      {
        id: 'sla-compliance',
        label: 'SLA compliance',
        measures: 'Findings remediated within their SLA window',
        display: fmtPct(summary?.sla_compliance_pct),
        target: '≥ 90%',
        status: slaComplianceState(summary?.sla_compliance_pct),
        source: 'executive-summary (sla_compliance_pct)',
      },
      {
        id: 'exposure-trend',
        label: 'Exposure-count trend',
        measures: `Open findings over ${period === '365' ? '1y' : `${period}d`} — should fall after ramp-up`,
        display: trendDelta === null ? null : `${trendDelta > 0 ? '+' : ''}${trendDelta} open`,
        target: 'Trending down',
        status: exposureTrendState(trendDelta),
        source: 'risk-trend (findings_open, first → last)',
      },
      {
        id: 'validation-downgrade',
        label: 'Validation downgrade %',
        measures: 'Findings de-prioritised after validation proved them non-exploitable',
        display: null,
        target: '25–40%',
        status: 'pending',
        source:
          'Not yet measured — the validation executor is deferred, so no downgrade signal exists. Auto-verify is shallow; validation/coverage measures coverage, not downgrade.',
      },
    ]
  }, [summary, mttr, quality, period, trendDelta])

  if (!canRead) {
    return (
      <Main>
        <PageHeader title="Program Health" className="mb-6" />
        <EmptyState
          icon={Lock}
          title="You don’t have access to program metrics."
          description="Dashboard read permission is required to view Program Health."
        />
      </Main>
    )
  }

  const hasAnyData = !!summary || !!mttr || !!quality

  return (
    <Main>
      <PageHeader
        title="Program Health"
        description="CTEM-playbook outcome metrics — is exposure actually going down and getting fixed in time?"
        className="mb-4"
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

      {/* Outcome-vs-activity framing (from the ctem.org guide). */}
      <Card className="mb-6 border-dashed">
        <CardContent className="flex items-start gap-3 py-4">
          <Target className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Lead with outcomes, not volume.</span>{' '}
            Total findings, scans and tickets measure <em>activity</em> — motion, not value. The
            scorecard below tracks whether risk is being retired: urgent things fixed in time,
            inventory owned, exposure falling, fixes that stay fixed. Volume ≠ value.
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <ScorecardSkeleton />
      ) : !hasAnyData ? (
        <EmptyState
          icon={ShieldCheck}
          title="No program data yet."
          description="Once findings are ingested and remediation begins, outcome metrics populate here."
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <MetricCard key={m.id} metric={m} />
            ))}
          </section>

          {/* Exposure-count trend chart (the guide's day-60 down-slope). */}
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Exposure over time</CardTitle>
              <CardDescription className="text-xs">
                Open findings across the selected window — a healthy program bends this down.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : openSeries.length > 1 ? (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={riskTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="exposureFill" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={SEVERITY_CHART_COLORS.info}
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="95%"
                            stopColor={SEVERITY_CHART_COLORS.info}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                        allowDecimals={false}
                      />
                      <Tooltip {...CHART_TOOLTIP_PROPS} />
                      <Area
                        type="monotone"
                        dataKey="findings_open"
                        name="Open findings"
                        stroke={SEVERITY_CHART_COLORS.info}
                        strokeWidth={2}
                        fill="url(#exposureFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Not enough trend history yet — needs at least two risk snapshots.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Activity metrics — deliberately de-emphasised: context, not goals. */}
          {summary && (
            <Card className="mt-6 bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Activity metrics (context, not goals)
                </CardTitle>
                <CardDescription className="text-xs">
                  Volume numbers — useful for context, but not what the program is judged on.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-semibold text-muted-foreground tabular-nums">
                    {summary.findings_total.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Total open findings</p>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-muted-foreground tabular-nums">
                    {(summary.findings_new_period ?? 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">New this period</p>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-muted-foreground tabular-nums">
                    {summary.findings_resolved_period.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Resolved this period</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Main>
  )
}
