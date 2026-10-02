'use client'

import { AssetsSectionTabs } from '@/features/assets/components/assets-section-tabs'
import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { RefreshCw, ShieldX } from 'lucide-react'
import { Main } from '@/components/layout'
import {
  PageHeader,
  DataTable,
  EmptyState,
  ErrorState,
  MetricStrip,
  RelativeTime,
  StackedCell,
  type MetricStripItem,
} from '@/features/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUrlFilter } from '@/hooks/use-url-param'
import { Permission, useHasPermission } from '@/lib/permissions'
import type { StateChangeResponse } from '@/lib/api/generated'
import {
  isChangeView,
  useAssetChangeCounts,
  useAssetChanges,
  type ChangeView,
} from '@/features/asset-changes'

const PAGE_SIZES = [10, 20, 50, 100]

const PERIODS = [
  { value: '24h', label: 'Last 24 hours', ms: 24 * 3600_000 },
  { value: '7d', label: 'Last 7 days', ms: 7 * 86400_000 },
  { value: '30d', label: 'Last 30 days', ms: 30 * 86400_000 },
  { value: '90d', label: 'Last 90 days', ms: 90 * 86400_000 },
] as const

const VIEW_META: Record<
  ChangeView,
  { label: string; empty: string; hint: string; danger?: boolean }
> = {
  appeared: {
    label: 'Appeared',
    empty: 'No new assets',
    hint: 'Assets discovered by a scan or added in this period appear here.',
  },
  disappeared: {
    label: 'Disappeared',
    empty: 'No assets disappeared',
    hint: 'Assets no scan has seen within the stale threshold appear here.',
  },
  newly_exposed: {
    label: 'Newly exposed',
    empty: 'Nothing newly exposed',
    hint: 'Assets that became reachable from the internet in this period appear here.',
    danger: true,
  },
  exposure_changes: {
    label: 'Exposure changes',
    empty: 'No exposure changes',
    hint: 'Every change to an asset’s exposure level or internet reachability appears here.',
  },
  shadow_it: {
    label: 'Shadow IT',
    empty: 'No shadow IT',
    hint: 'New assets in the shadow scope (found, but not part of any known scope) appear here.',
    danger: true,
  },
}

const CHANGE_LABEL: Record<string, string> = {
  appeared: 'Appeared',
  disappeared: 'Disappeared',
  recovered: 'Seen again',
  exposure_changed: 'Exposure',
  internet_exposure_changed: 'Internet reachability',
  renamed: 'Renamed',
}

const SOURCE_LABEL: Record<string, string> = {
  scan: 'Scan',
  manual: 'Manual',
  system: 'System',
  sensor: 'Sensor',
  integration: 'Integration',
  api: 'API',
}

function sentence(value: string | undefined): string {
  if (!value) return '—'
  const s = value
    .replace(/_/g, ' ')
    // Acronyms stay upper case: "ip_address" reads "IP address", not "Ip address".
    .replace(/\b(ip|api|dns|iam|vpc|url)\b/gi, (m) => m.toUpperCase())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** A field change's value in words: booleans of is_internet_accessible read as reachability. */
function valueLabel(field: string | undefined, value: string | undefined): string {
  if (field === 'is_internet_accessible') {
    return value === 'true' ? 'Internet-facing' : 'Not internet-facing'
  }
  return sentence(value)
}

function ChangeDetail({ change }: { change: StateChangeResponse }) {
  if (change.field && (change.old_value || change.new_value)) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">{valueLabel(change.field, change.old_value)}</span>
        <span className="text-muted-foreground" aria-hidden>
          →
        </span>
        <span className="font-medium">{valueLabel(change.field, change.new_value)}</span>
      </span>
    )
  }
  return <span className="text-sm text-muted-foreground">{sentence(change.reason)}</span>
}

function ExposureNow({ change }: { change: StateChangeResponse }) {
  if (!change.asset_exposure) return <span className="text-sm text-muted-foreground">—</span>
  const facing = change.asset_internet_accessible || change.asset_exposure === 'public'
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-sm">{sentence(change.asset_exposure)}</span>
      {facing && (
        <Badge variant="outline" className="font-normal">
          Internet-facing
        </Badge>
      )}
    </span>
  )
}

