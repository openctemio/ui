'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  RiskScoreBadge,
  EmptyState,
  MetricStrip,
  type MetricStripItem,
  FacetPanel,
  FacetSection,
  FacetOption,
  BulkActionBar,
  FilterPanelToggle,
  FilterSheet,
} from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Download,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  FolderKanban,
  Copy,
  Link,
  ExternalLink,
  SlidersHorizontal,
  Tags,
  Search as SearchIcon,
  Package,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  CreateGroupDialog,
  EditGroupDialog,
  GroupQuickView,
  type EditGroupFormData,
  useAssetGroups,
  useAssetGroupStats,
  useCreateAssetGroup,
  useUpdateAssetGroup,
  useDeleteAssetGroup,
  useAddAssetsToGroup,
  useBulkAssetGroupOperations,
} from '@/features/asset-groups'
import { useAssets } from '@/features/assets'
import type { AssetGroup, CreateAssetGroupInput } from '@/features/asset-groups/types'
import type { AssetGroupApiFilters } from '@/features/asset-groups/api'
import { copyToClipboard } from '@/lib/clipboard'
import { Can, Permission } from '@/lib/permissions'
import {
  CRITICALITY_BADGE_SOFT,
  CRITICALITY_DOT_COLORS,
  CRITICALITY_LABELS,
  CRITICALITY_ORDER,
} from '@/lib/criticality-colors'
import { useCsvExport, type ExportFieldConfig } from '@/hooks/use-csv-export'
import { useUrlFilter, useUrlFilterList } from '@/hooks/use-url-param'
import { cn } from '@/lib/utils'

// ============================================
// CONSTANTS
// ============================================

type Environment = 'production' | 'staging' | 'development' | 'testing'
type Criticality = 'critical' | 'high' | 'medium' | 'low'

const ENVIRONMENTS: Environment[] = ['production', 'staging', 'development', 'testing']
const CRITICALITIES: Criticality[] = CRITICALITY_ORDER

const CRITICALITY_BADGE: Record<string, string> = CRITICALITY_BADGE_SOFT

const FILTERS_OPEN_KEY = 'openctem:asset-groups-filters-open'

/** A 0–100 score from a URL value; anything else falls back. */
function clampScore(raw: string, fallback: number): number {
  if (!/^\d+$/.test(raw)) return fallback
  return Math.min(100, Math.max(0, Number(raw)))
}

const ASSET_GROUP_EXPORT_FIELDS: ExportFieldConfig<AssetGroup>[] = [
  { header: 'Name', accessor: (g) => g.name },
  { header: 'Description', accessor: (g) => g.description ?? '' },
  { header: 'Environment', accessor: (g) => g.environment },
  { header: 'Criticality', accessor: (g) => g.criticality },
  { header: 'Business Unit', accessor: (g) => g.businessUnit ?? '' },
  { header: 'Owner', accessor: (g) => g.owner ?? '' },
  { header: 'Assets', accessor: (g) => g.assetCount },
  { header: 'Findings', accessor: (g) => g.findingCount },
  { header: 'Risk Score', accessor: (g) => g.riskScore },
  { header: 'Tags', accessor: (g) => (g.tags ?? []).join('; ') },
]

// ============================================
// ADD ASSETS DIALOG (Simplified for list page)
// ============================================

