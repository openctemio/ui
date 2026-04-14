'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Main } from '@/components/layout'
import { PageHeader, StatusBadge, RiskScoreBadge } from '@/features/shared'
import {
  AssetDetailSheet,
  StatCardCentered,
  StatsGrid,
  SectionTitle,
  ClassificationBadges,
} from '@/features/assets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/clipboard'
import {
  Plus,
  Search as SearchIcon,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Copy,
  X,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useAssets, useAssetStats, type Asset } from '@/features/assets'
import { TagFilter } from './tag-filter'
import { PropertyFilter, PropertyFilterChips } from './property-filter'
import { Can, Permission, usePermissions } from '@/lib/permissions'
import {
  ScopeBadge,
  getScopeMatchesForAsset,
  useScopeTargetsApi,
  useScopeExclusionsApi,
  useScopeStatsApi,
  type ScopeMatchResult,
  type ScopeTarget,
  type ScopeExclusion,
  type ScopeTargetType,
  type ScopeTargetStatus,
} from '@/features/scope'
import type { ApiScopeTarget, ApiScopeExclusion } from '@/features/scope/api/scope-api.types'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'
// Status filter is now string-based to support custom status values
import type { AssetType } from '../types'
import type { AssetPageConfig } from '../types/page-config.types'
import { useAssetCRUD } from '../hooks/use-asset-crud'
import { useAssetDialogs } from '../hooks/use-asset-dialogs'
import { useAssetExport } from '../hooks/use-asset-export'
import { useAssetTags } from '../hooks/use-asset-tags'
import { updateAsset } from '../hooks/use-assets'
import { AssetFormDialogShared } from './asset-form-dialog-shared'
import { AssetDeleteDialogShared } from './asset-delete-dialog-shared'
import { AssetOwnersTab } from './asset-owners-tab'

type StatusFilter = string

const PRIORITY_MAP: Record<number, 'critical' | 'high' | 'medium' | 'low'> = {
  1: 'critical',
  2: 'high',
  3: 'medium',
  4: 'low',
}

function transformApiTarget(api: ApiScopeTarget): ScopeTarget {
  return {
    id: api.id,
    type: api.target_type as ScopeTargetType,
    pattern: api.pattern,
    description: api.description,
    status: api.status as ScopeTargetStatus,
    priority: PRIORITY_MAP[api.priority],
    tags: api.tags,
    addedAt: api.created_at,
    addedBy: api.created_by,
    updatedAt: api.updated_at,
  }
}

function transformApiExclusion(api: ApiScopeExclusion): ScopeExclusion {
  return {
    id: api.id,
    type: api.exclusion_type as ScopeTargetType,
    pattern: api.pattern,
    reason: api.reason,
    status: api.status as ScopeTargetStatus,
    expiresAt: api.expires_at,
    approvedBy: api.approved_by,
    addedAt: api.created_at,
    addedBy: api.created_by,
  }
}

const defaultStatusFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

interface AssetPageProps {
  config: AssetPageConfig
  /** Extra content rendered in the filter bar (e.g., type filter buttons) */
  headerExtra?: React.ReactNode
}

