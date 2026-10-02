'use client'

/**
 * Grouped findings: one findings table, a header row per group (from the
 * groups API, with its counts) and the group's findings under it, loaded when
 * the group expands. The house pattern for grouped lists: see "Grouped lists"
 * in docs/ui-style-contract.md.
 */

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, ErrorState, SeverityBadge, type DataTableRowGroups } from '@/features/shared'
import { formatEpssScore } from '@/lib/epss'
import { cn } from '@/lib/utils'
import { useLazyGroupRows } from '@/hooks/use-lazy-group-rows'
import type { FilterPanelToggleProps } from '@/features/shared/components/filter-button'
import {
  useFindingGroups,
  type FindingGroup,
  type FindingGroupStats,
  type GroupByDimension,
} from '../api/use-finding-groups'
import { buildFindingsEndpoint, fetchFindings } from '../api/use-findings-api'
import type { ApiFinding, FindingApiFilters } from '../api/finding-api.types'

/** The dimensions the Findings page groups by (the groups API's group_by). */
export const GROUP_BY_DIMENSIONS: GroupByDimension[] = [
  'cve_id',
  'asset_id',
  'owner_id',
  'severity',
  'source',
  'component_id',
  'finding_type',
]

/** Statuses the grouped view counts when no status filter is set. */
export const GROUPED_DEFAULT_STATUSES = 'new,confirmed,in_progress,fix_applied,resolved'
/** Rows a group shows when it opens, and how many "Show more" adds. */
const FIRST_ROWS = 5
const MORE_ROWS = 20
/** Groups open on arrival; the rest load when opened (each costs a request). */
const OPEN_ON_ARRIVAL = 3

const EMPTY_STATS: FindingGroupStats = {
  total: 0,
  open: 0,
  in_progress: 0,
  fix_applied: 0,
  resolved: 0,
  affected_assets: 0,
  resolved_assets: 0,
  progress_pct: 0,
}

/**
 * The list filter that selects one group's findings, or null when the list
 * API cannot express the dimension (the group is then a header only).
 */
export function groupRowFilter(
  dimension: GroupByDimension,
  key: string
): Partial<FindingApiFilters> | null {
  switch (dimension) {
    case 'asset_id':
      return { asset_id: key }
    case 'severity':
      return { severities: [key as NonNullable<FindingApiFilters['severities']>[number]] }
    case 'source':
      return { sources: [key as NonNullable<FindingApiFilters['sources']>[number]] }
    case 'component_id':
      return { component_id: key }
    case 'cve_id':
      return { cve_ids: [key] }
    case 'finding_type':
      return { finding_types: [key] }
    default:
      return null
  }
}

/**
 * Whether a returned finding belongs to the group. An API that does not know
 * a filter ignores it and returns other findings; those must not be shown
 * under the group's header.
 */
function belongsToGroup(dimension: GroupByDimension, key: string, f: ApiFinding): boolean {
  switch (dimension) {
    case 'cve_id':
      return f.cve_id === key
    case 'finding_type':
      return (f.finding_type ?? '') === key
    case 'asset_id':
      return f.asset_id === key
    default:
      return true
  }
}

class GroupFilterUnsupported extends Error {}

const humanize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ')

