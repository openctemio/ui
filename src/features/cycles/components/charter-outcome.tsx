'use client'

import { Badge } from '@/components/ui/badge'
import { MetricStrip } from '@/features/shared'
import { cn } from '@/lib/utils'

import type { CharterEvaluation } from '../types'
import { OUTCOME_BADGE_CLASS, OUTCOME_LABEL, describeCriterion } from '../charter-outcome'

/**
 * CharterOutcome shows how a closed cycle did against its charter: the
 * completion rate and counts as one MetricStrip, then each success criterion
 * with its verdict and the measured value (or why it could not be measured).
 */
export function CharterOutcome({ evaluation }: { evaluation: CharterEvaluation }) {
  const criteria = evaluation.criteria ?? []
  const met = evaluation.met ?? 0
  const unmet = evaluation.unmet ?? 0
  const notMeasurable = evaluation.not_measurable ?? 0
  const rate = evaluation.completion_rate

  return (
    // A plain section, not a Card: MetricStrip draws its own frame and the
    // style contract forbids card-in-card.
    <section aria-labelledby="charter-outcome-heading" className="space-y-3">
      <div>
        <h3 id="charter-outcome-heading" className="text-base font-semibold">
          Success criteria outcome
        </h3>
        <p className="text-sm text-muted-foreground">
          Each criterion checked against the metrics measured between activation and close.
        </p>
      </div>
      <MetricStrip
        items={[
          {
            key: 'completion',
            label: 'Completion rate',
            value: rate === undefined ? '—' : `${Math.round(rate)}%`,
            hint: rate === undefined ? 'nothing measurable' : undefined,
          },
          { key: 'met', label: 'Met', value: met },
          { key: 'unmet', label: 'Unmet', value: unmet, tone: 'danger' },
          { key: 'not_measurable', label: 'Not measurable', value: notMeasurable },
        ]}
      />

      {criteria.length === 0 ? (
        <p className="text-sm text-muted-foreground">The charter had no success criteria.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {criteria.map((c, i) => {
            const outcome = c.outcome ?? 'not_measurable'
            return (
              <li key={i} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{c.name || 'Untitled criterion'}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.metric || 'No metric'} · {c.target || 'no target'}
                  </p>
                  <p
                    className={cn(
                      'text-xs tabular-nums',
                      outcome === 'unmet' ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    {describeCriterion(c)}
                  </p>
                </div>
                <Badge variant="outline" className={OUTCOME_BADGE_CLASS[outcome]}>
                  {OUTCOME_LABEL[outcome]}
                </Badge>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
