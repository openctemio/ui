/**
 * Sensor API Types
 *
 * TypeScript types for Sensor Management
 * API endpoint: /api/v1/sensors
 */

// Sensor types - maps to backend SensorType
// runner = CI/CD one-shot, worker = daemon, collector = asset discovery, sensor = EASM
export type SensorType = 'runner' | 'worker' | 'collector' | 'sensor'

/**
 * Sensor role (RFC-023 §9.1, decision D18): what a sensor does, as opposed to
 * its legacy `type`, which mixes what it does with how it runs. The API does
 * not send a role yet (it arrives with RFC-023 Phase 2, together with the
 * endpoint-agent and monitor roles); until then the role is derived from the
 * legacy type exactly as the RFC maps it: worker, runner and the old EASM
 * 'sensor' type scan, a collector collects.
 */
export type SensorRole = 'scanner' | 'collector'

export const SENSOR_ROLES: readonly SensorRole[] = ['scanner', 'collector']

export function sensorRoleOf(type: SensorType): SensorRole {
  return type === 'collector' ? 'collector' : 'scanner'
}

// Admin-controlled status
export type SensorStatus = 'active' | 'disabled' | 'revoked'

// Heartbeat-based health (automatic)
export type SensorHealth = 'unknown' | 'online' | 'offline' | 'error'

export type ExecutionMode = 'standalone' | 'daemon'

/**
 * Operational state computed by the API (GET /sensors): the admin status, the
 * heartbeat age and the problems a heartbeating sensor reports, as one value.
 * Older APIs do not send it; `sensorState()` computes the same ladder then.
 */
export type SensorState =
  'online' | 'degraded' | 'stale' | 'offline' | 'idle' | 'never_connected' | 'disabled' | 'revoked'

/** How a sensor's version compares with the platform's release channel. */
export type SensorVersionStatus = 'latest' | 'update_available' | 'unsupported' | 'unknown'

/** One problem found on a sensor (stable `code`; `message` is a fallback). */
export interface SensorHealthReason {
  code:
    | 'outbox_backlog'
    | 'outbox_dead_letters'
    | 'outbox_evicted'
    | 'key_expired'
    | 'key_expiring'
    | 'version_unsupported'
    | 'no_tools'
    | 'error_reported'
    | (string & {})
  severity: 'warning' | 'critical'
  message: string
}

/** The sensor's last reported outbox (results waiting to be delivered). */
export interface SensorOutbox {
  pending_count: number
  pending_bytes: number
  oldest_age_seconds: number
  dead_letter_count: number
  evicted_count: number
  /** Server time the snapshot was stored. */
  reported_at: string
}

/**
 * What the platform last saw of the sensor's protocol (RFC-029): null before
 * the first heartbeat that recorded it; `deprecated` for protocol v1.
 */
export interface SensorProtocol {
  version: number
  user_agent: string
  seen_at: string
  deprecated: boolean
}

// Sensor capabilities
export const SENSOR_CAPABILITIES = [
  'sast',
  'sca',
  'dast',
  'secrets',
  'iac',
  'infra',
  'collector',
  'container',
  'cloud',
] as const

export type SensorCapability = (typeof SENSOR_CAPABILITIES)[number]

// Sensor tools
export const SENSOR_TOOLS = [
  'semgrep',
  'trivy',
  'nuclei',
  'betterleaks',
  'checkov',
  'tfsec',
  'grype',
  'syft',
  'custom',
] as const

export type SensorTool = (typeof SENSOR_TOOLS)[number]

/**
 * Sensor entity (maps to Sensor in backend)
 */
export interface Sensor {
  id: string
  tenant_id: string
  name: string
  type: SensorType
  description?: string
  capabilities: SensorCapability[]
  tools: SensorTool[]
  execution_mode: ExecutionMode
  status: SensorStatus // Admin-controlled: active, disabled, revoked
  health: SensorHealth // Automatic heartbeat: unknown, online, offline, error
  status_message?: string
  api_key_prefix: string
  version?: string
  hostname?: string
  ip_address?: string
  // System metrics (0 when the sensor does not report them)
  cpu_percent: number
  memory_percent: number
  region?: string
  // Load balancing: current_jobs is what the sensor is running now
  max_concurrent_jobs: number
  current_jobs: number
  available_slots?: number
  load_factor?: number
  // Other fields
  labels: Record<string, string>
  config: Record<string, unknown>
  metadata: Record<string, unknown>
  last_seen_at?: string
  last_error_at?: string | null
  last_offline_at?: string | null
  /** When the current API key stops working; null = never. */
  key_expires_at?: string | null
  /** Process start, from the uptime the heartbeat reports. */
  started_at?: string | null
  uptime_seconds?: number | null
  total_findings: number
  total_scans: number
  error_count: number
  created_at: string
  updated_at: string
  /** Last reported outbox; null when the sensor never reported one. */
  outbox?: SensorOutbox | null
  /** Lost or stuck results in the last outbox snapshot. */
  outbox_warning?: boolean
  // Computed fleet health (newer APIs; see sensorState()).
  state?: SensorState
  health_reasons?: SensorHealthReason[]
  version_status?: SensorVersionStatus
  is_platform_sensor?: boolean
  /** Protocol telemetry (RFC-029); absent on APIs without it. */
  protocol?: SensorProtocol | null
}

/**
 * Create sensor request
 */
export interface CreateSensorRequest {
  name: string
  type: SensorType
  description?: string
  capabilities?: SensorCapability[]
  tools?: SensorTool[]
  execution_mode?: ExecutionMode
  max_concurrent_jobs?: number
  labels?: Record<string, string>
  config?: Record<string, unknown>
}

/**
 * Create sensor response (includes API key)
 */
export interface CreateSensorResponse {
  sensor: Sensor // Backend returns "sensor" field
  api_key: string // Only returned on create
}

/**
 * Update sensor request
 */
export interface UpdateSensorRequest {
  name?: string
  description?: string
  capabilities?: SensorCapability[]
  tools?: SensorTool[]
  execution_mode?: ExecutionMode
  status?: SensorStatus
  max_concurrent_jobs?: number
  labels?: Record<string, string>
  config?: Record<string, unknown>
}

/**
 * Regenerate API key response
 */
export interface RegenerateAPIKeyResponse {
  api_key: string
  api_key_prefix: string
}

/**
 * Sensor list response
 */
export interface SensorListResponse {
  items: Sensor[]
  total: number
  page: number
  per_page: number
}

/**
 * Sensor list filters
 */
export interface SensorListFilters {
  type?: SensorType
  status?: SensorStatus
  search?: string
  page?: number
  /** The API reads per_page (max 100); page_size is ignored by it. */
  per_page?: number
}

/**
 * Available capabilities response
 * Returns all unique capability names from all sensors accessible to the tenant
 */
export interface AvailableCapabilitiesResponse {
  capabilities: string[]
}
