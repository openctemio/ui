/**
 * Centralized CIA IMPACT-RATING color system for OpenCTEM.
 *
 * Impact rating = the CTEM Scoping business-impact of losing an asset's
 * Confidentiality / Integrity / Availability (low | moderate | high). It is a
 * SEPARATE scale from finding severity and from asset criticality, so it gets
 * its own palette source (peer to `severity-colors.ts` / `criticality-colors.ts`).
 *
 * Higher impact reads hotter; low is the calm green end. Theme-aware so it
 * matches the scope / exposure / criticality badges in both light and dark.
 *
 * ALL components must import impact colors from here instead of defining their
 * own inline maps (enforced by src/config/__tests__/severity-color-governance.test.ts).
 */

import type { ImpactRating } from '@/features/assets/types/asset.types'

/** Soft-tint badge (the scoping/asset default): translucent fill + hued text. */
export const IMPACT_RATING_BADGE_SOFT: Record<ImpactRating, string> = {
  high: 'bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-900/30 dark:text-red-400',
  moderate:
    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-500/10 text-green-500 border-green-500/20 dark:bg-green-900/30 dark:text-green-400',
}
