/**
 * CTEM cycle + charter types.
 *
 * Field names mirror the API charter struct
 * (`api/pkg/domain/ctemcycle/entity.go`, api #463): the charter is stored as a
 * JSONB object on `ctem_cycles.charter` and round-trips verbatim through the
 * cycle create/update endpoints. Keep the JSON keys here in sync with the Go
 * `json:"..."` tags.
 */

export type CtemCycleStatus = 'planning' | 'active' | 'review' | 'closed'

export interface CharterExclusion {
  item: string
  reason: string
}

export interface CharterSuccessCriterion {
  name: string
  metric: string
  target: string
}

export interface CharterRoles {
  sponsor?: string
  operator?: string
  engineering_partner?: string
}

/**
 * CtemCharter is the business charter for a cycle. Every field is optional and
 * additive — charters written before the playbook fields existed still load
 * with the new fields left empty.
 */
export interface CtemCharter {
  business_priorities?: string[]
  risk_appetite?: string
  in_scope_services?: string[]
  objectives?: string[]
  threat_scenarios?: string[]
  exclusions?: CharterExclusion[]
  success_criteria?: CharterSuccessCriterion[]
  escalation_path?: string
  roles?: CharterRoles
  timeline?: string
  /**
   * Feedback-to-scope: what the review/close learned about scope — gaps to add,
   * items to exclude next cycle, lessons for the next charter. Unlike the rest
   * of the charter (fixed at planning) this is edited at review/close via
   * POST /ctem-cycles/{id}/scope-refinement.
   */
  scope_refinement_notes?: string
}

export interface CtemCycle {
  id: string
  name: string
  description?: string
  status: CtemCycleStatus
  start_date: string
  end_date: string
  charter?: CtemCharter | null
  created_at: string
  updated_at: string
}
