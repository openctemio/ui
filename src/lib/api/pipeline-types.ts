/**
 * Pipeline API Types
 *
 * TypeScript types for Pipeline Management (Workflow Orchestration)
 * Pipelines are templates for multi-step scan workflows.
 */

// ============================================
// TRIGGER TYPES
// ============================================

export const PIPELINE_TRIGGERS = [
  'manual',
  'schedule',
  'webhook',
  'api',
  'on_asset_discovery',
] as const
export type PipelineTriggerType = (typeof PIPELINE_TRIGGERS)[number]

export const PIPELINE_TRIGGER_LABELS: Record<PipelineTriggerType, string> = {
  manual: 'Manual',
  schedule: 'Scheduled',
  webhook: 'Webhook',
  api: 'API',
  on_asset_discovery: 'On Asset Discovery',
}

// ============================================
// CONDITION TYPES
// ============================================

export const STEP_CONDITION_TYPES = [
  'always',
  'never',
  'asset_type',
  'expression',
  'step_result',
] as const
export type StepConditionType = (typeof STEP_CONDITION_TYPES)[number]

export const STEP_CONDITION_LABELS: Record<StepConditionType, string> = {
  always: 'Always Run',
  never: 'Never Run',
  asset_type: 'Asset Type Match',
  expression: 'Expression',
  step_result: 'Previous Step Result',
}

// ============================================
// RUN STATUS TYPES
// ============================================

export const PIPELINE_RUN_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'timeout',
] as const
export type PipelineRunStatus = (typeof PIPELINE_RUN_STATUSES)[number]

export const PIPELINE_RUN_STATUS_LABELS: Record<PipelineRunStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  timeout: 'Timeout',
}

export const STEP_RUN_STATUSES = [
  'pending',
  'queued',
  'running',
  'completed',
  'failed',
  'skipped',
  'cancelled',
  'timeout',
] as const
export type StepRunStatus = (typeof STEP_RUN_STATUSES)[number]

// ============================================
// UI POSITION (for Visual Workflow Builder)
// ============================================

export interface UIPosition {
  x: number
  y: number
}

// ============================================
// STEP CONDITION
// ============================================

export interface StepCondition {
  type: StepConditionType
  value?: string
}

// ============================================
// PIPELINE TRIGGER
// ============================================

export interface PipelineTrigger {
  type: PipelineTriggerType
  schedule?: string
  webhook?: string
  filters?: Record<string, unknown>
}

// ============================================
// AGENT PREFERENCE
// ============================================

export const PIPELINE_AGENT_PREFERENCES = ['auto', 'tenant', 'platform'] as const
export type PipelineAgentPreference = (typeof PIPELINE_AGENT_PREFERENCES)[number]

export const PIPELINE_AGENT_PREFERENCE_LABELS: Record<PipelineAgentPreference, string> = {
  auto: 'Auto (Tenant first, Platform fallback)',
  tenant: 'Tenant Agents Only',
  platform: 'Platform Agents Only',
}

export const PIPELINE_AGENT_PREFERENCE_DESCRIPTIONS: Record<PipelineAgentPreference, string> = {
  auto: 'Uses tenant agents when available, falls back to platform agents',
  tenant: 'Only uses agents deployed in your infrastructure',
  platform: "Only uses Rediver's managed platform agents",
}

// ============================================
// PIPELINE SETTINGS
// ============================================

export interface PipelineSettings {
  max_parallel_steps: number
  fail_fast: boolean
  retry_failed_steps: number
  timeout_seconds: number
  notify_on_complete: boolean
  notify_on_failure: boolean
  notification_channels?: string[]
  agent_preference?: PipelineAgentPreference
}

export const DEFAULT_PIPELINE_SETTINGS: PipelineSettings = {
  max_parallel_steps: 3,
  fail_fast: false,
  retry_failed_steps: 0,
  timeout_seconds: 3600,
  notify_on_complete: false,
  notify_on_failure: true,
  notification_channels: [],
  agent_preference: 'auto',
}

// ============================================
// NODE TYPES (for Visual Builder)
// ============================================

export const PIPELINE_NODE_TYPES = [
  'scanner',
  'trigger',
  'condition',
  'action',
  'notification',
  'tool',
] as const
export type PipelineNodeType = (typeof PIPELINE_NODE_TYPES)[number]

// ============================================
// PIPELINE STEP
// ============================================

