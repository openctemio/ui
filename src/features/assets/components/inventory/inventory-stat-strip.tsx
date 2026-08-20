'use client'

/**
 * Compact, clickable summary strip for the All-Assets inventory.
 *
 * Each tile is a toggle button that applies (or clears) the matching filter and
 * reflects the current filter state as its active style — so the strip is both a
 * read-out and a one-click entry point into a filtered view. Counts come from the
 * tenant-wide /assets/stats aggregate (the same source the facets use).
 *
 * "Stale" is intentionally omitted: the stats endpoint exposes no stale count,
 * and faking one from the current page would misrepresent the tenant total. The
 * "Stale >30d" quick-view preset still covers that filter.
 */

import type { ElementType } from 'react'
import { Package, ShieldAlert, Globe, UserX, AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AssetStatsData } from '../../hooks/use-assets'
import { isInventoryFilterEmpty, type InventoryFilters } from '../../lib/inventory-url'

interface StatDef {
  id: string
  label: string
  icon: ElementType
  iconClassName?: string
  value: number
  active: boolean
  /** Toggle the filter this tile represents, returning the next filter state. */
  toggle: (f: InventoryFilters) => InventoryFilters
}

interface StatStripProps {
  stats: AssetStatsData
  filters: InventoryFilters
  isLoading?: boolean
  onChange: (next: InventoryFilters) => void
}

export function InventoryStatStrip({ stats, filters, isLoading, onChange }: StatStripProps) {
  const defs: StatDef[] = [
    {
      id: 'total',
      label: 'Total',
      icon: Package,
      value: stats.total,
      active: isInventoryFilterEmpty(filters),
      // Clicking "Total" clears every filter (keeps sort + page size).
      toggle: (f) => ({ sort: f.sort, pageSize: f.pageSize }),
    },
    {
      id: 'critical',
      label: 'Critical',
      icon: ShieldAlert,
      iconClassName: 'text-destructive',
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
      icon: Globe,
      iconClassName: 'text-warning',
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
      icon: UserX,
      value: stats.byHasOwner['false'] ?? 0,
      active: filters.hasOwner === false,
      toggle: (f) =>
        f.hasOwner === false
          ? { ...f, hasOwner: undefined, page: 1 }
          : { ...f, hasOwner: false, page: 1 },
    },
    {
      id: 'with-findings',
      label: 'With findings',
      icon: AlertTriangle,
      iconClassName: 'text-warning',
      value: stats.withFindings,
      active: filters.hasFindings === true,
      toggle: (f) =>
        f.hasFindings === true
          ? { ...f, hasFindings: undefined, page: 1 }
          : { ...f, hasFindings: true, page: 1 },
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {defs.map((stat) => {
        const Icon = stat.icon
        return (
          <button
            key={stat.id}
            type="button"
            aria-pressed={stat.active}
            onClick={() => onChange(stat.toggle(filters))}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-start transition-colors hover:border-primary',
              stat.active ? 'border-primary bg-primary/5' : 'border-border'
            )}
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Icon className={cn('h-3.5 w-3.5', stat.iconClassName)} />
              {stat.label}
            </span>
            {isLoading ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              <span className="text-2xl font-semibold tabular-nums">
                {stat.value.toLocaleString()}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
