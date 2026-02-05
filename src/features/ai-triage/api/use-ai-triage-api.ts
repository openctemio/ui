'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import type { SWRConfiguration } from 'swr'

import { get, post } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import type {
  AITriageResult,
  AIConfig,
  AIMode,
  RequestTriageInput,
  RequestTriageResponse,
  TriageHistoryResponse,
  TriageStatus,
  Exploitability,
  RemediationStep,
  RemediationEffort,
} from '../types'
import type {
  ApiTriageResult,
  ApiRequestTriageResponse,
  ApiTriageHistoryResponse,
  ApiRequestTriageInput,
  ApiAIConfigResponse,
} from './ai-triage-api.types'

// ============================================
// CONFIGURATION
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error: { statusCode?: number }) => {
    return error.statusCode !== undefined && error.statusCode >= 500
  },
  errorRetryCount: 3,
  dedupingInterval: 2000,
  onError: (error) => handleApiError(error, { showToast: true, logError: true }),
}

// ============================================
// TRANSFORMERS
// ============================================

/**
 * Transform API triage result to domain type
 */
function transformTriageResult(api: ApiTriageResult): AITriageResult {
  return {
    id: api.id,
    findingId: '', // Not returned by API in single result
    status: api.status as TriageStatus,
    severityAssessment: api.severity_assessment as AITriageResult['severityAssessment'],
    severityJustification: api.severity_justification,
    riskScore: api.risk_score,
    exploitability: api.exploitability as Exploitability | undefined,
    exploitabilityDetails: api.exploitability_details,
    businessImpact: api.business_impact,
    priorityRank: api.priority_rank,
    falsePositiveLikelihood: api.false_positive_likelihood,
    falsePositiveReason: api.false_positive_reason,
    summary: api.summary,
    remediationSteps: api.remediation_steps?.map((step) => ({
      step: step.step,
      description: step.description,
      effort: step.effort as RemediationEffort,
    })) as RemediationStep[] | undefined,
    relatedCves: api.related_cves,
    relatedCwes: api.related_cwes,
    llmProvider: api.llm_provider,
    llmModel: api.llm_model,
    promptTokens: api.prompt_tokens,
    completionTokens: api.completion_tokens,
    createdAt: api.created_at,
    completedAt: api.completed_at,
    errorMessage: api.error_message,
  }
}

/**
 * Transform API response for request triage
 */
function transformRequestTriageResponse(api: ApiRequestTriageResponse): RequestTriageResponse {
  return {
    jobId: api.job_id,
    status: api.status as TriageStatus,
  }
}

/**
 * Transform API history response
 */
function transformHistoryResponse(api: ApiTriageHistoryResponse): TriageHistoryResponse {
  return {
    data: api.data.map(transformTriageResult),
    total: api.total,
    limit: api.limit,
    offset: api.offset,
  }
}

// ============================================
// ENDPOINT BUILDERS
// ============================================

function buildTriageEndpoint(findingId: string): string {
  return `/api/v1/findings/${findingId}/ai-triage`
}

function buildTriageHistoryEndpoint(findingId: string, limit?: number, offset?: number): string {
  const params = new URLSearchParams()
  if (limit) params.set('limit', limit.toString())
  if (offset) params.set('offset', offset.toString())
  const query = params.toString()
  return `/api/v1/findings/${findingId}/ai-triage/history${query ? `?${query}` : ''}`
}

// ============================================
// FETCHERS
// ============================================

async function fetchTriageResult(url: string): Promise<AITriageResult | null> {
  try {
    const response = await get<ApiTriageResult>(url)
    return transformTriageResult(response)
  } catch (error: unknown) {
    // 404 means no triage exists yet - return null instead of throwing
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
      return null
    }
    throw error
  }
}

async function fetchTriageHistory(url: string): Promise<TriageHistoryResponse> {
  const response = await get<ApiTriageHistoryResponse>(url)
  return transformHistoryResponse(response)
}

async function postTriage(
  url: string,
  { arg }: { arg: RequestTriageInput }
): Promise<RequestTriageResponse> {
  const input: ApiRequestTriageInput = {
    mode: arg.mode,
  }
  const response = await post<ApiRequestTriageResponse>(url, input)
  return transformRequestTriageResponse(response)
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to get the latest triage result for a finding
 *
 * Note: Returns null data (not error) when no triage exists yet (404).
 * This is expected behavior - first triage hasn't been run.
 */
export function useTriageResult(findingId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant && findingId ? buildTriageEndpoint(findingId) : null

  return useSWR<AITriageResult | null>(key, fetchTriageResult, {
    ...defaultConfig,
    // Don't show error toast for 404 (no triage exists yet - expected)
    onError: (error: { statusCode?: number }) => {
      if (error.statusCode !== 404) {
        handleApiError(error, { showToast: true, logError: true })
      }
    },
    ...config,
  })
}

/**
 * Hook to get triage history for a finding
 */
export function useTriageHistory(
  findingId: string | null,
  options?: { limit?: number; offset?: number },
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()
  const key =
    currentTenant && findingId
      ? buildTriageHistoryEndpoint(findingId, options?.limit, options?.offset)
      : null

  return useSWR<TriageHistoryResponse>(key, fetchTriageHistory, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Hook to trigger AI triage for a finding
 */
export function useRequestTriage(findingId: string | null) {
  const { currentTenant } = useTenant()
  const key = currentTenant && findingId ? buildTriageEndpoint(findingId) : null

  return useSWRMutation<RequestTriageResponse, Error, string | null, RequestTriageInput>(
    key,
    postTriage
  )
}

/**
 * Get cache key for triage result
 */
export function getTriageCacheKey(findingId: string): string {
  return buildTriageEndpoint(findingId)
}

// ============================================
// AI CONFIG HOOK
// ============================================

const AI_CONFIG_ENDPOINT = '/api/v1/ai-triage/config'

/**
 * Transform API AI config to domain type
 */
function transformAIConfig(api: ApiAIConfigResponse): AIConfig {
  return {
    mode: api.mode as AIMode,
    provider: api.provider,
    model: api.model,
    isEnabled: api.is_enabled,
    autoTriageEnabled: api.auto_triage_enabled,
    autoTriageSeverities: api.auto_triage_severities,
    monthlyTokenLimit: api.monthly_token_limit,
    tokensUsedThisMonth: api.tokens_used_this_month,
  }
}

/**
 * Fetch AI config from API
 */
async function fetchAIConfig(url: string): Promise<AIConfig> {
  const response = await get<ApiAIConfigResponse>(url)
  return transformAIConfig(response)
}

/**
 * Hook to get the current AI configuration for the tenant
 *
 * Returns mode, provider, model, and whether AI is enabled
 *
 * @example
 * ```tsx
 * const { data: config, isLoading } = useAIConfig()
 * if (config) {
 *   console.log(`Using ${config.provider} (${config.model})`)
 * }
 * ```
 */
export function useAIConfig(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant ? AI_CONFIG_ENDPOINT : null

  return useSWR<AIConfig>(key, fetchAIConfig, {
    ...defaultConfig,
    // Cache for longer since config changes rarely
    dedupingInterval: 60000, // 1 minute
    ...config,
  })
}
