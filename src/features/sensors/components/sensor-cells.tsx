'use client'

import { cn } from '@/lib/utils'
import type { Sensor, SensorVersionStatus } from '@/lib/api/sensor-types'

import { formatDurationShort, keyExpiry } from '../lib/format'
import { isOneShotSensor } from '../lib/sensor-state'
import { normalizeSensorVersion, sensorVersionStatus } from '../lib/sensor-version'

/**
 * Cells shared by the sensor table, the phone cards and the drawer, so one
 * value reads the same everywhere. Theme tokens only.
 */

const muted = 'text-muted-foreground'

/** Small tag next to a value ("update", "unsupported", "Platform", ...). */
export function SensorTag({
  tone = 'muted',
  children,
  title,
}: {
  tone?: 'muted' | 'info' | 'warning' | 'destructive' | 'success'
  children: React.ReactNode
  title?: string
}) {
  const tones = {
    muted: 'border text-muted-foreground',
    info: 'bg-info/15 text-info',
    warning: 'bg-warning/15 text-warning',
    destructive: 'bg-destructive/15 text-destructive',
    success: 'text-success ps-0',
  }
  return (
    <span
      title={title}
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded px-1.5 py-px text-[11px] font-medium',
        tones[tone]
      )}
    >
      {children}
    </span>
  )
}

/** Name, host and address; badges for a platform sensor and the deprecated protocol. */
export function SensorNameCell({ sensor }: { sensor: Sensor }) {
  const host = [sensor.hostname, sensor.ip_address].filter(Boolean).join(' · ')
  const fallback = isOneShotSensor(sensor) ? 'CI/CD runner · one-shot' : 'No host reported yet'
  return (
    <div className="flex min-w-0 flex-col">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-medium">{sensor.name}</span>
        {sensor.is_platform_sensor && <SensorTag>Platform</SensorTag>}
        <ProtocolTag sensor={sensor} />
      </span>
      {host ? (
        <span
          className={cn('truncate font-mono text-xs', muted)}
          title="Host name and the address the platform sees the sensor connect from"
        >
          {host}
        </span>
      ) : (
        <span className={cn('truncate text-xs', muted)}>{fallback}</span>
      )}
    </div>
  )
}

/**
 * The sensor release that speaks protocol v2, and the date protocol v1 stops
 * (RFC-029: the protocol v1 sunset).
 */
export const PROTOCOL_V2_SENSOR_VERSION = 'v0.5.0'
export const PROTOCOL_V1_SUNSET = '2027-04-01'

/** "v1 · deprecated" when the API reports the sensor still speaks protocol v1 (RFC-029). */
export function ProtocolTag({ sensor }: { sensor: Pick<Sensor, 'protocol'> }) {
  if (!sensor.protocol || (!sensor.protocol.deprecated && sensor.protocol.version >= 2)) return null
  return (
    <SensorTag
      tone="warning"
      title={`Protocol v${sensor.protocol.version} is deprecated. Upgrade the sensor to ${PROTOCOL_V2_SENSOR_VERSION} or later before ${PROTOCOL_V1_SUNSET}.`}
    >
      v{sensor.protocol.version} · deprecated
    </SensorTag>
  )
}

const VERSION_TAG: Record<
  SensorVersionStatus,
  { label: string; tone: 'success' | 'info' | 'destructive' } | null
> = {
  latest: { label: 'latest', tone: 'success' },
  update_available: { label: 'update', tone: 'info' },
  unsupported: { label: 'unsupported', tone: 'destructive' },
  unknown: null,
}

