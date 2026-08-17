import type { SLAStatus } from '@/features/repositories/types/repository.types'

/**
 * SLA helpers shared by the breach board and the findings SLA column.
 *
 * Status vocabulary is the backend's (vulnerability value_objects.go):
 * on_track | warning | overdue | exceeded | not_applicable.
 */

/** Statuses considered an active SLA breach (past deadline). */
export const BREACH_STATUSES: SLAStatus[] = ['overdue', 'exceeded']

/** Order used when rendering the board columns / grouped counts (worst first). */
export const SLA_BOARD_ORDER: SLAStatus[] = ['exceeded', 'overdue', 'warning', 'on_track']

export function isBreach(status?: string | null): boolean {
  return status === 'overdue' || status === 'exceeded'
}

/**
 * Whole days between now and an SLA deadline. Positive = days remaining,
 * negative = days past due. Returns null when the deadline is missing/invalid.
 */
export function daysUntil(deadline?: string | null): number | null {
  if (!deadline) return null
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return null
  const ms = d.getTime() - Date.now()
  return Math.round(ms / 86_400_000)
}

/** Human-friendly "3d left" / "2d overdue" / "due today". */
export function formatDueRelative(deadline?: string | null): string {
  const days = daysUntil(deadline)
  if (days === null) return '—'
  if (days === 0) return 'Due today'
  return days > 0 ? `${days}d left` : `${Math.abs(days)}d overdue`
}

export interface AgingBucket {
  label: string
  /** inclusive lower bound of days-overdue */
  min: number
  /** inclusive upper bound of days-overdue, or null for open-ended */
  max: number | null
}

/** Aging buckets for breached findings, keyed on days past the SLA deadline. */
export const AGING_BUCKETS: AgingBucket[] = [
  { label: '1-7 days', min: 1, max: 7 },
  { label: '8-30 days', min: 8, max: 30 },
  { label: '31-90 days', min: 31, max: 90 },
  { label: '90+ days', min: 91, max: null },
]

/** Which aging bucket a breached finding falls in, by its deadline. Null if not overdue. */
export function agingBucketFor(deadline?: string | null): AgingBucket | null {
  const days = daysUntil(deadline)
  if (days === null || days >= 0) return null
  const overdue = Math.abs(days)
  return AGING_BUCKETS.find((b) => overdue >= b.min && (b.max === null || overdue <= b.max)) ?? null
}