export interface PipelineStep {
  id: string
  step_key: string
  name: string
  description?: string
  order: number
  ui_position: UIPosition
  node_type?: PipelineNodeType // Visual builder node type
  tool?: string
  capabilities: string[]
  config?: Record<string, unknown>
  timeout_seconds?: number
  depends_on?: string[]
  condition?: StepCondition
  max_retries: number
  retry_delay_seconds: number
}

// ============================================
// PIPELINE TEMPLATE
// ============================================

export interface PipelineTemplate {
  id: string
  tenant_id: string
  name: string
  description?: string
  version: number
  is_active: boolean
  is_system_template?: boolean
  triggers: PipelineTrigger[]
  settings: PipelineSettings
  tags?: string[]
  steps: PipelineStep[]
  // UI positions for visual builder Start/End nodes
  ui_start_position?: UIPosition
  ui_end_position?: UIPosition
  created_at: string
  updated_at: string
  created_by?: string
}

// ============================================
// STEP RUN
// ============================================

export interface StepRun {
  id: string
  step_id: string
  step_key: string
  status: StepRunStatus
  started_at?: string
  completed_at?: string
  error_message?: string
  error_code?: string
  findings_count: number
  attempt: number
  max_attempts: number
  output?: Record<string, unknown>
}

// ============================================
// PIPELINE RUN
// ============================================

export interface PipelineRun {
  id: string
  tenant_id: string
  pipeline_id: string
  asset_id?: string
  scan_id?: string
  trigger_type: PipelineTriggerType
  triggered_by?: string
  status: PipelineRunStatus
  started_at?: string
  completed_at?: string
  total_steps: number
  completed_steps: number
  failed_steps: number
  skipped_steps: number
  total_findings: number
  step_runs?: StepRun[]
  error_message?: string
  created_at: string
}

// ============================================
// REQUEST TYPES
// ============================================

export interface CreatePipelineRequest {
  name: string
  description?: string
  triggers?: PipelineTrigger[]
  settings?: Partial<PipelineSettings>
  tags?: string[]
  steps: CreateStepRequest[]
  // UI positions for visual builder Start/End nodes
  ui_start_position?: UIPosition
  ui_end_position?: UIPosition
}

export interface CreateStepRequest {
  step_key: string
  name: string
  description?: string
  order?: number
  ui_position?: UIPosition
  tool?: string
  capabilities?: string[] // Optional - backend derives from tool if not provided
  config?: Record<string, unknown>
  timeout_seconds?: number
  depends_on?: string[]
  condition?: StepCondition
  max_retries?: number
  retry_delay_seconds?: number
}

export interface UpdatePipelineRequest {
  name?: string
  description?: string
  triggers?: PipelineTrigger[]
  settings?: Partial<PipelineSettings>
  tags?: string[]
  steps?: CreateStepRequest[]
  // UI positions for visual builder Start/End nodes
  ui_start_position?: UIPosition
  ui_end_position?: UIPosition
}

export interface UpdateStepRequest {
  name?: string
  description?: string
  order?: number
  ui_position?: UIPosition
  tool?: string
  capabilities?: string[]
  config?: Record<string, unknown>
  timeout_seconds?: number
  depends_on?: string[]
  condition?: StepCondition
  max_retries?: number
  retry_delay_seconds?: number
}

export interface TriggerPipelineRunRequest {
  template_id: string
  asset_id?: string
  trigger_type?: PipelineTriggerType
  context?: Record<string, unknown>
}

export interface QuickScanRequest {
  targets: string[]
  scanner_name?: string
  workflow_id?: string
}

// ============================================
// FILTER TYPES
// ============================================

export interface PipelineListFilters {
  search?: string
  is_active?: boolean
  tags?: string
  page?: number
  per_page?: number
}

export interface PipelineRunListFilters {
  pipeline_id?: string
  asset_id?: string
  status?: PipelineRunStatus
  trigger_type?: PipelineTriggerType
  page?: number
  per_page?: number
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface PipelineListResponse {
  items: PipelineTemplate[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface PipelineRunListResponse {
  items: PipelineRun[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ============================================
// SCAN MANAGEMENT OVERVIEW STATS
// ============================================

export interface StatusCounts {
  total: number
  running: number
  pending: number
  completed: number
  failed: number
  canceled: number
}

export interface ScanManagementOverview {
  pipelines: StatusCounts
  scans: StatusCounts
  jobs: StatusCounts
}
