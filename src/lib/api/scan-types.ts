/**
 * Scan Configuration API Types
 *
 * TypeScript types for Scan Configuration Management
 * Scan configurations bind asset groups with scanners/workflows and schedules.
 */

// Scan types
export const SCAN_TYPES = ['workflow', 'single'] as const
export type ScanType = (typeof SCAN_TYPES)[number]

// Schedule types
export const SCHEDULE_TYPES = ['manual', 'daily', 'weekly', 'monthly', 'crontab'] as const
export type ScheduleType = (typeof SCHEDULE_TYPES)[number]

// Status types
export const SCAN_CONFIG_STATUSES = ['active', 'paused', 'disabled'] as const
export type ScanConfigStatus = (typeof SCAN_CONFIG_STATUSES)[number]

// Agent preference types
export const AGENT_PREFERENCES = ['auto', 'tenant', 'platform'] as const
export type AgentPreference = (typeof AGENT_PREFERENCES)[number]

// Labels for display
export const SCAN_TYPE_LABELS: Record<ScanType, string> = {
  workflow: 'Workflow',
  single: 'Single Scan',
}

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  manual: 'Manual',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  crontab: 'Custom (Cron)',
}

export const SCAN_CONFIG_STATUS_LABELS: Record<ScanConfigStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  disabled: 'Disabled',
}

export const AGENT_PREFERENCE_LABELS: Record<AgentPreference, string> = {
  auto: 'Auto (Tenant first, Platform fallback)',
  tenant: 'Tenant Agents Only',
  platform: 'Platform Agents Only',
}

export const AGENT_PREFERENCE_DESCRIPTIONS: Record<AgentPreference, string> = {
  auto: 'Uses tenant agents when available, falls back to platform agents',
  tenant: 'Only uses agents deployed in your infrastructure',
  platform: "Only uses Rediver's managed platform agents",
}

/**
 * Scan Configuration entity
 */
export interface ScanConfig {
  id: string
  tenant_id: string
  name: string
  description?: string
  asset_group_id?: string // Legacy single asset group
  asset_group_ids?: string[] // Multiple asset groups
  targets?: string[] // Direct targets (individual assets or custom)
  scan_type: ScanType
  pipeline_id?: string
  scanner_name?: string
  scanner_config?: Record<string, unknown>
  targets_per_job: number
  schedule_type: ScheduleType
  schedule_cron?: string
  schedule_day?: number
  schedule_time?: string
  schedule_timezone: string
  next_run_at?: string
  tags?: string[]
  run_on_tenant_runner: boolean
  agent_preference: AgentPreference
  status: ScanConfigStatus
  last_run_id?: string
  last_run_at?: string
  last_run_status?: ScanSessionStatus
  total_runs: number
  successful_runs: number
  failed_runs: number
  created_by?: string
  created_by_name?: string
  created_at: string
  updated_at: string
}

/**
 * Scan Configuration with related entities
 */
export interface ScanConfigWithRelations extends ScanConfig {
  asset_group?: {
    id: string
    name: string
  }
  pipeline?: {
    id: string
    name: string
  }
}

/**
 * Create scan configuration request
 * Either asset_group_id/asset_group_ids OR targets must be provided (can have any combination)
 */
export interface CreateScanConfigRequest {
  name: string
  description?: string
  asset_group_id?: string // Primary asset group (legacy, optional)
  asset_group_ids?: string[] // Multiple asset groups (NEW)
  targets?: string[] // Direct targets (domains, IPs, URLs)
  scan_type: ScanType
  pipeline_id?: string
  scanner_name?: string
  scanner_config?: Record<string, unknown>
  targets_per_job?: number
  schedule_type?: ScheduleType
  schedule_cron?: string
  schedule_day?: number
  schedule_time?: string
  timezone?: string
  tags?: string[]
  run_on_tenant_runner?: boolean
  agent_preference?: AgentPreference
}

/**
 * Update scan configuration request
 */
export interface UpdateScanConfigRequest {
  name?: string
  description?: string
  pipeline_id?: string
  scanner_name?: string
  scanner_config?: Record<string, unknown>
  targets_per_job?: number
  schedule_type?: ScheduleType
  schedule_cron?: string
  schedule_day?: number
  schedule_time?: string
  timezone?: string
  tags?: string[]
  run_on_tenant_runner?: boolean
  agent_preference?: AgentPreference
}

/**
 * Trigger scan request
 */
export interface TriggerScanRequest {
  context?: Record<string, unknown>
}

/**
 * Clone config request
 */
export interface CloneScanConfigRequest {
  name: string
}

/**
 * Bulk action request
 */
export interface BulkActionRequest {
  scan_ids: string[]
}

/**
 * Bulk action response
 */
export interface BulkActionResponse {
  successful: string[]
  failed: Array<{
    id: string
    error: string
  }>
  message: string
}

/**
 * Bulk action types
 */
