'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
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
} from 'lucide-react'
import { useAssets, type Asset } from '@/features/assets'
import { Can, Permission, usePermissions } from '@/lib/permissions'
import {
  ScopeBadge,
  ScopeCoverageCard,
  getScopeMatchesForAsset,
  calculateScopeCoverage,
  useScopeTargetsApi,
  useScopeExclusionsApi,
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
}

export function AssetPage({ config }: AssetPageProps) {
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
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch])

  // Data fetching with server-side pagination and search
  const { assets, total, totalPages, isLoading, mutate } = useAssets({
    types: (config.types || [config.type]) as AssetType[],
    page: currentPage,
    pageSize,
    search: debouncedSearch || undefined,
  })

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
  const [customFilterValues, setCustomFilterValues] = useState<Record<string, string>>({})
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
    if (currentPage > 1) params.set('page', String(currentPage))
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (statusFilter !== 'all') params.set('status', statusFilter)
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
  }, [currentPage, debouncedSearch, statusFilter, sorting, pathname, router, config.defaultSort])

  // Scope integration — real API data
  const { data: scopeTargetsData } = useScopeTargetsApi({ status: 'active', per_page: 500 })
  const { data: scopeExclusionsData } = useScopeExclusionsApi({ status: 'active', per_page: 500 })
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

  const scopeCoverage = useMemo(
    () =>
      calculateScopeCoverage(
        (transformedAssets ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type ?? 'unclassified',
        })),
        scopeTargets,
        scopeExclusions
      ),
    [transformedAssets, scopeTargets, scopeExclusions]
  )

  // Resolve filters: customFilters[] takes priority, fallback to single customFilter
  const resolvedFilters = useMemo(
    () => config.customFilters ?? (config.customFilter ? [config.customFilter] : []),
    [config.customFilters, config.customFilter]
  )

  // Resolve status filter options
  const statusFilterOptions = useMemo(
    () => config.statusFilters ?? defaultStatusFilters,
    [config.statusFilters]
  )

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...(transformedAssets ?? [])]
    if (statusFilter !== 'all') {
      data = data.filter((a) => a.status === statusFilter)
    }
    for (const filter of resolvedFilters) {
      const value = customFilterValues[filter.label] ?? 'all'
      if (value !== 'all') {
        data = data.filter((a) => filter.filterFn(a, value))
      }
    }
    return data
  }, [transformedAssets, statusFilter, customFilterValues, resolvedFilters])

  // Status counts — single pass O(n)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: transformedAssets.length }
    for (const asset of transformedAssets) {
      const s = asset.status
      counts[s] = (counts[s] ?? 0) + 1
    }
    return counts
  }, [transformedAssets])

  // Copy handler
  const handleCopy = useCallback(
    (asset: Asset) => {
      if (!config.copyAction) return
      navigator.clipboard
        .writeText(config.copyAction.getValue(asset))
        .then(() => toast.success('Copied to clipboard'))
        .catch(() => toast.error('Failed to copy'))
    },
    [config.copyAction]
  )

  // Form submit handlers
  const handleFormCreate = useCallback(
    async (data: Record<string, unknown>) => {
      const tags = (data.tags as string[] | undefined) ?? []
      delete data.tags

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
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate">{row.original.name}</p>
              {row.original.groupName && (
                <p className="text-muted-foreground text-xs truncate">{row.original.groupName}</p>
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
      {
        id: 'tags',
        header: 'Tags',
        cell: ({ row }) => {
          const tags = row.original.tags
          if (!tags?.length) return <span className="text-muted-foreground">-</span>
          const visible = tags.slice(0, 2)
          const remaining = tags.slice(2)
          return (
            <div className="flex flex-wrap gap-1 max-w-[180px]">
              {visible.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs px-1.5 py-0 truncate max-w-[80px]"
                >
                  {tag}
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
                    <TooltipContent side="bottom" className="max-w-[240px]">
                      <div className="flex flex-wrap gap-1">
                        {remaining.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                            {tag}
                          </Badge>
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
          title={`${config.labelPlural}`}
          description={`${transformedAssets.length} ${config.labelPlural.toLowerCase()} in your infrastructure`}
        >
          <div className="flex gap-2">
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

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mt-6">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setStatusFilter('all')}
          >
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                Total {config.labelPlural}
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-16 mt-1" />
              ) : (
                <CardTitle className="text-3xl">{transformedAssets.length}</CardTitle>
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
                  {isLoading ? (
                    <Skeleton className="h-9 w-16 mt-1" />
                  ) : (
                    <CardTitle className="text-3xl">{stat.compute(transformedAssets)}</CardTitle>
                  )}
                </CardHeader>
              </Card>
            )
          })}
        </div>

        {/* Scope status */}
        <div className="mt-4">
          <ScopeCoverageCard coverage={scopeCoverage} showBreakdown={false} />
        </div>

        {/* Optional header content (banners, alerts) */}
        {config.headerContent && (
          <div className="mt-4">
            <config.headerContent assets={transformedAssets} />
          </div>
        )}

        {/* Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All {config.labelPlural}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Tabs
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <TabsList>
                    {statusFilterOptions.map((f) => (
                      <TabsTrigger key={f.value} value={f.value} className="text-xs">
                        {f.label}
                        <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                          {statusCounts[f.value] ?? 0}
                        </Badge>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {resolvedFilters.map((filter) => (
                  <Select
                    key={filter.label}
                    value={customFilterValues[filter.label] ?? 'all'}
                    onValueChange={(v) =>
                      setCustomFilterValues((prev) => ({ ...prev, [filter.label]: v }))
                    }
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder={filter.label} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {filter.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${config.labelPlural.toLowerCase()}...`}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-8"
                  />
                </div>

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
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
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
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
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
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
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
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
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
              {config.detailSections.map((section, si) => (
                <div key={si} className="rounded-xl border p-4 bg-card space-y-3">
                  <SectionTitle>{section.title}</SectionTitle>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {section.fields.map((field, fi) => (
                      <div key={fi} className={field.fullWidth ? 'col-span-2' : ''}>
                        <p className="text-muted-foreground">{field.label}</p>
                        <div className="font-medium mt-0.5">{field.getValue(selectedAsset)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
