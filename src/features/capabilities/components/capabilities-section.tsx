'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Zap,
  AlertCircle,
  RefreshCw,
  Loader2,
  Search,
  LayoutGrid,
  TableIcon,
  Globe,
  Sparkles,
  AlertTriangle,
  Wrench,
  Bot,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { Can, Permission } from '@/lib/permissions'

import { CapabilityCard } from './capability-card'
import { CapabilityTable } from './capability-table'
import { CreateCapabilityDialog } from './create-capability-dialog'
import { EditCapabilityDialog } from './edit-capability-dialog'
import { CapabilityDetailPanel } from './capability-detail-panel'

import {
  useCapabilities,
  useDeleteCapability,
  useCapabilityUsageStats,
  useCapabilitiesUsageStatsBatch,
  invalidateCapabilitiesCache,
} from '@/lib/api/capability-hooks'
import type { Capability, CapabilityListFilters } from '@/lib/api/capability-types'

type ViewMode = 'grid' | 'table'
type MainTab = 'platform' | 'custom'
type CategoryFilter = 'all' | string

export function CapabilitiesSection() {
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [forceDelete, setForceDelete] = useState(false)

  // Selected capability for dialogs
  const [selectedCapability, setSelectedCapability] = useState<Capability | null>(null)

  // View and filter states
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [mainTab, setMainTab] = useState<MainTab>('platform')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, _setFilters] = useState<CapabilityListFilters>({})

  // API data
  const { data: capabilitiesData, error, isLoading, mutate } = useCapabilities(filters)

  // Get all capability IDs for batch usage stats
  const capabilityIds = useMemo(
    () => capabilitiesData?.items?.map((c) => c.id) || [],
    [capabilitiesData]
  )

  // Fetch usage stats for all capabilities
  const { data: usageStatsData } = useCapabilitiesUsageStatsBatch(capabilityIds)

  // Fetch usage stats for the selected capability (for delete dialog)
  const { data: selectedUsageStats, isLoading: isLoadingSelectedStats } = useCapabilityUsageStats(
    deleteDialogOpen ? selectedCapability?.id : null
  )

  // Delete mutation (only for custom capabilities)
  const { trigger: deleteCapability, isMutating: isDeleting } = useDeleteCapability(
    selectedCapability?.id || ''
  )

  // Filter capabilities based on tab and category
  const filteredCapabilities = useMemo(() => {
    let result = capabilitiesData?.items || []

    // Filter by main tab (platform vs custom)
    result = result.filter((c) => (mainTab === 'platform' ? c.is_builtin : !c.is_builtin))

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter((c) => c.category === categoryFilter)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.display_name.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query)
      )
    }

    return result
  }, [capabilitiesData, mainTab, categoryFilter, searchQuery])

  // Get unique categories from capabilities
  const categories = useMemo(() => {
    const cats = new Set<string>()
    capabilitiesData?.items?.forEach((c) => {
      if (c.category) cats.add(c.category)
    })
    return Array.from(cats).sort()
  }, [capabilitiesData])

  // Handlers
  const handleRefresh = useCallback(async () => {
    await invalidateCapabilitiesCache()
    await mutate()
    toast.success('Capabilities refreshed')
  }, [mutate])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
  }, [])

  const handleEditCapability = useCallback((capability: Capability) => {
    setSelectedCapability(capability)
    setEditDialogOpen(true)
  }, [])

  const handleDeleteClick = useCallback((capability: Capability) => {
    setSelectedCapability(capability)
    setForceDelete(false)
    setDeleteDialogOpen(true)
  }, [])

  const handleViewDetails = useCallback((capability: Capability) => {
    setSelectedCapability(capability)
    setDetailPanelOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedCapability) return

    // Check if capability is in use and force delete is not enabled
    const hasUsage =
      selectedUsageStats &&
      (selectedUsageStats.tool_count > 0 || selectedUsageStats.agent_count > 0)

    if (hasUsage && !forceDelete) {
      toast.error('Please confirm force delete to remove capability in use')
      return
    }

    try {
      await deleteCapability({ force: forceDelete })
      toast.success(`Capability "${selectedCapability.display_name}" deleted`)
      await invalidateCapabilitiesCache()
      setDeleteDialogOpen(false)
      setSelectedCapability(null)
      setForceDelete(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete capability'))
    }
  }, [selectedCapability, deleteCapability, forceDelete, selectedUsageStats])

  // Handle tab change - reset filters
  const handleMainTabChange = useCallback((tab: string) => {
    setMainTab(tab as MainTab)
    setCategoryFilter('all')
    setSearchQuery('')
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load capabilities</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  // Check if we're in custom capabilities mode for conditional rendering
  const isCustomMode = mainTab === 'custom'

  // Stats
  const platformCount = capabilitiesData?.items?.filter((c) => c.is_builtin).length || 0
  const customCount = capabilitiesData?.items?.filter((c) => !c.is_builtin).length || 0

  // Check if selected capability has usage
  const selectedHasUsage =
    selectedUsageStats && (selectedUsageStats.tool_count > 0 || selectedUsageStats.agent_count > 0)

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards - 2 per row on mobile, 4 on lg+ */}
        {!isLoading && (
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                      Total
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {capabilitiesData?.items?.length || 0}
                    </p>
                  </div>
                  <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                      Platform
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">{platformCount}</p>
                  </div>
                  <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                      Custom
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">{customCount}</p>
                  </div>
                  <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                      Categories
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">{categories.length}</p>
                  </div>
                  <LayoutGrid className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50 shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Card */}
        <Card>
          <CardHeader className="pb-4">
            {/* Row 1: Title + Main Tabs + Actions */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Title and description */}
              <div className="flex min-w-[280px] items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle>Tool Capabilities</CardTitle>
                  <CardDescription className="truncate">Manage what tools can do</CardDescription>
                </div>
              </div>

              {/* Center: Main Tabs (Platform / Custom) */}
              <Tabs value={mainTab} onValueChange={handleMainTabChange} className="w-auto">
                <TabsList>
                  <TabsTrigger value="platform" className="gap-1.5">
                    <Globe className="h-4 w-4" />
                    Platform
                    <Badge variant="secondary" className="ml-1">
                      {platformCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    Custom
                    <Badge variant="secondary" className="ml-1">
                      {customCount}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                {/* Add Capability button - only enabled for custom tab */}
                <Can permission={Permission.ToolsWrite}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button onClick={() => setCreateDialogOpen(true)} disabled={!isCustomMode}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Capability
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!isCustomMode && (
                      <TooltipContent>
                        <p>Switch to Custom tab to add your own capabilities</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </Can>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Category Filter + View Toggle */}
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Category Filter */}
              <div className="flex-1 overflow-hidden">
                <Tabs
                  value={categoryFilter}
                  onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
                  className="w-full"
                >
                  <TabsList className="inline-flex w-max gap-1 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted">
                    <TabsTrigger value="all">All</TabsTrigger>
                    {categories.map((cat) => (
                      <TabsTrigger key={cat} value={cat} className="capitalize">
                        {cat}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {/* View Toggle */}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <form onSubmit={handleSearch}>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search capabilities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </form>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredCapabilities.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredCapabilities.map((capability) => (
                    <CapabilityCard
                      key={capability.id}
                      capability={capability}
                      usageStats={usageStatsData?.[capability.id]}
                      onEdit={isCustomMode ? handleEditCapability : undefined}
                      onDelete={isCustomMode ? handleDeleteClick : undefined}
                      onViewDetails={handleViewDetails}
                      readOnly={!isCustomMode}
                    />
                  ))}
                </div>
              ) : (
                <CapabilityTable
                  capabilities={filteredCapabilities}
                  usageStats={usageStatsData}
                  onEdit={isCustomMode ? handleEditCapability : undefined}
                  onDelete={isCustomMode ? handleDeleteClick : undefined}
                  onViewDetails={handleViewDetails}
                  readOnly={!isCustomMode}
                />
              )
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Zap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-1 font-medium">No Capabilities Found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'No capabilities match your search criteria. Try adjusting your filters.'
                    : mainTab === 'platform'
                      ? 'No platform capabilities available yet.'
                      : 'Add a custom capability to extend your tool registry.'}
                </p>
                {!searchQuery && categoryFilter === 'all' && isCustomMode && (
                  <Can permission={Permission.ToolsWrite}>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Capability
                    </Button>
                  </Can>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateCapabilityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleRefresh}
      />

      {selectedCapability && (
        <EditCapabilityDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          capability={selectedCapability}
          onSuccess={handleRefresh}
        />
      )}

      {/* Capability Detail Panel */}
      <CapabilityDetailPanel
        capability={selectedCapability}
        initialStats={selectedCapability ? usageStatsData?.[selectedCapability.id] : undefined}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
      />

      {/* Enhanced Delete Confirmation */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setForceDelete(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {selectedHasUsage && <AlertTriangle className="h-5 w-5 text-amber-500" />}
              Delete Capability
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to delete{' '}
                  <strong>{selectedCapability?.display_name}</strong>? This action cannot be undone.
                </p>

                {/* Usage Stats Warning */}
                {isLoadingSelectedStats ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking usage...
                  </div>
                ) : selectedHasUsage ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                    <div className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      This capability is in use
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {selectedUsageStats.tool_count > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Wrench className="h-4 w-4" />
                          <span>
                            {selectedUsageStats.tool_count} tool
                            {selectedUsageStats.tool_count > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      {selectedUsageStats.agent_count > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Bot className="h-4 w-4" />
                          <span>
                            {selectedUsageStats.agent_count} agent
                            {selectedUsageStats.agent_count > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Show affected items */}
                    {(selectedUsageStats.tool_names?.length ||
                      selectedUsageStats.agent_names?.length) && (
                      <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-amber-500/20">
                        {selectedUsageStats.tool_names &&
                          selectedUsageStats.tool_names.length > 0 && (
                            <p>
                              <strong>Tools:</strong>{' '}
                              {selectedUsageStats.tool_names.slice(0, 3).join(', ')}
                              {selectedUsageStats.tool_names.length > 3 &&
                                ` (+${selectedUsageStats.tool_names.length - 3} more)`}
                            </p>
                          )}
                        {selectedUsageStats.agent_names &&
                          selectedUsageStats.agent_names.length > 0 && (
                            <p>
                              <strong>Agents:</strong>{' '}
                              {selectedUsageStats.agent_names.slice(0, 3).join(', ')}
                              {selectedUsageStats.agent_names.length > 3 &&
                                ` (+${selectedUsageStats.agent_names.length - 3} more)`}
                            </p>
                          )}
                      </div>
                    )}
                    {/* Force delete checkbox */}
                    <div className="flex items-center space-x-2 pt-2 border-t border-amber-500/20">
                      <Checkbox
                        id="force-delete"
                        checked={forceDelete}
                        onCheckedChange={(checked) => setForceDelete(checked === true)}
                      />
                      <label
                        htmlFor="force-delete"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        I understand and want to force delete
                      </label>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This capability is not currently used by any tools or agents.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting || isLoadingSelectedStats || (selectedHasUsage && !forceDelete)}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedHasUsage ? 'Force Delete' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
