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
   * `danger` colours the value only while it is a positive number — a zero is
   * good news and stays neutral (a red "0" reads as an alarm that isn't one).
   */
  tone?: 'default' | 'danger'
  /** Clickable metrics act as quick filters. */
  onClick?: () => void
  /** The filter this metric applies is currently on. */
  active?: boolean
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
        // One row on large screens with exactly as many columns as metrics.
        'grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-3 lg:grid-cols-[repeat(var(--metric-cols),minmax(0,1fr))]',
        className
      )}
      style={{ '--metric-cols': items.length } as React.CSSProperties}
    >
      {items.map((item) => {
        const numeric = typeof item.value === 'number'
        const alarming = item.tone === 'danger' && numeric && (item.value as number) > 0
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
                    alarming && 'text-destructive'
                  )}
                >
                  {numeric ? (item.value as number).toLocaleString() : item.value}
                </span>
              )}
              {item.hint && !loading ? (
                <span className="ms-1.5 text-xs text-muted-foreground">{item.hint}</span>
              ) : null}
            </dd>
          </>
        )
        const cellClass = cn(
          '-ms-px -mt-px border-s border-t px-4 py-2.5 text-start',
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
