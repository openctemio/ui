import type { Sensor } from '@/lib/api/sensor-types'
import type { ScanZone } from '@/lib/api/scan-zone-types'

import { dispatchTools, hasReportedTools, toolsNotInstalled } from './capabilities'
import { contentCheckSummary } from './content'
import { formatDurationShort, keyExpiry } from './format'
import { isOneShotSensor, sensorState, type FleetThresholds } from './sensor-state'
import {
  normalizeSensorVersion,
  sensorSdkStatus,
  sensorSdkVersion,
  sensorVersionStatus,
} from './sensor-version'
import type { ReleaseChannel } from './fleet'
import { sensorProtocolOf } from './fleet'

/**
 * The drawer's health checklist: one line per thing that can be wrong with a
 * sensor, each saying what it found and, when there is one, what to do.
 */
export type HealthCheckStatus = 'ok' | 'warning' | 'critical' | 'info'
export type HealthCheckAction = 'rotate_key' | 'install' | 'edit' | 'zones'

export interface HealthCheck {
  key:
    | 'heartbeat'
    | 'outbox'
    | 'key'
    | 'version'
    | 'sdk'
    | 'tools'
    | 'content'
    | 'zone'
    | 'protocol'
    | 'error'
  label: string
  status: HealthCheckStatus
  text: string
  /** Secondary fact on the right ("up 6d 3h"). */
  aside?: string
  action?: HealthCheckAction
}

export interface HealthCheckContext {
  now: number
  thresholds?: FleetThresholds
  channel: ReleaseChannel
  /** The zones this sensor is assigned to, with the fleet to count them. */
  zones?: Pick<ScanZone, 'id' | 'name' | 'ranges' | 'sensor_ids'>[]
  fleet?: Sensor[]
  /** Protocol v2 release and the v1 sunset (RFC-029). */
  protocolV2Version: string
  protocolV1Sunset: string
}

function age(iso: string, now: number): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t) || t >= now - 1000) return 'just now'
  return `${formatDurationShort((now - t) / 1000)} ago`
}

