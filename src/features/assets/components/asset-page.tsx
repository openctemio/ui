'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { type ColumnDef, type SortingState } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Main } from '@/components/layout'
import {
  PageHeader,
  StatusBadge,
  RiskScoreBadge,
  DataTable,
  DataTableColumnHeader,
  DetailSection,
  DetailField,
  DetailFieldGrid,
} from '@/features/shared'
import { AssetDetailSheet, ClassificationBadges } from '@/features/assets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
  Download,
  Copy,
  X,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { post } from '@/lib/api/client'
import { useAssets, useAssetStats, type Asset } from '@/features/assets'
import { TagFilter, TagFilterChips } from './tag-filter'
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
import type { AssetType, Criticality, AssetScope, ExposureLevel, ImpactRating } from '../types'
import type { AssetPageConfig } from '../types/page-config.types'
import { useAssetCRUD } from '../hooks/use-asset-crud'
import { useAssetDialogs } from '../hooks/use-asset-dialogs'
import { fetchAllAssets } from '../hooks/use-assets'
import { exportToCsv } from '@/hooks/use-csv-export'
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

// Every field of the generated wire type is optional (swag emits no `required`
// list for response structs), so the API-to-view-model boundary supplies the
// defaults.
function transformApiTarget(api: ApiScopeTarget): ScopeTarget {
  return {
    id: api.id ?? '',
    type: (api.target_type ?? '') as ScopeTargetType,
    pattern: api.pattern ?? '',
    description: api.description ?? '',
    status: (api.status ?? '') as ScopeTargetStatus,
    priority: PRIORITY_MAP[api.priority ?? 0],
    tags: api.tags,
    addedAt: api.created_at ?? '',
    addedBy: api.created_by ?? '',
    updatedAt: api.updated_at ?? '',
  }
}

function transformApiExclusion(api: ApiScopeExclusion): ScopeExclusion {
  return {
    id: api.id ?? '',
    type: (api.exclusion_type ?? '') as ScopeTargetType,
    pattern: api.pattern ?? '',
    reason: api.reason ?? '',
    status: (api.status ?? '') as ScopeTargetStatus,
    expiresAt: api.expires_at,
    approvedBy: api.approved_by,
    addedAt: api.created_at ?? '',
    addedBy: api.created_by ?? '',
  }
}

const ASSET_PAGE_SIZES = [10, 20, 30, 50, 100]
const DEFAULT_ASSET_PAGE_SIZE = 50

