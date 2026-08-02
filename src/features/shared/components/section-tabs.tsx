'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface SectionTab {
  label: string
  href: string
  /** Optional: also mark active when the pathname starts with this prefix. */
  matchPrefix?: string
}

interface SectionTabsProps {
  tabs: SectionTab[]
  className?: string
}

/**
 * A horizontal tab strip of route links for a section with multiple related
 * sub-views (e.g. Remediation → Tasks | Solution Families). Consolidates what
 * would otherwise be several near-duplicate top-level sidebar entries into one
 * nav item with in-page tabs. Active tab is derived from the current pathname.
 */
export function SectionTabs({ tabs, className }: SectionTabsProps) {
  const pathname = usePathname()
  return (
    <div className={cn('border-border/60 mb-6 flex gap-1 border-b', className)}>
      {tabs.map((tab) => {
        const active =
          pathname === tab.href || (tab.matchPrefix ? pathname.startsWith(tab.matchPrefix) : false)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
