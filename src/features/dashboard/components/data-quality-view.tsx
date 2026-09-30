/**
 * Data Quality — CTEM Discovery data-hygiene scorecard.
 *
 * Prioritisation is only as trustworthy as the inventory under it. This page
 * surfaces the already-computed `GET /api/v1/dashboard/data-quality` metrics
 * against their CTEM targets: is every asset owned (so a fix has an owner), does
 * every finding carry evidence (so it can be actioned), is the inventory fresh
 * (so coverage hasn't silently decayed).
 *
 * Sibling to Program Health (which reports OUTCOMES); this one reports the
 * INPUT hygiene those outcomes depend on. Every number is grounded in the real
 * endpoint — a metric renders "Not measured" only when its source has no value
 * yet, never a fabricated one.
 */

'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState, MetricStrip } from '@/features/shared'
import { useTenant } from '@/context/tenant-provider'
import { usePermissions, Permission } from '@/lib/permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { STATE_BADGE_SOFT, STATE_BAR, type CtemState } from '../lib/ctem-colors'
import { useDataQuality } from '../hooks/use-ctem-dashboard'
import {
  type MetricStatus,
  ownershipState,
  evidenceState,
  freshnessState,
  staleState,
  fmtPct,
  fmtAge,
} from '../lib/data-quality'
import {
  Database,
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

interface QualityMetric {
  id: string
  label: string
  /** One line on what the metric measures. */
  measures: string
  /** Formatted current value, or null for "not yet measured". */
  display: string | null
  /** The CTEM target. */
  target: string
  status: MetricStatus
  /** Optional 0–100 fill for the meter bar (omit for value-only metrics). */
  bar?: number | null
  /** Real data source (the API field). */
  source: string
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

// A value is coloured only when it is a problem; the status pill carries the
// rest of the state (on track / watch / not measured).
function stateTextClass(status: MetricStatus): string {
  if (status === 'pending') return 'text-muted-foreground'
  return status === 'crit' ? 'text-destructive' : ''
}

function statusBadgeClass(status: MetricStatus): string {
  return status === 'pending'
    ? 'bg-muted text-muted-foreground border-border'
    : STATE_BADGE_SOFT[status as CtemState]
}

function barClass(status: MetricStatus): string {
  return status === 'pending' ? 'bg-muted-foreground/40' : STATE_BAR[status as CtemState]
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatusPill({ status }: { status: MetricStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 gap-1 whitespace-nowrap', statusBadgeClass(status))}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  )
}

function MetricCard({ metric }: { metric: QualityMetric }) {
  const hasBar = metric.bar !== undefined && metric.bar !== null
  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
        <CardDescription className="text-xs">{metric.measures}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end">
        {/* Value and status share a row that wraps, so the pill never squeezes
            (or clips) the title at narrow widths. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn('text-2xl font-bold tabular-nums', stateTextClass(metric.status))}>
            {metric.display ?? '—'}
          </span>
          <StatusPill status={metric.status} />
        </div>
        {hasBar && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all', barClass(metric.status))}
              style={{ width: `${Math.min(100, Math.max(0, metric.bar as number))}%` }}
            />
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Target: <span className="font-medium text-foreground">{metric.target}</span>
        </p>
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
      {Array.from({ length: 4 }).map((_, i) => (
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

export function DataQualityView() {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()

  const tenantId = currentTenant?.id ?? null
  const canRead = can(Permission.DashboardRead)

  const { data: q, isLoading } = useDataQuality(tenantId)

  const metrics = useMemo<QualityMetric[]>(() => {
    const owner = q?.asset_ownership_pct
    const evidence = q?.finding_evidence_pct
    const freshHours = q?.median_last_seen_age_hours
    const stale = q?.stale_asset_pct

    return [
      {
        id: 'owner-coverage',
        label: 'Asset owner coverage',
        measures: 'Assets in inventory with an assigned owner',
        display: fmtPct(owner),
        target: '≥ 95%',
        status: ownershipState(owner),
        bar: owner ?? null,
        source: 'data-quality (asset_ownership_pct)',
      },
      {
        id: 'evidence-coverage',
        label: 'Finding evidence coverage',
        measures: 'Findings carrying evidence/context metadata',
        display: fmtPct(evidence),
        target: '≥ 90%',
        status: evidenceState(evidence),
        bar: evidence ?? null,
        source: 'data-quality (finding_evidence_pct)',
      },
      {
        id: 'freshness',
        label: 'Inventory freshness',
        measures: 'Median age of the most recent observation across all assets',
        display: fmtAge(freshHours),
        target: '< 48h',
        status: freshnessState(freshHours),
        source: 'data-quality (median_last_seen_age_hours)',
      },
      {
        id: 'stale-assets',
        label: 'Stale assets',
        measures: 'Assets not re-observed in the last 30 days — should trend down',
        display: fmtPct(stale),
        target: 'Trending down',
        status: staleState(stale),
        bar: stale ?? null,
        source: 'data-quality (stale_asset_pct)',
      },
    ]
  }, [q])

  if (!canRead) {
    return (
      <Main>
        <PageHeader title="Data quality" />
        <EmptyState
          className="mt-5"
          icon={Lock}
          title="You don’t have access to data-quality metrics."
          description="Dashboard read permission is required to view the data-quality scorecard."
        />
      </Main>
    )
  }

  const hasData = !!q
  const dedupPct = fmtPct(q?.deduplication_rate)

  return (
    <Main>
      <PageHeader
        title="Data quality"
        description="Whether the inventory is owned, evidenced and fresh enough to prioritise on — the inputs the rest of the CTEM loop trusts."
      />

      <div className="mt-5">
        {isLoading ? (
          <ScorecardSkeleton />
        ) : !hasData ? (
          <EmptyState
            icon={Database}
            title="No data-quality metrics yet"
            description="Once assets and findings are ingested, the scorecard populates here."
          />
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((m) => (
                <MetricCard key={m.id} metric={m} />
              ))}
            </section>

            {/* Context counts — the denominators behind the rates above. */}
            <section className="mt-5 space-y-3">
              <div>
                <h2 className="text-base font-semibold">Inventory context</h2>
                <p className="text-sm text-muted-foreground">
                  The scope the rates above are measured over.
                </p>
              </div>
              <MetricStrip
                items={[
                  { key: 'assets', label: 'Total assets', value: q?.total_assets ?? 0 },
                  { key: 'findings', label: 'Total findings', value: q?.total_findings ?? 0 },
                  { key: 'dedup', label: 'Dedup merges (of inventory)', value: dedupPct ?? '—' },
                  {
                    key: 'last-seen',
                    label: 'Median last-seen (internet-exposed)',
                    value:
                      q?.median_last_seen_days != null
                        ? `${q.median_last_seen_days.toFixed(1)}d`
                        : '—',
                  },
                ]}
              />
            </section>
          </>
        )}
      </div>
    </Main>
  )
}
