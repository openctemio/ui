'use client'

/**
 * Risk Scoring Context Provider
 *
 * Loads tenant-specific risk level thresholds from the API and provides them
 * via context so that risk score components (RiskScoreBadge, RiskScoreMeter,
 * RiskScoreGauge) display labels consistent with the configured scoring engine.
 */

import * as React from 'react'
import { useTenant } from '@/context/tenant-provider'
import { useRiskScoringSettings } from '@/features/organization/api/use-risk-scoring-settings'
import type { RiskLevelThresholds } from '@/features/shared/types/common.types'
import { DEFAULT_RISK_LEVELS } from '@/features/shared/types/common.types'

// ============================================
// TYPES
// ============================================

interface RiskScoringContextValue {
  thresholds: RiskLevelThresholds
  isLoading: boolean
}

// ============================================
// CONTEXT
// ============================================

const RiskScoringContext = React.createContext<RiskScoringContextValue>({
  thresholds: DEFAULT_RISK_LEVELS,
  isLoading: false,
})

// ============================================
// PROVIDER
// ============================================

export function RiskScoringProvider({ children }: { children: React.ReactNode }) {
  const { currentTenant } = useTenant()
  const { settings, isLoading } = useRiskScoringSettings(currentTenant?.id)

  const thresholds = React.useMemo<RiskLevelThresholds>(() => {
    if (!settings?.risk_levels) return DEFAULT_RISK_LEVELS
    return {
      critical_min: settings.risk_levels.critical_min,
      high_min: settings.risk_levels.high_min,
      medium_min: settings.risk_levels.medium_min,
      low_min: settings.risk_levels.low_min,
    }
  }, [settings])

  const value = React.useMemo<RiskScoringContextValue>(
    () => ({ thresholds, isLoading }),
    [thresholds, isLoading]
  )

  return <RiskScoringContext.Provider value={value}>{children}</RiskScoringContext.Provider>
}

// ============================================
// HOOK
// ============================================

export function useRiskThresholds(): RiskLevelThresholds {
  return React.useContext(RiskScoringContext).thresholds
}

export function useRiskScoringContext(): RiskScoringContextValue {
  return React.useContext(RiskScoringContext)
}
