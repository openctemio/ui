'use client'

import type * as React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface MetricStripItem {
  key: string
  label: string
  value: number | string
  /** Small caption under the value. */
  hint?: string
  /**
   * `danger` / `warning` colour the value only while it is a positive number —
   * a zero is good news and stays neutral (a red "0" reads as an alarm that
   * isn't one).
   */
  tone?: 'default' | 'danger' | 'warning'
  /**
   * Extra content under the value (a one-line explanation, a small
   * breakdown bar). Keep it short: the strip is a summary, not a card.
   */
  detail?: React.ReactNode
  /** Clickable metrics act as quick filters. */
  onClick?: () => void
  /** The filter this metric applies is currently on. */
  active?: boolean
}

/**
 * Columns for the tablet grid: up to 4 metrics share one row, more split into
 * two rows as evenly as possible (5 → 3+2, 7 → 4+3), never a lone metric.
 */
export function smColumns(count: number): number {
  return count <= 4 ? Math.max(count, 1) : Math.min(Math.ceil(count / 2), 4)
}

/**
 * A page's headline numbers as one quiet strip rather than a row of separate
 * cards — the list below stays the focus. Metrics with `onClick` are quick
 * filters (`aria-pressed` reflects `active`).
 */
export function MetricStrip({
  items,
  loading = false,
  className,
}: {
  items: MetricStripItem[]
  loading?: boolean
  className?: string
}) {
  return (
    <dl
      className={cn(
        // Phones: one horizontally scrollable row (snaps per metric) instead of
        // a tall 2-column stack. sm: a grid balanced so no metric sits alone on
        // its last row; lg: one row, one column per metric.
        'no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-xl border bg-card sm:grid sm:grid-cols-[repeat(var(--metric-cols-sm),minmax(0,1fr))] sm:overflow-hidden lg:grid-cols-[repeat(var(--metric-cols),minmax(0,1fr))]',
        className
      )}
      style={
        {
          '--metric-cols': items.length,
          '--metric-cols-sm': smColumns(items.length),
        } as React.CSSProperties
      }
    >
      {items.map((item) => {
        const numeric = typeof item.value === 'number'
        const positive = numeric && (item.value as number) > 0
        const alarming = item.tone === 'danger' && positive
        const warning = item.tone === 'warning' && positive
        const body = (
          <>
            <dt className="truncate text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-0.5">
              {loading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <span
                  className={cn(
                    'text-2xl font-semibold tabular-nums tracking-tight',
                    alarming && 'text-destructive',
                    warning && 'text-warning'
                  )}
                >
                  {numeric ? (item.value as number).toLocaleString() : item.value}
                </span>
              )}
              {item.hint && !loading ? (
                <span className="ms-1.5 text-xs text-muted-foreground">{item.hint}</span>
              ) : null}
            </dd>
            {item.detail && !loading ? (
              <dd className="mt-1 min-w-0 text-xs text-muted-foreground">{item.detail}</dd>
            ) : null}
          </>
        )
        const cellClass = cn(
          '-ms-px -mt-px min-w-32 shrink-0 snap-start border-s border-t px-4 py-2.5 text-start sm:min-w-0',
          item.active && 'bg-accent'
        )
        return item.onClick ? (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            aria-pressed={item.active ?? false}
            className={cn(
              cellClass,
              'transition-colors hover:bg-accent/60 focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            {body}
          </button>
        ) : (
          <div key={item.key} className={cellClass}>
            {body}
          </div>
        )
      })}
    </dl>
  )
}
