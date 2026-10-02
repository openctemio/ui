'use client'

/**
 * Credential leaks grouped by identity: the leaks table with a header row per
 * identity (its exposure counts) and the identity's leaks under it, loaded
 * when the group opens. The house grouped-list pattern ("Grouped lists" in
 * docs/ui-style-contract.md).
 */

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, SeverityBadge, type DataTableRowGroups } from '@/features/shared'
import type { Severity } from '@/features/shared/types'
import type { Asset } from '@/features/assets'
import { useLazyGroupRows } from '@/hooks/use-lazy-group-rows'
import { get } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import type {
  ApiCredential,
  ApiCredentialListResponse,
  ApiIdentityExposure,
} from '../api/credential-api.types'
import { mapCredentialsToAssets } from '../lib'

/** Identities open on arrival; the rest load when opened. */
const OPEN_ON_ARRIVAL = 3
const FIRST_ROWS = 5
const MORE_ROWS = 20
/** The exposures endpoint's page cap. */
const MAX_ROWS = 100
const PAGE_SIZES = [10, 20, 50, 100]

/** The leaks of one identity (all states), first `limit` of them. */
export async function fetchIdentityLeaks(identity: string, limit: number) {
  const url = `/api/v1/credentials/identities/${encodeURIComponent(identity)}/exposures?page=1&page_size=${limit}`
  const res = await get<ApiCredentialListResponse>(url)
  const items = (res.items ?? []) as ApiCredential[]
  return { rows: items, total: res.total ?? items.length }
}

function IdentityTitle({ identity }: { identity: ApiIdentityExposure }) {
  const Icon = identity.identity_type === 'email' ? Mail : User
  const count = identity.exposure_count ?? 0
  const facts = [
    `${count} ${count === 1 ? 'exposure' : 'exposures'}`,
    (identity.sources ?? []).length ? (identity.sources ?? []).join(', ') : null,
    (identity.credential_types ?? []).length ? (identity.credential_types ?? []).join(', ') : null,
  ].filter(Boolean)
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span className="max-w-[28rem] truncate text-sm font-medium text-foreground">
        {identity.identity}
      </span>
      <span className="tabular-nums">· {facts.join(' · ')}</span>
    </span>
  )
}

function IdentitySummary({ identity }: { identity: ApiIdentityExposure }) {
  const active = identity.states?.active ?? 0
  const resolved = identity.states?.resolved ?? 0
  return (
    <span className="flex items-center gap-2.5 tabular-nums">
      <span className="hidden items-center gap-2.5 sm:flex">
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span
            aria-hidden
            className={cn(
              'size-1.5 rounded-full',
              active > 0 ? 'bg-destructive' : 'bg-muted-foreground/30'
            )}
          />
          <span className={cn(active > 0 && 'text-foreground')}>{active}</span> active
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span
            aria-hidden
            className={cn(
              'size-1.5 rounded-full',
              resolved > 0 ? 'bg-success' : 'bg-muted-foreground/30'
            )}
          />
          <span className={cn(resolved > 0 && 'text-foreground')}>{resolved}</span> resolved
        </span>
      </span>
      {identity.highest_severity && (
        <SeverityBadge severity={identity.highest_severity as Severity} />
      )}
    </span>
  )
}

interface CredentialIdentityGroupsProps {
  /** Every identity matching the page's search and status (the API returns them all). */
  identities: ApiIdentityExposure[]
  isLoading?: boolean
  columns: ColumnDef<Asset>[]
  onRowClick?: (row: Asset) => void
  toolbarStart?: React.ReactNode
  toolbarEnd?: React.ReactNode
  /** Drops loaded leaks when the search or status changes. */
  resetKey: string
  emptyMessage?: string
  emptyDescription?: string
}

