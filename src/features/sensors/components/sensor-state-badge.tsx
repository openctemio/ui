'use client'

import { formatDistanceToNowStrict } from 'date-fns'

import { cn } from '@/lib/utils'
import type { Sensor } from '@/lib/api/sensor-types'

import {
  SENSOR_STATE_META,
  sensorState,
  type FleetThresholds,
  type SensorStateTone,
} from '../lib/sensor-state'

/** Theme tokens only (style contract §6): a tint and a dot per tone. */
const TONE_PILL: Record<SensorStateTone, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/15 text-destructive',
  info: 'bg-info/15 text-info',
  muted: 'bg-muted text-muted-foreground',
}
const TONE_DOT: Record<SensorStateTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
  muted: 'bg-muted-foreground',
}

function ago(iso: string | undefined | null, now: number): string | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  // A heartbeat a few seconds "in the future" (clock skew) reads as just now.
  if (t >= now - 1000) return 'just now'
  return `${formatDistanceToNowStrict(t)} ago`
}

/**
 * The line under the state: how long ago, in the words that fit the state
 * ("heartbeat 4s ago", "last run 3h ago").
 */
export function sensorStateDetail(
  sensor: Pick<Sensor, 'last_seen_at' | 'created_at'> & Parameters<typeof sensorState>[0],
  now: number = Date.now(),
  thresholds?: FleetThresholds
): string | null {
  const state = sensorState(sensor, now, thresholds)
  const seen = ago(sensor.last_seen_at, now)
  switch (state) {
    case 'online':
    case 'degraded':
      return seen ? `heartbeat ${seen}` : null
    case 'stale':
    case 'offline':
      return seen ? `last heartbeat ${seen}` : null
    case 'idle':
      return seen ? `last run ${seen}` : null
    case 'never_connected':
      return 'no heartbeat yet'
    default:
      return null
  }
}

interface SensorStateBadgeProps {
  sensor: Parameters<typeof sensorState>[0] & Pick<Sensor, 'last_seen_at' | 'created_at'>
  /** The current time (useNow), so the badge ages without impure renders. */
  now: number
  thresholds?: FleetThresholds
  /** Add the "heartbeat 4s ago" line under the pill. */
  withLastSeen?: boolean
  className?: string
}

/** The sensor's state as a pill: one vocabulary for the list, cards and drawer. */
export function SensorStateBadge({
  sensor,
  now,
  thresholds,
  withLastSeen = false,
  className,
}: SensorStateBadgeProps) {
  const state = sensorState(sensor, now, thresholds)
  const meta = SENSOR_STATE_META[state]
  const detail = withLastSeen ? sensorStateDetail(sensor, now, thresholds) : null
  const pill = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        TONE_PILL[meta.tone],
        !detail && className
      )}
      title={meta.description}
      data-state={state}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', TONE_DOT[meta.tone])} />
      {meta.label}
    </span>
  )
  if (!detail) return pill
  return (
    <span className={cn('inline-flex flex-col items-start gap-0.5', className)}>
      {pill}
      <span className="text-xs text-muted-foreground">{detail}</span>
    </span>
  )
}
