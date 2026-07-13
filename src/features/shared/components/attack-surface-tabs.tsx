'use client'

import { SectionTabs } from './section-tabs'

/**
 * Sub-navigation for the Attack Surface pages. The Overview page and the
 * per-zone detail views (External / Internal / Cloud) were previously
 * unreachable orphans — this links them into one tabbed surface.
 */
export function AttackSurfaceTabs() {
  return (
    <SectionTabs
      className="mt-4"
      tabs={[
        { label: 'Overview', href: '/attack-surface' },
        { label: 'External', href: '/attack-surface/external' },
        { label: 'Internal', href: '/attack-surface/internal' },
        { label: 'Cloud', href: '/attack-surface/cloud' },
      ]}
    />
  )
}
