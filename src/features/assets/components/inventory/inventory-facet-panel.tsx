'use client'

/**
 * The All-Assets filter panel, built on the shared FacetPanel (the same
 * controls as Findings). Every facet from `buildFacetGroups` becomes one
 * foldable section:
 *  - multi-value facets → a checkbox per value (a search box for long lists);
 *  - tri-state boolean facets (unset / true / false) → two mutually exclusive
 *    options, so "Has owner" and "Unowned" are both one click away and ticking
 *    one replaces the other.
 * A "Signals" section holds the filters that are not facets (crown jewels,
 * has findings, stale) and any tags that arrived in the URL, so every filter
 * counted on the toolbar button can be seen and removed here.
 *
 * No per-option counts: the stats counts ignore the other active filters, so
 * they would disagree with the list. Selecting anything resets to page 1.
 */

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { FacetOption, FacetPanel, FacetSection } from '@/features/shared'
import {
  staleBeforeISO,
  type BoolFacetDef,
  type FacetGroup,
  type MultiFacetDef,
} from '../../lib/inventory-facets'
import type { AssetStatsData } from '../../hooks/use-assets'
import type { InventoryFilters } from '../../lib/inventory-url'

/** Sections unfolded by default; the rest start folded (a selection unfolds them). */
const OPEN_BY_DEFAULT = new Set<string>(['types', 'criticalities', 'hasOwner'])

/** Long value lists get a search box and show only their first values until expanded. */
const SEARCH_THRESHOLD = 8
const COLLAPSED_COUNT = 6

interface InventoryFacetPanelProps {
  groups: FacetGroup[]
  filters: InventoryFilters
  stats: AssetStatsData
  onChange: (next: InventoryFilters) => void
  activeCount: number
  onClearAll: () => void
  className?: string
}

export function InventoryFacetPanel({
  groups,
  filters,
  stats,
  onChange,
  activeCount,
  onClearAll,
  className,
}: InventoryFacetPanelProps) {
  const facets = groups.flatMap((g) => g.facets)
  // Signals sit right after the "kind" facets: they are what an analyst reaches
  // for next (crown jewels, assets with findings).
  const kindCount = groups[0]?.facets.length ?? 0

  const renderFacet = (facet: (typeof facets)[number]) =>
    facet.kind === 'multi' ? (
      <MultiFacetSection
        key={facet.filterKey}
        facet={facet}
        filters={filters}
        stats={stats}
        onChange={onChange}
      />
    ) : (
      <BoolFacetSection key={facet.filterKey} facet={facet} filters={filters} onChange={onChange} />
    )

  return (
    <FacetPanel activeCount={activeCount} onClearAll={onClearAll} className={className}>
      {facets.slice(0, kindCount).map(renderFacet)}
      <SignalsSection filters={filters} onChange={onChange} />
      {facets.slice(kindCount).map(renderFacet)}
      <TagsSection filters={filters} onChange={onChange} />
    </FacetPanel>
  )
}

