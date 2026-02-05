'use client'

import { useState, useMemo, useCallback } from 'react'
import { SortingState } from '@tanstack/react-table'
import {
  Plus,
  Wrench,
  AlertCircle,
  RefreshCw,
  Loader2,
  Search,
  LayoutGrid,
  TableIcon,
  Download,
  Trash2,
  Globe,
  Code2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Can, Permission } from '@/lib/permissions'

import { AddToolDialog } from './add-tool-dialog'
import { ToolCard } from './tool-card'
import { ToolTable } from './tool-table'
import { ToolStatsCards } from './tool-stats-cards'
import { ToolDetailSheet } from './tool-detail-sheet'
import { ToolCategoryIcon } from './tool-category-icon'
import { CATEGORY_OPTIONS } from '../schemas/tool-schema'

import {
  usePlatformTools,
  useCustomTools,
  useDeleteCustomTool,
  invalidatePlatformToolsCache,
  invalidateCustomToolsCache,
} from '@/lib/api/tool-hooks'
import { useAllToolCategories, getCategoryNameById } from '@/lib/api/tool-category-hooks'
import { customToolEndpoints } from '@/lib/api/endpoints'
import { post } from '@/lib/api/client'
import type { Tool, ToolListFilters } from '@/lib/api/tool-types'
import { getErrorMessage } from '@/lib/api/error-handler'

type ViewMode = 'grid' | 'table'
type MainTab = 'platform' | 'custom'
type CategoryFilter = 'all' | string // Category name (e.g., 'sast', 'sca')

interface ToolsSectionProps {
  onToolSelect?: (toolId: string | null) => void
  selectedToolId?: string | null
}

