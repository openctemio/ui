/**
 * The edit-sensor form: what an administrator can change on a sensor and the
 * PUT /api/v1/sensors/{id} body it becomes. The update API accepts name,
 * description, status, tools, capabilities and max_concurrent_jobs. Tools,
 * capabilities and the job count are limits that narrow what the sensor
 * reports (api RFC-029 §4.3.1): a list replaces the limit, [] removes it,
 * an absent field leaves it as it is. Execution mode is not accepted by the
 * update API; it is fixed when the sensor is created.
 */

import type { Sensor, UpdateSensorRequest } from '@/lib/api/sensor-types'

export type ToolLimitMode = 'all' | 'only'

export interface SensorEditDraft {
  name: string
  description: string
  /** Active (true) or disabled (false). Revoking is a separate action. */
  enabled: boolean
  toolMode: ToolLimitMode
  /** The allowed tools when toolMode is 'only' (sorted). */
  tools: string[]
  /** The concurrency limit as typed. */
  maxJobs: string
  /** The scan zones the sensor belongs to (sorted). */
  zoneIds: string[]
}

export const MAX_JOBS_LIMIT = 100

/** The installed tools the sensor reports, sorted; null before its first report. */
export function reportedToolNames(sensor: Pick<Sensor, 'reported'>): string[] | null {
  const tools = sensor.reported?.tools
  if (!Array.isArray(tools)) return null
  return [...new Set(tools.filter((t) => t.installed).map((t) => t.name))].sort()
}

/** The form's starting values for a sensor and the zones it is in. */
export function sensorEditDraft(
  sensor: Pick<
    Sensor,
    'name' | 'description' | 'status' | 'tools' | 'max_concurrent_jobs' | 'reported'
  >,
  zoneIds: string[] = []
): SensorEditDraft {
  const reported = reportedToolNames(sensor)
  const limit = [...new Set(sensor.tools ?? [])].sort()
  const tools = reported ? limit.filter((t) => reported.includes(t)) : limit
  return {
    name: sensor.name,
    description: sensor.description ?? '',
    enabled: sensor.status === 'active',
    toolMode: limit.length > 0 ? 'only' : 'all',
    tools,
    maxJobs: sensor.max_concurrent_jobs ? String(sensor.max_concurrent_jobs) : '',
    zoneIds: [...zoneIds].sort(),
  }
}

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i])

export interface SensorEditErrors {
  name?: string
  description?: string
  tools?: string
  maxJobs?: string
}

export function validateSensorEdit(draft: SensorEditDraft, initial: SensorEditDraft) {
  const errors: SensorEditErrors = {}
  const name = draft.name.trim()
  if (!name) errors.name = 'Enter a name.'
  else if (name.length > 255) errors.name = 'Use 255 characters or fewer.'
  if (draft.description.length > 1000) errors.description = 'Use 1000 characters or fewer.'
  if (draft.toolMode === 'only' && draft.tools.length === 0) {
    errors.tools = 'Pick at least one tool, or allow all reported tools.'
  }
  if (draft.maxJobs !== initial.maxJobs) {
    const n = Number(draft.maxJobs)
    if (!/^\d+$/.test(draft.maxJobs.trim()) || n < 1 || n > MAX_JOBS_LIMIT) {
      errors.maxJobs = `Enter a whole number from 1 to ${MAX_JOBS_LIMIT}.`
    }
  }
  return errors
}

export function isSensorEditDirty(draft: SensorEditDraft, initial: SensorEditDraft): boolean {
  return (
    draft.name !== initial.name ||
    draft.description !== initial.description ||
    draft.enabled !== initial.enabled ||
    toolsChanged(draft, initial) ||
    draft.maxJobs !== initial.maxJobs ||
    !sameList(draft.zoneIds, initial.zoneIds)
  )
}

function toolsChanged(draft: SensorEditDraft, initial: SensorEditDraft): boolean {
  if (draft.toolMode !== initial.toolMode) return true
  return draft.toolMode === 'only' && !sameList(draft.tools, initial.tools)
}

/**
 * The PUT body: only what changed. A tool limit is sent with the capability
 * limit that goes with it: none when the sensor reports its capabilities
 * (its report says what it serves), else the capabilities of the allowed
 * tools, so a sensor without a capability report still gets jobs.
 */
