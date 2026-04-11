'use client'

import { useCallback, useMemo, useState } from 'react'
import { useUrlParams } from '@/hooks/use-url-param'

import { AssetPage } from '@/features/assets/components/asset-page'
import { buildDomainsConfig } from './config'

/**
 * Domains page renders the standard AssetPage but with a tree-like
 * collapse/expand layout: by default only ROOT domains are visible,
 * and clicking the chevron next to a root reveals its subdomains.
 *
 * The expansion state lives in this page (not in the shared AssetPage)
 * so the rest of the asset pages stay flat-list. When the user is
 * actively searching or filtering by tag we override the expansion
 * and return every row, so search results don't get hidden by a
 * collapsed parent.
 */
export default function DomainsPage() {
  const searchParams = useUrlParams()
  // A non-empty `q` (search) or `tags` filter forces the picker into
  // "show all" mode so a query like "api" still surfaces api.example.com
  // even when its parent root is collapsed. Status tabs (Active /
  // Inactive / Pending) are navigation, not filtering, so we ignore them.
  const showAllForFilter = !!searchParams.get('q')?.trim() || !!searchParams.get('tags')?.trim()

  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set())

  const toggleRoot = useCallback((rootName: string) => {
    setExpandedRoots((prev) => {
      const next = new Set(prev)
      if (next.has(rootName)) next.delete(rootName)
      else next.add(rootName)
      return next
    })
  }, [])

  const config = useMemo(
    () =>
      buildDomainsConfig({
        // null means "show every row regardless of expansion" — used
        // when a filter is active so search results aren't hidden.
        expandedRoots: showAllForFilter ? null : expandedRoots,
        toggleRoot,
      }),
    [showAllForFilter, expandedRoots, toggleRoot]
  )

  return <AssetPage config={config} />
}
