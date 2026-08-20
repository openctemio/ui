'use client'

/**
 * Collapsible faceted-filter panel (Kind / Business / Exposure / Lifecycle).
 *
 * Every value shows a LIVE count pulled from /assets/stats. Multi-select facets
 * are checkbox lists (with a search-within box for long lists like business
 * unit / provider / type); boolean facets are tri-state (unset → true → false).
 * Selecting anything resets pagination to page 1 via the parent's onChange.
 */

import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { FacetGroup, FacetDef, MultiFacetDef, BoolFacetDef } from '../../lib/inventory-facets'
import type { AssetStatsData } from '../../hooks/use-assets'
import type { InventoryFilters } from '../../lib/inventory-url'

/**
 * Render a single facet control (multi-select checkbox list OR tri-state
 * boolean toggle) — the same rendering used inside the sticky rail, the
 * desktop popover bar, and the mobile filter sheet. One source of truth for
 * the facet UI so the three surfaces can never drift apart.
 */
export function FacetControl({
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
  return facet.kind === 'multi' ? (
    <MultiFacet facet={facet} filters={filters} stats={stats} onChange={onChange} />
  ) : (
    <BoolFacet facet={facet} filters={filters} stats={stats} onChange={onChange} />
  )
}

/** Number of active selections on a facet (array length, or 1 for a set boolean). */
export function facetActiveCount(facet: FacetDef, filters: InventoryFilters): number {
  if (facet.kind === 'multi') {
    return (filters[facet.filterKey as keyof InventoryFilters] as string[] | undefined)?.length ?? 0
  }
  return filters[facet.filterKey as keyof InventoryFilters] !== undefined ? 1 : 0
}

interface FacetPanelProps {
  groups: FacetGroup[]
  filters: InventoryFilters
  stats: AssetStatsData
  onChange: (next: InventoryFilters) => void
}

export function InventoryFacetPanel({ groups, filters, stats, onChange }: FacetPanelProps) {
  return (
    <div className="space-y-1">
      {groups.map((group) => (
        <FacetGroupBlock
          key={group.id}
          group={group}
          filters={filters}
          stats={stats}
          onChange={onChange}
        />
      ))}
    </div>
  )
}

function FacetGroupBlock({
  group,
  filters,
  stats,
  onChange,
}: {
  group: FacetGroup
  filters: InventoryFilters
  stats: AssetStatsData
  onChange: (next: InventoryFilters) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b pb-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-semibold">
        {group.label}
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pb-1 pt-1">
        {group.facets.map((facet) =>
          facet.kind === 'multi' ? (
            <MultiFacet
              key={facet.filterKey}
              facet={facet}
              filters={filters}
              stats={stats}
              onChange={onChange}
            />
          ) : (
            <BoolFacet
              key={facet.filterKey}
              facet={facet}
              filters={filters}
              stats={stats}
              onChange={onChange}
            />
          )
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function MultiFacet({
  facet,
  filters,
  stats,
  onChange,
}: {
  facet: MultiFacetDef
  filters: InventoryFilters
  stats: AssetStatsData
  onChange: (next: InventoryFilters) => void
}) {
  const [query, setQuery] = useState('')
  const counts = facet.counts(stats)
  const selected =
    (filters[facet.filterKey as keyof InventoryFilters] as string[] | undefined) ?? []

  // Value set: static list keeps enum order; dynamic sorts by count desc.
  let values: string[]
  if (facet.source === 'static') {
    values = facet.values ?? []
  } else {
    values = Object.keys(counts).sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
  }
  // Always surface an already-selected value even if its live count is 0.
  for (const s of selected) if (!values.includes(s)) values.push(s)

  const filtered = query
    ? values.filter((v) => (facet.labelFor?.(v) ?? v).toLowerCase().includes(query.toLowerCase()))
    : values

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    onChange({
      ...filters,
      [facet.filterKey]: next.length > 0 ? next : undefined,
      page: 1,
    })
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{facet.label}</p>
      {facet.searchable && values.length > 6 && (
        <div className="relative">
          <Search className="absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${facet.label.toLowerCase()}…`}
            className="h-8 ps-7 text-xs"
          />
        </div>
      )}
      <div className="max-h-52 space-y-0.5 overflow-y-auto pe-1">
        {filtered.length === 0 && <p className="py-1 text-xs text-muted-foreground">No values</p>}
        {filtered.map((value) => {
          const checked = selected.includes(value)
          const count = counts[value] ?? 0
          return (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-accent"
            >
              <Checkbox checked={checked} onCheckedChange={() => toggle(value)} />
              <span className="flex-1 truncate text-sm">{facet.labelFor?.(value) ?? value}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {count.toLocaleString()}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function BoolFacet({
  facet,
  filters,
  stats,
  onChange,
}: {
  facet: BoolFacetDef
  filters: InventoryFilters
  stats: AssetStatsData
  onChange: (next: InventoryFilters) => void
}) {
  const counts = facet.counts(stats)
  const current = filters[facet.filterKey as keyof InventoryFilters] as boolean | undefined

  const set = (value: boolean) => {
    // Clicking the active option clears it (back to "any").
    const next = current === value ? undefined : value
    onChange({ ...filters, [facet.filterKey]: next, page: 1 })
  }

  const options: Array<{ value: boolean; label: string; count: number }> = [
    { value: true, label: facet.trueLabel, count: counts['true'] ?? 0 },
    { value: false, label: facet.falseLabel, count: counts['false'] ?? 0 },
  ]

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{facet.label}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((opt) => {
          const active = current === opt.value
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={active}
              onClick={() => set(opt.value)}
              className={cn(
                'flex items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-xs transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-accent'
              )}
            >
              <span className="truncate">{opt.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {opt.count.toLocaleString()}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
