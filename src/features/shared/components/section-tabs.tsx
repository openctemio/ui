'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TAB_CLASS, TAB_STRIP_CLASS, useTabStripScroll } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export interface SectionTab {
  label: string
  href: string
  /** Optional icon shown before the label. */
  icon?: React.ElementType
  /** Optional: also mark active when the pathname starts with this prefix. */
  matchPrefix?: string
  /**
   * Module the tab's route needs. Tabs of one section can belong to different
   * modules (Business context: Crown jewels | Services | Units); render those
   * strips with `GatedSectionTabs`, which hides a tab whose module is off.
   */
  module?: string
  /** Permission the tab's route needs (ANY of them when an array). */
  permission?: string | string[]
}

interface SectionTabsProps {
  tabs: readonly SectionTab[]
  className?: string
  /** Accessible name for the tab navigation. */
  label?: string
}

/**
 * Tabs whose items are routes (e.g. Remediation → Tasks | Solution families,
 * Account → Profile | Security | …). Looks and scrolls exactly like `TabsList`:
 * one underline strip, swipeable when the tabs do not fit, with the active tab
 * kept in view. The active tab is derived from the pathname; the most specific
 * match wins, so `/account` is not active on `/account/security`.
 */
export function SectionTabs({ tabs, className, label = 'Sections' }: SectionTabsProps) {
  const pathname = usePathname()
  const ref = React.useRef<HTMLElement>(null)
  useTabStripScroll(ref)

  const matches = (tab: SectionTab) =>
    pathname === tab.href ||
    (tab.matchPrefix ? pathname.startsWith(tab.matchPrefix) : false) ||
    pathname.startsWith(`${tab.href}/`)
  const active = tabs.filter(matches).sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <nav ref={ref} aria-label={label} className={cn(TAB_STRIP_CLASS, 'mb-5', className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.href === active ? 'page' : undefined}
            className={TAB_CLASS}
          >
            {Icon && <Icon aria-hidden />}
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