/** Group name plus the facts that identify it (type, owner, CVSS / EPSS, KEV). */
function GroupTitle({ group }: { group: FindingGroup }) {
  const stats = group.stats ?? EMPTY_STATS
  const meta = group.metadata ?? {}
  const facts: string[] = []
  if (group.group_type === 'cve') {
    if (meta.cvss_score) facts.push(`CVSS ${String(meta.cvss_score)}`)
    if (meta.epss_score) facts.push(`EPSS ${formatEpssScore(Number(meta.epss_score))}`)
  }
  if (group.group_type === 'asset') {
    if (meta.asset_type) facts.push(humanize(String(meta.asset_type)))
    if (meta.owner) facts.push(`Owner ${String(meta.owner)}`)
  }
  if (group.group_type === 'component' && meta.ecosystem) facts.push(String(meta.ecosystem))
  facts.push(`${stats.total} ${stats.total === 1 ? 'finding' : 'findings'}`)
  if (group.group_type !== 'asset') {
    facts.push(`${stats.affected_assets} ${stats.affected_assets === 1 ? 'asset' : 'assets'}`)
  }

  const isSeverityGroup = group.group_type === 'severity'
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
      {isSeverityGroup ? (
        <SeverityBadge
          severity={group.group_key as 'critical' | 'high' | 'medium' | 'low' | 'info'}
        />
      ) : (
        <span
          className={cn(
            'max-w-[28rem] truncate text-sm font-medium text-foreground',
            group.group_type === 'cve' && /^CVE-/i.test(group.label) && 'font-mono'
          )}
          title={group.label}
        >
          {group.group_type === 'finding_type' ? humanize(group.label) : group.label}
        </span>
      )}
      {group.group_type === 'cve' && group.severity && (
        <SeverityBadge
          severity={group.severity as 'critical' | 'high' | 'medium' | 'low' | 'info'}
        />
      )}
      {Boolean(meta.cisa_kev) && (
        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
          KEV
        </Badge>
      )}
      <span className="tabular-nums">· {facts.join(' · ')}</span>
    </span>
  )
}

/**
 * Status mix and verified share, compact enough for a header row. A status
 * is coloured only when it has findings.
 */
export function GroupStatusSummary({ stats }: { stats: FindingGroupStats }) {
  const parts: { label: string; value: number; dot: string }[] = [
    { label: 'open', value: stats.open, dot: 'bg-destructive' },
    { label: 'fixing', value: stats.in_progress, dot: 'bg-info' },
    { label: 'applied', value: stats.fix_applied, dot: 'bg-warning' },
    { label: 'resolved', value: stats.resolved, dot: 'bg-success' },
  ]
  const pct = Math.max(0, Math.min(100, stats.progress_pct))
  return (
    <span className="hidden items-center gap-3 tabular-nums lg:flex">
      <span className="flex items-center gap-2.5">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1 whitespace-nowrap">
            <span
              aria-hidden
              className={cn(
                'size-1.5 rounded-full',
                p.value > 0 ? p.dot : 'bg-muted-foreground/30'
              )}
            />
            <span className={cn(p.value > 0 && 'text-foreground')}>{p.value}</span> {p.label}
          </span>
        ))}
      </span>
      <span className="flex items-center gap-1.5 whitespace-nowrap" title="Resolved and verified">
        <span
          className="h-1.5 w-14 overflow-hidden rounded-full bg-muted-foreground/15"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Verified"
        >
          <span className="block h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
        </span>
        {pct.toFixed(0)}% verified
      </span>
    </span>
  )
}

export interface FindingGroupsTableProps<TRow extends { id: string }> {
  dimension: GroupByDimension
  /** The page's facet filters the groups API understands. */
  filters?: { severities?: string; statuses?: string; sources?: string; assignedToMe?: boolean }
  /** Status scope for groups and rows; defaults to the facet statuses, else open-to-resolved. */
  statuses?: string
  columns: ColumnDef<TRow>[]
  /** API finding → table row (the page's transform). */
  toRow: (f: ApiFinding) => TRow
  /** Groups page, 0-based, and size (the page keeps them in the URL). */
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (p: { pageIndex: number; pageSize: number }) => void
  pageSizeOptions?: number[]
  /** Group actions in the header (View, Mark fixed, Approve...). */
  renderGroupActions?: (group: FindingGroup) => React.ReactNode
  /** Opens the group in the full list; also offered when a group has more rows than load here. */
  onViewGroup?: (group: FindingGroup) => void
  onRowClick?: (row: TRow) => void
  onSelectionChange?: (rows: TRow[]) => void
  resetSelectionKey?: string | number
  mobileRow?: (row: TRow) => React.ReactNode
  filterToggle?: FilterPanelToggleProps
  toolbarStart?: React.ReactNode
  toolbarEnd?: React.ReactNode
  /** Bump to reload groups and their rows after a change. */
  reloadKey?: number
  /** Called with the groups on screen (e.g. to decide on page-level actions). */
  onGroupsLoaded?: (groups: FindingGroup[]) => void
  emptyMessage?: string
  emptyDescription?: string
}