export function CredentialIdentityGroups({
  identities,
  isLoading,
  columns,
  onRowClick,
  toolbarStart,
  toolbarEnd,
  resetKey,
  emptyMessage = 'No identities found',
  emptyDescription,
}: CredentialIdentityGroupsProps) {
  // Identities arrive all at once; the table pages through them.
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 20 })
  const [prevReset, setPrevReset] = React.useState(resetKey)
  if (prevReset !== resetKey) {
    setPrevReset(resetKey)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }
  const pageIdentities = React.useMemo(
    () =>
      identities.slice(
        pagination.pageIndex * pagination.pageSize,
        (pagination.pageIndex + 1) * pagination.pageSize
      ),
    [identities, pagination]
  )
  const keys = React.useMemo(
    () => pageIdentities.map((i) => i.identity ?? '').filter(Boolean),
    [pageIdentities]
  )
  const byKey = React.useMemo(
    () => new Map(pageIdentities.map((i) => [i.identity ?? '', i])),
    [pageIdentities]
  )

  const scope = `${resetKey}|${pagination.pageIndex}|${pagination.pageSize}`
  const [expanded, setExpanded] = React.useState<{ scope: string; keys: string[] } | null>(null)
  const expandedKeys = React.useMemo(
    () => (expanded?.scope === scope ? expanded.keys : keys.slice(0, OPEN_ON_ARRIVAL)),
    [expanded, scope, keys]
  )
  const setExpandedKeys = React.useCallback(
    (next: string[]) => setExpanded({ scope, keys: next }),
    [scope]
  )

  const lazy = useLazyGroupRows<ApiCredential>({
    keys: expandedKeys,
    fetchGroup: fetchIdentityLeaks,
    resetKey,
    initialLimit: FIRST_ROWS,
    maxLimit: MAX_ROWS,
  })

  const { rows, keyOf } = React.useMemo(() => {
    const keyOf = new Map<string, string>()
    const leaks: ApiCredential[] = []
    for (const key of keys) {
      for (const c of lazy.groups[key]?.rows ?? []) {
        if (!c.id || keyOf.has(c.id)) continue
        keyOf.set(c.id, key)
        leaks.push(c)
      }
    }
    return { rows: mapCredentialsToAssets(leaks), keyOf }
  }, [keys, lazy.groups])

  const rowGroups = React.useMemo<DataTableRowGroups<Asset>>(
    () => ({
      groups: keys,
      getKey: (r) => keyOf.get(r.id) ?? '',
      collapsible: true,
      expandedKeys,
      onExpandedKeysChange: setExpandedKeys,
      getLabel: (key) => key,
      isGroupLoading: (key) => !lazy.groups[key] || !!lazy.groups[key]?.loading,
      renderHeader: (key) => {
        const identity = byKey.get(key)
        return identity ? <IdentityTitle identity={identity} /> : key
      },
      renderActions: (key) => {
        const identity = byKey.get(key)
        return identity ? <IdentitySummary identity={identity} /> : null
      },
      renderFooter: (key, shown) => {
        const st = lazy.groups[key]
        if (!st) return null
        if (st.error) {
          return (
            <span className="text-destructive">
              Could not load these leaks.{' '}
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
        if (!st.loading && st.total === 0) return <span>No leaks recorded for this identity.</span>
        if (st.total <= shown.length) return null
        const canLoadMore = lazy.limitOf(key) < lazy.maxLimit
        return (
          <span className="flex flex-wrap items-center gap-x-3 tabular-nums">
            <span>
              Showing {shown.length} of {st.total}
            </span>
            {canLoadMore && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                disabled={st.loading}
                onClick={() => lazy.showMore(key, MORE_ROWS)}
              >
                Show {Math.min(MORE_ROWS, st.total - shown.length)} more
              </Button>
            )}
          </span>
        )
      },
    }),
    [keys, keyOf, expandedKeys, setExpandedKeys, byKey, lazy]
  )

  return (
    <DataTable
      columns={columns}
      data={rows}
      showSearch={false}
      toolbarStart={toolbarStart}
      toolbarEnd={toolbarEnd}
      getRowId={(r) => r.id}
      manualPagination
      rowCount={identities.length}
      pagination={pagination}
      onPaginationChange={setPagination}
      pageSizeOptions={PAGE_SIZES}
      paginationNoun="identities"
      pageSizeLabel="Identities per page"
      isLoading={isLoading}
      onRowClick={onRowClick}
      rowGroups={rowGroups}
      emptyMessage={emptyMessage}
      emptyDescription={emptyDescription}
    />
  )
}
