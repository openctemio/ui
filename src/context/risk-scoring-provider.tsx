'use client'

/**
 * Risk Scoring Context Provider
 *
 * Reads tenant-specific risk level thresholds from bootstrap data and provides
 * them via context so that risk score components (RiskScoreBadge, RiskScoreMeter,
 * RiskScoreGauge) display labels consistent with the configured scoring engine.
 *
 * NOTE: Risk levels are included in the bootstrap API response (/api/v1/me/bootstrap)
 * to avoid an extra API call on page load.
 */

import * as React from 'react'
import { useBootstrapRiskLevels } from '@/context/bootstrap-provider'
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
  const { riskLevels, isLoading } = useBootstrapRiskLevels()

  const thresholds = React.useMemo<RiskLevelThresholds>(() => {
    if (!riskLevels) return DEFAULT_RISK_LEVELS
    return {
      critical_min: riskLevels.critical_min,
      high_min: riskLevels.high_min,
      medium_min: riskLevels.medium_min,
      low_min: riskLevels.low_min,
    }
  }, [riskLevels])

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