export function sensorUpdateBody(
  sensor: Pick<Sensor, 'reported'>,
  draft: SensorEditDraft,
  initial: SensorEditDraft,
  capabilitiesForTools: (tools: string[]) => string[]
): UpdateSensorRequest {
  const body: UpdateSensorRequest = {}
  const name = draft.name.trim()
  if (name !== initial.name) body.name = name
  if (draft.description !== initial.description) body.description = draft.description.trim()
  if (draft.enabled !== initial.enabled) body.status = draft.enabled ? 'active' : 'disabled'
  if (toolsChanged(draft, initial)) {
    const allowed = draft.toolMode === 'all' ? [] : [...draft.tools].sort()
    const forCaps = draft.toolMode === 'all' ? (reportedToolNames(sensor) ?? []) : allowed
    body.tools = allowed as UpdateSensorRequest['tools']
    body.capabilities = (
      sensor.reported?.capabilities != null ? [] : capabilitiesForTools(forCaps)
    ) as UpdateSensorRequest['capabilities']
  }
  if (draft.maxJobs !== initial.maxJobs) body.max_concurrent_jobs = Number(draft.maxJobs)
  return body
}

/**
 * The PUT body for the "Allow these tools" review after the first heartbeat:
 * every installed tool the sensor reported checked means no limit (all
 * reported tools, now and later); a subset becomes the limit. null when
 * nothing would change, so "Done" with everything checked sends nothing.
 */
export function allowedToolsBody(
  sensor: Pick<
    Sensor,
    'name' | 'description' | 'status' | 'tools' | 'max_concurrent_jobs' | 'reported'
  >,
  allowed: string[],
  capabilitiesForTools: (tools: string[]) => string[]
): UpdateSensorRequest | null {
  const installed = reportedToolNames(sensor) ?? []
  const picked = [...new Set(allowed.filter((t) => installed.includes(t)))].sort()
  const initial = sensorEditDraft(sensor)
  const all = installed.every((t) => picked.includes(t))
  const draft: SensorEditDraft = {
    ...initial,
    toolMode: all ? 'all' : 'only',
    tools: all ? [] : picked,
  }
  // An empty subset is not a limit the API can express ([] means all): the
  // review keeps "Done" disabled then, and this refuses it as well.
  if (draft.toolMode === 'only' && picked.length === 0) return null
  if (!toolsChanged(draft, initial)) return null
  return sensorUpdateBody(sensor, draft, initial, capabilitiesForTools)
}

/**
 * Installed tools the sensor reports that its tool limit leaves out: a tool
 * installed after the administrator narrowed the list. Empty when there is
 * no limit (every reported tool is allowed) or no report.
 */
export function toolsInstalledNotAllowed(sensor: Pick<Sensor, 'tools' | 'reported'>): string[] {
  const limit = sensor.tools ?? []
  if (limit.length === 0) return []
  const installed = reportedToolNames(sensor) ?? []
  return installed.filter((t) => !limit.includes(t as (typeof limit)[number]))
}

/**
 * The PUT body that adds one installed tool to the sensor's tool limit. The
 * limit stays a limit (the administrator chose to narrow it), so a tool
 * installed later still needs allowing.
 */
export function allowToolBody(
  sensor: Pick<Sensor, 'tools' | 'reported'>,
  tool: string,
  capabilitiesForTools: (tools: string[]) => string[]
): UpdateSensorRequest {
  const tools = [...new Set([...(sensor.tools ?? []), tool])].sort()
  return {
    tools: tools as UpdateSensorRequest['tools'],
    capabilities: (sensor.reported?.capabilities != null
      ? []
      : capabilitiesForTools(tools)) as UpdateSensorRequest['capabilities'],
  }
}

/** Zone membership changes: zones to join and zones to leave. */
export function zoneChanges(draft: SensorEditDraft, initial: SensorEditDraft) {
  return {
    join: draft.zoneIds.filter((z) => !initial.zoneIds.includes(z)),
    leave: initial.zoneIds.filter((z) => !draft.zoneIds.includes(z)),
  }
}
