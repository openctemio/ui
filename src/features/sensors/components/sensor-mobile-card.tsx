'use client'

import { formatDistanceStrict } from 'date-fns'

import { cn } from '@/lib/utils'
import type { Sensor } from '@/lib/api/sensor-types'

import { SensorStateBadge } from './sensor-state-badge'
import { ProtocolTag } from './sensor-cells'
import { CONTENT_STATE_META, worstContentState } from '../lib/content'
import { formatDurationShort, keyExpiry } from '../lib/format'
import { isOneShotSensor, sensorState, type FleetThresholds } from '../lib/sensor-state'
import { normalizeSensorVersion, sensorVersionStatus } from '../lib/sensor-version'
import type { ReleaseChannel } from '../lib/fleet'

/**
 * A sensor on a phone: name and address, the state on the right, then the few
 * facts that need attention first (results waiting, version, key), the
 * heartbeat age and the jobs.
 */
export function SensorMobileCard({
  sensor,
  now,
  thresholds,
  channel,
  onOpen,
}: {
  sensor: Sensor
  now: number
  thresholds?: FleetThresholds
  channel: ReleaseChannel
  onOpen: (sensor: Sensor) => void
}) {
  const state = sensorState(sensor, now, thresholds)
  const facts: { text: string; tone?: 'warning' | 'destructive' }[] = []

  const ob = sensor.outbox
  if (ob && ob.pending_count > 0) {
    facts.push({
      text: `${ob.pending_count.toLocaleString()} results waiting${ob.oldest_age_seconds ? ` · ${formatDurationShort(ob.oldest_age_seconds)}` : ''}`,
      tone: sensor.outbox_warning ? 'warning' : undefined,
    })
  }
  if (sensor.last_seen_at && state !== 'disabled' && state !== 'revoked') {
    facts.push({ text: `${formatDistanceStrict(new Date(sensor.last_seen_at), now)} ago` })
  }
  if (!isOneShotSensor(sensor) && state !== 'disabled' && state !== 'revoked') {
    facts.push({ text: `${sensor.current_jobs ?? 0}/${sensor.max_concurrent_jobs} jobs` })
  }
  const v = normalizeSensorVersion(sensor.version)
  const vs = sensorVersionStatus(sensor, channel.latest, channel.min)
  if (v && vs === 'update_available') facts.push({ text: `${v} · update` })
  if (v && vs === 'unsupported') facts.push({ text: `${v} unsupported`, tone: 'destructive' })
  const k = keyExpiry(sensor.key_expires_at, now)
  if (k.kind === 'soon') facts.push({ text: `key expires in ${k.days}d`, tone: 'warning' })
  if (k.kind === 'expired') facts.push({ text: 'key expired', tone: 'destructive' })
  const content = worstContentState(sensor.content)
  if (content === 'failed' || content === 'stale') {
    facts.push({
      text: `content ${CONTENT_STATE_META[content].label.toLowerCase()}`,
      tone: content === 'failed' ? 'destructive' : 'warning',
    })
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(sensor)}
      className="flex w-full flex-col gap-2 px-3 py-3 text-start hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{sensor.name}</span>
          {sensor.ip_address || sensor.hostname ? (
            <span className="truncate font-mono text-xs text-muted-foreground">
              {sensor.ip_address || sensor.hostname}
            </span>
          ) : null}
        </span>
        <SensorStateBadge sensor={sensor} now={now} thresholds={thresholds} />
      </span>
      <ProtocolTag sensor={sensor} />
      {facts.length > 0 && (
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {facts.map((f) => (
            <span
              key={f.text}
              className={cn(
                f.tone === 'warning' && 'text-warning',
                f.tone === 'destructive' && 'text-destructive'
              )}
            >
              {f.text}
            </span>
          ))}
        </span>
      )}
    </button>
  )
}
