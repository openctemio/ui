'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Wrench, Search, LayoutGrid, TableIcon, Download } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { RefreshButton, TableSkeleton } from '@/components/list-page-parts'
import { useUrlFilter } from '@/hooks/use-url-param'
import { Can, Permission } from '@/lib/permissions'

import { AddToolDialog } from './add-tool-dialog'
import { ToolCard } from './tool-card'
import { ToolTable } from './tool-table'
import { ToolDetailSheet } from './tool-detail-sheet'
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
import {
  EmptyState,
  ErrorState,
  MetricStrip,
  PageHeader,
  type MetricStripItem,
} from '@/features/shared'

type ViewMode = 'grid' | 'table'
type MainTab = 'platform' | 'custom'

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
  // Tab, view, filters and search live in the URL so a filtered view can be
  // shared and survives a reload.
  const [viewParam, setViewMode] = useUrlFilter('view', 'table')
  const [tabParam, setMainTab] = useUrlFilter('tab', 'platform')
  const [categoryFilter, setCategoryFilter] = useUrlFilter('category', 'all')
  const [statsParam, setStatsParam] = useUrlFilter('stat', '')
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const [filters] = useState<ToolListFilters>({})
  const viewMode: ViewMode = viewParam === 'grid' ? 'grid' : 'table'
  const mainTab: MainTab = tabParam === 'custom' ? 'custom' : 'platform'
  const statsFilter = statsParam || null

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
    URL.revokeObjectURL(url)
    toast.success('Tools exported')
  }, [tools, mainTab, categoriesData])

  // Handle tab change - reset filters
  const handleMainTabChange = useCallback(
    (tab: string) => {
      setMainTab(tab)
      setCategoryFilter('all')
      setStatsParam('')
      setSearchQuery('')
    },
    [setMainTab, setCategoryFilter, setStatsParam, setSearchQuery]
  )

  // Check if we're in custom tools mode for conditional rendering
  const isCustomToolsMode = mainTab === 'custom'

  // Headline numbers describe the active tab's tools, so a metric's count is
  // exactly what its filter shows.
  const toggleStat = (filter: string) => setStatsParam(statsFilter === filter ? '' : filter)
  const metrics: MetricStripItem[] = [
    { key: 'total', label: 'Tools', value: tools.length },
    {
      key: 'active',
      label: 'Active',
      value: tools.filter((t) => t.is_active).length,
      onClick: () => toggleStat('status:active'),
      active: statsFilter === 'status:active',
    },
    {
      key: 'inactive',
      label: 'Inactive',
      value: tools.filter((t) => !t.is_active).length,
      onClick: () => toggleStat('status:inactive'),
      active: statsFilter === 'status:inactive',
    },
    {
      key: 'updates',
      label: 'Updates available',
      value: tools.filter((t) => t.has_update).length,
      onClick: () => toggleStat('has_update:true'),
      active: statsFilter === 'has_update:true',
    },
  ]

  const platformCount = platformToolsData?.items?.length
  const customCount = customToolsData?.items?.length

  const toolbarStart = (
    <>
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tools…"
          aria-label="Search tools"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 ps-9"
        />
      </div>
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="h-9 w-[160px]" aria-label="Category">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categoryOptions.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  const toolbarEnd = (
    <>
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
      <RefreshButton onClick={handleRefresh} loading={isLoading} />
    </>
  )

  const hasFilter = !!searchQuery || categoryFilter !== 'all' || !!statsFilter
  const emptyState = (
    <EmptyState
      icon={Wrench}
      title={hasFilter ? 'No matching tools' : 'No tools'}
      description={
        hasFilter
          ? 'No tools match your search or filters.'
          : mainTab === 'platform'
            ? 'No platform tools available yet.'
            : 'Add a custom tool to start scanning and collecting data.'
      }
      card={false}
      action={
        !hasFilter && isCustomToolsMode ? (
          <Can permission={Permission.ToolsWrite}>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add tool
            </Button>
          </Can>
        ) : undefined
      }
    />
  )

  let body: React.ReactNode
  if (error) {
    body = <ErrorState title="tools" error={error} onRetry={handleRefresh} />
  } else if (isLoading) {
    body = <TableSkeleton rows={6} />
  } else if (filteredTools.length === 0 && !hasFilter) {
    body = emptyState
  } else if (viewMode === 'table') {
    body = (
      <ToolTable
        tools={filteredTools}
        categories={categoriesData?.items}
        onViewTool={handleViewTool}
        onEditTool={isCustomToolsMode ? handleEditTool : undefined}
        onDeleteTool={isCustomToolsMode ? handleDeleteClick : undefined}
        onActivateTool={isCustomToolsMode ? handleActivateTool : undefined}
        onDeactivateTool={isCustomToolsMode ? handleDeactivateTool : undefined}
        // Platform tools are read-only - no enable/disable
        readOnly={!isCustomToolsMode}
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
        {filteredTools.length > 0 ? (
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
          <div className="rounded-md border">{emptyState}</div>
        )}
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Tools"
        description="The security tools and scanners agents can run. Platform tools are built in; add custom ones for your own scanners."
      >
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
        {/* Add is for custom tools; on the Platform tab it explains why it is off. */}
        <Can permission={Permission.ToolsWrite}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  onClick={() => setAddDialogOpen(true)}
                  disabled={!isCustomToolsMode}
                >
                  <Plus className="h-4 w-4" />
                  Add tool
                </Button>
              </span>
            </TooltipTrigger>
            {!isCustomToolsMode && (
              <TooltipContent>Switch to the Custom tab to add your own tools</TooltipContent>
            )}
          </Tooltip>
        </Can>
      </PageHeader>

      <Tabs value={mainTab} onValueChange={handleMainTabChange} className="mt-4">
        <TabsList>
          <TabsTrigger value="platform">
            Platform
            {platformCount != null && (
              <Badge variant="secondary" className="ms-1.5 tabular-nums">
                {platformCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="custom">
            Custom
            {customCount != null && (
              <Badge variant="secondary" className="ms-1.5 tabular-nums">
                {customCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <MetricStrip className="mt-5" loading={isLoading} items={metrics} />

      <div className="mt-5">{body}</div>

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
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete tool"
          desc={
            <>
              Are you sure you want to delete <strong>{selectedTool?.display_name}</strong>? This
              action cannot be undone.
            </>
          }
          confirmText="Delete"
          destructive
          isLoading={isDeleting}
          handleConfirm={handleDeleteConfirm}
        />
      )}
    </>
  )
}