function AddAssetsDialog({
  group,
  onClose,
  onSuccess,
}: {
  group: AssetGroup
  onClose: () => void
  onSuccess: () => void
}) {
  const { trigger: addAssets, isMutating } = useAddAssetsToGroup(group.id)
  const { assets: allAssets } = useAssets({ pageSize: 100 })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [displayLimit, setDisplayLimit] = useState(20)

  const filtered = useMemo(() => {
    return (allAssets || []).filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
  }, [allAssets, search])

  useEffect(() => {
    setDisplayLimit(20)
  }, [search])

  const displayed = filtered.slice(0, displayLimit)

  const handleSubmit = async () => {
    try {
      await addAssets(selectedIds)
      onSuccess()
    } catch {
      // Error handled by hook
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add assets to &quot;{group.name}&quot;</DialogTitle>
          <DialogDescription>Select assets to add to this group.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto border rounded-lg max-h-64">
            {displayed.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No assets found"
                description="Try a different search."
                card={false}
              />
            ) : (
              <div className="divide-y">
                {displayed.map((asset) => (
                  <label
                    key={asset.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(asset.id)}
                      onCheckedChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(asset.id)
                            ? prev.filter((id) => id !== asset.id)
                            : [...prev, asset.id]
                        )
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{asset.name}</p>
                      <p className="text-sm text-muted-foreground">{asset.type}</p>
                    </div>
                    <RiskScoreBadge score={asset.riskScore} size="sm" />
                  </label>
                ))}
                {displayLimit < filtered.length && (
                  <div className="p-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDisplayLimit((prev) => prev + 20)}
                      className="w-full"
                    >
                      Load more ({filtered.length - displayLimit} remaining)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedIds.length > 0 && (
            <p className="text-sm text-muted-foreground">{selectedIds.length} asset(s) selected</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMutating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={selectedIds.length === 0 || isMutating}>
            {isMutating
              ? 'Adding...'
              : `Add ${selectedIds.length || ''} asset${selectedIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// PAGE COMPONENT
// ============================================

export default function AssetGroupsPage() {
  const router = useRouter()

  // Data hooks
  const { data: stats, isLoading: statsLoading } = useAssetGroupStats()
  const createAssetGroup = useCreateAssetGroup()
  const bulkOperations = useBulkAssetGroupOperations()

  // Filters live in the URL so a filtered view can be linked to.
  const [envParam, setEnvParam] = useUrlFilterList('environment')
  const [critParam, setCritParam] = useUrlFilterList('criticality')
  const [findingsParam, setFindingsParam] = useUrlFilter('findings', '')
  const [riskMinParam, setRiskMinParam] = useUrlFilter('risk_min', '0')
  const [riskMaxParam, setRiskMaxParam] = useUrlFilter('risk_max', '100')
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')

  const environments = useMemo(
    () => envParam.filter((v): v is Environment => (ENVIRONMENTS as string[]).includes(v)),
    [envParam]
  )
  const criticalities = useMemo(
    () => critParam.filter((v): v is Criticality => (CRITICALITIES as string[]).includes(v)),
    [critParam]
  )
  const hasFindings = findingsParam === 'yes' ? true : findingsParam === 'no' ? false : null
  const riskMin = clampScore(riskMinParam, 0)
  const riskMax = clampScore(riskMaxParam, 100)
  // The slider moves locally while dragging; the URL is written on release.
  const [riskDraft, setRiskDraft] = useState<[number, number] | null>(null)
  const riskRange: [number, number] = riskDraft ?? [riskMin, riskMax]

  // Filter panel: closed by default; the viewer's choice is remembered.
  const [filtersOpen, setFiltersOpenState] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  useEffect(() => {
    try {
      if (window.localStorage.getItem(FILTERS_OPEN_KEY) === '1') setFiltersOpenState(true)
    } catch {
      // storage unavailable — stay closed
    }
  }, [])
  const toggleFiltersOpen = useCallback(() => {
    setFiltersOpenState((prev) => {
      try {
        window.localStorage.setItem(FILTERS_OPEN_KEY, prev ? '0' : '1')
      } catch {
        // best-effort
      }
      return !prev
    })
  }, [])

  // Dialog state
  const [viewGroup, setViewGroup] = useState<AssetGroup | null>(null)
  const [editGroup, setEditGroup] = useState<AssetGroup | null>(null)
  const [deleteGroup, setDeleteGroup] = useState<AssetGroup | null>(null)
  const [addAssetsGroup, setAddAssetsGroup] = useState<AssetGroup | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  // Selection state. The table owns the checkboxes; bumping the epoch clears them.
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionEpoch, setSelectionEpoch] = useState(0)
  const clearSelection = useCallback(() => {
    setSelectedIds([])
    setSelectionEpoch((n) => n + 1)
  }, [])

  const riskActive = riskMin > 0 || riskMax < 100
  const activeFilterCount =
    environments.length +
    criticalities.length +
    (riskActive ? 1 : 0) +
    (hasFindings !== null ? 1 : 0)

  // Build API filters
  const apiFilters = useMemo(() => {
    const result: AssetGroupApiFilters = {}
    if (environments.length > 0) result.environments = environments
    if (criticalities.length > 0) result.criticalities = criticalities
    if (riskMin > 0) result.min_risk_score = riskMin
    if (riskMax < 100) result.max_risk_score = riskMax
    if (hasFindings !== null) result.has_findings = hasFindings
    return result
  }, [environments, criticalities, riskMin, riskMax, hasFindings])

  // Fetch data
  const {
    data: fetchedGroups,
    isLoading,
    mutate: refreshData,
  } = useAssetGroups({ filters: apiFilters })

  const groups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return fetchedGroups
    return fetchedGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description ?? '').toLowerCase().includes(q) ||
        (g.tags ?? []).some((t) => t.toLowerCase().includes(q))
    )
  }, [fetchedGroups, searchQuery])

  // CSV export of the current (filtered) groups list.
  const { handleExport: handleExportCsv } = useCsvExport(
    groups,
    ASSET_GROUP_EXPORT_FIELDS,
    'asset-groups'
  )
  const handleExportJson = () => {
    if (!groups.length) {
      toast.error('No data to export')
      return
    }
    const blob = new Blob([JSON.stringify(groups, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `asset-groups-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported successfully')
  }

  // Get all assets for create dialog (lazy: only fetch when dialog is open)
  const { assets: allAssets } = useAssets({ pageSize: 100, skip: !isCreateOpen })

  // Mutation hooks
  const updateAssetGroup = useUpdateAssetGroup(editGroup?.id || '')
  const deleteAssetGroupMutation = useDeleteAssetGroup(deleteGroup?.id || '')

  // Handlers
  const handleRefresh = () => {
    refreshData()
    toast.success('Asset groups refreshed')
  }

  const handleCreate = async (input: CreateAssetGroupInput) => {
    await createAssetGroup.trigger(input)
    refreshData()
  }

  const handleEdit = async (formData: EditGroupFormData) => {
    if (!editGroup) return
    setIsEditSubmitting(true)
    try {
      await updateAssetGroup.trigger({
        name: formData.name,
        description: formData.description || undefined,
        environment: formData.environment,
        criticality: formData.criticality,
        businessUnit: formData.businessUnit || undefined,
        owner: formData.owner || undefined,
        ownerEmail: formData.ownerEmail || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      })
      refreshData()
      setEditGroup(null)
    } catch (error) {
      console.error('Failed to update asset group:', error)
    } finally {
      setIsEditSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteGroup) return
    try {
      await deleteAssetGroupMutation.trigger()
      refreshData()
    } catch {
      // Error handled by hook
    } finally {
      setDeleteGroup(null)
    }
  }

  const handleBulkDelete = async () => {
    await bulkOperations.bulkDelete(selectedIds)
    clearSelection()
    setBulkDeleteConfirm(false)
    refreshData()
  }

  const handleBulkAction = async (action: string, value?: string) => {
    if (action === 'change-criticality' && value) {
      await bulkOperations.bulkUpdate(selectedIds, { criticality: value })
      clearSelection()
      refreshData()
    } else if (action === 'change-environment' && value) {
      await bulkOperations.bulkUpdate(selectedIds, { environment: value })
      clearSelection()
      refreshData()
    }
  }

  const handleCopyId = (id: string) => {
    copyToClipboard(id)
    toast.success('Group ID copied')
  }

  const handleCopyLink = (id: string) => {
    copyToClipboard(`${window.location.origin}/asset-groups/${id}`)
    toast.success('Link copied to clipboard')
  }

  const clearFilters = () => {
    setEnvParam([])
    setCritParam([])
    setFindingsParam('')
    setRiskMinParam('0')
    setRiskMaxParam('100')
    setRiskDraft(null)
  }

  const toggleIn = (setter: typeof setEnvParam, value: string, on: boolean) =>
    setter((prev) => (on ? [...prev, value] : prev.filter((v) => v !== value)))

  // Column definitions
  const columns: ColumnDef<AssetGroup>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => {
        const group = row.original
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate font-medium">{group.name}</p>
              {group.description && (
                <p className="line-clamp-1 text-xs text-muted-foreground">{group.description}</p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'environment',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Environment" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.environment}
        </Badge>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'criticality',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Criticality" />,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn('capitalize', CRITICALITY_BADGE[row.original.criticality])}
        >
          {row.original.criticality}
        </Badge>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'assetCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Assets" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.assetCount}</span>,
    },
    {
      accessorKey: 'findingCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Findings" />,
      cell: ({ row }) => {
        const count = row.original.findingCount
        return (
          <span
            className={cn(
              'tabular-nums',
              count > 0 ? 'font-medium text-destructive' : 'text-muted-foreground'
            )}
          >
            {count}
          </span>
        )
      },
    },
    {
      accessorKey: 'riskScore',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Risk score" />,
      cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const group = row.original
        return (
          <DataTableRowActions
            actions={[
              { label: 'Quick view', icon: Eye, onClick: () => setViewGroup(group) },
              {
                label: 'Open full page',
                icon: ExternalLink,
                onClick: () => router.push(`/asset-groups/${group.id}`),
              },
              {
                label: 'Edit',
                icon: Pencil,
                onClick: () => setEditGroup(group),
                permission: Permission.AssetGroupsWrite,
              },
              {
                label: 'Add assets',
                icon: Plus,
                onClick: () => setAddAssetsGroup(group),
                permission: Permission.AssetGroupsWrite,
              },
              {
                label: 'Manage assets',
                icon: Package,
                onClick: () => router.push(`/asset-groups/${group.id}?tab=assets`),
                permission: Permission.AssetGroupsWrite,
              },
              {
                label: 'Copy ID',
                icon: Copy,
                onClick: () => handleCopyId(group.id),
                separatorBefore: true,
              },
              { label: 'Copy link', icon: Link, onClick: () => handleCopyLink(group.id) },
              {
                label: 'Delete',
                icon: Trash2,
                onClick: () => setDeleteGroup(group),
                destructive: true,
                separatorBefore: true,
                permission: Permission.AssetGroupsDelete,
              },
            ]}
          />
        )
      },
    },
  ]

  const criticalOnly = criticalities.length === 1 && criticalities[0] === 'critical'
  const metrics: MetricStripItem[] = [
    {
      key: 'total',
      label: 'Groups',
      value: stats.total,
      onClick: clearFilters,
      active: activeFilterCount === 0,
    },
    {
      key: 'critical',
      label: 'Critical groups',
      value: stats.byCriticality?.critical ?? 0,
      tone: 'danger',
      onClick: () => setCritParam(criticalOnly ? [] : ['critical']),
      active: criticalOnly,
    },
    { key: 'assets', label: 'Assets in groups', value: stats.totalAssets },
    {
      key: 'risk',
      label: 'Average risk score',
      // One decimal: the raw average of integer scores can carry a long
      // repeating fractional tail (e.g. 53.16666666666664).
      value: Math.round((stats.averageRiskScore ?? 0) * 10) / 10,
      hint: 'of 100',
    },
  ]

  const facetPanel = (
    <FacetPanel activeCount={activeFilterCount} onClearAll={clearFilters}>
      <FacetSection title="Environment" selectedCount={environments.length}>
        {ENVIRONMENTS.map((env) => (
          <FacetOption
            key={env}
            label={<span className="capitalize">{env}</span>}
            checked={environments.includes(env)}
            onCheckedChange={(on) => toggleIn(setEnvParam, env, on)}
          />
        ))}
      </FacetSection>
      <FacetSection title="Criticality" selectedCount={criticalities.length}>
        {CRITICALITIES.map((crit) => (
          <FacetOption
            key={crit}
            label={CRITICALITY_LABELS[crit]}
            adornment={
              <span className={cn('size-2 shrink-0 rounded-full', CRITICALITY_DOT_COLORS[crit])} />
            }
            checked={criticalities.includes(crit)}
            onCheckedChange={(on) => toggleIn(setCritParam, crit, on)}
          />
        ))}
      </FacetSection>
      <FacetSection title="Findings" selectedCount={hasFindings !== null ? 1 : 0}>
        <FacetOption
          label="Has findings"
          checked={hasFindings === true}
          onCheckedChange={(on) => setFindingsParam(on ? 'yes' : '')}
        />
        <FacetOption
          label="No findings"
          checked={hasFindings === false}
          onCheckedChange={(on) => setFindingsParam(on ? 'no' : '')}
        />
      </FacetSection>
      <FacetSection title="Risk score" selectedCount={riskActive ? 1 : 0}>
        <div className="space-y-3 pe-1.5 pt-1">
          <p className="text-xs tabular-nums text-muted-foreground">
            {riskRange[0]} – {riskRange[1]}
          </p>
          <Slider
            value={riskRange}
            onValueChange={(value) => setRiskDraft(value as [number, number])}
            onValueCommit={(value) => {
              setRiskMinParam(String(value[0]))
              setRiskMaxParam(String(value[1]))
              setRiskDraft(null)
            }}
            max={100}
            min={0}
            step={5}
            aria-label="Risk score range"
          />
        </div>
      </FacetSection>
    </FacetPanel>
  )

  const toolbarStart = (
    <>
      <FilterPanelToggle
        open={filtersOpen}
        onToggle={toggleFiltersOpen}
        onOpenSheet={() => setFilterSheetOpen(true)}
        activeCount={activeFilterCount}
        controlsId="asset-group-filters"
      />
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search name, description or tag…"
          aria-label="Search asset groups"
          className="h-9 ps-9"
        />
      </div>
    </>
  )

  const toolbarEnd = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Download className="h-4 w-4 md:me-2" />
            <span className="hidden md:inline">Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCsv} disabled={groups.length === 0}>
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportJson} disabled={groups.length === 0}>
            Export as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  return (
    <>
      <Main>
        <PageHeader
          title="Asset groups"
          description="Organize and monitor assets by logical group."
        >
          <Can permission={Permission.AssetGroupsWrite} mode="disable">
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              New group
            </Button>
          </Can>
        </PageHeader>

        <MetricStrip className="mt-5" loading={statsLoading} items={metrics} />

        <div className="mt-5 flex items-start gap-5">
          {filtersOpen && (
            <aside
              id="asset-group-filters"
              aria-label="Asset group filters"
              className="sticky top-4 hidden max-h-[calc(100svh-7.5rem)] w-64 shrink-0 flex-col rounded-xl border bg-card p-4 shadow-sm lg:flex"
            >
              <div className="flex min-h-0 flex-1 flex-col">{facetPanel}</div>
            </aside>
          )}

          <div className="min-w-0 flex-1">
            {isLoading && fetchedGroups.length === 0 ? (
              <div className="space-y-2 rounded-xl border p-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={groups}
                showSearch={false}
                toolbarStart={toolbarStart}
                toolbarEnd={toolbarEnd}
                emptyMessage="No asset groups found"
                emptyDescription={
                  activeFilterCount > 0 || searchQuery
                    ? 'Try adjusting your search or filters'
                    : 'Create a group to organize your assets'
                }
                onRowClick={(group) => setViewGroup(group)}
                getRowId={(group) => group.id}
                onSelectionChange={(rows) => setSelectedIds(rows.map((g) => g.id))}
                resetSelectionKey={selectionEpoch}
                showSelectionCount={false}
              />
            )}
          </div>
        </div>

        <BulkActionBar count={selectedIds.length} onClear={clearSelection} noun="selected">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Tags className="me-2 h-4 w-4" />
                Criticality
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {CRITICALITIES.map((crit) => (
                <DropdownMenuItem
                  key={crit}
                  onClick={() => handleBulkAction('change-criticality', crit)}
                >
                  <span className={cn('me-2 size-2 rounded-full', CRITICALITY_DOT_COLORS[crit])} />
                  {CRITICALITY_LABELS[crit]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <SlidersHorizontal className="me-2 h-4 w-4" />
                Environment
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {ENVIRONMENTS.map((env) => (
                <DropdownMenuItem
                  key={env}
                  className="capitalize"
                  onClick={() => handleBulkAction('change-environment', env)}
                >
                  {env}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Can permission={Permission.AssetGroupsDelete}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive"
              onClick={() => setBulkDeleteConfirm(true)}
            >
              <Trash2 className="me-2 h-4 w-4" />
              Delete
            </Button>
          </Can>
        </BulkActionBar>

        <FilterSheet
          open={filterSheetOpen}
          onOpenChange={setFilterSheetOpen}
          title="Asset group filters"
        >
          {facetPanel}
        </FilterSheet>
      </Main>

      {/* Quick View Sheet */}
      <GroupQuickView
        group={viewGroup}
        onClose={() => setViewGroup(null)}
        onEdit={setEditGroup}
        onDelete={setDeleteGroup}
        onRefresh={refreshData}
      />

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        ungroupedAssets={allAssets}
        onSubmit={handleCreate}
      />

      {/* Edit Dialog */}
      {editGroup && (
        <EditGroupDialog
          open={!!editGroup}
          onOpenChange={(open) => !open && setEditGroup(null)}
          group={editGroup}
          onSubmit={handleEdit}
          isSubmitting={isEditSubmitting}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteGroup}
        onOpenChange={() => setDeleteGroup(null)}
        title="Delete asset group"
        desc={
          <>
            Are you sure you want to delete &quot;{deleteGroup?.name}&quot;? This action cannot be
            undone. All assets in this group will be unassigned.
          </>
        }
        confirmText="Delete"
        destructive
        handleConfirm={handleDelete}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
        title={`Delete ${selectedIds.length} asset groups`}
        desc={
          <>
            Are you sure you want to delete {selectedIds.length} group(s)? This action cannot be
            undone. All assets in these groups will be unassigned.
          </>
        }
        confirmText={`Delete ${selectedIds.length} groups`}
        destructive
        handleConfirm={handleBulkDelete}
      />

      {/* Add Assets Dialog */}
      {addAssetsGroup && (
        <AddAssetsDialog
          group={addAssetsGroup}
          onClose={() => setAddAssetsGroup(null)}
          onSuccess={() => {
            refreshData()
            setAddAssetsGroup(null)
          }}
        />
      )}
    </>
  )
}
