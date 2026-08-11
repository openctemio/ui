'use client'

/**
 * Dry-run preview dialog for a priority rule.
 *
 * Shows the operator EXACTLY what would happen if this rule became active,
 * without actually re-classifying any finding. The preview is computed by the
 * backend engine (POST /api/v1/priority-rules/dry-run), which evaluates the
 * full predicate set — severity, EPSS, KEV, asset context, compensating
 * controls — the same way a live classification sweep would. The dialog is
 * intentionally decoupled from the persisted rule entity (see {@link DryRunRule})
 * so an in-progress, unsaved form can be previewed too: it sends the current
 * conditions + target class, not a rule id.
 */

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { post } from '@/lib/api/client'
import { PriorityClassBadge } from '@/features/findings/components/priority-class-badge'
import { SEVERITY_BADGE_SOFT, type SeverityLevel } from '@/lib/severity-colors'
import { AlertTriangle, ArrowRight, FlaskConical, ListChecks } from 'lucide-react'
import type { PriorityClass } from '@/features/findings/types/finding.types'

type FieldKey =
  | 'is_in_kev'
  | 'is_reachable'
  | 'asset_is_crown_jewel'
  | 'epss_score'
  | 'severity'
  | 'asset_criticality'

type Operator = 'eq' | 'neq' | 'gte' | 'lte' | 'in'

interface Condition {
  field: FieldKey
  operator: Operator
  value: unknown
}

// A conservative subset of the main PriorityRule: the dialog is
// intentionally decoupled from the full rule entity so an in-progress
// form (unsaved changes) can also be previewed.
export interface DryRunRule {
  name: string
  priority_class: PriorityClass
  conditions: Condition[]
}

interface DryRunSample {
  finding_id: string
  title: string
  severity: string
  current_class: PriorityClass
  would_be_class: PriorityClass
}

// Response of POST /api/v1/priority-rules/dry-run.
export interface DryRunResult {
  evaluated: number
  matched: number
  capped: boolean
  cap: number
  sample: DryRunSample[]
  would_be_distribution: Partial<Record<PriorityClass, number>>
}

const DRY_RUN_ENDPOINT = '/api/v1/priority-rules/dry-run'
const PRIORITY_ORDER: PriorityClass[] = ['P0', 'P1', 'P2', 'P3']

/** Map a raw severity string to its centralized soft-tint badge classes. */
function severityBadgeClass(severity: string): string {
  const key = severity.toLowerCase() as SeverityLevel
  return SEVERITY_BADGE_SOFT[key] ?? SEVERITY_BADGE_SOFT.info
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; result: DryRunResult }

interface DryRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: DryRunRule | null
}

export function DryRunDialog({ open, onOpenChange, rule }: DryRunDialogProps) {
  const [state, setState] = useState<FetchState>({ status: 'idle' })

  // Re-run whenever the dialog opens for a (possibly different) rule. Keyed on
  // the serialized predicate set so re-opening the same rule doesn't refetch,
  // and an edited in-progress rule does.
  const ruleKey = rule
    ? JSON.stringify({ conditions: rule.conditions, priority_class: rule.priority_class })
    : null

  useEffect(() => {
    if (!open || !rule) {
      setState({ status: 'idle' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })

    post<DryRunResult>(DRY_RUN_ENDPOINT, {
      conditions: rule.conditions,
      priority_class: rule.priority_class,
    })
      .then((result) => {
        if (cancelled) return
        setState({ status: 'done', result })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Failed to evaluate the rule. Please try again.'
        setState({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
    // `rule` is captured through the stable `ruleKey`; re-running on the object
    // identity alone would refetch on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ruleKey])

  if (!rule) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-5" />
            Dry run: {rule.name || '(unsaved rule)'}
          </DialogTitle>
          <DialogDescription>
            Preview the findings this rule would re-classify. No changes are applied.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target priority */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Would reclassify matching findings to</span>
            <PriorityClassBadge priorityClass={rule.priority_class} />
          </div>

          {state.status === 'loading' ? (
            <LoadingState />
          ) : state.status === 'error' ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Could not evaluate the rule</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : state.status === 'done' ? (
            <ResultView result={state.result} targetClass={rule.priority_class} />
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Evaluating rule">
      <div className="rounded-md border p-4">
        <Skeleton className="mb-3 h-4 w-40" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

function ResultView({ result, targetClass }: { result: DryRunResult; targetClass: PriorityClass }) {
  const { evaluated, matched, capped, cap, sample, would_be_distribution } = result

  // Nothing to evaluate — no open findings were in scope at all.
  if (evaluated === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center">
        <ListChecks className="text-muted-foreground mx-auto mb-2 size-6" />
        <p className="text-sm font-medium">No findings to evaluate</p>
        <p className="text-muted-foreground mt-1 text-xs">
          There are no findings in scope for this rule right now, so it would have no effect.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Exact impact */}
      <div className="rounded-md border p-4">
        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm font-medium">
          <ListChecks className="size-4" />
          Impact
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">{matched}</span>
          <span className="text-muted-foreground text-sm">
            of <span className="tabular-nums">{evaluated}</span> finding
            {evaluated === 1 ? '' : 's'} would be reclassified to{' '}
            <PriorityClassBadge priorityClass={targetClass} showTooltip={false} />
          </span>
        </div>
      </div>

      {/* Would-be distribution */}
      {matched > 0 ? (
        <div className="rounded-md border p-4">
          <div className="text-muted-foreground mb-3 text-sm font-medium">
            Would-be priority distribution
          </div>
          <div className="flex flex-wrap gap-3">
            {PRIORITY_ORDER.map((pc) => (
              <div key={pc} className="flex items-center gap-1.5">
                <PriorityClassBadge priorityClass={pc} showTooltip={false} />
                <span className="text-sm font-semibold tabular-nums">
                  {would_be_distribution[pc] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Sample findings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Sample findings</span>
          {capped ? (
            <span className="text-muted-foreground text-xs font-normal">
              Showing first <span className="tabular-nums">{sample.length}</span> of{' '}
              <span className="tabular-nums">{matched}</span> matches (capped at{' '}
              <span className="tabular-nums">{cap}</span>)
            </span>
          ) : null}
        </div>
        {sample.length > 0 ? (
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
            {sample.map((f) => (
              <li
                key={f.finding_id}
                className="hover:bg-muted flex items-center justify-between rounded px-2 py-1.5 text-sm"
              >
                <span className="truncate pe-2">{f.title}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] uppercase', severityBadgeClass(f.severity))}
                  >
                    {f.severity}
                  </Badge>
                  <PriorityClassBadge priorityClass={f.current_class} showTooltip={false} />
                  <ArrowRight className="text-muted-foreground size-3" aria-label="becomes" />
                  <PriorityClassBadge priorityClass={f.would_be_class} showTooltip={false} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
            No findings match this rule — nothing would be reclassified.
          </p>
        )}
      </div>

      <p className="text-muted-foreground border-t pt-3 text-xs">
        Dry run is a preview only. To actually change priorities, save the rule and trigger a
        reclassification sweep from the Cycles page (admin).
      </p>
    </>
  )
}
