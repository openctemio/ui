/**
 * Scope Configuration API Types
 *
 * Type definitions matching backend API responses for scope configuration
 * Following CTEM (Continuous Threat Exposure Management) Scoping phase
 */

// Types imported from '../types' are used for reference only - actual API values are strings

// ============================================
// Common Types
// ============================================

// Note: These are used for frontend display; actual values come from backend as strings

// ============================================
// API Response Types
// ============================================

/**
 * Scope Target entity from API
 */
export interface ApiScopeTarget {
  id: string
  tenant_id: string
  target_type: string
  pattern: string
  description: string
  status: string
  priority: number
  tags?: string[]
  created_by: string
  created_at: string
  updated_at: string
}

/**
 * Scope Exclusion entity from API
 */
export interface ApiScopeExclusion {
  id: string
  tenant_id: string
  exclusion_type: string
  pattern: string
  reason: string
  status: string
  expires_at?: string
  approved_by?: string
  approved_at?: string
  created_by: string
  created_at: string
  updated_at: string
}

/**
 * Scan Schedule entity from API
 */
export interface ApiScanSchedule {
  id: string
  tenant_id: string
  name: string
  description?: string
  scan_type: string
  target_scope: string
  target_ids?: string[]
  target_tags?: string[]
  scanner_configs?: Record<string, unknown>
  schedule_type: string
  cron_expression?: string
  interval_hours?: number
  enabled: boolean
  last_run_at?: string
  last_run_status?: string
  next_run_at?: string
  notify_on_completion: boolean
  notify_on_findings: boolean
  notification_channels?: string[]
  created_by: string
  created_at: string
  updated_at: string
}

// ============================================
// List Response Types
// ============================================

export interface PaginationLinks {
  first?: string
  prev?: string
  next?: string
  last?: string
}

export interface ApiScopeTargetListResponse {
  data: ApiScopeTarget[]
  total: number
  page: number
  per_page: number
  total_pages: number
  links?: PaginationLinks
}

export interface ApiScopeExclusionListResponse {
  data: ApiScopeExclusion[]
  total: number
  page: number
  per_page: number
  total_pages: number
  links?: PaginationLinks
}

export interface ApiScanScheduleListResponse {
  data: ApiScanSchedule[]
  total: number
  page: number
  per_page: number
  total_pages: number
  links?: PaginationLinks
}

// ============================================
// Stats Response Types
// ============================================

export interface ApiScopeStats {
  total_targets: number
  total_exclusions: number
  total_schedules: number
  active_targets: number
  active_exclusions: number
  enabled_schedules: number
  coverage: number
}

// ============================================
// Check Scope Response Type
// ============================================

export interface ApiCheckScopeResponse {
  in_scope: boolean
  matched_targets: string[]
  matched_exclusions: string[]
}

// ============================================
// Input Types
// ============================================

/**
 * Input for creating a new scope target
 */
export interface CreateScopeTargetInput {
  target_type: string
  pattern: string
  description?: string
  priority?: number
  tags?: string[]
}

/**
 * Input for updating a scope target
 */
export interface UpdateScopeTargetInput {
  description?: string
  status?: string
  priority?: number
  tags?: string[]
}

/**
 * Input for creating a scope exclusion
 */
export interface CreateScopeExclusionInput {
  exclusion_type: string
  pattern: string
  reason: string
  expires_at?: string
}

/**
 * Input for updating a scope exclusion
 */
export interface UpdateScopeExclusionInput {
  reason?: string
  status?: string
  expires_at?: string
}

/**
 * Input for creating a scan schedule
 */
export interface CreateScanScheduleInput {
  name: string
  description?: string
  scan_type: string
  target_scope?: string
  target_ids?: string[]
  target_tags?: string[]
  scanner_configs?: Record<string, unknown>
  schedule_type: string
  cron_expression?: string
  interval_hours?: number
  notify_on_completion?: boolean
  notify_on_findings?: boolean
  notification_channels?: string[]
}

/**
 * Input for updating a scan schedule
 */
export interface UpdateScanScheduleInput {
  name?: string
  description?: string
  target_scope?: string
  target_ids?: string[]
  target_tags?: string[]
  scanner_configs?: Record<string, unknown>
  schedule_type?: string
  cron_expression?: string
  interval_hours?: number
  enabled?: boolean
  notify_on_completion?: boolean
  notify_on_findings?: boolean
  notification_channels?: string[]
}

// ============================================
// Filter Types
// ============================================

export interface ScopeTargetFilters {
  target_type?: string
  status?: string
  search?: string
  page?: number
  per_page?: number
  sort_by?: 'created_at' | 'updated_at' | 'pattern' | 'target_type'
  sort_order?: 'asc' | 'desc'
}

export interface ScopeExclusionFilters {
  exclusion_type?: string
  status?: string
  search?: string
  page?: number
  per_page?: number
  sort_by?: 'created_at' | 'updated_at' | 'pattern' | 'exclusion_type'
  sort_order?: 'asc' | 'desc'
}

export interface ScanScheduleFilters {
  scan_type?: string
  enabled?: boolean
  search?: string
  page?: number
  per_page?: number
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'next_run_at'
  sort_order?: 'asc' | 'desc'
}

// ============================================
// Bulk Operation Types
// ============================================

export interface BulkDeleteTargetsInput {
  target_ids: string[]
}

export interface BulkDeleteExclusionsInput {
  exclusion_ids: string[]
}

export interface BulkDeleteSchedulesInput {
  schedule_ids: string[]
}

export interface BulkUpdateTargetsInput {
  target_ids: string[]
  update: {
    status?: string
    priority?: number
    add_tags?: string[]
    remove_tags?: string[]
  }
}

export interface BulkOperationResponse {
  success: boolean
  affected_count: number
  failed_ids?: string[]
  errors?: Record<string, string>
}
