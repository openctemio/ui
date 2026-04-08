'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import { PageHeader, DataTable, DataTableColumnHeader, RiskScoreBadge } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Download,
  Filter,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  FolderKanban,
  Copy,
  Link,
  ExternalLink,
  X,
  SlidersHorizontal,
  Tags,
  Search as SearchIcon,
  Package,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import { Can, Permission } from '@/lib/permissions'

// ============================================
// CONSTANTS
// ============================================

type Environment = 'production' | 'staging' | 'development' | 'testing'
type Criticality = 'critical' | 'high' | 'medium' | 'low'

const CRITICALITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
}

const ENVIRONMENT_BADGE: Record<string, string> = {
  production: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  staging: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  development: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  testing: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
}

interface Filters {
  environments: Environment[]
  criticalities: Criticality[]
  riskScoreRange: [number, number]
  hasFindings: boolean | null
}

const DEFAULT_FILTERS: Filters = {
  environments: [],
  criticalities: [],
  riskScoreRange: [0, 100],
  hasFindings: null,
}

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
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Assets to &quot;{group.name}&quot;</DialogTitle>
          <DialogDescription>Select assets to add to this group.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto border rounded-lg max-h-64">
            {displayed.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No assets found</div>
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
              : `Add ${selectedIds.length || ''} Asset${selectedIds.length !== 1 ? 's' : ''}`}
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

  // Filter state
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Dialog state
  const [viewGroup, setViewGroup] = useState<AssetGroup | null>(null)
  const [editGroup, setEditGroup] = useState<AssetGroup | null>(null)
  const [deleteGroup, setDeleteGroup] = useState<AssetGroup | null>(null)
  const [addAssetsGroup, setAddAssetsGroup] = useState<AssetGroup | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.environments.length > 0) count++
    if (filters.criticalities.length > 0) count++
    if (filters.riskScoreRange[0] > 0 || filters.riskScoreRange[1] < 100) count++
    if (filters.hasFindings !== null) count++
    return count
  }, [filters])

  // Build API filters
  const apiFilters = useMemo(() => {
    const result: AssetGroupApiFilters = {}
    if (filters.environments.length > 0) result.environments = filters.environments
    if (filters.criticalities.length > 0) result.criticalities = filters.criticalities
    if (filters.riskScoreRange[0] > 0) result.min_risk_score = filters.riskScoreRange[0]
    if (filters.riskScoreRange[1] < 100) result.max_risk_score = filters.riskScoreRange[1]
    if (filters.hasFindings !== null) result.has_findings = filters.hasFindings
    return result
  }, [filters])

  // Fetch data
  const { data: groups, isLoading, mutate: refreshData } = useAssetGroups({ filters: apiFilters })

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
    setSelectedIds([])
    setBulkDeleteConfirm(false)
    refreshData()
  }

  const handleBulkAction = async (action: string, value?: string) => {
    if (action === 'change-criticality' && value) {
      await bulkOperations.bulkUpdate(selectedIds, { criticality: value })
      setSelectedIds([])
      refreshData()
    } else if (action === 'change-environment' && value) {
      await bulkOperations.bulkUpdate(selectedIds, { environment: value })
      setSelectedIds([])
      refreshData()
    }
  }

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success('Group ID copied')
  }

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/asset-groups/${id}`)
    toast.success('Link copied to clipboard')
  }

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    toast.success('Filters cleared')
  }

  const toggleFilter = <K extends keyof Filters>(
    key: K,
    value: Filters[K] extends (infer T)[] ? T : never
  ) => {
    setFilters((prev) => {
      const arr = prev[key] as unknown[]
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
  }

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
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{group.name}</p>
              {group.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>
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
        <Badge variant="outline" className={ENVIRONMENT_BADGE[row.original.environment]}>
          {row.original.environment}
        </Badge>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'criticality',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Criticality" />,
      cell: ({ row }) => (
        <Badge className={CRITICALITY_BADGE[row.original.criticality]}>
          {row.original.criticality}
        </Badge>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'assetCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Assets" />,
      cell: ({ row }) => <span className="font-medium">{row.original.assetCount}</span>,
    },
    {
      accessorKey: 'findingCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Findings" />,
      cell: ({ row }) => {
        const count = row.original.findingCount
        return (
          <span className={count > 0 ? 'font-medium text-orange-500' : 'text-muted-foreground'}>
            {count}
          </span>
        )
      },
    },
    {
      accessorKey: 'riskScore',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Risk Score" />,
      cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const group = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewGroup(group)}>
                <Eye className="mr-2 h-4 w-4" />
                Quick View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/asset-groups/${group.id}`)}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Full Page
              </DropdownMenuItem>
              <Can permission={Permission.AssetGroupsWrite}>
                <DropdownMenuItem onClick={() => setEditGroup(group)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAddAssetsGroup(group)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Assets
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/asset-groups/${group.id}?tab=assets`)}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Manage Assets
                </DropdownMenuItem>
              </Can>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleCopyId(group.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopyLink(group.id)}>
                <Link className="mr-2 h-4 w-4" />
                Copy Link
              </DropdownMenuItem>
              <Can permission={Permission.AssetGroupsDelete}>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-400" onClick={() => setDeleteGroup(group)}>
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

  return (
    <>
      <Main>
        <PageHeader
          title="Asset Groups"
          description="Organize and monitor your assets by logical groups"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    toast.success('Exporting as CSV...', {
                      description: 'Your file will be downloaded shortly',
                    })
                  }
                >
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    toast.success('Exporting as JSON...', {
                      description: 'Your file will be downloaded shortly',
                    })
                  }
                >
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filters Popover */}
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 sm:w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear all
                      </Button>
                    )}
                  </div>

                  <Separator />

                  {/* Environment */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Environment</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['production', 'staging', 'development', 'testing'] as Environment[]).map(
                        (env) => (
                          <Badge
                            key={env}
                            variant={filters.environments.includes(env) ? 'default' : 'outline'}
                            className={`cursor-pointer ${
                              filters.environments.includes(env) ? '' : 'hover:bg-muted'
                            }`}
                            onClick={() => toggleFilter('environments', env)}
                          >
                            {env}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>

                  {/* Criticality */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Criticality</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['critical', 'high', 'medium', 'low'] as Criticality[]).map((crit) => (
                        <Badge
                          key={crit}
                          variant={filters.criticalities.includes(crit) ? 'default' : 'outline'}
                          className={`cursor-pointer ${
                            filters.criticalities.includes(crit)
                              ? CRITICALITY_BADGE[crit]
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleFilter('criticalities', crit)}
                        >
                          {crit}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Risk Score Range */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Risk Score</Label>
                      <span className="text-sm text-muted-foreground">
                        {filters.riskScoreRange[0]} - {filters.riskScoreRange[1]}
                      </span>
                    </div>
                    <Slider
                      value={filters.riskScoreRange}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          riskScoreRange: value as [number, number],
                        }))
                      }
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Has Findings */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Findings</Label>
                    <div className="flex gap-2">
                      <Badge
                        variant={filters.hasFindings === true ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            hasFindings: prev.hasFindings === true ? null : true,
                          }))
                        }
                      >
                        Has Findings
                      </Badge>
                      <Badge
                        variant={filters.hasFindings === false ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            hasFindings: prev.hasFindings === false ? null : false,
                          }))
                        }
                      >
                        No Findings
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{groups.length} results</span>
                    <Button size="sm" onClick={() => setIsFilterOpen(false)}>
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Can permission={Permission.AssetGroupsWrite} mode="disable">
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Group
              </Button>
            </Can>
          </div>
        </PageHeader>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {filters.environments.map((env) => (
              <Badge key={env} variant="secondary" className="gap-1">
                {env}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleFilter('environments', env)}
                />
              </Badge>
            ))}
            {filters.criticalities.map((crit) => (
              <Badge key={crit} variant="secondary" className="gap-1">
                {crit}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleFilter('criticalities', crit)}
                />
              </Badge>
            ))}
            {(filters.riskScoreRange[0] > 0 || filters.riskScoreRange[1] < 100) && (
              <Badge variant="secondary" className="gap-1">
                Risk: {filters.riskScoreRange[0]}-{filters.riskScoreRange[1]}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters((prev) => ({ ...prev, riskScoreRange: [0, 100] }))}
                />
              </Badge>
            )}
            {filters.hasFindings !== null && (
              <Badge variant="secondary" className="gap-1">
                {filters.hasFindings ? 'Has Findings' : 'No Findings'}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters((prev) => ({ ...prev, hasFindings: null }))}
                />
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <Card className="mt-4 border-primary">
            <CardContent className="flex items-center justify-between py-3">
              <span className="text-sm font-medium">{selectedIds.length} group(s) selected</span>
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Tags className="mr-2 h-4 w-4" />
                      Criticality
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {(['critical', 'high', 'medium', 'low'] as Criticality[]).map((crit) => (
                      <DropdownMenuItem
                        key={crit}
                        onClick={() => handleBulkAction('change-criticality', crit)}
                      >
                        <Badge className={`mr-2 ${CRITICALITY_BADGE[crit]}`}>{crit}</Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Environment
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {(['production', 'staging', 'development', 'testing'] as Environment[]).map(
                      (env) => (
                        <DropdownMenuItem
                          key={env}
                          onClick={() => handleBulkAction('change-environment', env)}
                        >
                          {env}
                        </DropdownMenuItem>
                      )
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => setBulkDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Groups</p>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Across all environments</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className={stats.byCriticality?.critical > 0 ? 'border-red-500/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Critical Groups</p>
              <AlertTriangle
                className={`h-4 w-4 ${stats.byCriticality?.critical > 0 ? 'text-red-500' : 'text-muted-foreground'}`}
              />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p
                    className={`text-2xl font-bold ${stats.byCriticality?.critical > 0 ? 'text-red-500' : ''}`}
                  >
                    {stats.byCriticality?.critical ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{stats.totalAssets}</p>
                  <p className="text-xs text-muted-foreground mt-1">In all groups</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Avg Risk Score</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  {/* Round to 1 decimal — the raw value is computed by
                      averaging integer scores so it can have a long
                      repeating fractional tail (e.g. 53.16666666666664).
                      One decimal place is precise enough for a risk
                      summary card. */}
                  <p className="text-2xl font-bold">
                    {Math.round((stats.averageRiskScore ?? 0) * 10) / 10}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Out of 100</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <div className="mt-6">
          <DataTable
            columns={columns}
            data={groups}
            searchPlaceholder="Search groups..."
            pageSize={10}
            emptyMessage="No asset groups found"
            emptyDescription={
              activeFilterCount > 0
                ? 'Try adjusting your filters'
                : 'Create your first asset group to organize your assets'
            }
            onRowClick={(group) => setViewGroup(group)}
          />
        </div>
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
      <AlertDialog open={!!deleteGroup} onOpenChange={() => setDeleteGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteGroup?.name}&quot;? This action cannot be
              undone. All assets in this group will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Asset Groups</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} group(s)? This action cannot be
              undone. All assets in these groups will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleBulkDelete}>
              Delete {selectedIds.length} Groups
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
