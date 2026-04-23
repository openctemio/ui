'use client'

/**
 * Dry-run preview dialog for a priority rule.
 *
 * Shows the operator what WOULD happen if this rule became active,
 * without actually re-classifying any finding. Preview is computed
 * from the rule's conditions against the findings list — only the
 * subset of conditions that map to existing finding-list filters
 * (severity, status) is honoured client-side. Other predicates
 * (is_in_kev, epss_score, asset_is_crown_jewel, compensating
 * controls) require server-side evaluation and are flagged in the
 * UI as "approximate — backend evaluates the full predicate".
 *
 * A future POST /priority-rules/{id}/dry-run endpoint will return an
 * exact match count + sample; when it ships, this dialog swaps its
 * client-side heuristic for the endpoint response.
 */

import { useMemo } from 'react'
import useSWR from 'swr'
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
import { get } from '@/lib/api/client'
import { PriorityClassBadge } from '@/features/findings/components/priority-class-badge'
import { AlertTriangle, FlaskConical, ListChecks, CheckCircle2 } from 'lucide-react'
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

interface FindingsListResponse {
  data?: Array<{ id: string; title: string; severity: string; priority_class?: PriorityClass }>
  total?: number
}

// Only these condition fields map 1:1 to existing findings list
// filters. Everything else is labelled "server-evaluated" in the UI.
const CLIENT_EVALUABLE: FieldKey[] = ['severity']

function buildApproximateFilter(conditions: Condition[]): URLSearchParams {
  const params = new URLSearchParams()
  // Only open statuses (new, confirmed, in_progress, fix_applied) —
  // closed findings are not candidates for future reclassification.
  params.set('exclude_statuses', 'resolved,verified,false_positive,accepted,duplicate')
  for (const c of conditions) {
    if (c.field !== 'severity') continue
    // `eq` → include just that severity.
    if (c.operator === 'eq' && typeof c.value === 'string' && c.value) {
      params.append('severities', c.value)
      continue
    }
    // `in` (array) → include each.
    if (c.operator === 'in' && Array.isArray(c.value)) {
      for (const v of c.value) {
        if (typeof v === 'string') params.append('severities', v)
      }
    }
  }
  params.set('per_page', '10')
  params.set('page', '1')
  return params
}

function serverOnlyConditions(conditions: Condition[]): Condition[] {
  return conditions.filter((c) => !CLIENT_EVALUABLE.includes(c.field))
}

interface DryRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: DryRunRule | null
}

export function DryRunDialog({ open, onOpenChange, rule }: DryRunDialogProps) {
  const params = useMemo(() => {
    if (!rule) return null
    return buildApproximateFilter(rule.conditions).toString()
  }, [rule])

  const { data, isLoading } = useSWR<FindingsListResponse>(
    open && params ? `/api/v1/findings?${params}` : null,
    get,
    { revalidateOnFocus: false }
  )

  const serverOnly = useMemo(() => (rule ? serverOnlyConditions(rule.conditions) : []), [rule])
  const clientConditions = useMemo(
    () => (rule ? rule.conditions.filter((c) => CLIENT_EVALUABLE.includes(c.field)) : []),
    [rule]
  )

  if (!rule) return null

  const matchCount = data?.total ?? data?.data?.length ?? 0
  const hasServerOnlyConditions = serverOnly.length > 0

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

          {/* Approximate match count */}
          <div className="rounded-md border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <ListChecks className="size-4 text-neutral-500" />
              Approximate impact (open findings only)
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums">{matchCount}</span>
                <span className="text-muted-foreground text-sm">
                  finding{matchCount === 1 ? '' : 's'} match the client-evaluable predicates
                </span>
              </div>
            )}
            {clientConditions.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1">
                {clientConditions.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {c.field} {c.operator} {String(c.value)}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mt-2 text-xs">
                No client-evaluable predicates in this rule — preview count is total open findings.
              </p>
            )}
          </div>

          {/* Server-only predicates warning */}
          {hasServerOnlyConditions ? (
            <Alert variant="default" className="border-amber-300 bg-amber-50">
              <AlertTriangle className="size-4 text-amber-700" />
              <AlertTitle className="text-amber-900">Approximate preview</AlertTitle>
              <AlertDescription className="text-amber-800">
                <p className="mb-2">
                  This rule uses predicates the UI cannot evaluate client-side. The backend looks
                  these up at classification time (EPSS, KEV, asset context, compensating controls).
                  The real match count will likely be smaller than {matchCount}.
                </p>
                <div className="flex flex-wrap gap-1">
                  {serverOnly.map((c, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-amber-300 bg-white text-xs text-amber-900"
                    >
                      {c.field} {c.operator} {String(c.value)}
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Sample findings */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="size-4 text-neutral-500" />
              Sample findings (up to 10)
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data?.data && data.data.length > 0 ? (
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                {data.data.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-neutral-50"
                  >
                    <span className="truncate pr-2">{f.title}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {f.severity}
                      </Badge>
                      {f.priority_class ? (
                        <PriorityClassBadge priorityClass={f.priority_class} />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                No matching findings in the current open set.
              </p>
            )}
          </div>

          <p className="text-muted-foreground border-t pt-3 text-xs">
            Dry run is a preview only. To actually change priorities, save the rule and trigger a
            reclassification sweep from the Cycles page (admin). A future server-side dry-run
            endpoint will return exact counts for rules with EPSS / KEV / asset predicates.
          </p>
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

// Exported for unit tests.
export { buildApproximateFilter, serverOnlyConditions, CLIENT_EVALUABLE }