function MultiFacetSection({
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
  const [expanded, setExpanded] = useState(false)
  const selected = (filters[facet.filterKey] as string[] | undefined) ?? []

  // Static facets keep their enum order; dynamic ones list the values the
  // tenant actually has (most common first) — the counts only order them.
  let values: string[]
  if (facet.source === 'static') {
    values = [...(facet.values ?? [])]
  } else {
    const counts = facet.counts(stats)
    values = Object.keys(counts).sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
  }
  // A value selected from the URL stays visible (and removable) even when the
  // tenant has none of it.
  for (const s of selected) if (!values.includes(s)) values.push(s)

  const label = (v: string) => facet.labelFor?.(v) ?? v
  const long = values.length > SEARCH_THRESHOLD
  // A long list (e.g. 25 asset types) shows its most common values first and
  // the rest on demand, so the sections below stay within reach. Selected
  // values are always shown.
  const shown = query
    ? values.filter((v) => label(v).toLowerCase().includes(query.toLowerCase()))
    : long && !expanded
      ? values.filter((v, i) => i < COLLAPSED_COUNT || selected.includes(v))
      : values
  const hiddenCount = values.length - shown.length

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    onChange({ ...filters, [facet.filterKey]: next.length > 0 ? next : undefined, page: 1 })
  }

  return (
    <FacetSection
      title={facet.label}
      selectedCount={selected.length}
      defaultOpen={OPEN_BY_DEFAULT.has(facet.filterKey)}
    >
      {facet.searchable && long && (
        <div className="relative mb-1.5">
          <Search className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${facet.label.toLowerCase()}…`}
            aria-label={`Search ${facet.label.toLowerCase()}`}
            className="h-8 ps-7 text-xs"
          />
        </div>
      )}
      {shown.length === 0 ? (
        <p className="py-1 text-xs text-muted-foreground">
          {query ? 'No matches.' : 'None in this workspace yet.'}
        </p>
      ) : (
        shown.map((value) => (
          <FacetOption
            key={value}
            label={label(value)}
            checked={selected.includes(value)}
            onCheckedChange={() => toggle(value)}
          />
        ))
      )}
      {!query && long && (hiddenCount > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="px-1.5 pt-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {expanded ? 'Show fewer' : `Show ${hiddenCount} more`}
        </button>
      )}
    </FacetSection>
  )
}

function BoolFacetSection({
  facet,
  filters,
  onChange,
}: {
  facet: BoolFacetDef
  filters: InventoryFilters
  onChange: (next: InventoryFilters) => void
}) {
  const current = filters[facet.filterKey]
  // Ticking an option selects that value; unticking the selected one returns
  // the facet to "any".
  const set = (value: boolean, on: boolean) =>
    onChange({ ...filters, [facet.filterKey]: on ? value : undefined, page: 1 })

  return (
    <FacetSection
      title={facet.label}
      selectedCount={current === undefined ? 0 : 1}
      defaultOpen={OPEN_BY_DEFAULT.has(facet.filterKey)}
    >
      <FacetOption
        label={facet.trueLabel}
        checked={current === true}
        onCheckedChange={(on) => set(true, on)}
      />
      <FacetOption
        label={facet.falseLabel}
        checked={current === false}
        onCheckedChange={(on) => set(false, on)}
      />
    </FacetSection>
  )
}

/** Filters that are not facets but that the views and metrics can turn on. */
function SignalsSection({
  filters,
  onChange,
}: {
  filters: InventoryFilters
  onChange: (next: InventoryFilters) => void
}) {
  const patch = (p: Partial<InventoryFilters>) => onChange({ ...filters, ...p, page: 1 })
  const selectedCount =
    (filters.isCrownJewel !== undefined ? 1 : 0) +
    (filters.hasFindings !== undefined ? 1 : 0) +
    (filters.lastSeenBefore ? 1 : 0) +
    (filters.lastSeenAfter ? 1 : 0)

  return (
    <FacetSection title="Signals" selectedCount={selectedCount} defaultOpen={false}>
      <FacetOption
        label="Crown jewels"
        checked={filters.isCrownJewel === true}
        onCheckedChange={(on) => patch({ isCrownJewel: on ? true : undefined })}
      />
      {/* The negative forms only arrive from a shared link; show them so they
          can be removed, but do not offer them otherwise. */}
      {filters.isCrownJewel === false && (
        <FacetOption
          label="Not a crown jewel"
          checked
          onCheckedChange={() => patch({ isCrownJewel: undefined })}
        />
      )}
      <FacetOption
        label="Has findings"
        checked={filters.hasFindings === true}
        onCheckedChange={(on) => patch({ hasFindings: on ? true : undefined })}
      />
      {filters.hasFindings === false && (
        <FacetOption
          label="No findings"
          checked
          onCheckedChange={() => patch({ hasFindings: undefined })}
        />
      )}
      <FacetOption
        label="Not seen for 30+ days"
        checked={!!filters.lastSeenBefore}
        onCheckedChange={(on) => patch({ lastSeenBefore: on ? staleBeforeISO(30) : undefined })}
      />
      {filters.lastSeenAfter && (
        <FacetOption
          label="Seen recently"
          checked
          onCheckedChange={() => patch({ lastSeenAfter: undefined })}
        />
      )}
    </FacetSection>
  )
}

/** Tags have no facet (no tenant tag list to offer); show the ones in the URL. */
function TagsSection({
  filters,
  onChange,
}: {
  filters: InventoryFilters
  onChange: (next: InventoryFilters) => void
}) {
  const tags = filters.tags ?? []
  if (tags.length === 0) return null
  return (
    <FacetSection title="Tags" selectedCount={tags.length}>
      {tags.map((t) => (
        <FacetOption
          key={t}
          label={t}
          checked
          onCheckedChange={() => {
            const next = tags.filter((x) => x !== t)
            onChange({ ...filters, tags: next.length > 0 ? next : undefined, page: 1 })
          }}
        />
      ))}
    </FacetSection>
  )
}
