'use client'

import { cn } from '@/lib/utils'

export type MeterTone = 'default' | 'success' | 'warning' | 'destructive'

const METER_TONE: Record<MeterTone, string> = {
  default: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
}

export interface MeterProps {
  value: number
  max: number
  /** What the bar measures, read by screen readers ("2 of 5 job slots in use"). */
  label: string
  tone?: MeterTone
  className?: string
}

/**
 * A thin `value / max` bar (job slots in use, quota spent): `role="meter"`
 * with its numbers, theme tokens only. The one look for a share of capacity
 * in a stat strip, a detail stat or a list row.
 */
export function Meter({ value, max, label, tone = 'default', className }: MeterProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('h-1 overflow-hidden rounded-full bg-muted', className)}
    >
      <div className={cn('h-full rounded-full', METER_TONE[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}
