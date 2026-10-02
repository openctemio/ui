/**
 * Sensor-reported capabilities (api RFC-029 §4.3.1). A sensor reports the
 * tools it really has (with versions), what it serves and how many jobs it
 * runs at once. The tools, capabilities and max_concurrent_jobs set on the
 * sensor are limits that can only narrow that report. These helpers read the
 * API's `reported` / `effective` blocks and fall back to the set values on
 * APIs and sensors without a report.
 */

import type { Sensor } from '@/lib/api/sensor-types'

/** How one tool stands on a sensor. */
export type SensorToolStatus =
  /** Installed, and dispatch may use it. */
  | 'ready'
  /** Set on the sensor (or reported), but the sensor reports it missing. */
  | 'not_installed'
  /** Installed, but the sensor's tool limit leaves it out. */
  | 'excluded'
  /** Set on the sensor; the sensor has not reported its tools. */
  | 'declared'

export interface SensorToolRow {
  name: string
  version?: string
  status: SensorToolStatus
}

type ToolSource = Pick<Sensor, 'tools' | 'reported' | 'effective'>

/** Whether the sensor reported its tool inventory. */
export function hasReportedTools(sensor: Pick<Sensor, 'reported'>): boolean {
  return Array.isArray(sensor.reported?.tools)
}

/** The tools dispatch may send the sensor work for. */
export function dispatchTools(sensor: ToolSource): string[] {
  return sensor.effective?.tools ?? sensor.tools ?? []
}

/**
 * Every tool worth showing for a sensor: its reported inventory with
 * versions, plus the tools set on it that it does not report. Ready tools
 * first, then excluded, then missing; alphabetical within each.
 */
export function sensorToolRows(sensor: ToolSource): SensorToolRow[] {
  const limit = sensor.tools ?? []
  if (!hasReportedTools(sensor)) {
    return [...limit].sort().map((name) => ({ name, status: 'declared' as const }))
  }
  const effective = new Set(dispatchTools(sensor))
  const rows = new Map<string, SensorToolRow>()
  for (const t of sensor.reported?.tools ?? []) {
    const status: SensorToolStatus = !t.installed
      ? 'not_installed'
      : effective.has(t.name)
        ? 'ready'
        : 'excluded'
    rows.set(t.name, { name: t.name, version: t.version || undefined, status })
  }
  for (const name of limit) {
    if (!rows.has(name)) rows.set(name, { name, status: 'not_installed' })
  }
  const order: Record<SensorToolStatus, number> = {
    ready: 0,
    declared: 0,
    excluded: 1,
    not_installed: 2,
  }
  return [...rows.values()].sort(
    (a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name)
  )
}

/** Tools set on the sensor that it reports as not installed. */
export function toolsNotInstalled(
  sensor: ToolSource & Pick<Sensor, 'capability_mismatch'>
): string[] {
  if (sensor.capability_mismatch?.tools_not_installed) {
    return sensor.capability_mismatch.tools_not_installed
  }
  const limit = new Set<string>(sensor.tools ?? [])
  return sensorToolRows(sensor)
    .filter((r) => r.status === 'not_installed' && limit.has(r.name))
    .map((r) => r.name)
}

export interface SensorCapacity {
  /** The concurrent jobs dispatch allows. */
  effective: number
  /** The sensor's own cap; null when it did not report one. */
  reported: number | null
  /** The limit set on the sensor. */
  limit: number
}

type CapacitySource = Pick<Sensor, 'max_concurrent_jobs' | 'reported' | 'effective'>

/** The sensor's capacity: effective, reported and the limit. */
export function sensorCapacity(sensor: CapacitySource): SensorCapacity {
  const limit = sensor.max_concurrent_jobs ?? 0
  const reported = sensor.reported?.max_concurrent_jobs ?? null
  let effective = sensor.effective?.max_concurrent_jobs
  if (effective == null) {
    effective = reported != null && reported > 0 && limit > 0 ? Math.min(reported, limit) : limit
  }
  return { effective, reported, limit }
}

/** "reported 3 · limit 5", or "limit 5" when the sensor reports nothing. */
export function capacityLabel(sensor: CapacitySource): string {
  const c = sensorCapacity(sensor)
  return c.reported != null ? `reported ${c.reported} · limit ${c.limit}` : `limit ${c.limit}`
}
