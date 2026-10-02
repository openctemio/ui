import type { Sensor, SensorRole, SensorState, SensorVersionStatus } from '@/lib/api/sensor-types'
import { sensorRoleOf } from '@/lib/api/sensor-types'
import type { ScanZone } from '@/lib/api/scan-zone-types'

import { dispatchTools, sensorCapacity } from './capabilities'
import { canTakeJobs, sensorState, SENSOR_STATES, type FleetThresholds } from './sensor-state'
import {
  compareSensorVersions,
  normalizeSensorVersion,
  sensorVersionStatus,
} from './sensor-version'

/** The platform's release channel (GET /sensors/stats). */
export interface ReleaseChannel {
  latest?: string | null
  min?: string | null
}

/** What a health reason is about, for the "Needs attention" caption. */
export type AttentionKind = 'backlog' | 'key' | 'version' | 'tools' | 'content' | 'error'

function attentionKindsOf(sensor: Sensor, channel: ReleaseChannel): AttentionKind[] {
  const kinds: AttentionKind[] = []
  for (const r of sensor.health_reasons ?? []) {
    const kind: AttentionKind | null = r.code.startsWith('outbox_')
      ? 'backlog'
      : r.code.startsWith('key_')
        ? 'key'
        : r.code === 'version_unsupported'
          ? 'version'
          : r.code === 'no_tools'
            ? 'tools'
            : r.code.startsWith('content_')
              ? 'content'
              : r.code === 'error_reported'
                ? 'error'
                : null
    if (kind && !kinds.includes(kind)) kinds.push(kind)
  }
  // Older APIs send no reasons: derive what the page can see itself.
  if (!sensor.health_reasons) {
    if (sensor.outbox_warning) kinds.push('backlog')
    if (sensorVersionStatus(sensor, channel.latest, channel.min) === 'unsupported') {
      kinds.push('version')
    }
  }
  return kinds
}

function isEnabled(state: SensorState): boolean {
  return state !== 'disabled' && state !== 'revoked'
}

/** An enabled sensor with something to fix (the "Needs attention" metric). */
export function needsAttention(
  sensor: Sensor,
  now: number,
  thresholds: FleetThresholds | undefined,
  channel: ReleaseChannel
): boolean {
  return (
    isEnabled(sensorState(sensor, now, thresholds)) && attentionKindsOf(sensor, channel).length > 0
  )
}

export interface FleetSummary {
  total: number
  /** Not disabled or revoked. */
  enabled: number
  byState: Record<SensorState, number>
  /** Long-running and online or degraded: the platform can dispatch to them. */
  canTakeJobs: number
  needsAttention: number
  attentionKinds: AttentionKind[]
  /** Below the latest release (unsupported included). */
  updates: number
  unsupported: number
  jobsRunning: number
  jobSlots: number
  /** Zones with at least one sensor that can take jobs (when zones exist). */
  zones: { total: number; covered: number; uncovered: string[] } | null
  /** Enabled sensors still on the deprecated protocol v1 (RFC-029). */
  protocolV1: number
  /** Whether any sensor reports protocol telemetry (the API sends it). */
  hasProtocolInfo: boolean
}

/** The protocol a sensor last spoke, from the API's telemetry (RFC-029). */
export type SensorProtocolFilter = 'v2' | 'v1' | 'unknown'

export function sensorProtocolOf(sensor: Pick<Sensor, 'protocol'>): SensorProtocolFilter {
  if (!sensor.protocol) return 'unknown'
  return sensor.protocol.deprecated || sensor.protocol.version < 2 ? 'v1' : 'v2'
}

/** The health strip's numbers, computed over the rows the table shows. */
export function summarizeFleet(
  sensors: Sensor[],
  now: number,
  thresholds: FleetThresholds | undefined,
  channel: ReleaseChannel,
  zones?: Pick<ScanZone, 'id' | 'name' | 'sensor_ids'>[]
): FleetSummary {
  const byState = Object.fromEntries(SENSOR_STATES.map((s) => [s, 0])) as Record<
    SensorState,
    number
  >
  const attentionKinds: AttentionKind[] = []
  let can = 0
  let attention = 0
  let updates = 0
  let unsupported = 0
  let jobsRunning = 0
  let jobSlots = 0
  let protocolV1 = 0
  let hasProtocolInfo = false
  const ready = new Set<string>()
  for (const s of sensors) {
    const state = sensorState(s, now, thresholds)
    byState[state]++
    if (canTakeJobs(s, now, thresholds)) {
      can++
      ready.add(s.id)
      jobsRunning += s.current_jobs ?? 0
      jobSlots += sensorCapacity(s).effective
    }
    if (s.protocol) hasProtocolInfo = true
    if (isEnabled(state) && sensorProtocolOf(s) === 'v1') protocolV1++
    if (isEnabled(state)) {
      const kinds = attentionKindsOf(s, channel)
      if (kinds.length) attention++
      for (const k of kinds) if (!attentionKinds.includes(k)) attentionKinds.push(k)
    }
    const vs = sensorVersionStatus(s, channel.latest, channel.min)
    if (vs === 'update_available' || vs === 'unsupported') updates++
    if (vs === 'unsupported') unsupported++
  }
  const zoneSummary =
    zones && zones.length > 0
      ? (() => {
          const uncovered = zones
            .filter((z) => !z.sensor_ids.some((id) => ready.has(id)))
            .map((z) => z.name)
          return { total: zones.length, covered: zones.length - uncovered.length, uncovered }
        })()
      : null
  return {
    total: sensors.length,
    enabled: sensors.length - byState.disabled - byState.revoked,
    byState,
    canTakeJobs: can,
    needsAttention: attention,
    attentionKinds,
    updates,
    unsupported,
    jobsRunning,
    jobSlots,
    zones: zoneSummary,
    protocolV1,
    hasProtocolInfo,
  }
}

