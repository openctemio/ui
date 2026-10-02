'use client'

import { AlertTriangle, CheckCircle2, Circle, MinusCircle } from 'lucide-react'

import { useTranslation } from '@/context/i18n-provider'
import { cn } from '@/lib/utils'
import type { Sensor, SensorSdkStatus, SensorVersionStatus } from '@/lib/api/sensor-types'

import { capacityLabel, sensorCapacity, type SensorToolRow } from '../lib/capabilities'
import { formatDurationShort, keyExpiry } from '../lib/format'
import { isOneShotSensor } from '../lib/sensor-state'
import {
  normalizeSensorVersion,
  sensorSdkStatus,
  sensorSdkVersion,
  sensorVersionStatus,
} from '../lib/sensor-version'

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

/**
 * The host name a sensor reports, or null when it adds nothing: not reported,
 * or the same as the sensor's name (installs often name the sensor after its
 * host).
 */
export function distinctHostname(sensor: Pick<Sensor, 'name' | 'hostname'>): string | null {
  const host = sensor.hostname?.trim()
  if (!host || host.toLowerCase() === sensor.name.trim().toLowerCase()) return null
  return host
}

/**
 * Name, then host and address on lines of their own (short lines instead of
 * one long one); badges for a platform sensor and the deprecated protocol.
 */