/** Column ids the assets API can sort by (AllowedSortFields, camelCase here). */
const SERVER_SORTABLE_COLUMNS = new Set([
  'name',
  'status',
  'findingCount',
  'riskScore',
  'updatedAt',
])

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
  // Page size lives in the URL (`per_page`) like the other list pages. The
  // default stays 50 rather than the table's 10: the headline stat cards that
  // read metadata compute over the fetched page (see headlineAssets below), so
  // a smaller default page would make those numbers noticeably less complete.
  const [pageSize, setPageSize] = useState(() => {
    const n = parseInt(searchParams.get('per_page') ?? '', 10)
    return ASSET_PAGE_SIZES.includes(n) ? n : DEFAULT_ASSET_PAGE_SIZE
  })

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

  // Dynamic properties filter — initialise from URL ?pf=key:value params (shareable, multi-value)
  const [propertiesFilter, setPropertiesFilter] = useState<Record<string, string[]>>(() => {
    const pf: Record<string, string[]> = {}
    for (const v of searchParams.getAll('pf')) {
      const idx = v.indexOf(':')
      if (idx > 0) {
        const key = v.slice(0, idx)
        const val = v.slice(idx + 1)
        if (!pf[key]) pf[key] = []
        pf[key].push(val)
      }
    }
    return pf
  })

  // Server-side sort. The URL is the source of truth (kept in sync with the
  // table's sorting state below); fall back to the configured default. The
  // backend expects `field` (asc) / `-field` (desc) and ignores unknown
  // fields, so this degrades gracefully. Without it, clicking a column header
  // only reordered the current page instead of the whole dataset.
  const sortFieldParam = searchParams.get('sort') || config.defaultSort?.field
  const sortDesc = searchParams.get('sort')
    ? searchParams.get('dir') === 'desc'
    : config.defaultSort?.direction === 'desc'
  // Column accessorKeys (and the URL sort value) are camelCase (findingCount,
  // riskScore, updatedAt) but the API only accepts snake_case sort fields and
  // silently ignores unknown ones — so sorting only ever reordered the current
  // page. Convert to snake_case so the server sorts the whole dataset.
  const toSnakeCase = (s: string) => s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
  const sortParam = sortFieldParam
    ? `${sortDesc ? '-' : ''}${toSnakeCase(sortFieldParam)}`
    : undefined

  // Status is kept in sync with the URL `status` param (see the sync effect
  // below); read it here so the fetch runs before the statusFilter state is
  // declared, and so status filters server-side across the whole dataset.
  const statusParam = searchParams.get('status')

  // Data fetching with server-side pagination, search, tag, and properties filter.
  const { assets, total, isLoading, mutate } = useAssets({
    types: typeFilter,
    subType: subTypeFilter,
    propertiesFilter: Object.keys(propertiesFilter).length > 0 ? propertiesFilter : undefined,
    page: currentPage,
    pageSize,
    search: debouncedSearch || undefined,
    tags: tagFilters.length > 0 ? tagFilters : undefined,
    // Status is filtered server-side (like search/tags) so it spans the whole
    // dataset — filtering client-side only touched the current page while the
    // count badges and pagination total stayed dataset-wide (misleading).
    statuses:
      statusParam && statusParam !== 'all'
        ? ([statusParam] as ('active' | 'inactive' | 'archived')[])
        : undefined,
    sort: sortParam,
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
    config.subType,
    config.countBy
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

  // Export the ENTIRE filtered dataset, not just the page currently rendered.
  // Fetches every matching asset across all pages (same server-side filters as
  // the table), applies the page's optional dataTransform, then writes the CSV.
  const [isExporting, setIsExporting] = useState(false)
  const handleExport = useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const all = await fetchAllAssets(
        {
          types: typeFilter,
          subType: subTypeFilter,
          propertiesFilter: Object.keys(propertiesFilter).length > 0 ? propertiesFilter : undefined,
          search: debouncedSearch || undefined,
          tags: tagFilters.length > 0 ? tagFilters : undefined,
          sort: sortParam,
        },
        (loaded) =>
          toast.warning(
            `Export limited to the first ${loaded.toLocaleString()} assets — refine filters to export the rest`
          )
      )
      const rows = config.dataTransform ? config.dataTransform(all) : all
      exportToCsv(rows, config.exportFields, config.type)
    } catch {
      toast.error('Failed to export assets')
    } finally {
      setIsExporting(false)
    }
  }, [
    isExporting,
    typeFilter,
    subTypeFilter,
    propertiesFilter,
    debouncedSearch,
    tagFilters,
    sortParam,
    config,
  ])

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
  // The table owns the checkbox state; this mirrors the ticked rows for the
  // bulk-action menu, and bumping selectionEpoch clears the table's copy.
  const [selectedRows, setSelectedRows] = useState<Asset[]>([])
  const [selectionEpoch, setSelectionEpoch] = useState(0)
  // A new sort reorders the whole dataset, so start again from its first page.
  const handleSortingChange = useCallback((next: SortingState) => {
    setSorting(next)
    setCurrentPage(1)
  }, [])

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
    if (pageSize !== DEFAULT_ASSET_PAGE_SIZE) params.set('per_page', String(pageSize))
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (tagFilters.length > 0) params.set('tags', tagFilters.join(','))
    // Property filters as repeated ?pf=key:value params (multi-value per key)
    for (const [key, vals] of Object.entries(propertiesFilter)) {
      for (const val of vals) {
        params.append('pf', `${key}:${val}`)
      }
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
    pageSize,
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

  // Status, search, tags, and properties are all filtered server-side now, so
  // the rows returned are already the filtered set — no client-side re-filter
  // (which previously only touched the current page).
  const filteredData = transformedAssets ?? []

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

      // Group is a create-time convenience field (only rendered on the create
      // form). It is NOT part of the asset DTO — membership is a separate
      // relation — so pull it out and apply it via the group-membership
      // endpoint after the asset exists, instead of letting it get silently
      // dropped into the create payload.
      const groupId = (data.groupId as string | undefined)?.trim() || undefined
      delete data.groupId

      // owner_ref is a universal field on every form, not in config.formFields
      const ownerRef = data.ownerRef as string | undefined
      delete data.ownerRef

      // CIA impact ratings are universal shared-form fields (api #467), not in
      // config.formFields — pull them out so they don't get dropped by the
      // config-only loop below, and forward them explicitly. '' = not rated.
      const impactConfidentiality = (data.impactConfidentiality as string | undefined) || undefined
      const impactIntegrity = (data.impactIntegrity as string | undefined) || undefined
      const impactAvailability = (data.impactAvailability as string | undefined) || undefined
      delete data.impactConfidentiality
      delete data.impactIntegrity
      delete data.impactAvailability

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

      // Classification is now set by the operator via the shared form (falls
      // back to sensible defaults only when absent) instead of being hardcoded.
      return crud.handleCreate(
        {
          name: String(data.name ?? ''),
          type: config.type as never,
          criticality: (data.criticality as string | undefined) || 'medium',
          description: String(data.description ?? ''),
          scope: (data.scope as string | undefined) || 'internal',
          exposure: (data.exposure as string | undefined) || 'unknown',
          ...(impactConfidentiality
            ? { impactConfidentiality: impactConfidentiality as ImpactRating }
            : {}),
          ...(impactIntegrity ? { impactIntegrity: impactIntegrity as ImpactRating } : {}),
          ...(impactAvailability ? { impactAvailability: impactAvailability as ImpactRating } : {}),
          ownerRef,
          tags,
          // Per-type fields collected by the form live in `metadata` (→ backend
          // `properties`). The update path passes this; create silently dropped it.
          ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
          ...topLevel,
        } as never,
        groupId
          ? async (created) => {
              await post(`/api/v1/asset-groups/${groupId}/assets`, {
                asset_ids: [created.id],
              })
            }
          : undefined
      )
    },
    [crud, config.formFields, config.type]
  )

  const handleFormUpdate = useCallback(
    async (data: Record<string, unknown>) => {
      if (!dialogs.selectedAsset) return false
      const tags = (data.tags as string[] | undefined) ?? []
      delete data.tags

      // owner_ref + classification are universal fields on every form, not in
      // config.formFields — pull them out before the config loop.
      // On edit the field is prefilled with the current owner, so coerce an
      // empty value to '' (not undefined) — the backend partial-update only
      // touches owner_ref when the key is present, so sending '' is the only
      // way to *clear* a previously-set owner. undefined would silently keep
      // the old value.
      const ownerRef = (data.ownerRef as string | undefined) ?? ''
      delete data.ownerRef
      const criticality = data.criticality as Criticality | undefined
      const scope = data.scope as AssetScope | undefined
      const exposure = data.exposure as ExposureLevel | undefined
      delete data.criticality
      delete data.scope
      delete data.exposure

      // CIA impact ratings (api #467). The shared form always sends a value on
      // edit ('' = not rated), so pass it through verbatim: '' clears the
      // rating, a rating sets it. Only omit when the key is genuinely absent.
      const impactConfidentiality = data.impactConfidentiality as ImpactRating | '' | undefined
      const impactIntegrity = data.impactIntegrity as ImpactRating | '' | undefined
      const impactAvailability = data.impactAvailability as ImpactRating | '' | undefined
      delete data.impactConfidentiality
      delete data.impactIntegrity
      delete data.impactAvailability

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
        ...(criticality ? { criticality } : {}),
        ...(scope ? { scope } : {}),
        ...(exposure ? { exposure } : {}),
        ...(impactConfidentiality !== undefined ? { impactConfidentiality } : {}),
        ...(impactIntegrity !== undefined ? { impactIntegrity } : {}),
        ...(impactAvailability !== undefined ? { impactAvailability } : {}),
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
        enableHiding: false,
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
        header: ({ column }) => <DataTableColumnHeader column={column} title={config.label} />,
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
      // Type-specific columns. They read metadata the API cannot sort by, so
      // their headers stay plain text (a sort would only reorder this page).
      ...config.columns.map((col) => ({ enableSorting: false, ...col })),
      // Status
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Findings" />,
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Risk" />,
        cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
      },
      // Last Update — built-in for all asset pages, sortable
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last updated" />,
        cell: ({ row }) => {
          const raw = row.original.updatedAt
          if (!raw) return <span className="text-muted-foreground">-</span>
          const date = new Date(raw)
          const now = new Date()
          const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
          const label = formatDistanceToNow(date, { addSuffix: true })
          const color =
            diffDays > 30
              ? 'text-destructive'
              : diffDays > 7
                ? 'text-warning'
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
        enableHiding: false,
        cell: ({ row }) => {
          const asset = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label={`Actions for ${asset.name}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    if (config.detailPagePath) {
                      router.push(config.detailPagePath.replace('{id}', asset.id))
                    } else {
                      dialogs.setSelectedAsset(asset)
                    }
                  }}
                >
                  <Eye className="me-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
                <Can permission={Permission.AssetsWrite}>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      dialogs.openEdit(asset)
                    }}
                  >
                    <Pencil className="me-2 h-4 w-4" />
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
                    <Copy className="me-2 h-4 w-4" />
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
                      <ActionIcon className="me-2 h-4 w-4" />
                      {action.label}
                    </DropdownMenuItem>
                  )
                })}
                <Can permission={Permission.AssetsDelete}>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      dialogs.openDelete(asset)
                    }}
                  >
                    <Trash2 className="me-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </Can>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ]
  }, [config, scopeMatchesMap, dialogs, handleCopy, can, router])

  // Only sort fields the API accepts; a stale URL value must not leave an
  // arrow on a column the rows are not actually ordered by.
  const tableSorting = useMemo(
    () => sorting.filter((s) => SERVER_SORTABLE_COLUMNS.has(s.id)),
    [sorting]
  )

  const handleBulkDelete = async () => {
    const ids = selectedRows.map((a) => a.id)
    const success = await crud.handleBulkDelete(ids)
    if (success) setSelectionEpoch((n) => n + 1)
  }

  const openAsset = useCallback(
    (asset: Asset) => {
      if (config.detailPagePath) {
        router.push(config.detailPagePath.replace('{id}', asset.id))
      } else {
        dialogs.setSelectedAsset(asset)
      }
    },
    [config.detailPagePath, router, dialogs]
  )

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
            <Button variant="outline" onClick={handleExport} disabled={isExporting}>
              <Download className="me-2 h-4 w-4" />
              {isExporting ? 'Exporting…' : 'Export'}
            </Button>
            <Can permission={Permission.AssetsWrite}>
              <Button
                onClick={() => {
                  dialogs.setSelectedAsset(null)
                  dialogs.setAddDialogOpen(true)
                }}
              >
                <Plus className="me-2 h-4 w-4" />
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
        <div className="mt-6 space-y-2">
          {/* Active filter chips — tags + properties */}
          <TagFilterChips value={tagFilters} onChange={setTagFilters} />
          <PropertyFilterChips
            value={propertiesFilter}
            onChange={(pf) => {
              setPropertiesFilter(pf)
              setCurrentPage(1)
            }}
            filtered={total}
            total={typeStats.total}
          />
          <DataTable
            columns={columns}
            data={filteredData}
            getRowId={(a) => a.id}
            isLoading={isLoading}
            showSearch={false}
            toolbarStart={
              <>
                <div className="relative min-w-0 flex-1 sm:max-w-sm">
                  <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${config.labelPlural.toLowerCase()}…`}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="h-9 ps-9"
                    aria-label={`Search ${config.labelPlural.toLowerCase()}`}
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as StatusFilter)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9 w-auto sm:min-w-32" aria-label="Filter by status">
                    <SelectValue>
                      Status:{' '}
                      {statusFilterOptions.find((f) => f.value === statusFilter)?.label ?? 'All'}
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
                {headerExtra}
              </>
            }
            toolbarEnd={
              selectedRows.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      {selectedRows.length} selected
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {config.bulkActions?.map((action) => {
                      if (action.permission && !can(action.permission)) return null
                      const BulkIcon = action.icon
                      return (
                        <DropdownMenuItem
                          key={action.label}
                          className={action.variant === 'destructive' ? 'text-destructive' : ''}
                          onClick={() => action.onClick(selectedRows)}
                        >
                          <BulkIcon className="me-2 h-4 w-4" />
                          {action.label}
                        </DropdownMenuItem>
                      )
                    })}
                    <Can permission={Permission.AssetsDelete}>
                      <DropdownMenuItem className="text-destructive" onClick={handleBulkDelete}>
                        <Trash2 className="me-2 h-4 w-4" />
                        Delete selected
                      </DropdownMenuItem>
                    </Can>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : undefined
            }
            showSelectionCount={false}
            onSelectionChange={setSelectedRows}
            resetSelectionKey={selectionEpoch}
            onRowClick={openAsset}
            manualPagination
            rowCount={total}
            pagination={{ pageIndex: currentPage - 1, pageSize }}
            onPaginationChange={(next) => {
              if (next.pageSize !== pageSize) {
                setPageSize(next.pageSize)
                setCurrentPage(1)
              } else {
                setCurrentPage(next.pageIndex + 1)
              }
            }}
            pageSize={pageSize}
            pageSizeOptions={ASSET_PAGE_SIZES}
            sorting={tableSorting}
            onSortingChange={handleSortingChange}
            emptyMessage={
              hasActiveFilter || statusFilter !== 'all'
                ? `No ${config.labelPlural.toLowerCase()} match these filters`
                : `No ${config.labelPlural.toLowerCase()} yet`
            }
            emptyDescription={
              hasActiveFilter || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : `Add a ${config.label.toLowerCase()} or run a discovery scan to populate this list`
            }
          />
        </div>
      </Main>

      {/* Detail Sheet */}
      <AssetDetailSheet
        asset={selectedAsset}
        open={!!selectedAsset && !dialogs.editDialogOpen}
        onOpenChange={() => dialogs.setSelectedAsset(null)}
        icon={config.icon}
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
              <Copy className="me-2 h-4 w-4" />
              {config.copyAction.label}
            </Button>
          ) : undefined
        }
        statsContent={
          selectedAsset && config.detailStats ? (
            <DetailFieldGrid className="grid-cols-2 sm:grid-cols-3">
              {config.detailStats.map((stat, i) => (
                <DetailField key={i} label={stat.label}>
                  <span className="text-lg font-semibold tabular-nums">
                    {stat.getValue(selectedAsset)}
                  </span>
                </DetailField>
              ))}
            </DetailFieldGrid>
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
                  <DetailSection key={si} title={section.title}>
                    <DetailFieldGrid>
                      {resolvedFields.map((field, fi) => (
                        <DetailField key={fi} label={field.label} full={field.fullWidth}>
                          {field.value}
                        </DetailField>
                      ))}
                    </DetailFieldGrid>
                  </DetailSection>
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
        assetType={config.type}
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
        assetType={config.type}
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