export default function AssetChangesPage() {
  const canRead = useHasPermission(Permission.AssetsRead)

  const [viewParam, setViewParam] = useUrlFilter('view', 'appeared')
  const [periodParam, setPeriodParam] = useUrlFilter('period', '7d')
  const [internetParam, setInternetParam] = useUrlFilter('internet', 'false')
  const [pageParam, setPageParam] = useUrlFilter('page', '1')
  const [perPageParam, setPerPageParam] = useUrlFilter('per_page', '20')
  // End of the period window. Set by Refresh so "the last 7 days" is
  // recomputed from now.
  const [anchor, setAnchor] = useState(() => Date.now())

  const view: ChangeView = isChangeView(viewParam) ? viewParam : 'appeared'
  const period = PERIODS.find((p) => p.value === periodParam) ?? PERIODS[1]
  // Newly exposed is internet-facing by definition; the toggle does not apply.
  const internetOnly = internetParam === 'true' && view !== 'newly_exposed'

  // The window ends at `anchor`, rounded to the minute so the request key is
  // stable; Refresh moves it to now.
  const from = useMemo(
    () => new Date(Math.floor(anchor / 60_000) * 60_000 - period.ms).toISOString(),
    [anchor, period.ms]
  )

  const pagination = useMemo(
    () => ({
      pageIndex: Math.max(0, (parseInt(pageParam, 10) || 1) - 1),
      pageSize: PAGE_SIZES.includes(parseInt(perPageParam, 10)) ? parseInt(perPageParam, 10) : 20,
    }),
    [pageParam, perPageParam]
  )
  const setPagination = useCallback(
    (next: { pageIndex: number; pageSize: number }) => {
      setPageParam(String(next.pageIndex + 1))
      setPerPageParam(String(next.pageSize))
    },
    [setPageParam, setPerPageParam]
  )

  const query = useMemo(() => ({ from, internetOnly }), [from, internetOnly])
  const { changes, total, error, isLoading, mutate } = useAssetChanges(
    view,
    query,
    pagination,
    canRead
  )
  // Counts follow the internet-facing toggle too, so a number and the list it
  // opens always agree (the hook leaves it off for newly exposed, like the list).
  const countQuery = useMemo(
    () => ({ from, internetOnly: internetParam === 'true' }),
    [from, internetParam]
  )
  const {
    counts,
    isLoading: countsLoading,
    mutate: mutateCounts,
  } = useAssetChangeCounts(countQuery, canRead)

  const selectView = useCallback(
    (next: ChangeView) => {
      setViewParam(next)
      setPageParam('1')
    },
    [setViewParam, setPageParam]
  )

  const metrics: MetricStripItem[] = (Object.keys(VIEW_META) as ChangeView[]).map((key) => ({
    key,
    label: VIEW_META[key].label,
    value: counts?.[key] ?? 0,
    tone: VIEW_META[key].danger ? 'danger' : 'default',
    onClick: () => selectView(key),
    active: view === key,
  }))

  const columns = useMemo<ColumnDef<StateChangeResponse>[]>(
    () => [
      {
        id: 'asset',
        header: 'Asset',
        enableSorting: false,
        cell: ({ row }) => {
          const c = row.original
          const name = c.asset_name || 'Deleted asset'
          return (
            <StackedCell
              truncate
              className="max-w-[320px]"
              primary={
                c.asset_name && c.asset_id ? (
                  <Link href={`/assets/${c.asset_id}`} className="hover:underline">
                    {name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{name}</span>
                )
              }
              secondary={sentence(c.asset_type)}
            />
          )
        },
      },
      {
        id: 'change',
        header: 'Change',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-normal">
            {CHANGE_LABEL[row.original.change_type ?? ''] ?? sentence(row.original.change_type)}
          </Badge>
        ),
      },
      {
        id: 'detail',
        header: 'Detail',
        enableSorting: false,
        cell: ({ row }) => <ChangeDetail change={row.original} />,
      },
      {
        id: 'exposure',
        header: 'Exposure now',
        enableSorting: false,
        cell: ({ row }) => <ExposureNow change={row.original} />,
      },
      {
        id: 'source',
        header: 'Source',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm">
            {SOURCE_LABEL[row.original.source ?? ''] ?? sentence(row.original.source)}
          </span>
        ),
      },
      {
        id: 'changed_at',
        header: 'When',
        enableSorting: false,
        cell: ({ row }) => <RelativeTime date={row.original.changed_at} />,
      },
    ],
    []
  )

  if (!canRead) {
    return (
      <Main>
        <PageHeader title="What changed" description="New, gone and newly exposed assets." />
        <EmptyState
          className="mt-5"
          icon={ShieldX}
          title="Access denied"
          description="You don't have permission to view assets. Ask your administrator for access."
        />
      </Main>
    )
  }

  const refresh = () => {
    setAnchor(Date.now())
    void mutate()
    void mutateCounts()
  }

  const toolbarStart =
    view === 'newly_exposed' ? undefined : (
      <div className="flex items-center gap-2">
        <Switch
          id="internet-only"
          checked={internetParam === 'true'}
          onCheckedChange={(checked) => {
            setInternetParam(checked ? 'true' : 'false')
            setPageParam('1')
          }}
        />
        <Label htmlFor="internet-only" className="cursor-pointer text-sm font-normal">
          Internet-facing only
        </Label>
      </div>
    )

  const toolbarEnd = (
    <Button variant="outline" size="sm" className="h-9" onClick={refresh} aria-label="Refresh">
      <RefreshCw className="h-4 w-4" />
    </Button>
  )

  const meta = VIEW_META[view]

  return (
    <Main>
      <PageHeader
        title="What changed"
        description="New, gone and newly exposed assets in your attack surface over a period."
      >
        <Select
          value={period.value}
          onValueChange={(value) => {
            setPeriodParam(value)
            setPageParam('1')
          }}
        >
          <SelectTrigger className="h-9 w-[150px]" aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>
      <AssetsSectionTabs />

      <MetricStrip className="mt-5" loading={countsLoading && !counts} items={metrics} />

      <div className="mt-5">
        {error && !isLoading ? (
          <ErrorState title="changes" error={error} onRetry={() => mutate()} />
        ) : isLoading && changes.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full max-w-sm" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={changes}
            getRowId={(c) => c.id ?? `${c.asset_id}-${c.changed_at}`}
            showSearch={false}
            showColumnToggle={false}
            toolbarStart={toolbarStart}
            toolbarEnd={toolbarEnd}
            manualPagination
            rowCount={total}
            pagination={pagination}
            onPaginationChange={setPagination}
            pageSizeOptions={PAGE_SIZES}
            emptyMessage={`${meta.empty} in the ${period.label.toLowerCase()}`}
            emptyDescription={
              internetOnly
                ? 'Turn off “Internet-facing only” to include internal assets.'
                : meta.hint
            }
          />
        )}
      </div>
    </Main>
  )
}
