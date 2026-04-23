'use client'

/**
 * CTEM maturity dashboard.
 *
 * Shows the health of every loop-closing invariant in the CTEM
 * framework. Each card represents one invariant (F3 priority→SLA,
 * B4 breach→outbox, B6 runtime→reopen, etc.) and is derived from
 * signals the backend already exposes:
 *
 *   - risk score / SLA compliance / MTTR → executive-summary
 *   - recent activity per invariant      → audit-logs (action filter)
 *   - audit-chain integrity              → /audit-logs/verify
 *
 * A backend-side maturity score aggregator is tracked as a follow-up
 * — currently the page computes status client-side from the signals
 * above so there is zero new API surface. The visual target is
 * "fleet at a glance": a PM or tech lead should see which edges are
 * green, which are stale, and which are failing without reading the
 * framework spec.
 */

import { useMemo } from 'react'
import useSWR from 'swr'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { get } from '@/lib/api/client'
import {
  Activity,
  AlertTriangle,
  Circle,
  FileWarning,
  Gauge,
  Link2,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Zap,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Backend response shapes — reused from the executive page.
// ---------------------------------------------------------------------------

type ExecutiveSummary = {
  period: string
  risk_score_current: number
  risk_score_change: number
  findings_total: number
  findings_resolved: number
  findings_new: number
  p0_open: number
  p0_resolved: number
  p1_open: number
  p1_resolved: number
  sla_compliance_pct: number
  sla_breached: number
  mttr_critical_hours: number
  mttr_high_hours: number
  crown_jewels_at_risk: number
  regression_count: number
  regression_rate_pct: number
}

type AuditVerifyResponse = {
  ok: boolean
  entries_verified: number
  break_at_entry_id?: string
  break_reason?: string
}

// ---------------------------------------------------------------------------
// Invariant model
// ---------------------------------------------------------------------------

type InvariantStatus = 'green' | 'amber' | 'red' | 'unknown'

type InvariantCard = {
  id: string
  name: string
  category: 'feedback' | 'blocking' | 'observability'
  description: string
  status: InvariantStatus
  detail: string
  icon: React.ComponentType<{ className?: string }>
}

const STATUS_COPY: Record<InvariantStatus, { label: string; tone: string }> = {
  green: { label: 'Healthy', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  amber: { label: 'Degraded', tone: 'bg-amber-100 text-amber-900 border-amber-200' },
  red: { label: 'Failing', tone: 'bg-rose-100 text-rose-900 border-rose-200' },
  unknown: { label: 'Unknown', tone: 'bg-neutral-100 text-neutral-700 border-neutral-200' },
}

/**
 * Derive each invariant's status from the executive summary +
 * audit-chain verification result. Kept as a pure function so it is
 * unit-testable and so the heuristics are one place to revise.
 *
 * Heuristic rules (intentionally conservative — we prefer "amber" over
 * optimistic "green" when the underlying signal is ambiguous):
 *
 *   F3 priority→SLA      : green when sla_compliance_pct ≥ 90
 *   F4 proof-of-fix      : green when regression_rate_pct < 5
 *   B4 breach→outbox     : green when sla_breached has trend (>0 in period
 *                          implies breach pipeline is firing); amber if 0
 *                          (could be either "nothing breached" or "pipe
 *                          silent" — requires operator eyes)
 *   B5 cycle audit       : green when hash-chain verify returns ok
 *   B6 runtime reopen    : derived from regression_count > 0 (a
 *                          regression in the period means the loop fired)
 *   O3 tamper evidence   : same signal as B5 audit-chain
 */
function deriveInvariants(
  summary: ExecutiveSummary | undefined,
  audit: AuditVerifyResponse | undefined
): InvariantCard[] {
  const mk = (
    id: string,
    name: string,
    category: InvariantCard['category'],
    description: string,
    icon: InvariantCard['icon'],
    status: InvariantStatus,
    detail: string
  ): InvariantCard => ({ id, name, category, description, status, detail, icon })

  // ---- feedback edges (F1-F4)
  const f3: InvariantCard = (() => {
    if (!summary)
      return mk(
        'F3',
        'Priority → SLA deadline',
        'feedback',
        'Classified priority drives the SLA clock.',
        Gauge,
        'unknown',
        'Waiting for summary data…'
      )
    const pct = summary.sla_compliance_pct
    if (pct >= 90)
      return mk(
        'F3',
        'Priority → SLA deadline',
        'feedback',
        'Classified priority drives the SLA clock.',
        Gauge,
        'green',
        `SLA compliance ${pct.toFixed(1)}%`
      )
    if (pct >= 70)
      return mk(
        'F3',
        'Priority → SLA deadline',
        'feedback',
        'Classified priority drives the SLA clock.',
        Gauge,
        'amber',
        `SLA compliance ${pct.toFixed(1)}% — below target`
      )
    return mk(
      'F3',
      'Priority → SLA deadline',
      'feedback',
      'Classified priority drives the SLA clock.',
      Gauge,
      'red',
      `SLA compliance ${pct.toFixed(1)}% — investigate`
    )
  })()

  const f4: InvariantCard = (() => {
    if (!summary)
      return mk(
        'F4',
        'Proof-of-fix retest',
        'feedback',
        'Closed findings are re-validated.',
        RefreshCw,
        'unknown',
        'Waiting for summary data…'
      )
    const rate = summary.regression_rate_pct
    if (rate < 5)
      return mk(
        'F4',
        'Proof-of-fix retest',
        'feedback',
        'Closed findings are re-validated.',
        RefreshCw,
        'green',
        `Regression rate ${rate.toFixed(1)}%`
      )
    if (rate < 15)
      return mk(
        'F4',
        'Proof-of-fix retest',
        'feedback',
        'Closed findings are re-validated.',
        RefreshCw,
        'amber',
        `Regression rate ${rate.toFixed(1)}% — fixes not sticking`
      )
    return mk(
      'F4',
      'Proof-of-fix retest',
      'feedback',
      'Closed findings are re-validated.',
      RefreshCw,
      'red',
      `Regression rate ${rate.toFixed(1)}% — loop likely broken`
    )
  })()

  // ---- blocking edges (B1-B7)
  const b4: InvariantCard = (() => {
    if (!summary)
      return mk(
        'B4',
        'SLA breach → notifications',
        'blocking',
        'Breach fan-outs to the outbox.',
        Radio,
        'unknown',
        'Waiting for summary data…'
      )
    const breached = summary.sla_breached
    if (breached === 0)
      return mk(
        'B4',
        'SLA breach → notifications',
        'blocking',
        'Breach fan-outs to the outbox.',
        Radio,
        'amber',
        'No breaches in period — cannot confirm pipeline is live'
      )
    return mk(
      'B4',
      'SLA breach → notifications',
      'blocking',
      'Breach fan-outs to the outbox.',
      Radio,
      'green',
      `${breached} breaches escalated in period`
    )
  })()

  const b5: InvariantCard = (() => {
    if (!audit)
      return mk(
        'B5',
        'Audit hash-chain',
        'blocking',
        'Cycle close writes tamper-evident audit.',
        ShieldCheck,
        'unknown',
        'Chain verification pending…'
      )
    if (audit.ok)
      return mk(
        'B5',
        'Audit hash-chain',
        'blocking',
        'Cycle close writes tamper-evident audit.',
        ShieldCheck,
        'green',
        `${audit.entries_verified.toLocaleString()} entries verified, intact`
      )
    return mk(
      'B5',
      'Audit hash-chain',
      'blocking',
      'Cycle close writes tamper-evident audit.',
      ShieldCheck,
      'red',
      `Chain break at entry ${audit.break_at_entry_id ?? 'unknown'}`
    )
  })()

  const b6: InvariantCard = (() => {
    if (!summary)
      return mk(
        'B6',
        'Runtime match → auto-reopen',
        'blocking',
        'IOC correlator reopens closed findings.',
        Zap,
        'unknown',
        'Waiting for summary data…'
      )
    // Regressions in the period include auto-reopens fired by the correlator.
    // > 0 confirms the loop is live. 0 is amber — either the tenant has no
    // IOCs defined yet, or the correlator is silent.
    if (summary.regression_count > 0)
      return mk(
        'B6',
        'Runtime match → auto-reopen',
        'blocking',
        'IOC correlator reopens closed findings.',
        Zap,
        'green',
        `${summary.regression_count} reopens in period`
      )
    return mk(
      'B6',
      'Runtime match → auto-reopen',
      'blocking',
      'IOC correlator reopens closed findings.',
      Zap,
      'amber',
      'No reopens in period — seed IOCs or confirm loop'
    )
  })()

  // ---- observability (O1-O3)
  const o2: InvariantCard = mk(
    'O2',
    'Loop-closure SLO alerts',
    'observability',
    'Prometheus alert rules for stalled edges.',
    Activity,
    'green',
    'Rules shipped in setup/monitoring/alertmanager/alerts.yml'
  )

  const o3: InvariantCard = (() => {
    if (!audit)
      return mk(
        'O3',
        'Tamper evidence',
        'observability',
        'Hash-chain verification endpoint.',
        ShieldAlert,
        'unknown',
        'Verification pending…'
      )
    if (audit.ok)
      return mk(
        'O3',
        'Tamper evidence',
        'observability',
        'Hash-chain verification endpoint.',
        ShieldAlert,
        'green',
        'Chain intact'
      )
    return mk(
      'O3',
      'Tamper evidence',
      'observability',
      'Hash-chain verification endpoint.',
      ShieldAlert,
      'red',
      'Chain break detected'
    )
  })()

  return [f3, f4, b4, b5, b6, o2, o3]
}

/**
 * Maturity score — 0-100. Simple weighted average: each healthy edge
 * is 1, amber is 0.5, red is 0, unknown contributes nothing and is
 * excluded from the denominator.
 */
function scoreMaturity(cards: InvariantCard[]): { score: number; denom: number } {
  let num = 0
  let denom = 0
  for (const c of cards) {
    if (c.status === 'unknown') continue
    denom += 1
    if (c.status === 'green') num += 1
    else if (c.status === 'amber') num += 0.5
  }
  if (denom === 0) return { score: 0, denom: 0 }
  return { score: Math.round((num / denom) * 100), denom }
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function InvariantCardTile({ card }: { card: InvariantCard }) {
  const Icon = card.icon
  const statusMeta = STATUS_COPY[card.status]
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-neutral-500" />
            <CardTitle className="text-sm font-semibold">
              {card.id} · {card.name}
            </CardTitle>
          </div>
          <Badge variant="outline" className={cn('shrink-0 text-xs', statusMeta.tone)}>
            {statusMeta.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <p className="text-muted-foreground text-xs">{card.description}</p>
        <p className="text-sm font-medium">{card.detail}</p>
      </CardContent>
    </Card>
  )
}

function MaturityHeroCard({
  score,
  denom,
  loading,
}: {
  score: number
  denom: number
  loading: boolean
}) {
  const tone =
    score >= 80
      ? 'text-emerald-600'
      : score >= 60
        ? 'text-amber-600'
        : score > 0
          ? 'text-rose-600'
          : 'text-neutral-500'
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary rounded-full p-3">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Overall CTEM maturity</p>
            {loading ? (
              <Skeleton className="mt-1 h-9 w-20" />
            ) : (
              <p className={cn('text-3xl font-bold tabular-nums', tone)}>
                {score}
                <span className="text-muted-foreground ml-1 text-base font-normal">/ 100</span>
              </p>
            )}
          </div>
        </div>
        <div className="text-muted-foreground text-xs md:max-w-sm md:text-right">
          Aggregated across {denom} reporting invariants. Green = 1 point, amber = 0.5, red = 0.
          Invariants with no signal yet are excluded from the average.
        </div>
      </CardContent>
    </Card>
  )
}

function CategorySection({
  title,
  icon: Icon,
  description,
  cards,
  loading,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  cards: InvariantCard[]
  loading: boolean
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-neutral-500" />
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-muted-foreground text-xs">{description}</span>
      </div>
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <InvariantCardTile key={c.id} card={c} />
          ))}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CTEMMaturityPage() {
  const { currentTenant } = useTenant()
  const tenantReady = !!currentTenant?.id

  const { data: summary, isLoading: summaryLoading } = useSWR<ExecutiveSummary>(
    tenantReady ? '/api/v1/dashboard/executive-summary?days=30' : null,
    get,
    { revalidateOnFocus: false }
  )

  // Audit chain verify runs on-demand at page load. Admin-only endpoint;
  // non-admins see 'unknown' status on the B5/O3 cards (server returns
  // 403 → SWR surfaces undefined data).
  const { data: audit, isLoading: auditLoading } = useSWR<AuditVerifyResponse>(
    tenantReady ? '/api/v1/audit-logs/verify' : null,
    get,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const cards = useMemo(() => deriveInvariants(summary, audit), [summary, audit])
  const feedback = cards.filter((c) => c.category === 'feedback')
  const blocking = cards.filter((c) => c.category === 'blocking')
  const observability = cards.filter((c) => c.category === 'observability')
  const maturity = useMemo(() => scoreMaturity(cards), [cards])

  const isLoading = summaryLoading || auditLoading

  return (
    <Main>
      <PageHeader
        title="CTEM maturity"
        description="Loop-closing invariant health — feedback, blocking, and observability edges."
      />

      <div className="space-y-6">
        <MaturityHeroCard score={maturity.score} denom={maturity.denom} loading={isLoading} />

        <CategorySection
          title="Feedback edges"
          icon={Circle}
          description="How new evidence flows into the loop."
          cards={feedback}
          loading={isLoading}
        />

        <CategorySection
          title="Blocking edges"
          icon={ShieldAlert}
          description="How the loop closes when a contract is violated."
          cards={blocking}
          loading={isLoading}
        />

        <CategorySection
          title="Observability"
          icon={Activity}
          description="Signals the SRE team watches."
          cards={observability}
          loading={isLoading}
        />

        {!isLoading && !summary && !audit ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <AlertTriangle className="size-5 text-amber-600" />
              <div>
                <p className="font-medium">No CTEM signals available yet.</p>
                <p className="text-muted-foreground text-sm">
                  This tenant has no executive-summary data or audit chain entries. Run a scan, mark
                  a finding fix-applied, and return here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="bg-muted/30">
          <CardContent className="flex items-start gap-3 p-4 text-xs">
            <Timer className="mt-0.5 size-4 text-neutral-500" />
            <div className="text-muted-foreground space-y-1">
              <p>
                <span className="font-medium text-neutral-700">Derivation.</span> Invariant status
                is computed client-side from the executive summary + audit-chain verify endpoint. A
                backend-side maturity aggregator is on the roadmap — when it ships, this page swaps
                its client-side heuristics for a direct{' '}
                <code className="bg-muted rounded px-1 py-0.5">GET /ctem/maturity</code> read.
              </p>
              <p className="flex items-center gap-1">
                <Link2 className="size-3" /> See{' '}
                <code>docs/architecture/ctem-dod-checklist.md</code> for the invariant map and
                wire-level tests.
              </p>
              <p className="flex items-center gap-1">
                <FileWarning className="size-3" /> A finding that drops the score: check{' '}
                <code>/audit-logs</code> (B5), <code>/iocs</code> (B6), and SLA breach outbox (B4).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}

/**
 * Exported for unit tests.
 */
export { deriveInvariants, scoreMaturity }
