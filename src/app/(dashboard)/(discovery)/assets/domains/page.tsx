'use client'

import { useCallback, useMemo, useState } from 'react'
import { useUrlParams } from '@/hooks/use-url-param'

import { AssetPage } from '@/features/assets/components/asset-page'
import { buildDomainsConfig } from './config'

/**
 * Domains page — tree-like collapse/expand layout.
 *
 * Uses "collapsed roots" model: empty Set = all expanded (default).
 * User clicks chevron to collapse a root → its name is added to the Set.
 * Search/tag filter overrides to always show all rows.
 */
export default function DomainsPage() {
  const searchParams = useUrlParams()
  const showAllForFilter = !!searchParams.get('q')?.trim() || !!searchParams.get('tags')?.trim()

  // Set of root domain names that are COLLAPSED. Empty = all expanded.
  const [collapsedRoots, setCollapsedRoots] = useState<Set<string>>(new Set())

  const toggleRoot = useCallback((rootName: string) => {
    setCollapsedRoots((prev) => {
      const next = new Set(prev)
      if (next.has(rootName))
        next.delete(rootName) // was collapsed → expand
      else next.add(rootName) // was expanded → collapse
      return next
    })
  }, [])

  const config = useMemo(
    () =>
      buildDomainsConfig({
        // null = show all rows (filter active or default expand-all)
        // Set = only roots NOT in the set are expanded
        collapsedRoots: showAllForFilter ? null : collapsedRoots,
        toggleRoot,
      }),
    [showAllForFilter, collapsedRoots, toggleRoot]
  )

  return <AssetPage config={config} />
}