export function SensorNameCell({ sensor }: { sensor: Sensor }) {
  const host = distinctHostname(sensor)
  const ip = sensor.ip_address || null
  const fallback = isOneShotSensor(sensor) ? 'CI/CD runner · one-shot' : 'No host reported yet'
  return (
    <div className="flex min-w-0 flex-col">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-medium">{sensor.name}</span>
        {sensor.is_platform_sensor && <SensorTag>Platform</SensorTag>}
        <ProtocolTag sensor={sensor} />
      </span>
      {host && (
        <span
          className={cn('truncate text-xs', muted)}
          title="Host name the sensor reports"
          data-slot="sensor-host"
        >
          {host}
        </span>
      )}
      {ip && (
        <span
          className={cn('truncate text-xs tabular-nums', muted)}
          title="Address the platform sees the sensor connect from"
          data-slot="sensor-ip"
        >
          {ip}
        </span>
      )}
      {!sensor.hostname && !ip && <span className={cn('truncate text-xs', muted)}>{fallback}</span>}
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

const SDK_TAG: Record<
  SensorSdkStatus,
  { key: string; label: string; tone: 'warning' | 'destructive' } | null
> = {
  current: null,
  unknown: null,
  outdated: { key: 'sensors.version.sdkOutdated', label: 'SDK outdated', tone: 'warning' },
  unsupported: {
    key: 'sensors.version.sdkUnsupported',
    label: 'SDK unsupported',
    tone: 'destructive',
  },
}

export type SensorVersionFields = Pick<
  Sensor,
  | 'version'
  | 'version_status'
  | 'sdk_name'
  | 'sdk_version'
  | 'sdk_status'
  | 'sensor_product'
  | 'sensor_commit'
  | 'sensor_build_time'
>

/** The build facts behind the version, for the tooltip (empty when none). */
export function sensorBuildTooltip(
  sensor: SensorVersionFields,
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string,
  locale?: string
): string {
  const lines: string[] = []
  if (sensor.sensor_product) {
    lines.push(t('sensors.version.product', 'Product: {value}', { value: sensor.sensor_product }))
  }
  if (sensor.sensor_commit) {
    lines.push(t('sensors.version.commit', 'Commit: {value}', { value: sensor.sensor_commit }))
  }
  if (sensor.sensor_build_time) {
    const d = new Date(sensor.sensor_build_time)
    if (!Number.isNaN(d.getTime())) {
      lines.push(t('sensors.version.built', 'Built: {value}', { value: d.toLocaleString(locale) }))
    }
  }
  const sdk = sensorSdkVersion(sensor)
  if (sensor.sdk_name || sdk) {
    lines.push(
      t('sensors.version.sdkLine', 'SDK: {value}', {
        value: [sensor.sdk_name, sdk].filter(Boolean).join(' '),
      })
    )
  }
  return lines.join('\n')
}

/**
 * "v0.5.0" over "SDK v0.9.0" (unknown parts left out), how the sensor
 * version compares to the release channel, and a warning when its SDK is
 * outdated or unsupported. The build facts are in the tooltip. The table,
 * the phone cards and the drawer all show the version through this.
 */
export function SensorVersionCell({
  sensor,
  latest,
  min,
  sdkLatest,
  sdkMin,
  showChannelTag = true,
}: {
  sensor: SensorVersionFields
  latest?: string | null
  min?: string | null
  /** Supported SDK range from GET /sensors/stats, for the SDK tag's tooltip. */
  sdkLatest?: string | null
  sdkMin?: string | null
  /** The latest / update / unsupported tag for the sensor release. */
  showChannelTag?: boolean
}) {
  const { t, locale } = useTranslation()
  const v = normalizeSensorVersion(sensor.version)
  const sdk = sensorSdkVersion(sensor)
  if (!v && !sdk) {
    return (
      <span className={cn('text-sm', muted)}>
        {t('sensors.version.notReported', 'Not reported')}
      </span>
    )
  }
  const status = sensorVersionStatus(sensor, latest, min)
  const tag = v && showChannelTag ? VERSION_TAG[status] : null
  const title =
    status === 'update_available' && latest
      ? `${latest} is available`
      : status === 'unsupported' && min
        ? `Older than the minimum supported ${min}`
        : undefined
  const sdkStatus = sensorSdkStatus(sensor)
  const sdkTag = SDK_TAG[sdkStatus]
  const sdkTitle =
    sdkStatus === 'unsupported'
      ? sdkMin
        ? t('sensors.version.sdkUnsupportedMin', 'Older than the minimum supported SDK {min}', {
            min: sdkMin,
          })
        : t('sensors.version.sdkUnsupportedHint', 'Below the minimum supported SDK')
      : sdkStatus === 'outdated'
        ? sdkLatest
          ? t('sensors.version.sdkOutdatedLatest', 'SDK {latest} is available', {
              latest: sdkLatest,
            })
          : t('sensors.version.sdkOutdatedHint', 'A newer SDK is available')
        : undefined
  const build = sensorBuildTooltip(sensor, t, locale)
  // Two short lines instead of one long one: the sensor release with its
  // channel tag, then the SDK (smaller, muted) with its warning.
  return (
    <span className="inline-flex flex-col gap-0.5" title={build || undefined}>
      {v && (
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="whitespace-nowrap text-sm tabular-nums" data-slot="sensor-version">
            {v}
          </span>
          {tag && (
            <SensorTag tone={tag.tone} title={title}>
              {tag.label}
            </SensorTag>
          )}
        </span>
      )}
      {sdk && (
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span
            className={cn('whitespace-nowrap text-xs tabular-nums', muted)}
            data-slot="sdk-version"
          >
            {t('sensors.version.sdk', 'SDK')} {sdk}
          </span>
          {sdkTag && (
            <SensorTag tone={sdkTag.tone} title={sdkTitle}>
              {t(sdkTag.key, sdkTag.label)}
            </SensorTag>
          )}
        </span>
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
  // The capacity dispatch uses: the sensor's reported cap narrowed by the
  // limit set on it.
  const max = sensorCapacity(sensor).effective || 0
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  return (
    <span className="inline-flex items-center gap-2 tabular-nums" title={capacityLabel(sensor)}>
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

/**
 * The first tools, then "+N" (all of them on hover), a "not installed" tag
 * for tools set on the sensor that it reports missing, and a quiet "not
 * allowed" tag for installed tools its narrowed tool list leaves out.
 */
export function SensorToolsCell({
  tools,
  missing,
  notAllowed,
  max = 2,
}: {
  tools: string[] | null | undefined
  /** Set on the sensor but reported as not installed. */
  missing?: string[]
  /** Installed, but the sensor's tool list leaves them out (installed later). */
  notAllowed?: string[]
  max?: number
}) {
  const { t } = useTranslation()
  const list = tools ?? []
  const gone = missing ?? []
  const left = notAllowed ?? []
  const tag = gone.length > 0 && (
    <SensorTag tone="warning" title={`Set on the sensor but not installed: ${gone.join(', ')}`}>
      {gone.length} not installed
    </SensorTag>
  )
  const leftTag = left.length > 0 && (
    <SensorTag
      tone="info"
      title={t('sensors.tools.notAllowedTitle', 'Installed but not allowed: {list}', {
        list: left.join(', '),
      })}
    >
      {t('sensors.tools.notAllowedTag', '{count} not allowed', { count: left.length })}
    </SensorTag>
  )
  if (list.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={cn('text-sm', muted)}>none</span>
        {tag}
        {leftTag}
      </span>
    )
  }
  const shown = list.slice(0, max).join(', ')
  const more = list.length - max
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('text-sm', muted)} title={list.join(', ')}>
        {shown}
        {more > 0 ? ` +${more}` : ''}
      </span>
      {tag}
      {leftTag}
    </span>
  )
}

const TOOL_STATUS: Record<
  SensorToolRow['status'],
  { icon: typeof CheckCircle2; className: string; label: string }
> = {
  ready: { icon: CheckCircle2, className: 'text-success', label: 'installed' },
  declared: { icon: Circle, className: muted, label: 'not reported by the sensor' },
  not_installed: { icon: AlertTriangle, className: 'text-warning', label: 'not installed' },
  excluded: { icon: MinusCircle, className: muted, label: 'left out by the tool limit' },
}

/**
 * A sensor's tools for the drawer: one chip per tool with its version and
 * whether it is installed (an icon, and a tag when it is not usable).
 */
export function SensorToolList({ rows }: { rows: SensorToolRow[] }) {
  if (rows.length === 0) return <span className={cn('text-sm', muted)}>none</span>
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Tools">
      {rows.map((r) => {
        const s = TOOL_STATUS[r.status]
        const Icon = s.icon
        return (
          <li
            key={r.name}
            data-tool={r.name}
            data-status={r.status}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-card px-2 text-sm"
          >
            <Icon className={cn('h-3.5 w-3.5 shrink-0', s.className)} aria-label={s.label} />
            <span className={cn(r.status === 'ready' || r.status === 'declared' ? '' : muted)}>
              {r.name}
            </span>
            {r.version && <span className={cn('text-xs tabular-nums', muted)}>{r.version}</span>}
            {r.status === 'not_installed' && <SensorTag tone="warning">not installed</SensorTag>}
            {r.status === 'excluded' && (
              <SensorTag title="Installed, but the sensor's tool limit leaves it out">
                not allowed
              </SensorTag>
            )}
          </li>
        )
      })}
    </ul>
  )
}
