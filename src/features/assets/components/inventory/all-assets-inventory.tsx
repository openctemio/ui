'use client'

/**
 * Unified All-Assets inventory: ONE server-paginated table across every asset
 * type, with a best-in-class CTEM faceted filter.
 *
 * State model: the URL query string is the single source of truth. Filters are
 * parsed from it on every render and written back with router.replace, so a
 * reload or a shared link restores the exact view (deep-linkable, scoped to the
 * viewer's own tenant). Saved / named views are intentionally deferred to v2.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, Lock } from 'lucide-react'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState } from '@/features/shared'
import { Input } from '@/components/ui/input'
import { usePermissions, Permission } from '@/lib/permissions'
import { useDebounce } from '@/hooks/use-debounce'
import { useAssets, useAssetStats, type AssetSearchFilters } from '../../hooks/use-assets'
import { useBusinessUnits } from '@/features/business-units/api/use-business-units'
import { buildFacetGroups, type QuickPreset } from '../../lib/inventory-facets'
import {
  parseInventoryFilters,
  serializeInventoryFilters,
  countActiveFilters,
  DEFAULT_PAGE_SIZE,
  type InventoryFilters,
} from '../../lib/inventory-url'
import { InventoryQuickPresets } from './inventory-quick-presets'
import { InventoryFacetPanel } from './inventory-facet-panel'
import { InventoryActiveChips } from './inventory-active-chips'
import { InventoryTable, type InventorySort } from './inventory-table'

/** Map the URL sort string ("-risk_score") to the table's {field, desc}. */
function toInventorySort(sort?: string): InventorySort | undefined {
  if (!sort) return undefined
  return sort.startsWith('-') ? { field: sort.slice(1), desc: true } : { field: sort, desc: false }
}
function fromInventorySort(sort?: InventorySort): string | undefined {
  if (!sort) return undefined
  return sort.desc ? `-${sort.field}` : sort.field
}

/** Translate the inventory filter model into the useAssets query shape. */
function toSearchFilters(f: InventoryFilters): AssetSearchFilters {
  return {
    search: f.search,
    types: f.types,
    criticalities: f.criticalities,
    statuses: f.statuses,
    scopes: f.scopes,
    exposures: f.exposures,
    tags: f.tags,
    dataClassifications: f.dataClassifications,
    environments: f.environments,
    providers: f.providers,
    businessUnitIds: f.businessUnitIds,
    hasOwner: f.hasOwner,
    isControlPlane: f.isControlPlane,
    isInternetAccessible: f.isInternetAccessible,
    isCrownJewel: f.isCrownJewel,
    hasFindings: f.hasFindings,
    lastSeenBefore: f.lastSeenBefore,
    lastSeenAfter: f.lastSeenAfter,
    sort: f.sort,
    page: f.page ?? 1,
    pageSize: f.pageSize ?? DEFAULT_PAGE_SIZE,
  }
}

export function AllAssetsInventory() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { can } = usePermissions()
  const canRead = can(Permission.AssetsRead)

  // URL is the source of truth for all filter state.
  const filters = useMemo(
    () => parseInventoryFilters(new URLSearchParams(searchParams.toString())),
    [searchParams]
  )

  const setFilters = useCallback(
    (next: InventoryFilters) => {
      const qs = serializeInventoryFilters(next).toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname]
  )

  // Local search input, debounced into the URL so we don't replace() per keystroke.
  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const debouncedSearch = useDebounce(searchInput, 300)
  // Keep the box in sync when search is cleared elsewhere (chip, clear-all).
  useEffect(() => {
    setSearchInput(filters.search ?? '')
  }, [filters.search])
  useEffect(() => {
    const current = filters.search ?? ''
    if (debouncedSearch !== current) {
      setFilters({ ...filters, search: debouncedSearch || undefined, page: 1 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  // Data. Facet counts come from the tenant-wide stats endpoint (see note below).
  const searchFilters = useMemo(() => toSearchFilters(filters), [filters])
  const { assets, total, page, pageSize, isLoading, isError, error, mutate } =
    useAssets(searchFilters)
  const { stats } = useAssetStats()
  const { data: buData } = useBusinessUnits()

  const businessUnitLabels = useMemo(() => {
    const map: Record<string, string> = {}
    for (const bu of buData?.data ?? []) map[bu.id] = bu.name
    return map
  }, [buData])

  const facetGroups = useMemo(() => buildFacetGroups(businessUnitLabels), [businessUnitLabels])

  const togglePreset = useCallback(
    (preset: QuickPreset) => {
      if (preset.isActive(filters)) {
        // Turn it off: unset exactly the keys the preset controls.
        const next = { ...filters }
        for (const key of Object.keys(preset.apply) as (keyof InventoryFilters)[]) {
          delete next[key]
        }
        setFilters({ ...next, page: 1 })
      } else {
        setFilters({ ...filters, ...preset.apply, page: 1 })
      }
    },
    [filters, setFilters]
  )

  const activeCount = countActiveFilters(filters)

  if (!canRead) {
    return (
      <Main>
        <PageHeader title="All Assets" description="Unified, filterable inventory of every asset" />
        <EmptyState
          className="mt-8 border-dashed"
          icon={Lock}
          title="You don't have access to assets"
          description="Ask an administrator for the assets:read permission to view the inventory."
        />
      </Main>
    )
  }

  return (
    <Main>
      <PageHeader
        title="All Assets"
        description="One filterable inventory across every asset type — search, facet, and share deep links."
      />

      {/* Search + quick presets */}
      <div className="mt-6 space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search assets by name, description, or alias…"
            className="ps-9"
          />
        </div>
        <InventoryQuickPresets filters={filters} onToggle={togglePreset} />
      </div>

      {/* Layout: facet panel (left) + table (right) */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Filters</h2>
              {activeCount > 0 && (
                <span className="text-xs text-muted-foreground">{activeCount} active</span>
              )}
            </div>
            <InventoryFacetPanel
              groups={facetGroups}
              filters={filters}
              stats={stats}
              onChange={setFilters}
            />
          </div>
        </aside>

        <section className="min-w-0 space-y-3">
          <InventoryActiveChips
            filters={filters}
            facetGroups={facetGroups}
            onChange={setFilters}
            onClearAll={() => setFilters({ sort: filters.sort, pageSize: filters.pageSize })}
          />
          <InventoryTable
            assets={assets}
            isLoading={isLoading}
            isError={isError}
            error={error}
            total={total}
            page={page}
            pageSize={pageSize}
            sort={toInventorySort(filters.sort)}
            onPageChange={(p) => setFilters({ ...filters, page: p })}
            onPageSizeChange={(size) => setFilters({ ...filters, pageSize: size, page: 1 })}
            onSortChange={(s) => setFilters({ ...filters, sort: fromInventorySort(s), page: 1 })}
            onRefresh={() => mutate()}
          />
        </section>
      </div>
    </Main>
  )
}
