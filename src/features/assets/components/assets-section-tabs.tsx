'use client'

import { GatedSectionTabs } from '@/features/shared'
import { ASSETS_SECTION_TABS } from '@/config/section-tabs'
import { useVisibleSectionTabs } from '@/lib/permissions'
import { useSuggestionCount } from '@/features/relationships/api/use-relationship-suggestions'

const SUGGESTIONS_HREF = '/relationships/suggestions'

/**
 * Inventory · Groups · What changed · Suggestions, the route tabs of Discovery
 * > Assets. Placed directly under the page's `PageHeader` (see
 * docs/ui-style-contract.md); the next block carries `mt-5`. Suggestions shows
 * how many relationship suggestions wait for review, fetched only when that
 * tab is visible (its module is `relationships`).
 */
export function AssetsSectionTabs() {
  const visible = useVisibleSectionTabs(ASSETS_SECTION_TABS)
  const showsSuggestions = visible.some((t) => t.href === SUGGESTIONS_HREF)
  const { data } = useSuggestionCount(showsSuggestions)
  return (
    <GatedSectionTabs
      tabs={ASSETS_SECTION_TABS}
      label="Assets sections"
      className="mt-4 mb-0"
      counts={{ [SUGGESTIONS_HREF]: data?.count }}
    />
  )
}