export function AssetPage({ config, headerExtra }: AssetPageProps) {
  const { can } = usePermissions()
  const canWriteAssets = can(Permission.AssetsWrite)
  const canDeleteAssets = can(Permission.AssetsDelete)

  // URL state persistence
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Pagination state — initialise from URL
  const [currentPage, setCurrentPage] = useState(() => {
    const p = searchParams.get('page')
    return p ? Math.max(1, parseInt(p, 10) || 1) : 1
  })
  const [pageSize] = useState(50)

  // Server-side search (debounced) — initialise from URL
  const [searchValue, setSearchValue] = useState(() => searchParams.get('q') || '')
  const debouncedSearch = useDebounce(searchValue, 300)

  // Tag filter (multi-select, server-side) — initialise from URL
  const [tagFilters, setTagFilters] = useState<string[]>(() => {
    const t = searchParams.get('tags')
    return t ? t.split(',').filter(Boolean) : []
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch])
  useEffect(() => {
    setCurrentPage(1)
  }, [tagFilters])

  // URL query params can override type/sub_type filter (e.g. from overview click-through)
  const urlType = searchParams.get('type')
  const urlSubType = searchParams.get('sub_type')

  // Memoize array references to keep SWR cache keys stable across renders
  const typeFilter = useMemo(
    () => (urlType ? [urlType] : config.types || [config.type]) as AssetType[],
    [config.types, config.type, urlType]
  )

  const subTypeFilter = urlSubType || config.subType

  // Dynamic properties filter — initialise from URL ?pf=key:value params (shareable)
  const [propertiesFilter, setPropertiesFilter] = useState<Record<string, string>>(() => {
    const pf: Record<string, string> = {}
    for (const v of searchParams.getAll('pf')) {
      const idx = v.indexOf(':')
      if (idx > 0) pf[v.slice(0, idx)] = v.slice(idx + 1)
    }
    return pf
  })

  // Data fetching with server-side pagination, search, tag, and properties filter.
  const { assets, total, totalPages, isLoading, mutate } = useAssets({
    types: typeFilter,
    subType: subTypeFilter,
    propertiesFilter: Object.keys(propertiesFilter).length > 0 ? propertiesFilter : undefined,
    page: currentPage,
    pageSize,
    search: debouncedSearch || undefined,
    tags: tagFilters.length > 0 ? tagFilters : undefined,
  })

  // Type-wide stats (NOT filter-aware). These power the top stat cards and
  // status tab badges, which should remain stable regardless of search/tag
  // filters — they are the user's "anchor" for the size of the dataset.
  // Filter results are surfaced separately via the `total` from useAssets()
  // and the "filtered" hint near the table.
  //
  // CRITICAL: We track `statsLoading` separately so the stat cards don't flash
  // a skeleton every time the user changes a filter (which only re-fetches
  // `useAssets`, not `useAssetStats`).
  // Stats always show the full type scope (not filtered by URL sub_type)
  // so stat cards like "Firewalls: 3, Routers: 1" remain visible even
  // when the table is filtered to a specific sub_type via URL param.
  // Stats always reflect the FULL scope of this page (all types in config),
  // never narrowed by URL ?type= filter. This way stat cards show the global
  // picture (e.g., "15 Total, 2 Root, 13 Sub") even when the table is
  // filtered to show only Root or only Sub.
  const { stats: typeStats, isLoading: statsLoading } = useAssetStats(
    (config.types || [config.type]) as AssetType[],
    undefined,
    config.subType
  )

  // Headline assets — a separate query that fetches the FIRST page of assets
  // for this type with NO search/tag/page filters applied. Used by stat cards
  // whose `compute` reads metadata fields (e.g. SSL, encryption, isVirtual)
  // that the backend stats endpoint does not aggregate. This keeps those
  // cards STABLE when the user filters the table — without it, a card like
  // "SSL Insecure" would re-compute on every keystroke.
  //
  // Limitation: still page-bounded (only the first 50 rows of the type), so
  // it's an approximation. If a metadata aggregate is critical, the right
  // long-term fix is to extend GetAggregateStats to include those fields.
  // Headline assets & scope coverage reuse the main table query.
  // No extra API call — stat cards and scope widget work from the
  // same page of data already fetched for the table.
  const headlineAssets = assets

  // True when the user has narrowed the view via a non-status filter.
  // Status tabs are intentionally excluded — they're navigation, not filtering.
  const hasActiveFilter =
    debouncedSearch.length > 0 ||
    tagFilters.length > 0 ||
    !!urlSubType ||
    !!urlType ||
    Object.keys(propertiesFilter).length > 0

  // Total stats card count (1 default "Total" + custom cards from config)
  const statsCardCount = 1 + (config.statsCards?.length ?? 0)

  const SUB_TYPE_LABELS: Record<string, string> = {
    firewall: 'Firewalls',
    load_balancer: 'Load Balancers',
    switch: 'Switches',
    router: 'Routers',
    wireless_ap: 'Wireless APs',
    iam_user: 'IAM Users',
    iam_role: 'IAM Roles',
    service_account: 'Service Accounts',
    website: 'Websites',
    api: 'APIs',
    mobile_app: 'Mobile Apps',
    serverless: 'Serverless',
    http: 'HTTP Services',
    open_port: 'Open Ports',
    cluster: 'Clusters',
    s3_bucket: 'S3 Buckets',
    web_application: 'Web Applications',
  }

  // Apply optional data transform (e.g., domain tree flattening)
  const transformedAssets = useMemo(
    () => (config.dataTransform ? config.dataTransform(assets) : assets),
    [assets, config]
  )

  // Shared hooks
  const crud = useAssetCRUD(config.type as AssetType, config.label, mutate)
  const dialogs = useAssetDialogs()
  const { handleExport } = useAssetExport(transformedAssets, config.exportFields, config.type)

  // Table state — initialise from URL where applicable
  const [sorting, setSorting] = useState<SortingState>(() => {
    const sortParam = searchParams.get('sort')
    const dirParam = searchParams.get('dir')
    if (sortParam) {
      return [{ id: sortParam, desc: dirParam === 'desc' }]
    }
    return config.defaultSort
      ? [{ id: config.defaultSort.field, desc: config.defaultSort.direction === 'desc' }]
      : []
  })
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    () => (searchParams.get('status') as StatusFilter) || 'all'
  )
  // (customFilterValues removed — PropertyFilter handles properties directly)
  const [rowSelection, setRowSelection] = useState({})

  // Sync state to URL search params
  const isInitialMount = useRef(true)
  useEffect(() => {
    // Skip the initial mount to avoid a redundant replace on first render
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const params = new URLSearchParams()
    // Preserve type/sub_type override params from overview click-through
    if (urlType) params.set('type', urlType)
    if (urlSubType) params.set('sub_type', urlSubType)
    if (currentPage > 1) params.set('page', String(currentPage))
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (tagFilters.length > 0) params.set('tags', tagFilters.join(','))
    // Property filters as repeated ?pf=key:value params
    for (const [key, val] of Object.entries(propertiesFilter)) {
      params.append('pf', `${key}:${val}`)
    }
    if (sorting.length > 0) {
      const defaultField = config.defaultSort?.field
      const defaultDesc = config.defaultSort?.direction === 'desc'
      const isDefault =
        sorting.length === 1 && sorting[0].id === defaultField && sorting[0].desc === defaultDesc
      if (!isDefault) {
        params.set('sort', sorting[0].id)
        params.set('dir', sorting[0].desc ? 'desc' : 'asc')
      }
    }
    const qs = params.toString()
    const newUrl = qs ? `${pathname}?${qs}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [
    currentPage,
    debouncedSearch,
    statusFilter,
    tagFilters,
    propertiesFilter,
    sorting,
    pathname,
    router,
    config.defaultSort,
    urlType,
    urlSubType,
  ])

  // Scope integration — server-side stats for the coverage bar,
  // client-side matching for per-row scope badges.
  const { data: scopeStats } = useScopeStatsApi()
  const { data: scopeTargetsData } = useScopeTargetsApi({ status: 'active', per_page: 100 })
  const { data: scopeExclusionsData } = useScopeExclusionsApi({ status: 'active', per_page: 100 })
  const scopeTargets = useMemo(
    () => (scopeTargetsData?.data ?? []).map(transformApiTarget),
    [scopeTargetsData]
  )
  const scopeExclusions = useMemo(
    () => (scopeExclusionsData?.data ?? []).map(transformApiExclusion),
    [scopeExclusionsData]
  )
  const scopeMatchesMap = useMemo(() => {
    const map = new Map<string, ScopeMatchResult>()
    if (!transformedAssets?.length) return map
    for (const asset of transformedAssets) {
      map.set(
        asset.id,
        getScopeMatchesForAsset(
          { id: asset.id, type: asset.type ?? 'unclassified', name: asset.name },
          scopeTargets,
          scopeExclusions
        )
      )
    }
    return map
  }, [transformedAssets, scopeTargets, scopeExclusions])

  // Scope coverage from server-side stats endpoint (tenant-wide, not page-bounded).
  const scopeCoverage = useMemo(() => {
    const total = typeStats.total || transformedAssets.length
    const coveragePercent = scopeStats?.coverage ?? 0
    const inScope = Math.round((coveragePercent / 100) * total)
    return {
      totalAssets: total,
      inScopeAssets: inScope,
      excludedAssets: scopeStats?.active_exclusions ?? 0,
      notScopedAssets: total - inScope,
      coveragePercent,
    }
  }, [typeStats.total, transformedAssets.length, scopeStats])

  // Resolve status filter options
  const statusFilterOptions = useMemo(
    () => config.statusFilters ?? defaultStatusFilters,
    [config.statusFilters]
  )

  // Filter data — status is client-side, properties are server-side (via useAssets)
  const filteredData = useMemo(() => {
    let data = [...(transformedAssets ?? [])]
    if (statusFilter !== 'all') {
      data = data.filter((a) => a.status === statusFilter)
    }
    return data
  }, [transformedAssets, statusFilter])

  // Status counts — derived from the tenant-wide stats endpoint so the tab
  // badges reflect the entire dataset (e.g. 1427 hosts) instead of only the
  // 50 rows on the current page. Fall back to the in-page tally while stats
  // are loading or if a status value isn't surfaced by the backend aggregate.
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: typeStats.total || transformedAssets.length,
    }
    for (const [status, count] of Object.entries(typeStats.byStatus)) {
      counts[status] = count
    }
    // Backstop: ensure any status visible on the current page has a number,
    // even if the stats endpoint doesn't list it (e.g. custom status values).
    for (const asset of transformedAssets) {
      if (counts[asset.status] === undefined) {
        counts[asset.status] = 0
      }
    }
    return counts
  }, [typeStats, transformedAssets])

  // Copy handler — uses copyToClipboard helper which feature-detects
  // navigator.clipboard (only available in secure contexts) and falls
  // back to document.execCommand. The previous direct navigator.clipboard
  // call crashed with "navigator.clipboard is undefined" when the app
  // was served over plain HTTP on a LAN IP.
  const handleCopy = useCallback(
    async (asset: Asset) => {
      if (!config.copyAction) return
      const ok = await copyToClipboard(config.copyAction.getValue(asset))
      if (ok) {
        toast.success('Copied to clipboard')
      } else {
        toast.error('Failed to copy')
      }
    },
    [config.copyAction]
  )

  // Tag suggestions for the inline editor in TagsSection. The hook
  // pulls the global tag list cached for ~5min so we don't hit the
  // network for every keystroke.
  const { tags: tagSuggestions } = useAssetTags()

  // Tag editor save handler. Used by `<TagsSection onSave>` inside the
  // AssetDetailSheet's Overview tab. Without this prop the section
  // renders read-only and the user can't add/edit/delete tags.
  //
  // Stale-display bug: after a successful save the API returns the
  // updated asset, BUT `dialogs.selectedAsset` is component state set
  // when the user clicked the row — it's a snapshot. Without lifting
  // the new tags into selectedAsset, the TagsSection re-renders with
  // the OLD tags array even though the save succeeded. The user sees
  // a "Tags updated" toast and the deleted tag still in the list,
  // which looks like the save lied to them.
  //
  // Fix: capture the returned Asset from updateAsset() and call
  // setSelectedAsset(updated) so the sheet's local state is fresh.
  // Then mutate() the list query in the background so the table
  // also reflects the change on the next render.
  const handleUpdateTags = useCallback(
    async (tags: string[]) => {
      if (!dialogs.selectedAsset) return
      try {
        const updated = await updateAsset(dialogs.selectedAsset.id, { tags })
        toast.success('Tags updated')
        // Lift the fresh asset into the sheet's local state so the
        // TagsSection re-renders with the new tag list immediately.
        dialogs.setSelectedAsset(updated)
        // Background: refetch the list so the table reflects the
        // updated tags on the next render too.
        await mutate()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update tags'
        toast.error(message)
        // Re-throw so TagsSection's catch surfaces a toast and keeps
        // the dialog in edit mode.
        throw err
      }
    },
    [dialogs, mutate]
  )

  // Form submit handlers
  const handleFormCreate = useCallback(
    async (data: Record<string, unknown>) => {
      const tags = (data.tags as string[] | undefined) ?? []
      delete data.tags

      // owner_ref is a universal field on every form, not in config.formFields
      const ownerRef = data.ownerRef as string | undefined
      delete data.ownerRef

      const metadata: Record<string, unknown> = {}
      const topLevel: Record<string, unknown> = {}

      for (const field of config.formFields) {
        if (data[field.name] === undefined || data[field.name] === '') continue
        if (field.isMetadata) {
          metadata[field.name] = data[field.name]
        } else if (field.name !== 'name' && field.name !== 'description') {
          topLevel[field.name] = data[field.name]
        }
      }

      return crud.handleCreate({
        name: String(data.name ?? ''),
        type: config.type as never,
        criticality: 'medium',
        description: String(data.description ?? ''),
        scope: 'internal',
        exposure: 'unknown',
        ownerRef,
        tags,
        ...topLevel,
      } as never)
    },
    [crud, config.formFields, config.type]
  )

  const handleFormUpdate = useCallback(
    async (data: Record<string, unknown>) => {
      if (!dialogs.selectedAsset) return false
      const tags = (data.tags as string[] | undefined) ?? []
      delete data.tags

      // owner_ref is a universal field on every form, not in config.formFields
      const ownerRef = data.ownerRef as string | undefined
      delete data.ownerRef

      // Collect metadata and top-level fields (same logic as create)
      const metadata: Record<string, unknown> = {}
      const topLevel: Record<string, unknown> = {}

      for (const field of config.formFields) {
        if (field.name === 'name' || field.name === 'description' || field.name === 'tags') continue
        if (data[field.name] === undefined) continue
        if (field.isMetadata) {
          metadata[field.name] = data[field.name]
        } else {
          topLevel[field.name] = data[field.name]
        }
      }

      return crud.handleUpdate(dialogs.selectedAsset.id, {
        name: String(data.name ?? ''),
        description: String(data.description ?? ''),
        ownerRef,
        tags,
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
        ...topLevel,
      })
    },
    [crud, dialogs.selectedAsset, config.formFields]
  )

  // Build columns: select + name + type-specific + status + classification + findings + risk + scope + actions
  const columns: ColumnDef<Asset>[] = useMemo(() => {
    const Icon = config.icon
    return [
      // Select
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
      },
      // Name
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            {config.label}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          // max-w caps the cell so very long names (e.g. UUIDs appended to a
          // hostname) don't blow out the table layout. Truncate + native title
          // tooltip surfaces the full value on hover.
          <div className="flex items-center gap-2 max-w-[280px]">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate" title={row.original.name}>
                {row.original.name}
              </p>
              {row.original.groupName && (
                <p
                  className="text-muted-foreground text-xs truncate"
                  title={row.original.groupName}
                >
                  {row.original.groupName}
                </p>
              )}
            </div>
          </div>
        ),
      },
      // Type-specific columns
      ...config.columns,
      // Status
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      // Classification
      {
        id: 'classification',
        header: 'Classification',
        cell: ({ row }) => (
          <ClassificationBadges
            scope={row.original.scope}
            exposure={row.original.exposure}
            size="sm"
            showTooltips
          />
        ),
      },
      // Tags
      //
      // Tag chips can hold values like "source:gcp-dns" (14 chars) which
      // are wider than a tight max-w cap. The previous version applied
      // truncate + max-w-[80px] directly on the Badge — but Badge is
      // `inline-flex` with `justify-center` and `overflow-hidden`, and
      // text-overflow:ellipsis does not work on flex items unless the
      // child has `min-w-0`. The result was text clipped on both sides
      // with no ellipsis, leaving operators staring at "urce:gcp-dns"
      // and wondering what the actual tag name was.
      //
      // The fix: wrap each tag value in an inner <span> that owns the
      // truncate behaviour (block display → ellipsis works), give the
      // badge a roomier max width that fits typical "key:value" tags,
      // and add a native title tooltip for the full value on hover.
      // Two-tag preview + tooltip with the rest stays the same.
      {
        id: 'tags',
        header: 'Tags',
        cell: ({ row }) => {
          const tags = row.original.tags
          if (!tags?.length) return <span className="text-muted-foreground">-</span>
          const visible = tags.slice(0, 2)
          const remaining = tags.slice(2)
          return (
            <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
              {visible.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs px-1.5 py-0 max-w-[140px]"
                  title={tag}
                >
                  <span className="block truncate">{tag}</span>
                </Badge>
              ))}
              {remaining.length > 0 && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 cursor-default">
                        +{remaining.length}
                      </Badge>
                    </TooltipTrigger>
                    {/*
                      TooltipContent uses bg-primary + text-primary-foreground
                      (dark bg, light text) regardless of theme. The default
                      Badge `variant="outline"` paints text in `text-foreground`
                      which is the regular dark text — that gives BLACK chips
                      on a BLACK tooltip background and the user can't read
                      the tag names. Override the colours to use the popover
                      foreground tokens so the chips contrast against the
                      tooltip background in both light and dark themes.
                    */}
                    <TooltipContent side="bottom" className="max-w-[280px]">
                      <div className="flex flex-wrap gap-1">
                        {remaining.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 text-xs text-primary-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )
        },
      },
      // Findings
      {
        accessorKey: 'findingCount',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Findings
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const count = row.original.findingCount
          if (count === 0) {
            return (
              <Badge variant="outline" className="text-muted-foreground">
                0
              </Badge>
            )
          }
          return <Badge variant={count > 5 ? 'destructive' : 'secondary'}>{count}</Badge>
        },
      },
      // Risk
      {
        accessorKey: 'riskScore',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Risk
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
      },
      // Last Update — built-in for all asset pages, sortable
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Last Update
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const raw = row.original.updatedAt
          if (!raw) return <span className="text-muted-foreground">-</span>
          const date = new Date(raw)
          const now = new Date()
          const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
          const label = formatDistanceToNow(date, { addSuffix: true })
          const color =
            diffDays > 30
              ? 'text-red-500'
              : diffDays > 7
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-muted-foreground'
          return (
            <span className={`text-xs ${color}`} title={date.toLocaleString()}>
              {label}
            </span>
          )
        },
      },
      // Scope
      {
        id: 'scope-match',
        header: 'Scope',
        cell: ({ row }) => {
          const match = scopeMatchesMap.get(row.original.id)
          if (!match) return <span className="text-muted-foreground">-</span>
          return <ScopeBadge match={match} />
        },
      },
      // Actions
      {
        id: 'actions',
        cell: ({ row }) => {
          const asset = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    dialogs.setSelectedAsset(asset)
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <Can permission={Permission.AssetsWrite}>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      dialogs.openEdit(asset)
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </Can>
                {config.copyAction && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopy(asset)
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {config.copyAction.label}
                  </DropdownMenuItem>
                )}
                {config.rowActions?.map((action) => {
                  if (action.permission && !can(action.permission)) return null
                  const ActionIcon = action.icon
                  return (
                    <DropdownMenuItem
                      key={action.label}
                      onClick={(e) => {
                        e.stopPropagation()
                        action.onClick(asset)
                      }}
                    >
                      <ActionIcon className="mr-2 h-4 w-4" />
                      {action.label}
                    </DropdownMenuItem>
                  )
                })}
                <Can permission={Permission.AssetsDelete}>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      dialogs.openDelete(asset)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </Can>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ]
  }, [config, scopeMatchesMap, dialogs, handleCopy, can])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  const handleBulkDelete = async () => {
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id)
    const success = await crud.handleBulkDelete(ids)
    if (success) setRowSelection({})
  }

  const selectedAsset = dialogs.selectedAsset
  const Icon = config.icon

  return (
    <>
      <Main>
        <PageHeader
          title={
            urlSubType ? SUB_TYPE_LABELS[urlSubType] || config.labelPlural : config.labelPlural
          }
          description={`${typeStats.total.toLocaleString()} ${config.labelPlural.toLowerCase()} in your infrastructure`}
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.AssetsWrite}>
              <Button
                onClick={() => {
                  dialogs.setSelectedAsset(null)
                  dialogs.setAddDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add {config.label}
              </Button>
            </Can>
          </div>
        </PageHeader>

        {(urlSubType || urlType) && !headerExtra && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="gap-1">
              {urlSubType
                ? `Filtered: ${SUB_TYPE_LABELS[urlSubType] || urlSubType}`
                : `Type: ${urlType}`}
              <Link href={pathname}>
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" />
              </Link>
            </Badge>
          </div>
        )}

        {/* Stats cards — dynamic grid to never leave orphan cards on last row */}
        <div
          className={cn('grid gap-4 mt-6', {
            'grid-cols-2': statsCardCount <= 2,
            'grid-cols-3': statsCardCount === 3,
            'grid-cols-2 lg:grid-cols-4': statsCardCount === 4,
            'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5': statsCardCount === 5,
            'grid-cols-2 sm:grid-cols-3': statsCardCount === 6,
            'grid-cols-2 sm:grid-cols-4': statsCardCount >= 7,
          })}
        >
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setStatusFilter('all')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                Total {config.labelPlural}
              </CardDescription>
              {statsLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl">{typeStats.total.toLocaleString()}</CardTitle>
              )}
            </CardHeader>
          </Card>

          {(config.statsCards ?? []).map((stat, i) => {
            const StatIcon = stat.icon
            return (
              <Card key={i} className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <StatIcon className="h-4 w-4" />
                    {stat.title}
                  </CardDescription>
                  {statsLoading ? (
                    <Skeleton className="h-9 w-16 mt-1" />
                  ) : (
                    <CardTitle className="text-3xl">
                      {/* Pass headlineAssets (unfiltered first page) so
                          metadata-based computes (SSL, virtual, encrypted)
                          stay stable when the user filters the table. */}
                      {stat.compute(headlineAssets, typeStats)}
                    </CardTitle>
                  )}
                </CardHeader>
              </Card>
            )
          })}
        </div>

        {/* Compact scope indicator — only show when scope targets are configured */}
        {scopeTargets.length > 0 && scopeCoverage.totalAssets > 0 && (
          <div className="mt-4 flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-muted/30">
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
              <span className="text-muted-foreground">Scope:</span>
              <span className="font-medium">{scopeCoverage.inScopeAssets}</span>
              <span className="text-muted-foreground">in scope</span>
              {scopeCoverage.excludedAssets > 0 && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-medium text-orange-500">
                    {scopeCoverage.excludedAssets}
                  </span>
                  <span className="text-muted-foreground">excluded</span>
                </>
              )}
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{scopeCoverage.totalAssets} total</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${scopeCoverage.coveragePercent}%` }}
                />
              </div>
              <span
                className={`text-xs font-medium ${scopeCoverage.coveragePercent === 100 ? 'text-green-600' : 'text-muted-foreground'}`}
              >
                {Math.round(scopeCoverage.coveragePercent)}%
              </span>
            </div>
          </div>
        )}

        {/* Optional header content (banners, alerts) */}
        {config.headerContent && (
          <div className="mt-4">
            <config.headerContent assets={transformedAssets} />
          </div>
        )}

        {/* Table */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All {config.labelPlural}</CardTitle>
              {headerExtra}
            </div>
            {hasActiveFilter && !isLoading && (
              <CardDescription className="text-xs">
                Filtered:{' '}
                <span className="font-medium text-foreground">{total.toLocaleString()}</span> of{' '}
                <span className="font-medium">{typeStats.total.toLocaleString()}</span>{' '}
                {config.labelPlural.toLowerCase()}
                {tagFilters.length > 0 && (
                  <>
                    {' '}
                    — matching tag{tagFilters.length === 1 ? '' : 's'}{' '}
                    <span className="font-medium">{tagFilters.join(', ')}</span>
                  </>
                )}
                {debouncedSearch && (
                  <>
                    {' '}
                    — search <span className="font-medium">&ldquo;{debouncedSearch}&rdquo;</span>
                  </>
                )}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 mb-4">
              {/* Row 1: Search + Status + Tags + Add Filter (scrollable, no wrap) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${config.labelPlural.toLowerCase()}...`}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-8 h-9"
                    aria-label="Search assets"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue>
                      <span className="text-xs">
                        Status:{' '}
                        {statusFilterOptions.find((f) => f.value === statusFilter)?.label ?? 'All'}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilterOptions.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label} ({statusCounts[f.value] ?? 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <TagFilter value={tagFilters} onChange={setTagFilters} types={typeFilter} />

                <PropertyFilter
                  types={typeFilter}
                  subType={subTypeFilter}
                  value={propertiesFilter}
                  onChange={(pf) => {
                    setPropertiesFilter(pf)
                    setCurrentPage(1)
                  }}
                />

                {Object.keys(rowSelection).length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {Object.keys(rowSelection).length} selected
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {config.bulkActions?.map((action) => {
                        if (action.permission && !can(action.permission)) return null
                        const BulkIcon = action.icon
                        return (
                          <DropdownMenuItem
                            key={action.label}
                            className={action.variant === 'destructive' ? 'text-red-400' : ''}
                            onClick={() => {
                              const assets = table.getSelectedRowModel().rows.map((r) => r.original)
                              action.onClick(assets)
                            }}
                          >
                            <BulkIcon className="mr-2 h-4 w-4" />
                            {action.label}
                          </DropdownMenuItem>
                        )
                      })}
                      <Can permission={Permission.AssetsDelete}>
                        <DropdownMenuItem className="text-red-400" onClick={handleBulkDelete}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Selected
                        </DropdownMenuItem>
                      </Can>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Row 2: Active property filter chips (separate row to avoid wrapping into controls) */}
              <PropertyFilterChips
                value={propertiesFilter}
                onChange={(pf) => {
                  setPropertiesFilter(pf)
                  setCurrentPage(1)
                }}
                filtered={total}
                total={typeStats.total}
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[800px] sm:min-w-0">
                <div className="rounded-md border">
                  <Table aria-label="Assets table">
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => {
                            const hideOnMobile = [
                              'classification',
                              'tags',
                              'findingCount',
                              'riskScore',
                              'scope-match',
                            ].includes(header.id)
                            return (
                              <TableHead
                                key={header.id}
                                className={hideOnMobile ? 'hidden sm:table-cell' : undefined}
                              >
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(header.column.columnDef.header, header.getContext())}
                              </TableHead>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && 'selected'}
                            className="cursor-pointer"
                            onClick={() => dialogs.setSelectedAsset(row.original)}
                          >
                            {row.getVisibleCells().map((cell) => {
                              const hideOnMobile = [
                                'classification',
                                'tags',
                                'findingCount',
                                'riskScore',
                                'scope-match',
                              ].includes(cell.column.id)
                              return (
                                <TableCell
                                  key={cell.id}
                                  className={hideOnMobile ? 'hidden sm:table-cell' : undefined}
                                >
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="h-24 text-center">
                            {isLoading ? (
                              <div className="flex flex-col items-center gap-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-4 w-32" />
                              </div>
                            ) : (
                              `No ${config.labelPlural.toLowerCase()} found.`
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Pagination (server-side) */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {total > 0
                  ? `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, total)} of ${total}`
                  : 'No results'}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                  aria-label="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  aria-label="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>

      {/* Detail Sheet */}
      <AssetDetailSheet
        asset={selectedAsset}
        open={!!selectedAsset && !dialogs.editDialogOpen}
        onOpenChange={() => dialogs.setSelectedAsset(null)}
        icon={config.icon}
        iconColor={config.iconColor}
        gradientFrom={config.gradientFrom}
        gradientVia={config.gradientVia}
        assetTypeName={config.label}
        // Tag CRUD: passes the inline tag editor save handler so the
        // TagsSection in the Overview tab is editable. Without this
        // the section renders read-only (no pencil icon, no add/delete).
        // Was the user-reported "no add/edit/delete tag" bug.
        onUpdateTags={handleUpdateTags}
        tagSuggestions={tagSuggestions}
        extraTabs={
          selectedAsset
            ? [
                {
                  value: 'owners',
                  label: 'Owners',
                  content: <AssetOwnersTab assetId={selectedAsset.id} />,
                },
                ...(config.detailTabs?.map((tab) => ({
                  value: tab.id,
                  label: tab.label,
                  content: tab.render(selectedAsset),
                })) ?? []),
              ]
            : undefined
        }
        onEdit={() => selectedAsset && dialogs.openEdit(selectedAsset)}
        onDelete={() => {
          if (selectedAsset) {
            dialogs.openDelete(selectedAsset)
            dialogs.setSelectedAsset(null)
          }
        }}
        canEdit={canWriteAssets}
        canDelete={canDeleteAssets}
        quickActions={
          selectedAsset && config.copyAction ? (
            <Button size="sm" variant="outline" onClick={() => handleCopy(selectedAsset)}>
              <Copy className="mr-2 h-4 w-4" />
              {config.copyAction.label}
            </Button>
          ) : undefined
        }
        statsContent={
          selectedAsset && config.detailStats ? (
            <StatsGrid columns={config.detailStats.length as 2 | 3}>
              {config.detailStats.map((stat, i) => (
                <StatCardCentered
                  key={i}
                  icon={stat.icon}
                  iconBg={stat.iconBg}
                  iconColor={stat.iconColor}
                  value={stat.getValue(selectedAsset)}
                  label={stat.label}
                />
              ))}
            </StatsGrid>
          ) : undefined
        }
        overviewContent={
          selectedAsset && config.detailSections ? (
            <>
              {config.detailSections.map((section, si) => {
                // Resolve every field eagerly so we can filter empty
                // ones and skip whole sections that end up with no
                // content. Fields whose getValue returns null /
                // undefined are dropped — this lets per-type configs
                // hide rows where the underlying metadata is missing
                // instead of rendering a "-" wall.
                const resolvedFields = section.fields
                  .map((field) => ({
                    ...field,
                    value: field.getValue(selectedAsset!),
                  }))
                  .filter((f) => f.value !== null && f.value !== undefined)
                if (resolvedFields.length === 0) return null
                return (
                  <div key={si} className="rounded-xl border p-4 bg-card space-y-3">
                    <SectionTitle>{section.title}</SectionTitle>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {resolvedFields.map((field, fi) => (
                        <div key={fi} className={field.fullWidth ? 'col-span-2' : ''}>
                          <p className="text-muted-foreground">{field.label}</p>
                          <div className="font-medium mt-0.5">{field.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          ) : undefined
        }
      />

      {/* Add Dialog */}
      <AssetFormDialogShared
        open={dialogs.addDialogOpen}
        onOpenChange={dialogs.setAddDialogOpen}
        title={`Add ${config.label}`}
        description={`Add a new ${config.label.toLowerCase()} to your infrastructure.`}
        fields={config.formFields}
        onSubmit={handleFormCreate}
        isSubmitting={crud.isSubmitting}
        includeGroupSelect={config.includeGroupSelect}
      />

      {/* Edit Dialog */}
      <AssetFormDialogShared
        open={dialogs.editDialogOpen}
        onOpenChange={dialogs.setEditDialogOpen}
        title={`Edit ${config.label}`}
        description={`Update the details for this ${config.label.toLowerCase()}.`}
        fields={config.formFields}
        asset={dialogs.selectedAsset}
        onSubmit={handleFormUpdate}
        isSubmitting={crud.isSubmitting}
        includeGroupSelect={config.includeGroupSelect}
      />

      {/* Delete Dialog */}
      <AssetDeleteDialogShared
        open={dialogs.deleteDialogOpen}
        onOpenChange={dialogs.setDeleteDialogOpen}
        assetName={dialogs.assetToDelete?.name}
        typeName={config.label}
        onConfirm={async () => {
          if (!dialogs.assetToDelete) return
          const success = await crud.handleDelete(dialogs.assetToDelete.id)
          if (success) {
            dialogs.setDeleteDialogOpen(false)
            dialogs.setAssetToDelete(null)
          }
        }}
        isSubmitting={crud.isSubmitting}
      />
    </>
  )
}
