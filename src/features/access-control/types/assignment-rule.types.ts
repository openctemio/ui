import type { AssetOwnershipType } from './group.types'

export interface AssignmentConditions {
  asset_type?: string[]
  finding_severity?: string[]
  finding_type?: string[]
  finding_source?: string[]
  asset_tags?: string[]
  file_path_pattern?: string
}

export interface AssignmentOptions {
  notify_group?: boolean
  set_finding_priority?: string
}

export interface AssignmentRule {
  id: string
  name: string
  description: string
  priority: number
  target_group_id: string
  target_group_name?: string
  conditions: AssignmentConditions
  options: AssignmentOptions
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateAssignmentRuleInput {
  name: string
  description?: string
  priority: number
  target_group_id: string
  conditions: AssignmentConditions
  options?: AssignmentOptions
}

export interface UpdateAssignmentRuleInput {
  name?: string
  description?: string
  priority?: number
  target_group_id?: string
  conditions?: AssignmentConditions
  options?: AssignmentOptions
  is_active?: boolean
}

export interface TestRuleFindingSummary {
  id: string
  severity: string
  source: string
  tool_name: string
  message: string
}

export interface TestRuleResult {
  rule_id: string
  rule_name: string
  matching_findings: number
  target_group_id: string
  sample_findings?: TestRuleFindingSummary[]
}

export interface AssignmentRuleFilters {
  search?: string
  is_active?: boolean
}

export interface BulkAssignAssetsInput {
  asset_ids: string[]
  ownership_type: AssetOwnershipType
}

export interface BulkAssignAssetsResult {
  success_count: number
  failed_count: number
  failed_assets?: string[]
}