export function sensorHealthChecks(sensor: Sensor, ctx: HealthCheckContext): HealthCheck[] {
  const { now, thresholds, channel } = ctx
  const state = sensorState(sensor, now, thresholds)
  const oneShot = isOneShotSensor(sensor)
  const checks: HealthCheck[] = []

  // Heartbeat
  const uptime =
    sensor.uptime_seconds != null &&
    (state === 'online' || state === 'degraded' || state === 'stale')
      ? `up ${formatDurationShort(sensor.uptime_seconds)}`
      : undefined
  if (state === 'disabled' || state === 'revoked') {
    checks.push({
      key: 'heartbeat',
      label: 'Heartbeat',
      status: 'info',
      text:
        state === 'disabled'
          ? `Disabled${sensor.status_message ? `: ${sensor.status_message}` : ''}. It cannot connect until an admin enables it.`
          : 'Access revoked. The sensor can no longer connect.',
    })
  } else if (!sensor.last_seen_at) {
    checks.push({
      key: 'heartbeat',
      label: 'Heartbeat',
      status: 'warning',
      text: 'No heartbeat yet. Install the sensor with its key; it shows up here within a minute.',
      action: 'install',
    })
  } else if (state === 'idle') {
    checks.push({
      key: 'heartbeat',
      label: 'Heartbeat',
      status: 'info',
      text: `Last run ${age(sensor.last_seen_at, now)}. A CI sensor connects only while it runs.`,
    })
  } else if (state === 'online' || state === 'degraded') {
    checks.push({
      key: 'heartbeat',
      label: 'Heartbeat',
      status: 'ok',
      text: age(sensor.last_seen_at, now),
      aside: uptime,
    })
  } else {
    checks.push({
      key: 'heartbeat',
      label: 'Heartbeat',
      status: state === 'stale' ? 'warning' : 'critical',
      text:
        state === 'stale'
          ? `Late: last heartbeat ${age(sensor.last_seen_at, now)}.`
          : `No heartbeat for ${age(sensor.last_seen_at, now).replace(' ago', '')}. Check the host, its network path to the platform and the sensor's logs.`,
      aside: uptime,
    })
  }

  // Outbox (results waiting on the sensor)
  const ob = sensor.outbox
  if (!oneShot) {
    if (!ob) {
      checks.push({
        key: 'outbox',
        label: 'Outbox',
        status: 'info',
        text: 'Not reported. Sensors from v0.4.0 report results waiting to upload.',
      })
    } else {
      const lost = ob.dead_letter_count + ob.evicted_count
      const reported = `reported ${age(ob.reported_at, now)}`
      if (lost > 0) {
        checks.push({
          key: 'outbox',
          label: 'Outbox',
          status: 'critical',
          text:
            ob.dead_letter_count > 0
              ? `${ob.dead_letter_count} results were refused for good. Run openctemio-sensor -outbox-status on the host to see why.`
              : `${ob.evicted_count} results were dropped at the outbox's size or age limit.`,
          aside: reported,
        })
      } else if (ob.pending_count > 0) {
        checks.push({
          key: 'outbox',
          label: 'Outbox',
          status: sensor.outbox_warning ? 'warning' : 'ok',
          text: `${ob.pending_count.toLocaleString()} results waiting to upload${ob.oldest_age_seconds ? `, the oldest for ${formatDurationShort(ob.oldest_age_seconds)}` : ''}.${sensor.outbox_warning ? ' Check that the sensor can reach the platform URL.' : ''}`,
          aside: reported,
        })
      } else {
        checks.push({
          key: 'outbox',
          label: 'Outbox',
          status: 'ok',
          text: 'Empty, nothing waiting to upload',
          aside: reported,
        })
      }
    }
  }

  // API key
  const k = keyExpiry(sensor.key_expires_at, now)
  if (k.kind === 'expired') {
    checks.push({
      key: 'key',
      label: 'API key',
      status: 'critical',
      text: 'Expired: the sensor cannot connect. Rotate the key and update the sensor.',
      action: 'rotate_key',
    })
  } else if (k.kind === 'soon') {
    checks.push({
      key: 'key',
      label: 'API key',
      status: 'warning',
      text: `Expires in ${k.days} ${k.days === 1 ? 'day' : 'days'}. The sensor renews it on its own; rotate it now if it can't.`,
      action: 'rotate_key',
    })
  } else if (k.kind === 'later') {
    checks.push({ key: 'key', label: 'API key', status: 'ok', text: `Expires in ${k.days} days` })
  } else if (k.kind === 'never') {
    checks.push({ key: 'key', label: 'API key', status: 'ok', text: 'Never expires' })
  }

  // Version
  const v = normalizeSensorVersion(sensor.version)
  const vs = sensorVersionStatus(sensor, channel.latest, channel.min)
  checks.push(
    !v
      ? { key: 'version', label: 'Version', status: 'info', text: 'Not reported yet' }
      : vs === 'unsupported'
        ? {
            key: 'version',
            label: 'Version',
            status: 'critical',
            text: `${v}, older than the minimum supported ${channel.min}. Upgrade the sensor.`,
            action: 'install',
          }
        : vs === 'update_available'
          ? {
              key: 'version',
              label: 'Version',
              status: 'info',
              text: `${v}; ${channel.latest} is available.`,
              action: 'install',
            }
          : vs === 'latest'
            ? { key: 'version', label: 'Version', status: 'ok', text: `${v}, the latest release` }
            : { key: 'version', label: 'Version', status: 'info', text: v }
  )

  // SDK, only when it needs attention (the version line covers the rest)
  const sdk = sensorSdkVersion(sensor)
  const sdkStatus = sensorSdkStatus(sensor)
  const sdkReason = sensor.health_reasons?.find((r) => r.code === 'sdk_unsupported')
  if (sdkStatus === 'unsupported' || sdkReason) {
    checks.push({
      key: 'sdk',
      label: 'SDK',
      status: 'warning',
      text: `${sdk ?? 'The SDK'} is below the minimum supported${channel.sdkMin ? ` ${channel.sdkMin}` : ''}. Upgrade the sensor.`,
      action: 'install',
    })
  } else if (sdkStatus === 'outdated') {
    checks.push({
      key: 'sdk',
      label: 'SDK',
      status: 'info',
      text: `${sdk ?? 'The SDK'} is outdated${channel.sdkLatest ? `; ${channel.sdkLatest} is available` : ''}.`,
      action: 'install',
    })
  }

  // Protocol (RFC-029), once the API reports it
  if (sensor.protocol) {
    const p = sensorProtocolOf(sensor)
    checks.push(
      p === 'v1'
        ? {
            key: 'protocol',
            label: 'Protocol',
            status: 'warning',
            text: `v1, deprecated. Upgrade the sensor to ${ctx.protocolV2Version} or later before ${ctx.protocolV1Sunset}.`,
            action: 'install',
          }
        : { key: 'protocol', label: 'Protocol', status: 'ok', text: 'v2' }
    )
  }

  // Tools: what dispatch uses (the sensor's report narrowed by its limit,
  // or the tools set on it when it reports nothing)
  const tools = dispatchTools(sensor)
  const missing = toolsNotInstalled(sensor)
  const reported = hasReportedTools(sensor)
  const scans = sensor.type !== 'collector'
  if (missing.length > 0 && scans && !oneShot) {
    checks.push({
      key: 'tools',
      label: 'Tools',
      status: 'warning',
      text: `${tools.length > 0 ? `${tools.join(', ')}. ` : ''}Set but not installed: ${missing.join(', ')}; scans for ${missing.length === 1 ? 'it are' : 'them are'} not sent here.`,
      action: 'edit',
    })
  } else if (tools.length > 0) {
    checks.push({ key: 'tools', label: 'Tools', status: 'ok', text: tools.join(', ') })
  } else if (scans && !oneShot) {
    checks.push({
      key: 'tools',
      label: 'Tools',
      status: 'warning',
      text: reported
        ? 'The sensor reports no usable tool (none installed, or none its tool limit allows), so no scan can be dispatched to it.'
        : 'None configured, so no scan can be dispatched to it.',
      action: 'edit',
    })
  }

  // Scanner content (RFC-031), once the sensor reports it
  const content = contentCheckSummary(sensor, now)
  if (content) checks.push({ key: 'content', label: 'Content', ...content })

  // Zone
  if (ctx.zones) {
    const mine = ctx.zones.filter((z) => z.sensor_ids.includes(sensor.id))
    if (mine.length === 0) {
      checks.push({
        key: 'zone',
        label: 'Zone',
        status: 'info',
        text: ctx.zones.length
          ? 'No zone: it takes jobs no zone claims.'
          : 'No scan zones in this organization.',
        action: ctx.zones.length ? 'zones' : undefined,
      })
    } else {
      const fleet = ctx.fleet ?? []
      const parts = mine.map((z) => {
        const members = fleet.filter((s) => z.sensor_ids.includes(s.id))
        const online = members.filter((s) => {
          const st = sensorState(s, now, thresholds)
          return st === 'online' || st === 'degraded'
        }).length
        const ranges = z.ranges.length ? ` · ${z.ranges.slice(0, 2).join(', ')}` : ''
        return `${z.name}${ranges} (${online} of ${members.length} online)`
      })
      checks.push({ key: 'zone', label: 'Zone', status: 'ok', text: parts.join('; ') })
    }
  }

  // An error the sensor reported
  const err = sensor.health_reasons?.find((r) => r.code === 'error_reported')
  if (err) checks.push({ key: 'error', label: 'Error', status: 'warning', text: err.message })

  return checks
}
