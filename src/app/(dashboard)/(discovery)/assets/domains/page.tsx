'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUrlParams } from '@/hooks/use-url-param'

import { AssetPage } from '@/features/assets/components/asset-page'
import { buildDomainsConfig } from './config'

/**
 * Domains page — tree-like collapse/expand layout.
 *
 * Uses "collapsed roots" model: empty Set = all expanded (default).
 * User clicks chevron to collapse a root → its name is added to the Set.
 * Search/tag filter overrides to always show all rows.
 *
 * When ?type=subdomain is in URL (from overview click), shows only subdomains
 * as flat list (no tree nesting).
 */
export default function DomainsPage() {
  const searchParams = useSearchParams()
  const urlParams = useUrlParams()
  const showAllForFilter = !!urlParams.get('q')?.trim() || !!urlParams.get('tags')?.trim()
  // When URL has ?type= filter (e.g., type=subdomain), show flat list without tree
  const urlType = searchParams.get('type')
  const flatMode = !!urlType

  // Set of root domain names that are COLLAPSED. Empty = all expanded.
  const [collapsedRoots, setCollapsedRoots] = useState<Set<string>>(new Set())

  const toggleRoot = useCallback((rootName: string) => {
    setCollapsedRoots((prev) => {
      const next = new Set(prev)
      if (next.has(rootName)) next.delete(rootName)
      else next.add(rootName)
      return next
    })
  }, [])

  const config = useMemo(
    () =>
      buildDomainsConfig({
        collapsedRoots: showAllForFilter ? null : collapsedRoots,
        toggleRoot,
        flatMode,
      }),
    [showAllForFilter, collapsedRoots, toggleRoot, flatMode]
  )

  // Only remount when type/sub_type changes (overview click-through), NOT on page/q/sort changes
  const remountKey = `${searchParams.get('type') ?? ''}_${searchParams.get('sub_type') ?? ''}`
  return <AssetPage key={remountKey} config={config} />
}