/**
 * The tenant's own sensors. Shared platform sensors have their own page
 * (/sensors/platform); the API leaves them out of GET /sensors, and this keeps
 * an older API from mixing them into the tenant's list and counts.
 */
export function tenantSensors<T extends Pick<Sensor, 'is_platform_sensor'>>(sensors: T[]): T[] {
  return sensors.filter((s) => !s.is_platform_sensor)
}

/** Execution mode facet: long-running daemons vs one-shot CI runs. */
export type SensorModeFilter = 'daemon' | 'ci'

export interface FleetFilters {
  q: string
  roles: SensorRole[]
  states: SensorState[]
  versions: SensorVersionStatus[]
  modes: SensorModeFilter[]
  protocols: SensorProtocolFilter[]
  /** The "Needs attention" metric. */
  attention: boolean
}

export const EMPTY_FLEET_FILTERS: FleetFilters = {
  q: '',
  roles: [],
  states: [],
  versions: [],
  modes: [],
  protocols: [],
  attention: false,
}

/** Number of facets in use (for the Filters button badge). */
export function activeFilterCount(f: FleetFilters): number {
  return (
    f.roles.length +
    f.states.length +
    f.versions.length +
    f.modes.length +
    f.protocols.length +
    (f.attention ? 1 : 0)
  )
}

function searchText(s: Sensor): string {
  return [
    s.name,
    s.description,
    s.hostname,
    s.ip_address,
    normalizeSensorVersion(s.version),
    ...(s.tools ?? []),
    ...dispatchTools(s),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** The rows the table shows: every facet narrows (AND), values within one widen (OR). */
export function filterSensors(
  sensors: Sensor[],
  f: FleetFilters,
  now: number,
  thresholds: FleetThresholds | undefined,
  channel: ReleaseChannel
): Sensor[] {
  const q = f.q.trim().toLowerCase()
  return sensors.filter((s) => {
    if (q && !searchText(s).includes(q)) return false
    if (f.roles.length && !f.roles.includes(sensorRoleOf(s.type))) return false
    if (f.states.length && !f.states.includes(sensorState(s, now, thresholds))) return false
    if (
      f.versions.length &&
      !f.versions.includes(sensorVersionStatus(s, channel.latest, channel.min))
    ) {
      return false
    }
    if (f.modes.length) {
      const mode: SensorModeFilter =
        s.execution_mode === 'standalone' || s.type === 'runner' ? 'ci' : 'daemon'
      if (!f.modes.includes(mode)) return false
    }
    if (f.protocols.length && !f.protocols.includes(sensorProtocolOf(s))) return false
    if (f.attention && !needsAttention(s, now, thresholds, channel)) return false
    return true
  })
}

export type FleetGroupBy = 'none' | 'zone' | 'role' | 'version'

export interface SensorGroup {
  key: string
  label: string
  sensors: Sensor[]
  /** The zone, when grouping by zone ("No zone" has none). */
  zone?: Pick<ScanZone, 'id' | 'name' | 'ranges' | 'sensor_ids'>
}

const NO_ZONE = '__none__'
const NO_VERSION = '__none__'

/**
 * Groups for the table. By zone, a sensor goes under its first zone (zones in
 * name order) so every row appears once; sensors in no zone come last. By
 * version, newest first and "Not reported" last.
 */
export function groupSensors(
  sensors: Sensor[],
  by: FleetGroupBy,
  zones: Pick<ScanZone, 'id' | 'name' | 'ranges' | 'sensor_ids'>[] = []
): SensorGroup[] {
  if (by === 'none') return [{ key: 'all', label: 'All sensors', sensors }]

  if (by === 'role') {
    const scanners = sensors.filter((s) => sensorRoleOf(s.type) === 'scanner')
    const collectors = sensors.filter((s) => sensorRoleOf(s.type) === 'collector')
    return [
      { key: 'scanner', label: 'Scanners', sensors: scanners },
      { key: 'collector', label: 'Collectors', sensors: collectors },
    ].filter((g) => g.sensors.length > 0)
  }

  if (by === 'version') {
    const groups = new Map<string, Sensor[]>()
    for (const s of sensors) {
      const v = normalizeSensorVersion(s.version) ?? NO_VERSION
      groups.set(v, [...(groups.get(v) ?? []), s])
    }
    const keys = [...groups.keys()].sort((a, b) => {
      if (a === NO_VERSION) return 1
      if (b === NO_VERSION) return -1
      const c = compareSensorVersions(b, a)
      return c === null ? a.localeCompare(b) : c
    })
    return keys.map((k) => ({
      key: k,
      label: k === NO_VERSION ? 'Not reported' : k,
      sensors: groups.get(k) ?? [],
    }))
  }

  // by zone
  const ordered = [...zones].sort((a, b) => a.name.localeCompare(b.name))
  const zoneOf = new Map<string, string>()
  for (const z of ordered) {
    for (const id of z.sensor_ids) if (!zoneOf.has(id)) zoneOf.set(id, z.id)
  }
  const buckets = new Map<string, Sensor[]>()
  for (const s of sensors) {
    const k = zoneOf.get(s.id) ?? NO_ZONE
    buckets.set(k, [...(buckets.get(k) ?? []), s])
  }
  const out: SensorGroup[] = []
  for (const z of ordered) {
    const rows = buckets.get(z.id)
    if (rows?.length) out.push({ key: z.id, label: z.name, sensors: rows, zone: z })
  }
  const rest = buckets.get(NO_ZONE)
  if (rest?.length) out.push({ key: NO_ZONE, label: 'No zone', sensors: rest })
  return out
}
