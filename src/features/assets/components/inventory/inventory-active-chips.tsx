'use client'

/**
 * Active-filter chips. One removable chip per selected value (multi-select
 * facets expand to a chip each), plus chips for the boolean/preset dimensions
 * and free-text search. "Clear all" resets every filter but leaves sort +
 * pagination alone.
 */

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { FacetGroup, MultiFacetDef, BoolFacetDef } from '../../lib/inventory-facets'
import type { InventoryFilters } from '../../lib/inventory-url'

interface Chip {
  key: string
  label: string
  onRemove: () => void
}

interface ActiveChipsProps {
  filters: InventoryFilters
  facetGroups: FacetGroup[]
  onChange: (next: InventoryFilters) => void
  onClearAll: () => void
}

export function InventoryActiveChips({
  filters,
  facetGroups,
  onChange,
  onClearAll,
}: ActiveChipsProps) {
  const chips: Chip[] = []

  // Resolve per-facet metadata (group label + value labeller) once.
  const multiDefs = new Map<string, { def: MultiFacetDef; groupLabel: string }>()
  const boolDefs = new Map<string, { def: BoolFacetDef; groupLabel: string }>()
  for (const g of facetGroups) {
    for (const f of g.facets) {
      if (f.kind === 'multi') multiDefs.set(f.filterKey, { def: f, groupLabel: f.label })
      else boolDefs.set(f.filterKey, { def: f, groupLabel: f.label })
    }
  }

  // Multi-select facets → one chip per value.
  for (const [filterKey, { def }] of multiDefs) {
    const values = (filters[filterKey as keyof InventoryFilters] as string[] | undefined) ?? []
    for (const v of values) {
      chips.push({
        key: `${filterKey}:${v}`,
        label: `${def.label}: ${def.labelFor?.(v) ?? v}`,
        onRemove: () => {
          const next = values.filter((x) => x !== v)
          onChange({
            ...filters,
            [filterKey]: next.length > 0 ? next : undefined,
            page: 1,
          })
        },
      })
    }
  }

  // Boolean facets.
  for (const [filterKey, { def }] of boolDefs) {
    const val = filters[filterKey as keyof InventoryFilters] as boolean | undefined
    if (val !== undefined) {
      chips.push({
        key: filterKey,
        label: val ? def.trueLabel : def.falseLabel,
        onRemove: () => onChange({ ...filters, [filterKey]: undefined, page: 1 }),
      })
    }
  }

  // Standalone booleans not modelled as facets.
  if (filters.isCrownJewel !== undefined) {
    chips.push({
      key: 'isCrownJewel',
      label: filters.isCrownJewel ? 'Crown jewels' : 'Not crown jewels',
      onRemove: () => onChange({ ...filters, isCrownJewel: undefined, page: 1 }),
    })
  }
  if (filters.hasFindings !== undefined) {
    chips.push({
      key: 'hasFindings',
      label: filters.hasFindings ? 'Has findings' : 'No findings',
      onRemove: () => onChange({ ...filters, hasFindings: undefined, page: 1 }),
    })
  }
  if (filters.lastSeenBefore) {
    chips.push({
      key: 'lastSeenBefore',
      label: 'Stale (older than cutoff)',
      onRemove: () => onChange({ ...filters, lastSeenBefore: undefined, page: 1 }),
    })
  }
  if (filters.lastSeenAfter) {
    chips.push({
      key: 'lastSeenAfter',
      label: 'Seen recently',
      onRemove: () => onChange({ ...filters, lastSeenAfter: undefined, page: 1 }),
    })
  }
  if (filters.search) {
    chips.push({
      key: 'search',
      label: `Search: ${filters.search}`,
      onRemove: () => onChange({ ...filters, search: undefined, page: 1 }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="h-7 gap-1 ps-2 pe-1 text-xs">
          <span className="max-w-[220px] truncate font-medium">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove filter ${chip.label}`}
            className="rounded-sm p-0.5 hover:bg-destructive/20 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={onClearAll}
      >
        Clear all
      </Button>
    </div>
  )
}