export function FindingGroupsTable<TRow extends { id: string }>({
  dimension,
  filters,
  statuses: statusesProp,
  columns,
  toRow,
  pagination,
  onPaginationChange,
  pageSizeOptions,
  renderGroupActions,
  onViewGroup,
  onRowClick,
  onSelectionChange,
  resetSelectionKey,
  mobileRow,
  filterToggle,
  toolbarStart,
  toolbarEnd,
  reloadKey = 0,
  onGroupsLoaded,
  emptyMessage = 'No findings to group',
  emptyDescription,
}: FindingGroupsTableProps<TRow>) {
  const statuses = statusesProp || filters?.statuses || GROUPED_DEFAULT_STATUSES
  const severities = filters?.severities
  const sources = filters?.sources
  const assignedToMe = !!filters?.assignedToMe
  const {
    data,
    error,
    isLoading,
    mutate: mutateGroups,
  } = useFindingGroups({
    group_by: dimension,
    statuses,
    severities: filters?.severities || undefined,
    sources: filters?.sources || undefined,
    assigned_to_me: !!filters?.assignedToMe,
    page: pagination.pageIndex + 1,
    per_page: pagination.pageSize,
  })
  const groups = React.useMemo(() => data?.data ?? [], [data])
  const groupKeys = React.useMemo(() => groups.map((g) => g.group_key), [groups])
  const byKey = React.useMemo(() => new Map(groups.map((g) => [g.group_key, g])), [groups])
  const expandable = groupRowFilter(dimension, '') !== null

  const onGroupsLoadedRef = React.useRef(onGroupsLoaded)
  React.useEffect(() => {
    onGroupsLoadedRef.current = onGroupsLoaded
  })
  React.useEffect(() => {
    onGroupsLoadedRef.current?.(groups)
  }, [groups])

  // Which groups are open: the first few of each new set of groups.
  const scope = [
    dimension,
    statuses,
    filters?.severities ?? '',
    filters?.sources ?? '',
    filters?.assignedToMe ? 'mine' : '',
    pagination.pageIndex,
    pagination.pageSize,
  ].join('|')
  const [expanded, setExpanded] = React.useState<{ scope: string; keys: string[] } | null>(null)
  const expandedKeys = React.useMemo(() => {
    if (!expandable) return []
    if (expanded?.scope === scope) return expanded.keys
    return groupKeys.slice(0, OPEN_ON_ARRIVAL)
  }, [expandable, expanded, scope, groupKeys])
  const setExpandedKeys = React.useCallback(
    (keys: string[]) => setExpanded({ scope, keys }),
    [scope]
  )

  const fetchGroup = React.useCallback(
    async (key: string, limit: number) => {
      const groupFilter = groupRowFilter(dimension, key)
      if (!groupFilter) return { rows: [] as ApiFinding[], total: 0 }
      const url = buildFindingsEndpoint({
        statuses: statuses.split(',') as NonNullable<FindingApiFilters['statuses']>,
        ...(severities && {
          severities: severities.split(',') as NonNullable<FindingApiFilters['severities']>,
        }),
        ...(sources && {
          sources: sources.split(',') as NonNullable<FindingApiFilters['sources']>,
        }),
        ...(assignedToMe && { assigned_to_me: true }),
        ...groupFilter,
        page: 1,
        per_page: limit,
      })
      const res = await fetchFindings(url)
      const rows = res.data ?? []
      if (rows.some((f) => !belongsToGroup(dimension, key, f))) throw new GroupFilterUnsupported()
      return { rows, total: res.total ?? rows.length }
    },
    [dimension, statuses, severities, sources, assignedToMe]
  )

  const lazy = useLazyGroupRows<ApiFinding>({
    keys: expandedKeys,
    fetchGroup,
    resetKey: scope,
    initialLimit: FIRST_ROWS,
  })

  // Reload groups and rows when the page reports a change.
  const lastReload = React.useRef(reloadKey)
  const { reload } = lazy
  React.useEffect(() => {
    if (lastReload.current === reloadKey) return
    lastReload.current = reloadKey
    void mutateGroups()
    reload()
  }, [reloadKey, mutateGroups, reload])

  // The loaded rows of the groups on this page, each tagged with its group.
  const { rows, keyOf } = React.useMemo(() => {
    const keyOf = new Map<string, string>()
    const rows: TRow[] = []
    for (const key of groupKeys) {
      for (const f of lazy.groups[key]?.rows ?? []) {
        if (keyOf.has(f.id)) continue
        keyOf.set(f.id, key)
        rows.push(toRow(f))
      }
    }
    return { rows, keyOf }
  }, [groupKeys, lazy.groups, toRow])

  const rowGroups = React.useMemo<DataTableRowGroups<TRow>>(
    () => ({
      groups: groupKeys,
      getKey: (r) => keyOf.get(r.id) ?? '',
      collapsible: expandable,
      selectable: true,
      expandedKeys,
      onExpandedKeysChange: setExpandedKeys,
      getLabel: (key) => byKey.get(key)?.label || key,
      // An open group that has not answered yet shows skeleton rows.
      isGroupLoading: (key) => expandable && (!lazy.groups[key] || !!lazy.groups[key]?.loading),
      renderHeader: (key) => {
        const g = byKey.get(key)
        return g ? <GroupTitle group={g} /> : key
      },
      renderActions: (key) => {
        const g = byKey.get(key)
        if (!g) return null
        return (
          <>
            <GroupStatusSummary stats={g.stats ?? EMPTY_STATS} />
            {renderGroupActions?.(g)}
          </>
        )
      },
      renderFooter: (key, shown) => {
        const g = byKey.get(key)
        const st = lazy.groups[key]
        if (!g || !st) return null
        if (st.error instanceof GroupFilterUnsupported) {
          return (
            <span>
              These findings open in the list.{' '}
              {onViewGroup && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => onViewGroup(g)}
                >
                  {(g.stats?.total ?? 0) === 1
                    ? 'View the finding'
                    : `View ${g.stats?.total ?? ''} findings`}
                </Button>
              )}
            </span>
          )
        }
        if (st.error) {
          return (
            <span className="text-destructive">
              Could not load these findings.{' '}
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => lazy.retry(key)}
              >
                Retry
              </Button>
            </span>
          )
        }
        if (st.loading && shown.length === 0) return null
        if (st.total <= shown.length) return null
        const canLoadMore = lazy.limitOf(key) < lazy.maxLimit
        const more = Math.min(MORE_ROWS, st.total - shown.length)
        return (
          <span className="flex flex-wrap items-center gap-x-3 tabular-nums">
            <span>
              Showing {shown.length} of {st.total}
            </span>
            {canLoadMore ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                disabled={st.loading}
                onClick={() => lazy.showMore(key, MORE_ROWS)}
              >
                Show {more} more
              </Button>
            ) : (
              onViewGroup && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => onViewGroup(g)}
                >
                  View all {st.total} in the list
                </Button>
              )
            )}
          </span>
        )
      },
    }),
    [
      groupKeys,
      keyOf,
      expandable,
      expandedKeys,
      setExpandedKeys,
      byKey,
      lazy,
      renderGroupActions,
      onViewGroup,
    ]
  )

  if (error && !data) {
    return <ErrorState title="finding groups" error={error} onRetry={() => mutateGroups()} />
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      showSearch={false}
      filterToggle={filterToggle}
      toolbarStart={toolbarStart}
      toolbarEnd={toolbarEnd}
      getRowId={(r) => r.id}
      manualPagination
      rowCount={data?.pagination?.total ?? 0}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      pageSizeOptions={pageSizeOptions}
      paginationNoun="groups"
      pageSizeLabel="Groups per page"
      isLoading={isLoading && !data}
      onRowClick={onRowClick}
      onSelectionChange={onSelectionChange}
      resetSelectionKey={resetSelectionKey}
      showSelectionCount={false}
      mobileRow={mobileRow}
      rowGroups={rowGroups}
      emptyMessage={emptyMessage}
      emptyDescription={emptyDescription}
    />
  )
}