/** Version in one form, with how it compares to the release channel. */
export function SensorVersionCell({
  sensor,
  latest,
  min,
}: {
  sensor: Pick<Sensor, 'version' | 'version_status'>
  latest?: string | null
  min?: string | null
}) {
  const v = normalizeSensorVersion(sensor.version)
  if (!v) return <span className={cn('text-sm', muted)}>Not reported</span>
  const status = sensorVersionStatus(sensor, latest, min)
  const tag = VERSION_TAG[status]
  const title =
    status === 'update_available' && latest
      ? `${latest} is available`
      : status === 'unsupported' && min
        ? `Older than the minimum supported ${min}`
        : undefined
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="font-mono text-xs">{v}</span>
      {tag && (
        <SensorTag tone={tag.tone} title={title}>
          {tag.label}
        </SensorTag>
      )}
    </span>
  )
}

/** Running jobs over slots, with a small bar. One-shot sensors have none. */
export function SensorJobsCell({ sensor }: { sensor: Sensor }) {
  if (isOneShotSensor(sensor) || sensor.status !== 'active') {
    return <span className={muted}>—</span>
  }
  const current = sensor.current_jobs ?? 0
  const max = sensor.max_concurrent_jobs || 0
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  return (
    <span className="inline-flex items-center gap-2 tabular-nums">
      <span className="h-1.5 w-11 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="block h-full bg-info" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-sm">
        {current}/{max}
      </span>
    </span>
  )
}

/** Results waiting on the sensor (its outbox), as it last reported. */
export function SensorOutboxCell({ sensor }: { sensor: Sensor }) {
  const ob = sensor.outbox
  if (!ob && sensor.status !== 'active') return <span className={muted}>—</span>
  if (!ob) {
    return (
      <span className={cn('text-sm', muted)} title="The sensor's SDK does not report an outbox">
        {isOneShotSensor(sensor) ? '—' : 'not reported'}
      </span>
    )
  }
  const lost = ob.dead_letter_count + ob.evicted_count
  if (ob.pending_count === 0 && lost === 0) {
    return <span className={cn('text-sm tabular-nums', muted)}>0</span>
  }
  return (
    <span className="flex flex-col">
      {ob.pending_count > 0 && (
        <span
          className={cn(
            'text-sm tabular-nums',
            sensor.outbox_warning ? 'text-warning' : 'text-foreground'
          )}
        >
          {ob.pending_count.toLocaleString()} queued
        </span>
      )}
      {lost > 0 && (
        <span className="text-sm tabular-nums text-destructive">{lost.toLocaleString()} lost</span>
      )}
      {ob.pending_count > 0 && ob.oldest_age_seconds > 0 && (
        <span className={cn('text-xs', muted)}>
          oldest {formatDurationShort(ob.oldest_age_seconds)}
        </span>
      )}
    </span>
  )
}

/** When the API key stops working. */
export function SensorKeyCell({
  sensor,
  now,
}: {
  sensor: Pick<Sensor, 'key_expires_at'>
  now: number
}) {
  const k = keyExpiry(sensor.key_expires_at, now)
  switch (k.kind) {
    case 'unknown':
      return <span className={muted}>—</span>
    case 'never':
      return <span className={cn('whitespace-nowrap text-sm', muted)}>never expires</span>
    case 'expired':
      return <span className="whitespace-nowrap text-sm text-destructive">expired</span>
    case 'soon':
      return (
        <span className="whitespace-nowrap text-sm text-warning">
          expires in {k.days} {k.days === 1 ? 'day' : 'days'}
        </span>
      )
    default:
      return <span className={cn('whitespace-nowrap text-sm', muted)}>in {k.days} days</span>
  }
}

/** The first tools, then "+N" (all of them on hover). */
export function SensorToolsCell({
  tools,
  max = 2,
}: {
  tools: string[] | null | undefined
  max?: number
}) {
  const list = tools ?? []
  if (list.length === 0) return <span className={cn('text-sm', muted)}>none</span>
  const shown = list.slice(0, max).join(', ')
  const more = list.length - max
  return (
    <span className={cn('text-sm', muted)} title={list.join(', ')}>
      {shown}
      {more > 0 ? ` +${more}` : ''}
    </span>
  )
}
