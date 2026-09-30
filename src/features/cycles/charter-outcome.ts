/**
 * Presentation helpers for the close-time charter evaluation
 * (`charter_evaluation` on a CTEM cycle). The API does the judging; these only
 * turn its numbers into readable text.
 */

import type { CharterEvaluation, CriterionEvaluation, CriterionOutcome } from './types'

export const OUTCOME_LABEL: Record<CriterionOutcome, string> = {
  met: 'Met',
  unmet: 'Unmet',
  not_measurable: 'Not measurable',
}

/** Token-only badge tints, one per outcome. */
export const OUTCOME_BADGE_CLASS: Record<CriterionOutcome, string> = {
  met: 'border-transparent bg-success/15 text-success',
  unmet: 'border-transparent bg-destructive/15 text-destructive',
  not_measurable: 'border-transparent bg-muted text-muted-foreground',
}

const COMPARATOR_SYMBOL: Record<string, string> = {
  '<=': '≤',
  '<': '<',
  '>=': '≥',
  '>': '>',
  '=': '=',
}

const round = (v: number, digits = 2) => {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

/** Formats a value in the metric's base unit (hours, count, percent, score). */
export function formatCriterionValue(value: number, unit?: string): string {
  switch (unit) {
    case 'hours':
      // Hours read badly past two days; switch to days there.
      if (Math.abs(value) >= 48) {
        const days = round(value / 24, 1)
        return `${days} ${days === 1 ? 'day' : 'days'}`
      }
      return `${round(value, 1)} h`
    case 'percent':
      return `${round(value, 1)}%`
    default:
      return `${round(value)}`
  }
}

/** "≤ 1 day" — the target as the API interpreted it. Empty when unparsed. */
export function formatThreshold(c: CriterionEvaluation): string {
  if (c.threshold === undefined || !c.comparator) return ''
  const symbol = COMPARATOR_SYMBOL[c.comparator] ?? c.comparator
  return `${symbol} ${formatCriterionValue(c.threshold, c.unit)}`
}

/**
 * One-line explanation under a criterion: the measured value against the
 * interpreted target, or why it could not be measured.
 */
export function describeCriterion(c: CriterionEvaluation): string {
  if (c.outcome === 'not_measurable' || c.actual === undefined) {
    return c.reason ? capitalize(c.reason) : 'Could not be measured'
  }
  const target = formatThreshold(c)
  const actual = formatCriterionValue(c.actual, c.unit)
  return target ? `Measured ${actual}, target ${target}` : `Measured ${actual}`
}

/** "2 of 3 measurable criteria met" — the table cell / toast summary. */
export function summarizeEvaluation(ev: CharterEvaluation | undefined | null): string | null {
  if (!ev) return null
  const met = ev.met ?? 0
  const measurable = met + (ev.unmet ?? 0)
  if (measurable === 0) {
    return (ev.criteria?.length ?? 0) > 0 ? 'No measurable criteria' : null
  }
  return `${met} of ${measurable} met`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
