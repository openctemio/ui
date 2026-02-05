import type { Severity } from '@/features/shared/types'

/**
 * AI Triage status enum
 */
export type TriageStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Exploitability assessment
 */
export type Exploitability = 'high' | 'medium' | 'low' | 'theoretical'

/**
 * Remediation step effort level
 */
export type RemediationEffort = 'low' | 'medium' | 'high'

/**
 * Remediation step from AI analysis
 */
export interface RemediationStep {
  step: number
  description: string
  effort: RemediationEffort
}

/**
 * AI Triage result from the API
 */
export interface AITriageResult {
  id: string
  findingId: string
  status: TriageStatus

  // Analysis results
  severityAssessment?: Severity
  severityJustification?: string
  riskScore?: number
  exploitability?: Exploitability
  exploitabilityDetails?: string
  businessImpact?: string
  priorityRank?: number
  falsePositiveLikelihood?: number
  falsePositiveReason?: string
  summary?: string

  // Recommendations
  remediationSteps?: RemediationStep[]
  relatedCves?: string[]
  relatedCwes?: string[]

  // Metadata
  llmProvider?: string
  llmModel?: string
  promptTokens?: number
  completionTokens?: number

  // Timestamps
  createdAt: string
  completedAt?: string
  errorMessage?: string
}

/**
 * Status configuration for UI display
 */
export interface TriageStatusConfig {
  label: string
  color: string
  bgColor: string
  icon: string
}

/**
 * Status configuration map
 */
export const TRIAGE_STATUS_CONFIG: Record<TriageStatus, TriageStatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    icon: 'clock',
  },
  processing: {
    label: 'Analyzing',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    icon: 'loader',
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    icon: 'check-circle',
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    icon: 'x-circle',
  },
}

/**
 * Exploitability configuration for UI display
 */
export const EXPLOITABILITY_CONFIG: Record<Exploitability, { label: string; color: string }> = {
  high: { label: 'High', color: 'text-red-600' },
  medium: { label: 'Medium', color: 'text-orange-600' },
  low: { label: 'Low', color: 'text-yellow-600' },
  theoretical: { label: 'Theoretical', color: 'text-gray-600' },
}

/**
 * Effort configuration for UI display
 */
export const EFFORT_CONFIG: Record<RemediationEffort, { label: string; color: string }> = {
  low: { label: 'Low Effort', color: 'text-green-600' },
  medium: { label: 'Medium Effort', color: 'text-yellow-600' },
  high: { label: 'High Effort', color: 'text-red-600' },
}

/**
 * Request body for triggering AI triage
 */
export interface RequestTriageInput {
  mode?: 'quick' | 'detailed'
}

/**
 * Response from triggering AI triage
 */
export interface RequestTriageResponse {
  jobId: string
  status: TriageStatus
}

/**
 * Paginated triage history response
 */
export interface TriageHistoryResponse {
  data: AITriageResult[]
  total: number
  limit: number
  offset: number
}

/**
 * AI mode for the tenant
 */
export type AIMode = 'platform' | 'byok' | 'agent' | 'disabled'

/**
 * AI configuration info returned from the API
 */
export interface AIConfig {
  mode: AIMode
  provider: string
  model: string
  isEnabled: boolean
  autoTriageEnabled: boolean
  autoTriageSeverities?: string[]
  monthlyTokenLimit: number
  tokensUsedThisMonth: number
}

/**
 * Provider display names
 */
export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  gemini: 'Gemini',
  agent: 'Self-hosted',
}

/**
 * Mode display names
 */
export const MODE_DISPLAY_NAMES: Record<AIMode, string> = {
  platform: 'Platform AI',
  byok: 'Your API Key',
  agent: 'Self-hosted',
  disabled: 'Disabled',
}
