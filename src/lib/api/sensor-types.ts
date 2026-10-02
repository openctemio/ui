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

/**
 * How the SDK a sensor is built with compares with the platform's supported
 * SDK range (GET /sensors/stats sdk_min_version / sdk_latest_version).
 */
export type SensorSdkStatus = 'current' | 'outdated' | 'unsupported' | 'unknown'

/** One problem found on a sensor (stable `code`; `message` is a fallback). */
export interface SensorHealthReason {
  code:
    | 'outbox_backlog'
    | 'outbox_dead_letters'
    | 'outbox_evicted'
    | 'key_expired'
    | 'key_expiring'
    | 'identity_cloned'
    | 'version_unsupported'
    | 'no_tools'
    | 'error_reported'
    | 'content_stale'
    | 'content_refresh_failed'
    | 'sdk_unsupported'
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

/**
 * Scanner content (api RFC-031): the data a tool scans with (trivy's
 * vulnerability DB, the nuclei templates, the semgrep rules), as the sensor
 * last reported it, with the staleness the API computed from the tenant's
 * content policy.
 */
export type SensorContentName =
  'trivy-db' | 'trivy-java-db' | 'nuclei-templates' | 'semgrep-rules' | (string & {})

export interface SensorContent {
  /** The tool the content belongs to ("trivy"). */
  tool: string
  name: SensorContentName
  /** Release tag, DB build time or bundle digest prefix; "" when none. */
  version: string
  /** When the content was published (staleness is measured from it). */
  updated_at?: string | null
  /** When this sensor installed it. */
  fetched_at?: string | null
  /** When the sensor last confirmed this is the newest (or pinned) version. */
  checked_at?: string | null
  source?: string
  /** "sha256:..." */
  digest?: string
  /** false: the tool fetches it by itself on each scan (not controlled). */
  managed: boolean
  /** The last refresh failure; the sensor keeps the version above. */
  error?: string
  age_seconds?: number | null
  /** The policy's limit; 0 or absent = no limit. */
  max_age_hours?: number | null
  stale: boolean
  /** The version the policy pins ("" = newest). */
  pinned_version?: string
  /** The sensor runs another version than the pinned one. */
  pin_mismatch?: boolean
}

/** One content kind's policy. */
export interface ContentPin {
  max_age_hours?: number
  /** A DB digest ("sha256:...") or a template tag ("v10.4.9"); "" = newest. */
  version?: string
  /** semgrep-rules only: registry rulesets; empty = semgrep's own per-scan fetch. */
  rulesets?: string[]
}

export interface ContentPolicy {
  refresh_interval_hours?: number
  content: Partial<Record<SensorContentName, ContentPin>>
}

/** GET /api/v1/sensors/content-policy */
export interface ContentPolicyResponse {
  policy: ContentPolicy
  defaults: ContentPolicy
  updated_at: string | null
  updated_by: string | null
}

/** PUT /api/v1/sensors/content-policy */
export interface UpdateContentPolicyRequest {
  policy: ContentPolicy
  apply_now: boolean
}

export interface UpdateContentPolicyResponse {
  policy: ContentPolicy
  commands_created: number
  skipped: number
}

/** POST /api/v1/sensors/{id}/content/refresh and /sensors/content/refresh */
export interface RefreshContentRequest {
  /** Empty = all managed content. */
  content: SensorContentName[]
  force: boolean
}

export interface RefreshSensorContentResponse {
  command_id: string
  already_pending: boolean
}

export interface RefreshFleetContentResponse {
  commands_created: number
  skipped: number
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
  /** Scanner content (RFC-031); absent on APIs without it. */
  content?: SensorContent[]
  /** The sensor accepts refresh_content commands (it manages content). */
  content_refresh_supported?: boolean
  /**
   * What the sensor last reported it has (api RFC-029 §4.3.1); null before
   * its first report, absent on APIs without it. `tools`, `capabilities`
   * and `max_concurrent_jobs` above are then the administrator's limits.
   */
  reported?: SensorReported | null
  /** What dispatch uses: the report narrowed by the limits. */
  effective?: SensorEffective
  /** Limits the report contradicts (a tool set here that is not installed). */
  capability_mismatch?: SensorCapabilityMismatch | null
  /** The SDK the sensor binary is built with ("openctem-sdk-go"); "" when unknown. */
  sdk_name?: string
  /** Its version ("v0.9.0"); "" when unknown. */
  sdk_version?: string
  sdk_status?: SensorSdkStatus
  /** The sensor binary's product name ("openctemio-sensor"); "" when unknown. */
  sensor_product?: string
  /** The commit the sensor binary was built from; "" when unknown. */
  sensor_commit?: string
  /** When the sensor binary was built. */
  sensor_build_time?: string | null
}

/** One tool of a sensor's reported inventory. */
export interface SensorReportedTool {
  name: string
  version?: string
  installed: boolean
}

/** A sensor's last capability report; a null list was never reported. */
export interface SensorReported {
  tools: SensorReportedTool[] | null
  capabilities: string[] | null
  /** The sensor's configured cap on concurrent jobs. */
  max_concurrent_jobs: number | null
  os?: string
  arch?: string
  reported_at: string | null
}

/** The tools, capabilities and capacity dispatch uses for a sensor. */
export interface SensorEffective {
  tools: string[]
  capabilities: string[]
  max_concurrent_jobs: number
}

export interface SensorCapabilityMismatch {
  tools_not_installed?: string[]
  capabilities_not_reported?: string[]
}

/** A job dispatched to a sensor (GET /api/v1/commands). */
export interface SensorCommand {
  id: string
  sensor_id?: string
  type: 'scan' | 'collect' | 'health_check' | 'config_update' | 'cancel' | (string & {})
  priority: string
  status:
    | 'pending'
    | 'acknowledged'
    | 'running'
    | 'completed'
    | 'failed'
    | 'canceled'
    | 'expired'
    | (string & {})
  payload?: Record<string, unknown> | null
  error_message?: string
  created_at: string
  acknowledged_at?: string | null
  started_at?: string | null
  completed_at?: string | null
}

export interface SensorCommandListResponse {
  data: SensorCommand[]
  total: number
  page: number
  per_page: number
  total_pages: number
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
  /** An exact normalized SDK version ("v0.9.0") or "unknown". */
  sdk_version?: string
}

/**
 * Available capabilities response
 * Returns all unique capability names from all sensors accessible to the tenant
 */
export interface AvailableCapabilitiesResponse {
  capabilities: string[]
}

// ============================================
// SENSOR ACTIVITY (GET /api/v1/sensors/{id}/activity)
// ============================================

/** The filter chips of a sensor's activity timeline. */
export type SensorActivityCategory = 'people' | 'status' | 'updates' | 'jobs'

export const SENSOR_ACTIVITY_CATEGORIES: readonly SensorActivityCategory[] = [
  'people',
  'status',
  'updates',
  'jobs',
]

export type SensorActivityType =
  // status
  | 'online'
  | 'offline'
  | 'restarted'
  // updates
  | 'version_changed'
  | 'sdk_version_changed'
  | 'protocol_changed'
  | 'tools_changed'
  | 'capacity_changed'
  | 'content_updated'
  | 'content_refresh_failed'
  // jobs
  | 'job_claimed'
  | 'job_completed'
  | 'job_failed'
  | 'job_canceled'
  | 'job_expired'
  // people (an audit-log row)
  | 'audit'
  | (string & {})

export type VersionDirection = 'upgrade' | 'downgrade' | 'changed'

/** Per-type details; every field is optional because older rows may lack them. */
export interface SensorActivityDetails {
  // restarted
  started_at?: string
  previous_started_at?: string
  downtime_seconds?: number
  // version_changed / sdk_version_changed / protocol_changed / capacity_changed
  name?: string
  from?: string | number
  to?: string | number
  direction?: VersionDirection | (string & {})
  // tools_changed
  added?: { name: string; version?: string }[]
  removed?: { name: string; version?: string }[]
  updated?: { name: string; from?: string; to?: string }[]
  // content_updated / content_refresh_failed
  items?: { tool?: string; name?: string; from?: string; to?: string; error?: string }[]
  // online / offline
  offline_seconds?: number
  last_seen_at?: string
  // job_*
  command_id?: string
  command_type?: string
  status?: string
  error?: string
  duration_seconds?: number
  // audit
  action?: string
  changes?: Record<string, { old?: unknown; new?: unknown }>
  message?: string
  [key: string]: unknown
}

export interface SensorActivityItem {
  /** Unique and stable ("e:<uuid>", "a:<uuid>", "j:<uuid>:done"). */
  id: string
  /** RFC3339. */
  at: string
  category: SensorActivityCategory
  type: SensorActivityType
  source: 'sensor' | 'audit' | 'job' | (string & {})
  /** Plain-English server text, the fallback for types this UI does not know. */
  summary: string
  details?: SensorActivityDetails | null
  /** >1 when identical events were coalesced. */
  repeat_count?: number
  /** The last occurrence when repeat_count > 1. */
  last_at?: string
  /** Audit rows only: the canonical action id ("sensor.updated"). */
  action?: string
  /** Audit rows only: who did it ("admin@example.com" or "system"). */
  actor?: string
  /** Audit rows only. */
  result?: 'success' | 'failure' | (string & {})
}

export interface SensorActivityResponse {
  /** Newest first. */
  items: SensorActivityItem[]
  /** "" when there is no more. */
  next_cursor: string
  /** false without audit:read: administrator actions are then left out. */
  audit_included: boolean
}

export interface SensorActivityQuery {
  /** Empty = every category. */
  types?: SensorActivityCategory[]
  cursor?: string
  /** 1..100, default 30. */
  limit?: number
}
