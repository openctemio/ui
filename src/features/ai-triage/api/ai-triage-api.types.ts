/**
 * API types for AI Triage endpoints (snake_case matching backend)
 */

/**
 * API response for triage result
 */
export interface ApiTriageResult {
  id: string
  status: string
  severity_assessment?: string
  severity_justification?: string
  risk_score?: number
  exploitability?: string
  exploitability_details?: string
  business_impact?: string
  priority_rank?: number
  false_positive_likelihood?: number
  false_positive_reason?: string
  summary?: string
  remediation_steps?: ApiRemediationStep[]
  related_cves?: string[]
  related_cwes?: string[]
  llm_provider?: string
  llm_model?: string
  prompt_tokens?: number
  completion_tokens?: number
  created_at: string
  completed_at?: string
  error_message?: string
}

/**
 * API remediation step
 */
export interface ApiRemediationStep {
  step: number
  description: string
  effort: string
}

/**
 * API response for triggering triage
 */
export interface ApiRequestTriageResponse {
  job_id: string
  status: string
}

/**
 * API response for triage history
 */
export interface ApiTriageHistoryResponse {
  data: ApiTriageResult[]
  total: number
  limit: number
  offset: number
}

/**
 * API request body for triggering triage
 */
export interface ApiRequestTriageInput {
  mode?: 'quick' | 'detailed'
}

/**
 * API response for AI config
 */
export interface ApiAIConfigResponse {
  mode: string
  provider: string
  model: string
  is_enabled: boolean
  auto_triage_enabled: boolean
  auto_triage_severities?: string[]
  monthly_token_limit: number
  tokens_used_this_month: number
}
