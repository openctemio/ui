/**
 * Agent API Types
 *
 * TypeScript types for Agent Management
 * API endpoint: /api/v1/agents
 */

// Agent types - maps to backend AgentType
// runner = CI/CD one-shot, worker = daemon, collector = asset discovery, sensor = EASM
export type AgentType = 'runner' | 'worker' | 'collector' | 'sensor'

// Admin-controlled status
export type AgentStatus = 'active' | 'disabled' | 'revoked'

// Heartbeat-based health (automatic)
export type AgentHealth = 'unknown' | 'online' | 'offline' | 'error'

export type ExecutionMode = 'standalone' | 'daemon'

// Agent capabilities
export const AGENT_CAPABILITIES = [
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

export type AgentCapability = (typeof AGENT_CAPABILITIES)[number]

// Agent tools
export const AGENT_TOOLS = [
  'semgrep',
  'trivy',
  'nuclei',
  'gitleaks',
  'checkov',
  'tfsec',
  'grype',
  'syft',
  'custom',
] as const

export type AgentTool = (typeof AGENT_TOOLS)[number]

/**
 * Agent entity (maps to Agent in backend)
 */
export interface Agent {
  id: string
  tenant_id: string
  name: string
  type: AgentType
  description?: string
  capabilities: AgentCapability[]
  tools: AgentTool[]
  execution_mode: ExecutionMode
  status: AgentStatus // Admin-controlled: active, disabled, revoked
  health: AgentHealth // Automatic heartbeat: unknown, online, offline, error
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
 * Create agent request
 */
export interface CreateAgentRequest {
  name: string
  type: AgentType
  description?: string
  capabilities?: AgentCapability[]
  tools?: AgentTool[]
  execution_mode?: ExecutionMode
  max_concurrent_jobs?: number
  labels?: Record<string, string>
  config?: Record<string, unknown>
}

/**
 * Create agent response (includes API key)
 */
export interface CreateAgentResponse {
  agent: Agent // Backend returns "agent" field
  api_key: string // Only returned on create
}

/**
 * Update agent request
 */
export interface UpdateAgentRequest {
  name?: string
  description?: string
  capabilities?: AgentCapability[]
  tools?: AgentTool[]
  execution_mode?: ExecutionMode
  status?: AgentStatus
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
 * Agent list response
 */
export interface AgentListResponse {
  items: Agent[]
  total: number
  page: number
  page_size: number
}

/**
 * Agent list filters
 */
export interface AgentListFilters {
  type?: AgentType
  status?: AgentStatus
  search?: string
  page?: number
  page_size?: number
}

/**
 * Available capabilities response
 * Returns all unique capability names from all agents accessible to the tenant
 */
export interface AvailableCapabilitiesResponse {
  capabilities: string[]
}

// =============================================================================
// Agent Analytics Types
// =============================================================================

/**
 * Agent Session - tracks each online session with stats
 */
export interface AgentSession {
  id: string
  agent_id: string
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
 * Agent Daily Stats - aggregated daily statistics
 */
export interface AgentDailyStats {
  id: string
  agent_id: string
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
 * Agent Session Stats - aggregate stats for an agent over a time range
 */
export interface AgentSessionStats {
  total_sessions: number
  total_findings: number
  total_scans: number
  total_errors: number
  total_jobs: number
  total_online_seconds: number
  average_session_time_seconds: number
}

/**
 * Agent Session List Response
 */
export interface AgentSessionListResponse {
  data: AgentSession[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/**
 * Agent Daily Stats List Response
 */
export interface AgentDailyStatsListResponse {
  data: AgentDailyStats[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/**
 * Agent Session List Filters
 */
export interface AgentSessionListFilters {
  is_active?: boolean
  started_at?: string
  ended_at?: string
  page?: number
  per_page?: number
}

/**
 * Agent Daily Stats List Filters
 */
export interface AgentDailyStatsListFilters {
  from?: string
  to?: string
  page?: number
  per_page?: number
}
