/**
 * Suppression / Exception types.
 *
 * Mirrors the API contract at `internal/infra/http/handler/suppression_handler.go`
 * (`SuppressionRuleResponse`, `CreateSuppressionRuleRequest`,
 * `UpdateSuppressionRuleRequest`) and the domain enums in
 * `pkg/domain/suppression/entity.go`.
 */

/** Approval lifecycle status of a suppression rule. */
export type SuppressionStatus = 'pending' | 'approved' | 'rejected' | 'expired'

/** Why a finding is being suppressed. */
export type SuppressionType = 'false_positive' | 'accepted_risk' | 'wont_fix'

/** A suppression rule as returned by `GET /api/v1/suppressions`. */
export interface SuppressionRule {
  id: string
  tenant_id: string
  name: string
  description?: string
  suppression_type: SuppressionType
  /** Tool rule ID pattern, e.g. "semgrep.sql-injection". */
  rule_id?: string
  /** Tool name, e.g. "semgrep", "gitleaks". */
  tool_name?: string
  /** File path glob, e.g. "tests/**". */
  path_pattern?: string
  asset_id?: string | null
  status: SuppressionStatus
  requested_by: string
  requested_at: string
  approved_by?: string | null
  approved_at?: string | null
  rejected_by?: string | null
  rejected_at?: string | null
  rejection_reason?: string
  expires_at?: string | null
  created_at: string
  updated_at: string
}

/** `GET /api/v1/suppressions` list envelope. */
export interface SuppressionListResponse {
  data: SuppressionRule[]
  total: number
}

/** Body for `POST /api/v1/suppressions`. */
export interface CreateSuppressionInput {
  name: string
  description?: string
  suppression_type: SuppressionType
  rule_id?: string
  tool_name?: string
  path_pattern?: string
  asset_id?: string | null
  /** RFC3339 timestamp; omit for a rule that never expires. */
  expires_at?: string | null
}

/** Body for `PUT /api/v1/suppressions/{id}`. */
export interface UpdateSuppressionInput {
  name?: string
  description?: string
  rule_id?: string
  tool_name?: string
  path_pattern?: string
  expires_at?: string | null
}

export const SUPPRESSION_TYPE_LABELS: Record<SuppressionType, string> = {
  false_positive: 'False Positive',
  accepted_risk: 'Accepted Risk',
  wont_fix: "Won't Fix",
}

export const SUPPRESSION_STATUS_LABELS: Record<SuppressionStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
}

/**
 * Status → badge classes. Keyed by suppression status (NOT severity), so this is
 * outside the severity-color governance guard's scope.
 */
export const SUPPRESSION_STATUS_BADGE: Record<SuppressionStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30', // palette-ok: approval-status accent lookup, no semantic token for these states
  approved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', // palette-ok: approval-status accent lookup
  rejected: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30', // palette-ok: approval-status accent lookup
  expired: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30', // palette-ok: approval-status accent lookup
}

export const SUPPRESSION_TYPE_BADGE: Record<SuppressionType, string> = {
  false_positive: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30', // palette-ok: suppression-type accent lookup, no semantic token
  accepted_risk: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30', // palette-ok: suppression-type accent lookup
  wont_fix: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30', // palette-ok: suppression-type accent lookup
}

/** Short human summary of a rule's matching criteria for table/scope cells. */
export function suppressionScopeSummary(rule: SuppressionRule): string {
  const parts: string[] = []
  if (rule.tool_name) parts.push(rule.tool_name)
  if (rule.rule_id) parts.push(rule.rule_id)
  if (rule.path_pattern) parts.push(rule.path_pattern)
  if (rule.asset_id) parts.push('asset-scoped')
  return parts.length ? parts.join(' · ') : 'Any finding'
}
