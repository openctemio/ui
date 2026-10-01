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
  // System metrics
  cpu_percent: number
  memory_percent: number
  active_jobs: number
  region?: string
  // Load balancing
  max_concurrent_jobs: number
  current_jobs: number
  // Other fields
  labels: Record<string, string>
  config: Record<string, unknown>
  metadata: Record<string, unknown>
  last_seen_at?: string
  last_error_at?: string
  total_findings: number
  total_scans: number
  error_count: number
  created_at: string
  updated_at: string
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
  page_size: number
}

/**
 * Sensor list filters
 */
export interface SensorListFilters {
  type?: SensorType
  status?: SensorStatus
  search?: string
  page?: number
  page_size?: number
}

/**
 * Available capabilities response
 * Returns all unique capability names from all sensors accessible to the tenant
 */
export interface AvailableCapabilitiesResponse {
  capabilities: string[]
}

// =============================================================================
// Sensor Analytics Types
// =============================================================================

/**
 * Sensor Session - tracks each online session with stats
 */
export interface SensorSession {
  id: string
  sensor_id: string
  started_at: string
  ended_at?: string
  duration_seconds?: number
  findings_count: number
  scans_count: number
  errors_count: number
  jobs_completed: number
  version?: string
  hostname?: string
  ip_address?: string
  region?: string
  created_at: string
}

/**
 * Sensor Daily Stats - aggregated daily statistics
 */
export interface SensorDailyStats {
  id: string
  sensor_id: string
  date: string
  total_findings: number
  total_scans: number
  total_errors: number
  total_jobs: number
  online_seconds: number
  offline_seconds: number
  session_count: number
  created_at: string
  updated_at: string
}

/**
 * Sensor Session Stats - aggregate stats for a sensor over a time range
 */
export interface SensorSessionStats {
  total_sessions: number
  total_findings: number
  total_scans: number
  total_errors: number
  total_jobs: number
  total_online_seconds: number
  average_session_time_seconds: number
}

/**
 * Sensor Session List Response
 */
export interface SensorSessionListResponse {
  data: SensorSession[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/**
 * Sensor Daily Stats List Response
 */
export interface SensorDailyStatsListResponse {
  data: SensorDailyStats[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/**
 * Sensor Session List Filters
 */
export interface SensorSessionListFilters {
  is_active?: boolean
  started_at?: string
  ended_at?: string
  page?: number
  per_page?: number
}

/**
 * Sensor Daily Stats List Filters
 */
export interface SensorDailyStatsListFilters {
  from?: string
  to?: string
  page?: number
  per_page?: number
}
