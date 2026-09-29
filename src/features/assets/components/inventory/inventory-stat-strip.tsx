'use client'

/**
 * Headline numbers for the All-Assets inventory, as the shared MetricStrip.
 *
 * Each metric is also a quick filter: clicking it applies (or clears) the
 * matching filter, and its active state is read straight from the current
 * filters. Counts come from the tenant-wide /assets/stats aggregate.
 *
 * Only "Unowned" is coloured: an asset nobody owns is a gap to close. A
 * critical or internet-facing asset is important, not a problem in itself.
 *
 * "Stale" is intentionally omitted: the stats endpoint exposes no stale count,
 * and faking one from the current page would misrepresent the tenant total. The
 * "Stale >30d" view still covers that filter.
 */

import { MetricStrip, type MetricStripItem } from '@/features/shared'
import type { AssetStatsData } from '../../hooks/use-assets'
import { isInventoryFilterEmpty, type InventoryFilters } from '../../lib/inventory-url'

interface StatDef {
  id: string
  label: string
  value: number
  tone?: MetricStripItem['tone']
  active: boolean
  /** Toggle the filter this metric represents, returning the next filter state. */
  toggle: (f: InventoryFilters) => InventoryFilters
}

interface StatStripProps {
  stats: AssetStatsData
  filters: InventoryFilters
  isLoading?: boolean
  onChange: (next: InventoryFilters) => void
  className?: string
}

export function InventoryStatStrip({
  stats,
  filters,
  isLoading,
  onChange,
  className,
}: StatStripProps) {
  const defs: StatDef[] = [
    {
      id: 'total',
      label: 'All assets',
      value: stats.total,
      active: isInventoryFilterEmpty(filters),
      // Clears every filter (keeps sort + page size).
      toggle: (f) => ({ sort: f.sort, pageSize: f.pageSize }),
    },
    {
      id: 'critical',
      label: 'Critical',
      value: stats.byCriticality['critical'] ?? 0,
      active: filters.criticalities?.includes('critical') ?? false,
      toggle: (f) =>
        f.criticalities?.includes('critical')
          ? { ...f, criticalities: undefined, page: 1 }
          : { ...f, criticalities: ['critical'], page: 1 },
    },
    {
      id: 'internet',
      label: 'Internet-facing',
      value: stats.byInternetAccessible['true'] ?? 0,
      active: filters.isInternetAccessible === true,
      toggle: (f) =>
        f.isInternetAccessible === true
          ? { ...f, isInternetAccessible: undefined, page: 1 }
          : { ...f, isInternetAccessible: true, page: 1 },
    },
    {
      id: 'unowned',
      label: 'Unowned',
      value: stats.byHasOwner['false'] ?? 0,
      tone: 'danger',
      active: filters.hasOwner === false,
      toggle: (f) =>
        f.hasOwner === false
          ? { ...f, hasOwner: undefined, page: 1 }
          : { ...f, hasOwner: false, page: 1 },
    },
    {
      id: 'with-findings',
      label: 'With findings',
      value: stats.withFindings,
      active: filters.hasFindings === true,
      toggle: (f) =>
        f.hasFindings === true
          ? { ...f, hasFindings: undefined, page: 1 }
          : { ...f, hasFindings: true, page: 1 },
    },
  ]

  return (
    <MetricStrip
      className={className}
      loading={isLoading}
      items={defs.map((d) => ({
        key: d.id,
        label: d.label,
        value: d.value,
        tone: d.tone,
        active: d.active,
        onClick: () => onChange(d.toggle(filters)),
      }))}
    />
  )
}