export type BulkAction = 'activate' | 'pause' | 'disable' | 'delete'

/**
 * Scan configuration list filters
 */
export interface ScanConfigListFilters {
  asset_group_id?: string
  pipeline_id?: string
  scan_type?: ScanType
  schedule_type?: ScheduleType
  status?: ScanConfigStatus
  tags?: string
  search?: string
  page?: number
  per_page?: number
}

/**
 * Scan configuration list response
 */
export interface ScanConfigListResponse {
  items: ScanConfig[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/**
 * Scan configuration stats data
 */
export interface ScanConfigStatsData {
  total: number
  active: number
  paused: number
  disabled: number
  by_schedule_type: Record<ScheduleType, number>
  by_scan_type: Record<ScanType, number>
}

/**
 * Pipeline run response (returned when triggering scan)
 */
export interface PipelineRun {
  id: string
  tenant_id: string
  pipeline_id: string
  asset_id?: string
  scan_id?: string
  trigger_type: string
  triggered_by?: string
  status: string
  started_at?: string
  completed_at?: string
  total_steps: number
  completed_steps: number
  failed_steps: number
  skipped_steps: number
  total_findings: number
  error_message?: string
  created_at: string
}

/**
 * Status counts for overview dashboard
 */
export interface StatusCounts {
  total: number
  queued: number
  pending: number
  running: number
  completed: number
  failed: number
  canceled: number
  timeout: number
}

/**
 * Overview stats for scan management dashboard
 */
export interface ScanManagementOverview {
  pipelines: StatusCounts
  scans: StatusCounts
  jobs: StatusCounts
}

// Scan Session/Run status types
export const SCAN_SESSION_STATUSES = [
  'queued',
  'pending',
  'running',
  'completed',
  'failed',
  'canceled',
  'timeout',
] as const
export type ScanSessionStatus = (typeof SCAN_SESSION_STATUSES)[number]

// Alias for backward compatibility
export const SCAN_RUN_STATUSES = SCAN_SESSION_STATUSES
export type ScanRunStatus = ScanSessionStatus

export const SCAN_SESSION_STATUS_LABELS: Record<ScanSessionStatus, string> = {
  queued: 'Queued',
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  canceled: 'Canceled',
  timeout: 'Timed Out',
}

// Alias for backward compatibility
export const SCAN_RUN_STATUS_LABELS = SCAN_SESSION_STATUS_LABELS

/**
 * Helper functions for status checking
 */
export function isTerminalStatus(status: ScanSessionStatus): boolean {
  return ['completed', 'failed', 'canceled', 'timeout'].includes(status)
}

export function isActiveStatus(status: ScanSessionStatus): boolean {
  return ['queued', 'pending', 'running'].includes(status)
}

export function isSuccessStatus(status: ScanSessionStatus): boolean {
  return status === 'completed'
}

export function isErrorStatus(status: ScanSessionStatus): boolean {
  return ['failed', 'timeout'].includes(status)
}

/**
 * Scan Session entity (matches backend ScanSessionResponse)
 */
export interface ScanSession {
  id: string
  tenant_id?: string
  agent_id?: string
  scanner_name: string
  scanner_version?: string
  scanner_type?: string
  asset_type: string
  asset_value: string
  asset_id?: string
  commit_sha?: string
  branch?: string
  base_commit_sha?: string
  status: ScanRunStatus
  error_message?: string
  findings_total: number
  findings_new: number
  findings_fixed: number
  findings_by_severity?: Record<string, number>
  started_at?: string
  completed_at?: string
  duration_ms?: number
  created_at: string
}

// Alias for backward compatibility
export type ScanRun = ScanSession

/**
 * Scan Run list filters
 */
export interface ScanRunListFilters {
  scan_id?: string
  status?: ScanRunStatus
  page?: number
  per_page?: number
}

/**
 * Scan Session list response (matches backend pagination)
 */
export interface ScanSessionListResponse {
  data: ScanSession[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// Alias for backward compatibility
export type ScanRunListResponse = ScanSessionListResponse

// ============================================
// SMART FILTERING (Asset-Scanner Compatibility)
// ============================================

/**
 * Skip reason explaining why assets of a certain type were skipped
 */
export interface SkipReason {
  asset_type: string
  count: number
  reason: string
}

/**
 * Result of smart filtering during scan trigger
 * Matches backend FilteringResultResponse
 */
export interface FilteringResult {
  total_assets: number
  scanned_assets: number
  skipped_assets: number
  unclassified_assets: number
  compatibility_percent: number
  scanned_by_type?: Record<string, number>
  skipped_by_type?: Record<string, number>
  skip_reasons?: SkipReason[]
  was_filtered: boolean
  tool_name?: string
  supported_targets?: string[]
}

/**
 * Extended PipelineRun with filtering result
 */
export interface PipelineRunWithFiltering extends PipelineRun {
  filtering_result?: FilteringResult
}
