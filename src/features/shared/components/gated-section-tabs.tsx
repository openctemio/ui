'use client'

import { useVisibleSectionTabs } from '@/lib/permissions'
import { SectionTabs, type SectionTab } from './section-tabs'

interface GatedSectionTabsProps {
  tabs: readonly SectionTab[]
  className?: string
  /** Accessible name for the tab navigation. */
  label?: string
  /** A count after a tab's label, keyed by href (see `SectionTabs`). */
  counts?: Readonly<Record<string, number | undefined>>
}

/**
 * `SectionTabs` for a section whose tabs belong to different modules or
 * permissions (Business context, Threat model, Assets). A tab the user cannot
 * open is left out, the same decision the sidebar row makes. With one tab
 * left there is nothing to switch between, so no strip is drawn.
 */
export function GatedSectionTabs({ tabs, className, label, counts }: GatedSectionTabsProps) {
  const visible = useVisibleSectionTabs(tabs)
  if (visible.length < 2) return null
  return <SectionTabs tabs={visible} className={className} label={label} counts={counts} />
}
