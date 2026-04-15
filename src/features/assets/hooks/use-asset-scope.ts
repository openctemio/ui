'use client'

import { useMemo } from 'react'
import {
  getScopeMatchesForAsset,
  calculateScopeCoverage,
  type ScopeMatchResult,
} from '@/features/scope'
import type { Asset } from '../types'

/**
 * Shared scope integration for asset pages.
 * Computes scope matches and coverage for a list of assets.
 */
export function useAssetScope(assets: Asset[]) {
  // Scope targets/exclusions: server handles scope filtering via API.
  // Client-side matching uses empty arrays — scope stats come from /scope/stats API.
  const scopeTargets = useMemo(() => [] as Parameters<typeof getScopeMatchesForAsset>[1], [])
  const scopeExclusions = useMemo(() => [] as Parameters<typeof getScopeMatchesForAsset>[2], [])

  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    if (!assets?.length) return map
    for (const asset of assets) {
      const match = getScopeMatchesForAsset(
        { id: asset.id, type: asset.type ?? 'unclassified', name: asset.name },
        scopeTargets,
        scopeExclusions
      )
      map.set(asset.id, match)
    }
    return map
  }, [assets, scopeTargets, scopeExclusions])

  const scopeCoverage = useMemo(
    () =>
      calculateScopeCoverage(
        (assets ?? []).map((a) => ({ id: a.id, name: a.name, type: a.type ?? 'unclassified' })),
        scopeTargets,
        scopeExclusions
      ),
    [assets, scopeTargets, scopeExclusions]
  )

  return { scopeMatchesMap, scopeCoverage }
}