export function ToolsSection({ onToolSelect, selectedToolId }: ToolsSectionProps) {
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  // Selected tool for dialogs
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  // Tool being edited (null = create mode)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)

  // View and filter states
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [mainTab, setMainTab] = useState<MainTab>('platform')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [statsFilter, setStatsFilter] = useState<string | null>(null)
  const [filters, _setFilters] = useState<ToolListFilters>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Table states
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  // API data - Platform tools
  const {
    data: platformToolsData,
    error: platformError,
    isLoading: isPlatformLoading,
    mutate: mutatePlatform,
  } = usePlatformTools(filters)

  // API data - Custom tools
  const {
    data: customToolsData,
    error: customError,
    isLoading: isCustomLoading,
    mutate: mutateCustom,
  } = useCustomTools(filters)

  // API data - Tool categories (from database)
  const { data: categoriesData } = useAllToolCategories()

  // Categories list - use API data if available, fallback to static options
  const categoryOptions = useMemo(() => {
    if (categoriesData?.items && categoriesData.items.length > 0) {
      return categoriesData.items.map((cat) => ({
        value: cat.name,
        label: cat.display_name,
        icon: cat.icon,
        color: cat.color,
      }))
    }
    // Fallback to static options
    return CATEGORY_OPTIONS
  }, [categoriesData])

  // All tools combined for stats (platform + custom)
  const allTools = useMemo(() => {
    const platform = platformToolsData?.items || []
    const custom = customToolsData?.items || []
    return [...platform, ...custom]
  }, [platformToolsData, customToolsData])

  // Current data based on active tab (for list display)
  const tools = useMemo(() => {
    if (mainTab === 'platform') {
      return platformToolsData?.items || []
    }
    return customToolsData?.items || []
  }, [mainTab, platformToolsData, customToolsData])

  const isLoading = mainTab === 'platform' ? isPlatformLoading : isCustomLoading
  const error = mainTab === 'platform' ? platformError : customError

  // Delete mutation (only for custom tools)
  const { trigger: deleteCustomTool, isMutating: isDeleting } = useDeleteCustomTool(
    selectedTool?.id || ''
  )

  // Activation state tracking
  const [_isActivating, setIsActivating] = useState(false)

  // Filter tools based on category and stats filter
  const filteredTools = useMemo(() => {
    let result = [...tools]

    // Filter by category (look up category name from category_id)
    if (categoryFilter !== 'all') {
      result = result.filter((t) => {
        const categoryName = getCategoryNameById(categoriesData?.items, t.category_id)
        return categoryName === categoryFilter
      })
    }

    // Filter by stats card click
    if (statsFilter) {
      const [filterType, filterValue] = statsFilter.split(':')
      if (filterType === 'status') {
        result = result.filter((t) => (filterValue === 'active' ? t.is_active : !t.is_active))
      } else if (filterType === 'has_update') {
        result = result.filter((t) => t.has_update)
      } else if (filterType === 'type') {
        result = result.filter((t) => (filterValue === 'builtin' ? t.is_builtin : !t.is_builtin))
      }
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.display_name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      )
    }

    return result
  }, [tools, categoryFilter, statsFilter, searchQuery, categoriesData])

  // Handlers
  const handleRefresh = useCallback(async () => {
    if (mainTab === 'platform') {
      await invalidatePlatformToolsCache()
      await mutatePlatform()
    } else {
      await invalidateCustomToolsCache()
      await mutateCustom()
    }
    toast.success('Tools refreshed')
  }, [mainTab, mutatePlatform, mutateCustom])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
  }, [])

  const handleViewTool = useCallback((tool: Tool) => {
    setSelectedTool(tool)
    setDetailSheetOpen(true)
  }, [])

  const handleEditTool = useCallback((tool: Tool) => {
    setEditingTool(tool)
    setDetailSheetOpen(false)
    setAddDialogOpen(true)
  }, [])

  const handleDeleteClick = useCallback((tool: Tool) => {
    setSelectedTool(tool)
    setDetailSheetOpen(false)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedTool) return
    try {
      await deleteCustomTool()
      toast.success(`Tool "${selectedTool.display_name}" deleted`)
      await invalidateCustomToolsCache()
      setDeleteDialogOpen(false)
      setSelectedTool(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete tool'))
    }
  }, [selectedTool, deleteCustomTool])

  const handleActivateTool = useCallback(
    async (tool: Tool) => {
      setIsActivating(true)
      try {
        await post(customToolEndpoints.activate(tool.id), {})
        toast.success(`Tool "${tool.display_name}" activated`)
        // Update selectedTool state to reflect the change immediately
        if (selectedTool?.id === tool.id) {
          setSelectedTool({ ...tool, is_active: true })
        }
        await invalidateCustomToolsCache()
        await mutateCustom()
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to activate tool'))
      } finally {
        setIsActivating(false)
      }
    },
    [mutateCustom, selectedTool]
  )

  const handleDeactivateTool = useCallback(
    async (tool: Tool) => {
      setIsActivating(true)
      try {
        await post(customToolEndpoints.deactivate(tool.id), {})
        toast.success(`Tool "${tool.display_name}" deactivated`)
        // Update selectedTool state to reflect the change immediately
        if (selectedTool?.id === tool.id) {
          setSelectedTool({ ...tool, is_active: false })
        }
        await invalidateCustomToolsCache()
        await mutateCustom()
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to deactivate tool'))
      } finally {
        setIsActivating(false)
      }
    },
    [mutateCustom, selectedTool]
  )

  const handleExport = useCallback(() => {
    const csv = [
      ['Name', 'Display Name', 'Category', 'Install Method', 'Version', 'Active', 'Built-in'].join(
        ','
      ),
      ...tools.map((t) =>
        [
          t.name,
          t.display_name,
          getCategoryNameById(categoriesData?.items, t.category_id),
          t.install_method,
          t.current_version || '',
          t.is_active ? 'Yes' : 'No',
          t.is_builtin ? 'Yes' : 'No',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${mainTab}-tools.csv`
    link.click()
    toast.success('Tools exported')
  }, [tools, mainTab, categoriesData])

  // Handle tab change - reset filters
  const handleMainTabChange = useCallback((tab: string) => {
    setMainTab(tab as MainTab)
    setCategoryFilter('all')
    setStatsFilter(null)
    setSearchQuery('')
    setRowSelection({})
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load tools</span>
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

  // Check if we're in custom tools mode for conditional rendering
  const isCustomToolsMode = mainTab === 'custom'

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards - Always show aggregate data for all tools (platform + custom) */}
        {!isPlatformLoading && !isCustomLoading && (
          <ToolStatsCards
            tools={allTools}
            activeFilter={statsFilter}
            onFilterChange={setStatsFilter}
          />
        )}

        {/* Main Content Card */}
        <Card>
          <CardHeader className="pb-4">
            {/* Row 1: Title + Main Tabs + Actions */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Title and description - fixed width to prevent layout shift */}
              <div className="flex min-w-[280px] items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle>Tool Registry</CardTitle>
                  <CardDescription className="truncate">
                    Manage security tools and scanners
                  </CardDescription>
                </div>
              </div>

              {/* Center: Main Tabs (Platform / Custom) */}
              <Tabs value={mainTab} onValueChange={handleMainTabChange} className="w-auto">
                <TabsList>
                  <TabsTrigger value="platform" className="gap-1.5">
                    <Globe className="h-4 w-4" />
                    Platform Tools
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="gap-1.5">
                    <Code2 className="h-4 w-4" />
                    Custom Tools
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
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                {/* Add Tool button - always visible but disabled for platform tools */}
                <Can permission={Permission.ToolsWrite}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          onClick={() => setAddDialogOpen(true)}
                          disabled={!isCustomToolsMode}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Tool
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!isCustomToolsMode && (
                      <TooltipContent>
                        <p>Switch to Custom Tools tab to add your own tools</p>
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
              {/* Category Filter - Scrollable container for many categories */}
              <div className="flex-1 overflow-hidden">
                <Tabs
                  value={categoryFilter}
                  onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
                  className="w-full"
                >
                  <TabsList className="inline-flex w-max gap-1 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted">
                    <TabsTrigger value="all">All</TabsTrigger>
                    {categoryOptions.map((cat) => (
                      <TabsTrigger
                        key={cat.value}
                        value={cat.value}
                        className="gap-1 whitespace-nowrap"
                      >
                        <ToolCategoryIcon category={cat.value} className="h-3.5 w-3.5" />
                        {cat.label}
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
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </form>
            </div>

            {/* Bulk Actions (only for custom tools) */}
            {isCustomToolsMode && Object.keys(rowSelection).length > 0 && (
              <div className="mb-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {Object.keys(rowSelection).length} selected
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      className="text-red-500"
                      onClick={() => toast.info('Bulk delete coming soon')}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

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
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTools.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      categories={categoriesData?.items}
                      selected={selectedToolId === tool.id}
                      onSelect={() => onToolSelect?.(selectedToolId === tool.id ? null : tool.id)}
                      onView={handleViewTool}
                      onEdit={isCustomToolsMode ? handleEditTool : undefined}
                      onDelete={isCustomToolsMode ? handleDeleteClick : undefined}
                      onActivate={isCustomToolsMode ? handleActivateTool : undefined}
                      onDeactivate={isCustomToolsMode ? handleDeactivateTool : undefined}
                      // Platform tools are read-only - no enable/disable
                      readOnly={!isCustomToolsMode}
                    />
                  ))}
                </div>
              ) : (
                <ToolTable
                  tools={filteredTools}
                  categories={categoriesData?.items}
                  sorting={sorting}
                  onSortingChange={setSorting}
                  globalFilter={searchQuery}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                  onViewTool={handleViewTool}
                  onEditTool={isCustomToolsMode ? handleEditTool : undefined}
                  onDeleteTool={isCustomToolsMode ? handleDeleteClick : undefined}
                  onActivateTool={isCustomToolsMode ? handleActivateTool : undefined}
                  onDeactivateTool={isCustomToolsMode ? handleDeactivateTool : undefined}
                  // Platform tools are read-only - no enable/disable
                  readOnly={!isCustomToolsMode}
                />
              )
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Wrench className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-1 font-medium">No Tools Found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery || categoryFilter !== 'all' || statsFilter
                    ? 'No tools match your search criteria. Try adjusting your filters.'
                    : mainTab === 'platform'
                      ? 'No platform tools available yet.'
                      : 'Add a custom tool to start scanning and collecting data.'}
                </p>
                {!searchQuery && categoryFilter === 'all' && !statsFilter && isCustomToolsMode && (
                  <Can permission={Permission.ToolsWrite}>
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Custom Tool
                    </Button>
                  </Can>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs - only for custom tools */}
      {isCustomToolsMode && (
        <AddToolDialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            setAddDialogOpen(open)
            // Clear editing tool when dialog closes
            if (!open) setEditingTool(null)
          }}
          onSuccess={handleRefresh}
          tool={editingTool}
        />
      )}

      {selectedTool && (
        <ToolDetailSheet
          tool={selectedTool}
          categories={categoriesData?.items}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          onEdit={isCustomToolsMode ? handleEditTool : undefined}
          onDelete={isCustomToolsMode ? handleDeleteClick : undefined}
          onActivate={isCustomToolsMode ? handleActivateTool : undefined}
          onDeactivate={isCustomToolsMode ? handleDeactivateTool : undefined}
          // Platform tools are read-only
          readOnly={!isCustomToolsMode}
        />
      )}

      {/* Delete Confirmation (only for custom tools) */}
      {isCustomToolsMode && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tool</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{selectedTool?.display_name}</strong>? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
