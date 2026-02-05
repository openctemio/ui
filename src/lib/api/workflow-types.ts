/**
 * Workflow API Types
 *
 * TypeScript types for Automation Workflows
 * Workflows are event-driven automation pipelines with visual graph builder.
 */

// ============================================
// NODE TYPES
// ============================================

export const WORKFLOW_NODE_TYPES = ['trigger', 'condition', 'action', 'notification'] as const
export type WorkflowNodeType = (typeof WORKFLOW_NODE_TYPES)[number]

export const WORKFLOW_NODE_TYPE_LABELS: Record<WorkflowNodeType, string> = {
  trigger: 'Trigger',
  condition: 'Condition',
  action: 'Action',
  notification: 'Notification',
}

// ============================================
// TRIGGER TYPES
// ============================================

export const WORKFLOW_TRIGGER_TYPES = [
  'manual',
  'schedule',
  'finding_created',
  'finding_updated',
  'finding_age',
  'asset_discovered',
  'scan_completed',
  'webhook',
] as const
export type WorkflowTriggerType = (typeof WORKFLOW_TRIGGER_TYPES)[number]

export const WORKFLOW_TRIGGER_LABELS: Record<WorkflowTriggerType, string> = {
  manual: 'Manual',
  schedule: 'Scheduled',
  finding_created: 'Finding Created',
  finding_updated: 'Finding Updated',
  finding_age: 'Finding Age',
  asset_discovered: 'Asset Discovered',
  scan_completed: 'Scan Completed',
  webhook: 'Webhook',
}

// ============================================
// ACTION TYPES
// ============================================

export const WORKFLOW_ACTION_TYPES = [
  'assign_user',
  'assign_team',
  'update_priority',
  'update_status',
  'add_tags',
  'remove_tags',
  'create_ticket',
  'update_ticket',
  'trigger_pipeline',
  'trigger_scan',
  'http_request',
  'run_script',
] as const
export type WorkflowActionType = (typeof WORKFLOW_ACTION_TYPES)[number]

