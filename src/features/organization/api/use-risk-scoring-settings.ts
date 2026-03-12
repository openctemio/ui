/**
 * Risk Scoring Settings API Hooks
 *
 * SWR hooks for risk scoring configuration
 */

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { tenantEndpoints } from '@/lib/api/endpoints'
import { fetcher, fetcherWithOptions } from '@/lib/api/client'
import type {
  RiskScoringSettings,
  RiskScorePreviewItem,
  RecalculateResponse,
  PresetInfo,
} from '../types/settings.types'

// ============================================
// FETCH RISK SCORING SETTINGS
// ============================================

export function useRiskScoringSettings(tenantIdOrSlug: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<RiskScoringSettings>(
    tenantIdOrSlug ? tenantEndpoints.riskScoringSettings(tenantIdOrSlug) : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    settings: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

// ============================================
// UPDATE RISK SCORING SETTINGS
// ============================================

interface UpdateRiskScoringResponse {
  config: RiskScoringSettings
  assets_updated: number
}

async function updateRiskScoring(url: string, { arg }: { arg: RiskScoringSettings }) {
  return fetcherWithOptions<UpdateRiskScoringResponse>(url, {
    method: 'PATCH',
    body: JSON.stringify(arg),
  })
}

export function useUpdateRiskScoring(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.riskScoringSettings(tenantIdOrSlug) : null,
    updateRiskScoring
  )

  return {
    updateRiskScoring: trigger,
    isUpdating: isMutating,
    error,
  }
}

// ============================================
// PREVIEW RISK SCORING CHANGES
// ============================================

async function previewRiskScoring(url: string, { arg }: { arg: RiskScoringSettings }) {
  return fetcherWithOptions<{
    assets: RiskScorePreviewItem[]
    sample_count: number
    total_assets: number
  }>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  })
}

export function useRiskScoringPreview(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.riskScoringPreview(tenantIdOrSlug) : null,
    previewRiskScoring
  )

  return {
    previewChanges: trigger,
    isPreviewing: isMutating,
    error,
  }
}

// ============================================
// RECALCULATE RISK SCORES
// ============================================

async function recalculateScores(url: string) {
  return fetcherWithOptions<RecalculateResponse>(url, {
    method: 'POST',
  })
}

export function useRecalculateRiskScores(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.riskScoringRecalculate(tenantIdOrSlug) : null,
    recalculateScores
  )

  return {
    recalculate: trigger,
    isRecalculating: isMutating,
    error,
  }
}

// ============================================
// FETCH PRESETS
// ============================================

export function useRiskScoringPresets(tenantIdOrSlug: string | undefined) {
  const { data, error, isLoading } = useSWR<PresetInfo[]>(
    tenantIdOrSlug ? tenantEndpoints.riskScoringPresets(tenantIdOrSlug) : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  return {
    presets: data,
    isLoading,
    isError: !!error,
    error,
  }
}
