'use client'

import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface RelativeTimeProps {
  /** ISO string, Date, or nullish. Nullish / invalid renders an em-dash. */
  date: string | Date | null | undefined
  /** Append "ago"/"in" (default true). */
  addSuffix?: boolean
  className?: string
}

/**
 * Muted relative timestamp ("3 days ago") with the absolute date on hover.
 * Replaces the `formatDistanceToNow(new Date(x), { addSuffix: true })` snippet
 * that was hand-rolled in ~every table's "created/first seen/flagged" column.
 */
export function RelativeTime({ date, addSuffix = true, className }: RelativeTimeProps) {
  const d = date == null ? null : typeof date === 'string' ? new Date(date) : date
  if (!d || Number.isNaN(d.getTime())) {
    return <span className={cn('text-sm text-muted-foreground', className)}>—</span>
  }
  return (
    <span className={cn('text-sm text-muted-foreground', className)} title={d.toLocaleString()}>
      {formatDistanceToNow(d, { addSuffix })}
    </span>
  )
}