export const WORKFLOW_ACTION_LABELS: Record<WorkflowActionType, string> = {
  assign_user: 'Assign User',
  assign_team: 'Assign Team',
  update_priority: 'Update Priority',
  update_status: 'Update Status',
  add_tags: 'Add Tags',
  remove_tags: 'Remove Tags',
  create_ticket: 'Create Ticket',
  update_ticket: 'Update Ticket',
  trigger_pipeline: 'Trigger Pipeline',
  trigger_scan: 'Trigger Scan',
  http_request: 'HTTP Request',
  run_script: 'Run Script',
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export const WORKFLOW_NOTIFICATION_TYPES = [
  'slack',
  'email',
  'teams',
  'webhook',
  'pagerduty',
] as const
export type WorkflowNotificationType = (typeof WORKFLOW_NOTIFICATION_TYPES)[number]

export const WORKFLOW_NOTIFICATION_LABELS: Record<WorkflowNotificationType, string> = {
  slack: 'Slack',
  email: 'Email',
  teams: 'Microsoft Teams',
  webhook: 'Webhook',
  pagerduty: 'PagerDuty',
}

// ============================================
// RUN STATUS TYPES
// ============================================

export const WORKFLOW_RUN_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const
export type WorkflowRunStatus = (typeof WORKFLOW_RUN_STATUSES)[number]

export const WORKFLOW_RUN_STATUS_LABELS: Record<WorkflowRunStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

// ============================================
// NODE RUN STATUS TYPES
// ============================================

export const NODE_RUN_STATUSES = ['pending', 'running', 'completed', 'failed', 'skipped'] as const
export type NodeRunStatus = (typeof NODE_RUN_STATUSES)[number]

// ============================================
// UI POSITION (for Visual Workflow Builder)
// ============================================

export interface WorkflowUIPosition {
  x: number
  y: number
}

// ============================================
// TRIGGER CONFIG TYPES
// ============================================

/**
 * Configuration for finding_created trigger.
 * Filters which findings should trigger this workflow.
 */
export interface FindingCreatedTriggerConfig {
  /** Filter by severity levels (critical, high, medium, low) */
  severity_filter?: Array<'critical' | 'high' | 'medium' | 'low'>
  /** Filter by tool names (nuclei, semgrep, etc.) */
  tool_filter?: string[]
  /** Filter by finding source codes (sast, dast, pentest, bug_bounty, etc.) */
  source_filter?: string[]
}

/**
 * Configuration for finding_updated trigger.
 * Filters which finding updates should trigger this workflow.
 */
export interface FindingUpdatedTriggerConfig {
  /** Filter by status changes */
  status_filter?: string[]
  /** Filter by which fields changed */
  field_filter?: string[]
  /** Filter by finding source codes */
  source_filter?: string[]
}

/**
 * Configuration for finding_age trigger.
 * Triggers when findings exceed a certain age.
 */
export interface FindingAgeTriggerConfig {
  /** Age in days */
  age_days: number
  /** Filter by severity levels */
  severity_filter?: Array<'critical' | 'high' | 'medium' | 'low'>
  /** Filter by finding source codes */
  source_filter?: string[]
}

/**
 * Configuration for schedule trigger.
 */
export interface ScheduleTriggerConfig {
  /** Cron expression */
  cron_expression: string
  /** Timezone (e.g., 'America/New_York') */
  timezone?: string
}

/**
 * Configuration for asset_discovered trigger.
 */
export interface AssetDiscoveredTriggerConfig {
  /** Filter by asset types */
  asset_type_filter?: string[]
}

/**
 * Configuration for scan_completed trigger.
 */
export interface ScanCompletedTriggerConfig {
  /** Filter by scan types */
  scan_type_filter?: string[]
  /** Filter by scan status */
  status_filter?: string[]
}

/**
 * Configuration for webhook trigger.
 */
export interface WebhookTriggerConfig {
  /** Webhook secret for verification */
  secret?: string
  /** Custom webhook path */
  path?: string
}

// ============================================
// NODE CONFIG
// ============================================

export interface WorkflowNodeConfig {
  // Trigger config
  trigger_type?: WorkflowTriggerType
  trigger_config?:
    | FindingCreatedTriggerConfig
    | FindingUpdatedTriggerConfig
    | FindingAgeTriggerConfig
    | ScheduleTriggerConfig
    | AssetDiscoveredTriggerConfig
    | ScanCompletedTriggerConfig
    | WebhookTriggerConfig
    | Record<string, unknown>

  // Condition config
  condition_expr?: string

  // Action config
  action_type?: WorkflowActionType
  action_config?: Record<string, unknown>

  // Notification config
  notification_type?: WorkflowNotificationType
  notification_config?: Record<string, unknown>
}

// ============================================
// WORKFLOW NODE
// ============================================

export interface WorkflowNode {
  id: string
  workflow_id: string
  node_key: string
  node_type: WorkflowNodeType
  name: string
  description?: string
  ui_position: WorkflowUIPosition
  config: WorkflowNodeConfig
  created_at: string
}

// ============================================
// WORKFLOW EDGE
// ============================================

export interface WorkflowEdge {
  id: string
  workflow_id: string
  source_node_key: string
  target_node_key: string
  source_handle?: string
  label?: string
  created_at: string
}

// ============================================
// WORKFLOW
// ============================================

export interface Workflow {
  id: string
  tenant_id: string
  name: string
  description?: string
  is_active: boolean
  tags?: string[]
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
  total_runs: number
  successful_runs: number
  failed_runs: number
  last_run_id?: string
  last_run_at?: string
  last_run_status?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// ============================================
// NODE RUN
// ============================================

export interface NodeRun {
  id: string
  workflow_run_id: string
  node_id: string
  node_key: string
  node_type: WorkflowNodeType
  status: NodeRunStatus
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  started_at?: string
  completed_at?: string
  error_message?: string
  error_code?: string
}

// ============================================
// WORKFLOW RUN
// ============================================

export interface WorkflowRun {
  id: string
  workflow_id: string
  tenant_id: string
  trigger_type: WorkflowTriggerType
  trigger_data?: Record<string, unknown>
  status: WorkflowRunStatus
  started_at?: string
  completed_at?: string
  total_nodes: number
  completed_nodes: number
  failed_nodes: number
  triggered_by?: string
  error_message?: string
  node_runs?: NodeRun[]
  created_at: string
}

// ============================================
// REQUEST TYPES
// ============================================

export interface CreateNodeRequest {
  node_key: string
  node_type: WorkflowNodeType
  name: string
  description?: string
  ui_position?: WorkflowUIPosition
  config?: WorkflowNodeConfig
}

export interface CreateEdgeRequest {
  source_node_key: string
  target_node_key: string
  source_handle?: string
  label?: string
}

export interface CreateWorkflowRequest {
  name: string
  description?: string
  tags?: string[]
  nodes: CreateNodeRequest[]
  edges?: CreateEdgeRequest[]
}

export interface UpdateWorkflowRequest {
  name?: string
  description?: string
  tags?: string[]
  is_active?: boolean
}

/**
 * Request to atomically replace a workflow's graph (all nodes and edges).
 * This is a complete replacement operation - all existing nodes/edges are deleted
 * and replaced with the new ones in a single atomic operation.
 */
export interface UpdateWorkflowGraphRequest {
  name?: string
  description?: string
  tags?: string[]
  nodes: CreateNodeRequest[]
  edges?: CreateEdgeRequest[]
}

export interface UpdateNodeRequest {
  name?: string
  description?: string
  ui_position?: WorkflowUIPosition
  config?: WorkflowNodeConfig
}

export interface TriggerWorkflowRequest {
  trigger_type?: WorkflowTriggerType
  trigger_data?: Record<string, unknown>
}

// ============================================
// FILTER TYPES
// ============================================

export interface WorkflowListFilters {
  search?: string
  is_active?: boolean
  tags?: string
  page?: number
  per_page?: number
}

export interface WorkflowRunListFilters {
  workflow_id?: string
  status?: WorkflowRunStatus
  page?: number
  per_page?: number
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface WorkflowListResponse {
  items: Workflow[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface WorkflowRunListResponse {
  items: WorkflowRun[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ============================================
// WORKFLOW STATS
// ============================================

export interface WorkflowStats {
  total_workflows: number
  active_workflows: number
  total_runs: number
  successful_runs: number
  failed_runs: number
  pending_runs: number
  running_runs: number
}
