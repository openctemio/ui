'use client'

/**
 * Horizontal facet toolbar for the unified All-Assets inventory.
 *
 * Replaces the old sticky left rail so the table runs full-width. Each primary
 * facet is a Popover dropdown (`Type ▾`, `Criticality ▾`, `Owner ▾`,
 * `Exposure ▾`, `Data classification ▾`) whose body is the SAME facet control
 * used everywhere else (see FacetControl). Everything else lives behind a
 * `More filters ▾` popover. On mobile the whole bar collapses into a single
 * `Filters (n)` button that opens a Sheet holding every facet group — the exact
 * accordion body from InventoryFacetPanel. One source for the facet lists.
 */

import { useMemo } from 'react'
import { ChevronDown, SlidersHorizontal, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { FacetDef, FacetGroup } from '../../lib/inventory-facets'
import type { AssetStatsData } from '../../hooks/use-assets'
import type { InventoryFilters } from '../../lib/inventory-url'
import { FacetControl, facetActiveCount, InventoryFacetPanel } from './inventory-facet-panel'

interface FilterBarProps {
  groups: FacetGroup[]
  filters: InventoryFilters
  stats: AssetStatsData
  onChange: (next: InventoryFilters) => void
  /** Total active filter dimensions (drives the mobile "Filters (n)" badge). */
  activeCount: number
}

// The facets promoted to their own popover in the primary bar, in display order.
// Everything else falls through to the "More filters" popover automatically.
const PRIMARY_FILTER_KEYS: string[] = [
  'types',
  'criticalities',
  'hasOwner',
  'exposures',
  'dataClassifications',
]

// Short trigger labels — the facet's own `label` ("Asset type", "Ownership") is
// tuned for a stacked list; the bar wants a terse noun.
const TRIGGER_LABELS: Record<string, string> = {
  types: 'Type',
  criticalities: 'Criticality',
  hasOwner: 'Owner',
  exposures: 'Exposure',
  dataClassifications: 'Data classification',
}

function FacetPopover({
  facet,
  filters,
  stats,
  onChange,
}: {
  facet: FacetDef
  filters: InventoryFilters
  stats: AssetStatsData
  onChange: (next: InventoryFilters) => void
}) {
  const count = facetActiveCount(facet, filters)
  const active = count > 0
  const label = TRIGGER_LABELS[facet.filterKey] ?? facet.label
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={active}
          className={cn('h-9 gap-1.5', active && 'border-primary bg-primary/5 text-primary')}
        >
          {label}
          {active && <span className="tabular-nums">({count})</span>}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <FacetControl facet={facet} filters={filters} stats={stats} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}

export function InventoryFilterBar({
  groups,
  filters,
  stats,
  onChange,
  activeCount,
}: FilterBarProps) {
  // Flatten every facet once, then split into the primary set (own popovers)
  // and the remainder (the "More filters" popover), preserving group order.
  const { primary, more } = useMemo(() => {
    const allFacets = groups.flatMap((g) => g.facets)
    const byKey = new Map(allFacets.map((f) => [f.filterKey as string, f]))
    const primaryFacets = PRIMARY_FILTER_KEYS.map((k) => byKey.get(k)).filter(
      (f): f is FacetDef => !!f
    )
    const primaryKeys = new Set(primaryFacets.map((f) => f.filterKey as string))
    const moreFacets = allFacets.filter((f) => !primaryKeys.has(f.filterKey as string))
    return { primary: primaryFacets, more: moreFacets }
  }, [groups])

  const moreCount = useMemo(
    () => more.reduce((sum, f) => sum + facetActiveCount(f, filters), 0),
    [more, filters]
  )

  return (
    <div className="flex items-center gap-2">
      {/* Desktop: a popover per primary facet + a "More filters" popover. */}
      <div className="hidden flex-wrap items-center gap-2 lg:flex">
        {primary.map((facet) => (
          <FacetPopover
            key={facet.filterKey}
            facet={facet}
            filters={filters}
            stats={stats}
            onChange={onChange}
          />
        ))}
        {more.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-pressed={moreCount > 0}
                className={cn(
                  'h-9 gap-1.5',
                  moreCount > 0 && 'border-primary bg-primary/5 text-primary'
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                More filters
                {moreCount > 0 && <span className="tabular-nums">({moreCount})</span>}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-[70vh] w-72 overflow-y-auto">
              <div className="space-y-4">
                {more.map((facet) => (
                  <FacetControl
                    key={facet.filterKey}
                    facet={facet}
                    filters={filters}
                    stats={stats}
                    onChange={onChange}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Mobile: one button → Sheet holding the full facet accordion. */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-pressed={activeCount > 0}
              className={cn(
                'h-9 gap-1.5',
                activeCount > 0 && 'border-primary bg-primary/5 text-primary'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {activeCount > 0 && <span className="tabular-nums">({activeCount})</span>}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Refine the inventory across every facet.</SheetDescription>
            </SheetHeader>
            <div className="mt-4 px-4 pb-8">
              <InventoryFacetPanel
                groups={groups}
                filters={filters}
                stats={stats}
                onChange={onChange}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
