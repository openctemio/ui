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
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  CreateGroupDialog,
  EditGroupDialog,
  type EditGroupFormData,
  useAssetGroups,
  useAssetGroupStats,
  useCreateAssetGroup,
  useUpdateAssetGroup,
  useAddAssetsToGroup,
  useGroupAssets,
  useRemoveAssetsFromGroup,
  useBulkAssetGroupOperations,
} from '@/features/asset-groups'
import { useAssets } from '@/features/assets'
import type { AssetGroup, CreateAssetGroupInput } from '@/features/asset-groups/types'
import type { AssetGroupApiFilters } from '@/features/asset-groups/api'
import { Can, Permission } from '@/lib/permissions'

type Environment = 'production' | 'staging' | 'development' | 'testing'
type Criticality = 'critical' | 'high' | 'medium' | 'low'

const criticalityColors: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
}

const environmentColors: Record<string, string> = {
  production: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  staging: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  development: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  testing: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
}

// Filter types
interface Filters {
  environments: Environment[]
  criticalities: Criticality[]
  riskScoreRange: [number, number]
  hasFindings: boolean | null
}

// QuickViewAssets component for Sheet
function QuickViewAssets({ groupId, onRefresh }: { groupId: string; onRefresh?: () => void }) {
  const { data: assets, isLoading, mutate: refreshAssets } = useGroupAssets(groupId)
  const { trigger: removeAssets, isMutating: isRemoving } = useRemoveAssetsFromGroup(groupId)
  const router = useRouter()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleRemoveAsset = async (assetId: string) => {
    setRemovingId(assetId)
    try {
      await removeAssets([assetId])
      // Toast is shown by the hook
      refreshAssets()
      onRefresh?.()
    } catch {
      // Error handled by hook
    } finally {
      setRemovingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-sm font-medium">Recent Assets</span>
        </div>
        <div className="divide-y">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const displayAssets = (assets || []).slice(0, 5)

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <span className="text-sm font-medium">Recent Assets ({assets?.length || 0})</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => router.push(`/asset-groups/${groupId}?tab=assets`)}
        >
          Manage All
          <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </div>
      {displayAssets.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">No assets in this group</div>
      ) : (
        <div className="divide-y">
          {displayAssets.map(
            (asset: { id: string; name: string; type: string; status?: string }) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 hover:bg-muted/50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FolderKanban className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-green-500 border-green-500/30 bg-green-500/10"
                  >
                    {asset.status || 'active'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveAsset(asset.id)
                    }}
                    disabled={isRemoving}
                  >
                    {removingId === asset.id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

const defaultFilters: Filters = {
  environments: [],
  criticalities: [],
  riskScoreRange: [0, 100],
  hasFindings: null,
}

// Add Assets Dialog Component
interface AddAssetsDialogProps {
  group: AssetGroup
  allAssets: Array<{ id: string; name: string; type: string; riskScore: number }>
  selectedAssetIds: string[]
  setSelectedAssetIds: React.Dispatch<React.SetStateAction<string[]>>
  searchTerm: string
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>
  onClose: () => void
  onSuccess: () => void
}

function AddAssetsDialog({
  group,
  allAssets,
  selectedAssetIds,
  setSelectedAssetIds,
  searchTerm,
  setSearchTerm,
  onClose,
  onSuccess,
}: AddAssetsDialogProps) {
  const { trigger: addAssets, isMutating } = useAddAssetsToGroup(group.id)
  const { data: groupAssets } = useGroupAssets(group.id)
  const [displayLimit, setDisplayLimit] = useState(20)
  const PAGE_SIZE = 20

  // Get IDs of assets already in the group
  const existingAssetIds = useMemo(() => {
    return groupAssets?.map((a: { id: string }) => a.id) || []
  }, [groupAssets])

  // Filter assets and separate existing ones
  const filteredAssets = useMemo(() => {
    return allAssets.filter((asset) => asset.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [allAssets, searchTerm])

  // Count available (not already added) assets
  const availableCount = filteredAssets.filter((a) => !existingAssetIds.includes(a.id)).length

  // Reset display limit when search changes
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE)
  }, [searchTerm])

  const displayedAssets = filteredAssets.slice(0, displayLimit)
  const hasMore = displayLimit < filteredAssets.length

  const handleToggle = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    )
  }

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + PAGE_SIZE)
  }

  const handleSubmit = async () => {
    try {
      await addAssets(selectedAssetIds)
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
          <DialogDescription>{availableCount} assets available to add.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Asset List */}
          <div className="flex-1 overflow-y-auto border rounded-lg max-h-64">
            {displayedAssets.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No assets found</div>
            ) : (
              <div className="divide-y">
                {displayedAssets.map((asset) => {
                  const isAlreadyAdded = existingAssetIds.includes(asset.id)
                  return (
                    <label
                      key={asset.id}
                      className={`flex items-center gap-3 p-3 ${isAlreadyAdded ? 'opacity-50 cursor-not-allowed bg-muted/30' : 'hover:bg-muted/50 cursor-pointer'}`}
                    >
                      <Checkbox
                        checked={isAlreadyAdded || selectedAssetIds.includes(asset.id)}
                        onCheckedChange={() => !isAlreadyAdded && handleToggle(asset.id)}
                        disabled={isAlreadyAdded}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{asset.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {asset.type}
                          {isAlreadyAdded && (
                            <span className="ml-2 text-xs">(Already in group)</span>
                          )}
                        </p>
                      </div>
                      <RiskScoreBadge score={asset.riskScore} size="sm" />
                    </label>
                  )
                })}
                {/* Load More Button */}
                {hasMore && (
                  <div className="p-3 text-center">
                    <Button variant="ghost" size="sm" onClick={handleLoadMore} className="w-full">
                      Load more ({filteredAssets.length - displayLimit} remaining)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedAssetIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedAssetIds.length} asset(s) selected
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMutating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={selectedAssetIds.length === 0 || isMutating}>
            {isMutating
              ? 'Adding...'
              : `Add ${selectedAssetIds.length || ''} Asset${selectedAssetIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AssetGroupsPage() {
  const router = useRouter()

  // Data fetching hooks
  const { data: stats } = useAssetGroupStats()
  const createAssetGroup = useCreateAssetGroup()
  const bulkOperations = useBulkAssetGroupOperations()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [quickFilter, setQuickFilter] = useState('all')

  // Filter states
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Dialog states
  const [viewGroup, setViewGroup] = useState<AssetGroup | null>(null)
  const [editGroup, setEditGroup] = useState<AssetGroup | null>(null)
  const [deleteGroup, setDeleteGroup] = useState<AssetGroup | null>(null)
  const [addAssetsGroup, setAddAssetsGroup] = useState<AssetGroup | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [_bulkActionType, setBulkActionType] = useState<string | null>(null)

  const [isEditSubmitting, setIsEditSubmitting] = useState(false)

  // Add Assets state
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [assetSearchTerm, setAssetSearchTerm] = useState('')

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.environments.length > 0) count++
    if (filters.criticalities.length > 0) count++
    if (filters.riskScoreRange[0] > 0 || filters.riskScoreRange[1] < 100) count++
    if (filters.hasFindings !== null) count++
    return count
  }, [filters])

  // Build API filters from UI filters
  const apiFilters = useMemo(() => {
    const result: AssetGroupApiFilters = {}

    if (filters.environments.length > 0) {
      result.environments = filters.environments
    }
    if (filters.criticalities.length > 0) {
      result.criticalities = filters.criticalities
    }
    if (filters.riskScoreRange[0] > 0) {
      result.min_risk_score = filters.riskScoreRange[0]
    }
    if (filters.riskScoreRange[1] < 100) {
      result.max_risk_score = filters.riskScoreRange[1]
    }
    if (filters.hasFindings !== null) {
      result.has_findings = filters.hasFindings
    }

    return result
  }, [filters])

  // Fetch data using hook
  const {
    data: allGroups,
    isLoading,
    mutate: refreshData,
  } = useAssetGroups({ filters: apiFilters })

  // Apply quick filter on top of API filters
  const filteredData = useMemo(() => {
    let data = [...allGroups]

    // Quick filter (applied client-side for responsiveness)
    if (quickFilter === 'critical') {
      data = data.filter((g) => g.criticality === 'critical')
    } else if (quickFilter === 'high-risk') {
      data = data.filter((g) => g.riskScore >= 70)
    } else if (quickFilter === 'production') {
      data = data.filter((g) => g.environment === 'production')
    } else if (quickFilter === 'with-findings') {
      data = data.filter((g) => g.findingCount > 0)
    }

    return data
  }, [allGroups, quickFilter])

  const handleRefresh = () => {
    refreshData()
    toast.success('Asset groups refreshed')
  }

  const handleExport = (format: string) => {
    toast.success(`Exporting ${filteredData.length} groups as ${format}...`, {
      description: 'Your file will be downloaded shortly',
    })
  }

  // Get all assets for the create dialog (Backend doesn't have ungrouped filter yet)
  const { assets: allAssets } = useAssets({ pageSize: 100 })

  const handleCreate = async (input: CreateAssetGroupInput) => {
    await createAssetGroup.trigger(input)
    refreshData()
  }

  // Get update mutation for current edit group
  const updateAssetGroup = useUpdateAssetGroup(editGroup?.id || '')

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
      // Error toast is handled by hook
      console.error('Failed to update asset group:', error)
    } finally {
      setIsEditSubmitting(false)
    }
  }

  const handleDelete = () => {
    toast.success('Asset group deleted', {
      description: deleteGroup?.name,
    })
    setDeleteGroup(null)
  }

  const handleBulkDelete = async () => {
    await bulkOperations.bulkDelete(selectedIds)
    setSelectedIds([])
    refreshData()
  }

  const handleBulkAction = async (action: string, value?: string) => {
    if (action === 'delete') {
      await handleBulkDelete()
    } else if (action === 'change-criticality' && value) {
      await bulkOperations.bulkUpdate(selectedIds, { criticality: value })
      setSelectedIds([])
      refreshData()
    } else if (action === 'change-environment' && value) {
      await bulkOperations.bulkUpdate(selectedIds, { environment: value })
      setSelectedIds([])
      refreshData()
    }
    setBulkActionType(null)
  }

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success('Group ID copied')
  }

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/asset-groups/${id}`)
    toast.success('Link copied to clipboard')
  }

  const openEditDialog = (group: AssetGroup) => {
    setEditGroup(group)
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
    setQuickFilter('all')
    toast.success('Filters cleared')
  }

  const toggleEnvironmentFilter = (env: Environment) => {
    setFilters((prev) => ({
      ...prev,
      environments: prev.environments.includes(env)
        ? prev.environments.filter((e) => e !== env)
        : [...prev.environments, env],
    }))
  }

  const toggleCriticalityFilter = (crit: Criticality) => {
    setFilters((prev) => ({
      ...prev,
      criticalities: prev.criticalities.includes(crit)
        ? prev.criticalities.filter((c) => c !== crit)
        : [...prev.criticalities, crit],
    }))
  }

  // Handle stats card click for quick filtering
  const handleStatsCardClick = (filter: string) => {
    if (filter === 'critical') {
      setQuickFilter('critical')
    } else if (filter === 'all') {
      setQuickFilter('all')
    }
  }

  // React Compiler handles memoization automatically
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
        <Badge variant="outline" className={environmentColors[row.original.environment]}>
          {row.original.environment}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: 'criticality',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Criticality" />,
      cell: ({ row }) => (
        <Badge className={criticalityColors[row.original.criticality]}>
          {row.original.criticality}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
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
                <DropdownMenuItem onClick={() => openEditDialog(group)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedAssetIds([])
                    setAssetSearchTerm('')
                    setAddAssetsGroup(group)
                  }}
                >
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
          description={`${filteredData.length} of ${allGroups.length} groups`}
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
                <DropdownMenuItem onClick={() => handleExport('CSV')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('JSON')}>
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('PDF')}>
                  Export as PDF
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

                  {/* Environment Filter */}
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
                            onClick={() => toggleEnvironmentFilter(env)}
                          >
                            {env}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>

                  {/* Criticality Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Criticality</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['critical', 'high', 'medium', 'low'] as Criticality[]).map((crit) => (
                        <Badge
                          key={crit}
                          variant={filters.criticalities.includes(crit) ? 'default' : 'outline'}
                          className={`cursor-pointer ${
                            filters.criticalities.includes(crit)
                              ? criticalityColors[crit]
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleCriticalityFilter(crit)}
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

                  {/* Has Findings Filter */}
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
                    <span className="text-sm text-muted-foreground">
                      {filteredData.length} results
                    </span>
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

        {/* Active Filters Display */}
        {(activeFilterCount > 0 || quickFilter !== 'all') && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {quickFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {quickFilter === 'critical' && 'Critical Only'}
                {quickFilter === 'high-risk' && 'High Risk (70+)'}
                {quickFilter === 'production' && 'Production Only'}
                {quickFilter === 'with-findings' && 'With Findings'}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setQuickFilter('all')} />
              </Badge>
            )}
            {filters.environments.map((env) => (
              <Badge key={env} variant="secondary" className="gap-1">
                {env}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleEnvironmentFilter(env)}
                />
              </Badge>
            ))}
            {filters.criticalities.map((crit) => (
              <Badge key={crit} variant="secondary" className="gap-1">
                {crit}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleCriticalityFilter(crit)}
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

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <Card className="mt-4 border-primary">
            <CardContent className="flex items-center justify-between py-3">
              <span className="text-sm font-medium">{selectedIds.length} group(s) selected</span>
              <div className="flex flex-wrap items-center gap-2">
                {/* Change Criticality */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Tags className="mr-2 h-4 w-4" />
                      Change Criticality
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {(['critical', 'high', 'medium', 'low'] as Criticality[]).map((crit) => (
                      <DropdownMenuItem
                        key={crit}
                        onClick={() => handleBulkAction('change-criticality', crit)}
                      >
                        <Badge className={`mr-2 ${criticalityColors[crit]}`}>{crit}</Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Change Environment */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Change Environment
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

                <Button variant="outline" size="sm" onClick={handleBulkDelete}>
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

        {/* Stats Cards - Clickable */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            className={`cursor-pointer transition-colors hover:border-primary ${
              quickFilter === 'all' ? 'border-primary' : ''
            }`}
            onClick={() => handleStatsCardClick('all')}
          >
            <CardHeader className="pb-2">
              <CardDescription>Total Groups</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer transition-colors hover:border-red-500 ${
              quickFilter === 'critical' ? 'border-red-500' : ''
            }`}
            onClick={() => handleStatsCardClick('critical')}
          >
            <CardHeader className="pb-2">
              <CardDescription>Critical Groups</CardDescription>
              <CardTitle className="text-3xl text-red-500">
                {stats.byCriticality?.critical ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Assets</CardDescription>
              <CardTitle className="text-3xl">{stats.totalAssets}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Risk Score</CardDescription>
              <CardTitle className="text-3xl">{stats.averageRiskScore}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Quick Filter Tabs */}
        <Tabs value={quickFilter} onValueChange={setQuickFilter} className="mt-6">
          <TabsList>
            <TabsTrigger value="all">All Groups</TabsTrigger>
            <TabsTrigger value="critical">Critical</TabsTrigger>
            <TabsTrigger value="high-risk">High Risk</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="with-findings">With Findings</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Data Table */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>All Groups</CardTitle>
            <CardDescription>Manage and organize your assets into logical groups</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredData}
              searchPlaceholder="Search groups..."
              pageSize={10}
              emptyMessage="No asset groups found"
              emptyDescription={
                activeFilterCount > 0 || quickFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first asset group to organize your assets'
              }
              onRowClick={(group) => setViewGroup(group)}
            />
          </CardContent>
        </Card>
      </Main>

      {/* View Details Sheet */}
      <Sheet open={!!viewGroup} onOpenChange={() => setViewGroup(null)}>
        <SheetContent className="sm:max-w-xl p-0 overflow-y-auto">
          <VisuallyHidden>
            <SheetTitle>Asset Group Details</SheetTitle>
            <SheetDescription>View details of the selected asset group</SheetDescription>
          </VisuallyHidden>
          {viewGroup && (
            <>
              {/* Header with gradient background */}
              <div
                className={`relative p-6 ${
                  viewGroup.criticality === 'critical'
                    ? 'bg-gradient-to-br from-red-500/20 to-red-600/5'
                    : viewGroup.criticality === 'high'
                      ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/5'
                      : viewGroup.criticality === 'medium'
                        ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/5'
                        : 'bg-gradient-to-br from-blue-500/20 to-blue-600/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                        viewGroup.criticality === 'critical'
                          ? 'bg-red-500/20'
                          : viewGroup.criticality === 'high'
                            ? 'bg-orange-500/20'
                            : viewGroup.criticality === 'medium'
                              ? 'bg-yellow-500/20'
                              : 'bg-blue-500/20'
                      }`}
                    >
                      <FolderKanban
                        className={`h-7 w-7 ${
                          viewGroup.criticality === 'critical'
                            ? 'text-red-500'
                            : viewGroup.criticality === 'high'
                              ? 'text-orange-500'
                              : viewGroup.criticality === 'medium'
                                ? 'text-yellow-500'
                                : 'text-blue-500'
                        }`}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{viewGroup.name}</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {viewGroup.description || 'No description'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Info Badges */}
                <div className="flex items-center gap-2 mt-4">
                  <Badge variant="outline" className={environmentColors[viewGroup.environment]}>
                    {viewGroup.environment}
                  </Badge>
                  <Badge className={criticalityColors[viewGroup.criticality]}>
                    {viewGroup.criticality}
                  </Badge>
                </div>

                {/* Quick Actions - moved to avoid Sheet close button */}
                <div className="flex items-center gap-1 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => handleCopyId(viewGroup.id)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy ID
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => handleCopyLink(viewGroup.id)}
                  >
                    <Link className="h-3.5 w-3.5 mr-1" />
                    Copy Link
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <FolderKanban className="h-4 w-4" />
                      <span className="text-xs font-medium">Assets</span>
                    </div>
                    <p className="text-2xl font-bold">{viewGroup.assetCount}</p>
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Filter className="h-4 w-4" />
                      <span className="text-xs font-medium">Findings</span>
                    </div>
                    <p
                      className={`text-2xl font-bold ${viewGroup.findingCount > 0 ? 'text-orange-500' : ''}`}
                    >
                      {viewGroup.findingCount}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Filter className="h-4 w-4" />
                      <span className="text-xs font-medium">Risk</span>
                    </div>
                    <RiskScoreBadge score={viewGroup.riskScore} size="lg" />
                  </div>
                </div>

                {/* Risk Score Progress */}
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Risk Score Distribution</span>
                    <span
                      className={`text-sm font-bold ${
                        viewGroup.riskScore >= 80
                          ? 'text-red-500'
                          : viewGroup.riskScore >= 60
                            ? 'text-orange-500'
                            : viewGroup.riskScore >= 40
                              ? 'text-yellow-500'
                              : 'text-green-500'
                      }`}
                    >
                      {viewGroup.riskScore}/100
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        viewGroup.riskScore >= 80
                          ? 'bg-red-500'
                          : viewGroup.riskScore >= 60
                            ? 'bg-orange-500'
                            : viewGroup.riskScore >= 40
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                      }`}
                      style={{ width: `${viewGroup.riskScore}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                    <span>Critical</span>
                  </div>
                </div>

                {/* Assets Preview */}
                <QuickViewAssets groupId={viewGroup.id} onRefresh={refreshData} />

                {/* Metadata */}
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <h4 className="text-sm font-medium">Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Group ID</p>
                      <p className="font-mono text-xs mt-0.5">{viewGroup.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Created</p>
                      <p className="mt-0.5">{new Date(viewGroup.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Last Updated</p>
                      <p className="mt-0.5">{new Date(viewGroup.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Owner</p>
                      <p className="mt-0.5">{viewGroup.owner || 'Not assigned'}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Can permission={Permission.AssetGroupsWrite}>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setViewGroup(null)
                        openEditDialog(viewGroup)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Group
                    </Button>
                  </Can>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setViewGroup(null)
                      router.push(`/asset-groups/${viewGroup.id}`)
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Full Page
                  </Button>
                </div>

                {/* Danger Zone */}
                <Can permission={Permission.AssetGroupsDelete}>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-500">Danger Zone</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Permanently delete this group and unassign all assets
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          setViewGroup(null)
                          setDeleteGroup(viewGroup)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Can>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Group Dialog - Multi-step wizard */}
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

      {/* Add Assets Dialog */}
      {addAssetsGroup && (
        <AddAssetsDialog
          group={addAssetsGroup}
          allAssets={allAssets || []}
          selectedAssetIds={selectedAssetIds}
          setSelectedAssetIds={setSelectedAssetIds}
          searchTerm={assetSearchTerm}
          setSearchTerm={setAssetSearchTerm}
          onClose={() => {
            setAddAssetsGroup(null)
            setSelectedAssetIds([])
            setAssetSearchTerm('')
          }}
          onSuccess={() => {
            refreshData()
            setAddAssetsGroup(null)
            setSelectedAssetIds([])
            setAssetSearchTerm('')
          }}
        />
      )}
    </>
  )
}
