/**
 * Scope Rule Types
 *
 * Types for dynamic asset-to-group scoping rules.
 */

export type ScopeRuleType = 'tag_match' | 'asset_group_match'
export type MatchLogic = 'any' | 'all'
export type OwnershipType = 'primary' | 'secondary' | 'stakeholder' | 'informed'

export interface ScopeRule {
  id: string
  tenant_id: string
  group_id: string
  name: string
  description: string
  rule_type: ScopeRuleType
  match_tags: string[]
  match_logic: MatchLogic
  match_asset_group_ids: string[]
  ownership_type: OwnershipType
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export interface CreateScopeRuleInput {
  name: string
  description?: string
  rule_type: ScopeRuleType
  match_tags?: string[]
  match_logic?: MatchLogic
  match_asset_group_ids?: string[]
  ownership_type?: OwnershipType
  priority?: number
}

export interface UpdateScopeRuleInput {
  name?: string
  description?: string
  match_tags?: string[]
  match_logic?: MatchLogic
  match_asset_group_ids?: string[]
  ownership_type?: OwnershipType
  priority?: number
  is_active?: boolean
}

export interface PreviewScopeRuleResult {
  rule_id: string
  rule_name: string
  matching_assets: number
  already_assigned: number
  would_add: number
}

export interface ReconcileGroupResult {
  rules_evaluated: number
  assets_added: number
  assets_removed: number
}

export const SCOPE_RULE_TYPE_LABELS: Record<ScopeRuleType, string> = {
  tag_match: 'Tag Match',
  asset_group_match: 'Asset Group Match',
}

export const OWNERSHIP_TYPE_LABELS: Record<OwnershipType, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  stakeholder: 'Stakeholder',
  informed: 'Informed',
}
