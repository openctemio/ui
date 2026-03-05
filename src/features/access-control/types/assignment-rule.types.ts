import type { AssetOwnershipType } from './group.types'

export interface AssignmentRule {
  id: string
  name: string
  description: string
  priority: number
  target_group_id: string
  target_group_name?: string
  conditions: Record<string, string[]>
  options: Record<string, unknown>
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
  conditions: Record<string, string[]>
  options?: Record<string, unknown>
}

export interface UpdateAssignmentRuleInput {
  name?: string
  description?: string
  priority?: number
  target_group_id?: string
  conditions?: Record<string, string[]>
  options?: Record<string, unknown>
  is_active?: boolean
}

export interface TestRuleResult {
  rule_id: string
  matched_assets: { id: string; name: string; type: string }[]
  total_matched: number
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
