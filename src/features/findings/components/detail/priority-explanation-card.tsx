'use client'

/**
 * "Why this priority" panel.
 *
 * Surfaces the read-only priority explanation the backend already computes
 * (GET /api/v1/findings/{id}/priority-explanation) — the P-class plus the
 * contributing factors (reachability, EPSS, KEV, asset criticality,
 * compensating controls). Read-only.
 *
 * Degrades gracefully: skeleton while loading, and nothing at all when the
 * endpoint has no explanation (404 / unwired) so a finding without one just
 * omits the section.
 */

import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Gavel, HelpCircle } from 'lucide-react'
import { PriorityClassBadge } from '../priority-class-badge'
import {
  useFindingPriorityExplanation,
  type PriorityExplanation,
  type PriorityScoreBreakdown,
} from '../../api/use-finding-priority-explanation'
import { PRIORITY_CLASS_CONFIG, type PriorityClass } from '../../types'

interface PriorityExplanationCardProps {
  findingId: string
  /** 'page' = larger h3 heading (detail page); 'drawer' = compact h4. */
  variant?: 'page' | 'drawer'
}

const PRIORITY_CLASSES: readonly string[] = ['P0', 'P1', 'P2', 'P3']

function isPriorityClass(value: string): value is PriorityClass {
  return PRIORITY_CLASSES.includes(value)
}

/** Build the human-readable contributing-factor chips from the raw factors. */
function factorChips(exp: PriorityExplanation): { key: string; label: string; strong: boolean }[] {
  const f = exp.factors
  const chips: { key: string; label: string; strong: boolean }[] = []

  if (f.is_in_kev) chips.push({ key: 'kev', label: 'Known exploited (KEV)', strong: true })
  if (f.on_open_threat_path)
    chips.push({ key: 'threat-path', label: 'On open attack path', strong: true })
  if (f.is_internet_accessible)
    chips.push({ key: 'internet', label: 'Internet-accessible', strong: true })
  else if (f.is_reachable || f.reachable)
    chips.push({ key: 'reachable', label: 'Reachable', strong: true })
  else if (f.is_network_accessible)
    chips.push({ key: 'network', label: 'Network-accessible', strong: false })

  if (f.reachable_from_count > 0)
    chips.push({
      key: 'reach-count',
      label: `Reachable from ${f.reachable_from_count} entry point${f.reachable_from_count === 1 ? '' : 's'}`,
      strong: false,
    })

  if (typeof f.epss_score === 'number')
    chips.push({
      key: 'epss',
      label: `EPSS ${(f.epss_score * 100).toFixed(1)}%`,
      strong: f.epss_score >= 0.5,
    })

  if (f.asset_criticality)
    chips.push({
      key: 'asset-crit',
      label: `${f.asset_criticality} asset`,
      strong: f.critical_asset,
    })
  if (f.asset_is_crown_jewel) chips.push({ key: 'crown', label: 'Crown-jewel asset', strong: true })
  if (f.asset_exposure)
    chips.push({ key: 'exposure', label: `${f.asset_exposure} exposure`, strong: false })

  if (f.is_protected && f.control_reduction_pct > 0)
    chips.push({
      key: 'control',
      label: `Compensating controls -${Math.round(f.control_reduction_pct)}%`,
      strong: false,
    })

  return chips
}

/** One labeled 0-5 sub-score row with a compact meter. */
function SubScoreRow({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(5, value))
  return (
    <div className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <Progress value={(clamped / 5) * 100} className="h-1.5" />
      <span className="text-right text-xs tabular-nums">{clamped.toFixed(1)}</span>
    </div>
  )
}

/**
 * Transparent composite score (ctem.org prioritization model). Read-only: it
 * EXPLAINS the class above, it does not decide it — the P0-P3 cascade stays
 * authoritative. Shown only when the backend supplies the breakdown.
 */
function ScoreBreakdown({ breakdown }: { breakdown: PriorityScoreBreakdown }) {
  const reductionPct = Math.round(breakdown.control_reduction * 100)
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium">Priority score</span>
        <span className="text-sm font-semibold tabular-nums">
          {breakdown.score.toFixed(1)}
          <span className="text-muted-foreground ml-0.5 text-xs font-normal">/ 15</span>
        </span>
      </div>
      <div className="space-y-1.5">
        <SubScoreRow label="Impact" value={breakdown.impact} />
        <SubScoreRow label="Likelihood" value={breakdown.likelihood} />
        <SubScoreRow label="Exposure" value={breakdown.exposure} />
      </div>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        (Impact + Likelihood + Exposure)
        {reductionPct > 0 ? ` × (1 − ${reductionPct}% controls)` : ''} · sub-scores 0–5. Explains
        the class, does not change it.
      </p>
    </div>
  )
}

export function PriorityExplanationCard({
  findingId,
  variant = 'page',
}: PriorityExplanationCardProps) {
  const { explanation, isLoading } = useFindingPriorityExplanation(findingId)

  const Heading = variant === 'page' ? 'h3' : 'h4'
  const headingCls =
    variant === 'page'
      ? 'mb-3 flex items-center gap-2 font-semibold'
      : 'flex items-center gap-2 text-sm font-semibold'

  if (isLoading) {
    return (
      <>
        <Separator />
        <div className={variant === 'drawer' ? 'space-y-3' : undefined}>
          <Heading className={headingCls}>
            <HelpCircle className="h-4 w-4" />
            Why this priority
          </Heading>
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </>
    )
  }

  // No explanation available — omit the section entirely (graceful degrade).
  if (!explanation) return null

  const chips = factorChips(explanation)
  const cls = explanation.priority_class

  return (
    <>
      <Separator />
      <div className={variant === 'drawer' ? 'space-y-3' : undefined}>
        <Heading className={headingCls}>
          <HelpCircle className="h-4 w-4" />
          Why this priority
        </Heading>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {isPriorityClass(cls) ? (
              <PriorityClassBadge priorityClass={cls} />
            ) : (
              <Badge variant="outline" className="font-mono">
                {cls}
              </Badge>
            )}
            {explanation.source === 'rule' && explanation.rule_name && (
              <Badge variant="secondary" className="gap-1">
                <Gavel className="h-3 w-3" />
                {explanation.rule_name}
              </Badge>
            )}
            {isPriorityClass(cls) && (
              <span className="text-muted-foreground text-xs">
                SLA: {PRIORITY_CLASS_CONFIG[cls].sla}
              </span>
            )}
          </div>

          {explanation.reason && (
            <p className="text-muted-foreground text-sm leading-relaxed">{explanation.reason}</p>
          )}

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <Badge key={chip.key} variant={chip.strong ? 'destructive' : 'outline'}>
                  {chip.label}
                </Badge>
              ))}
            </div>
          )}

          {explanation.score_breakdown && (
            <ScoreBreakdown breakdown={explanation.score_breakdown} />
          )}
        </div>
      </div>
    </>
  )
}
