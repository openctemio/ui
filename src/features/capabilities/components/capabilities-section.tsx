'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Zap,
  Loader2,
  Search,
  LayoutGrid,
  TableIcon,
  AlertTriangle,
  Wrench,
  Bot,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsCount } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { RefreshButton, TableSkeleton } from '@/components/list-page-parts'
import { useUrlFilter } from '@/hooks/use-url-param'
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
import { EmptyState, ErrorState, PageHeader } from '@/features/shared'

type ViewMode = 'grid' | 'table'
type MainTab = 'platform' | 'custom'

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
  // Tab, view, category and search live in the URL so a filtered view can be
  // shared and survives a reload.
  const [viewParam, setViewMode] = useUrlFilter('view', 'table')
  const [tabParam, setMainTab] = useUrlFilter('tab', 'platform')
  const [categoryFilter, setCategoryFilter] = useUrlFilter('category', 'all')
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const viewMode: ViewMode = viewParam === 'grid' ? 'grid' : 'table'
  const mainTab: MainTab = tabParam === 'custom' ? 'custom' : 'platform'
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
      (selectedUsageStats.tool_count > 0 || selectedUsageStats.sensor_count > 0)

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
  const handleMainTabChange = useCallback(
    (tab: string) => {
      setMainTab(tab)
      setCategoryFilter('all')
      setSearchQuery('')
    },
    [setMainTab, setCategoryFilter, setSearchQuery]
  )

  // Check if we're in custom capabilities mode for conditional rendering
  const isCustomMode = mainTab === 'custom'

  // Stats
  const platformCount = capabilitiesData?.items?.filter((c) => c.is_builtin).length || 0
  const customCount = capabilitiesData?.items?.filter((c) => !c.is_builtin).length || 0

  // Check if selected capability has usage
  const selectedHasUsage =
    selectedUsageStats && (selectedUsageStats.tool_count > 0 || selectedUsageStats.sensor_count > 0)

  const toolbarStart = (
    <>
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search capabilities…"
          aria-label="Search capabilities"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 ps-9"
        />
      </div>
      {categories.length > 0 && (
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-[160px]" aria-label="Category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat} className="capitalize">
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  )

  const viewToggle = (
    <div className="flex items-center rounded-md border p-0.5" role="group" aria-label="View">
      <Button
        variant={viewMode === 'table' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => setViewMode('table')}
        aria-label="Table view"
        aria-pressed={viewMode === 'table'}
      >
        <TableIcon className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => setViewMode('grid')}
        aria-label="Card view"
        aria-pressed={viewMode === 'grid'}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  )

  const toolbarEnd = (
    <>
      {viewToggle}
      <RefreshButton onClick={handleRefresh} loading={isLoading} />
    </>
  )

  const hasFilter = !!searchQuery || categoryFilter !== 'all'
  const emptyState = (
    <EmptyState
      icon={Zap}
      title={hasFilter ? 'No matching capabilities' : 'No capabilities'}
      description={
        hasFilter
          ? 'No capabilities match your search or category.'
          : mainTab === 'platform'
            ? 'No platform capabilities available yet.'
            : 'Add a custom capability to extend your tool registry.'
      }
      card={false}
      action={
        !hasFilter && isCustomMode ? (
          <Can permission={Permission.ToolsWrite}>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add capability
            </Button>
          </Can>
        ) : undefined
      }
    />
  )

  let body: React.ReactNode
  if (error) {
    body = <ErrorState title="capabilities" error={error} onRetry={handleRefresh} />
  } else if (isLoading) {
    body = <TableSkeleton rows={6} />
  } else if (viewMode === 'table') {
    body =
      filteredCapabilities.length === 0 && !hasFilter ? (
        emptyState
      ) : (
        <CapabilityTable
          capabilities={filteredCapabilities}
          usageStats={usageStatsData}
          onEdit={isCustomMode ? handleEditCapability : undefined}
          onDelete={isCustomMode ? handleDeleteClick : undefined}
          onViewDetails={handleViewDetails}
          readOnly={!isCustomMode}
          toolbarStart={toolbarStart}
          toolbarEnd={toolbarEnd}
        />
      )
  } else {
    // Card view: the same toolbar row the table draws, then the grid.
    body = (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">{toolbarStart}</div>
          <div className="ms-auto flex shrink-0 items-center gap-2">{toolbarEnd}</div>
        </div>
        {filteredCapabilities.length > 0 ? (
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
          <div className="rounded-md border">{emptyState}</div>
        )}
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Capabilities"
        description="What tools can do. Platform capabilities are built in; add custom ones to extend the tool registry."
      >
        <Can permission={Permission.ToolsWrite}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  onClick={() => setCreateDialogOpen(true)}
                  disabled={!isCustomMode}
                >
                  <Plus className="h-4 w-4" />
                  Add capability
                </Button>
              </span>
            </TooltipTrigger>
            {!isCustomMode && (
              <TooltipContent>Switch to the Custom tab to add your own capabilities</TooltipContent>
            )}
          </Tooltip>
        </Can>
      </PageHeader>

      <Tabs value={mainTab} onValueChange={handleMainTabChange} className="mt-4">
        <TabsList>
          <TabsTrigger value="platform">
            Platform
            <TabsCount value={platformCount} />
          </TabsTrigger>
          <TabsTrigger value="custom">
            Custom
            <TabsCount value={customCount} />
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-5">{body}</div>

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
              {selectedHasUsage && <AlertTriangle className="h-5 w-5 text-destructive" />}
              Delete capability
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
                      {selectedUsageStats.sensor_count > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Bot className="h-4 w-4" />
                          <span>
                            {selectedUsageStats.sensor_count} sensor
                            {selectedUsageStats.sensor_count > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Show affected items */}
                    {(selectedUsageStats.tool_names?.length ||
                      selectedUsageStats.sensor_names?.length) && (
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
                        {selectedUsageStats.sensor_names &&
                          selectedUsageStats.sensor_names.length > 0 && (
                            <p>
                              <strong>Sensors:</strong>{' '}
                              {selectedUsageStats.sensor_names.slice(0, 3).join(', ')}
                              {selectedUsageStats.sensor_names.length > 3 &&
                                ` (+${selectedUsageStats.sensor_names.length - 3} more)`}
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
                    This capability is not currently used by any tools or sensors.
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
              {isDeleting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {selectedHasUsage ? 'Force delete' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
