'use client'

import * as React from 'react'
import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  StatusBadge,
  RunStatusBadge,
  MetricStrip,
  type MetricStripItem,
  DataTable,
  DataTableColumnHeader,
  BulkActionBar,
  FacetPanel,
  FacetSection,
  FacetOption,
  EmptyState,
  SheetStatCard,
} from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  ListFilter,
  PanelLeftClose,
  MoreHorizontal,
  Eye,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  XCircle,
  Radar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  Shield,
  Calendar,
  Layers,
  Copy,
  Pencil,
  Tag,
  Settings,
  Zap,
  Loader2,
  Download,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { SEVERITY_BADGE_SOFT, SEVERITY_DOT_COLORS } from '@/lib/severity-colors'
import { useUrlFilter } from '@/hooks/use-url-param'
import { copyToClipboard } from '@/lib/clipboard'
import { Can, Permission } from '@/lib/permissions'
import { cn, exportToCSV, exportToJSON } from '@/lib/utils'
import {
  useScanConfigs,
  useScanConfigStats,
  useScanSessions,
  useScanSessionStats,
  useBulkActivateScanConfigs,
  useBulkPauseScanConfigs,
  useBulkDisableScanConfigs,
  useBulkDeleteScanConfigs,
  invalidateScanConfigsCache,
} from '@/lib/api/scan-hooks'
import type { ScanSession, ScanRunStatus } from '@/lib/api/scan-types'
import { post, del } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { scanEndpoints } from '@/lib/api/endpoints'
// Note: useAssetGroups can be imported when CreateConfigDialog is implemented
// import { useAssetGroups } from "@/lib/api/security-hooks";
import {
  SCAN_TYPE_LABELS,
  SCHEDULE_TYPE_LABELS,
  SCAN_CONFIG_STATUS_LABELS,
  SCHEDULE_TYPES,
} from '@/lib/api/scan-types'
import type {
  ScanConfig,
  ScanConfigStatus,
  ScanType as ApiScanType,
  ScheduleType,
} from '@/lib/api/scan-types'
import {
  NewScanDialog,
  CloneScanDialog,
  EditScanDialog,
  QuickScanDialog,
} from '@/features/scans/components'
import { SCAN_RUN_STATUS_LABELS } from '@/lib/api/scan-types'

// ============================================
// CONFIGURATIONS TAB TYPES
// ============================================

type ConfigStatusFilter = ScanConfigStatus | 'all'
type ConfigTypeFilter = ApiScanType | 'all'

const configStatusFilters: { value: ConfigStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'disabled', label: 'Disabled' },
]

const configTypeFilters: { value: ConfigTypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'single', label: 'Single scanner' },
]

type ConfigScheduleFilter = ScheduleType | 'all'

const configScheduleFilters: { value: ConfigScheduleFilter; label: string }[] = [
  { value: 'all', label: 'All schedules' },
  ...SCHEDULE_TYPES.map((type) => ({
    value: type as ScheduleType,
    label: SCHEDULE_TYPE_LABELS[type],
  })),
]

// ============================================
// RUNS TAB TYPES
// ============================================

type RunStatusFilter = 'all' | ScanRunStatus

const runStatusFilters: { value: RunStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'queued', label: 'Queued' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'timeout', label: 'Timed out' },
]

// Map API status to UI-friendly status for StatusBadge
// ============================================
// UTILS
// ============================================

function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** A run's duration in the largest two units (e.g. "3m 12s"). */
function formatDuration(ms?: number): string {
  if (!ms) return '-'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Format next run time as relative time (e.g., "in 2 days", "in 3 hours")
 */
function formatNextRun(nextRunAt?: string): string | null {
  if (!nextRunAt) return null

  const now = new Date()
  const nextRun = new Date(nextRunAt)
  const diffMs = nextRun.getTime() - now.getTime()

  if (diffMs < 0) return 'Overdue'

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`
  if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`
  if (diffMinutes > 0) return `in ${diffMinutes} min${diffMinutes > 1 ? 's' : ''}`
  return 'Soon'
}

// ============================================
// SHARED LIST PIECES
// ============================================

const CONFIG_FILTERS_OPEN_KEY = 'openctem:scan-config-filters-open'

/**
 * Whether the filter panel is open. Closed by default so the table gets the
 * width; the viewer's choice is remembered per browser (safe to lose).
 */
function usePersistentFiltersOpen(key: string): [boolean, (open: boolean) => void] {
  const [open, setOpenState] = useState(false)
  useEffect(() => {
    try {
      if (window.localStorage.getItem(key) === '1') setOpenState(true)
    } catch {
      // storage unavailable — stay closed
    }
  }, [key])
  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next)
      try {
        window.localStorage.setItem(key, next ? '1' : '0')
      } catch {
        // best-effort
      }
    },
    [key]
  )
  return [open, setOpen]
}

function SearchBox({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-9 ps-9"
      />
    </div>
  )
}

/** Shaped like the DataTable it stands in for: toolbar, then rows. */
function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="ms-auto h-9 w-24" />
      </div>
      <div className="space-y-2 rounded-md border p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ScansPage() {
  // The active tab lives in the URL (`?tab=runs`) so either view can be linked to.
  const [tabParam, setTabParam] = useUrlFilter('tab', 'configurations')
  const mainTab: 'configurations' | 'runs' = tabParam === 'runs' ? 'runs' : 'configurations'
  const [dialogOpen, setDialogOpen] = useState(false)
  const [quickScanOpen, setQuickScanOpen] = useState(false)

  return (
    <>
      <NewScanDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <QuickScanDialog open={quickScanOpen} onOpenChange={setQuickScanOpen} />
      <Main>
        <PageHeader
          title="Scans"
          description="Schedule scan configurations and follow every run they produce."
        >
          <Can permission={Permission.ScansWrite} mode="disable">
            <Button variant="outline" size="sm" onClick={() => setQuickScanOpen(true)}>
              <Zap className="me-2 h-4 w-4" />
              Quick scan
            </Button>
          </Can>
          <Can permission={Permission.ScansWrite} mode="disable">
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              New scan
            </Button>
          </Can>
        </PageHeader>

        <Tabs value={mainTab} onValueChange={setTabParam} className="mt-4">
          <TabsList>
            <TabsTrigger value="configurations" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurations
            </TabsTrigger>
            <TabsTrigger value="runs" className="gap-2">
              <Play className="h-4 w-4" />
              Runs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configurations" className="mt-5">
            <ConfigurationsTab />
          </TabsContent>

          <TabsContent value="runs" className="mt-5">
            <RunsTab />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

// ============================================
// STATUS TOGGLE CELL (with loading state and debounce)
// ============================================

interface StatusToggleCellProps {
  config: ScanConfig
  onToggle: (action: 'pause' | 'activate', config: ScanConfig) => Promise<void>
}

function StatusToggleCell({ config, onToggle }: StatusToggleCellProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [localStatus, setLocalStatus] = useState(config.status)
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null)

  // Sync local status with prop when config changes
  React.useEffect(() => {
    setLocalStatus(config.status)
  }, [config.status])

  const handleToggle = async (checked: boolean) => {
    // Debounce to prevent rapid clicking
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const action = checked ? 'activate' : 'pause'
    const canToggle =
      (checked && localStatus === 'paused') || (!checked && localStatus === 'active')

    if (!canToggle) return

    // Optimistic update
    setLocalStatus(checked ? 'active' : 'paused')
    setIsLoading(true)

    debounceRef.current = setTimeout(async () => {
      try {
        await onToggle(action, config)
      } catch {
        // Revert on error
        setLocalStatus(config.status)
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce
  }

  const isActive = localStatus === 'active'
  const isDisabled = config.status === 'disabled'

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          disabled={isDisabled || isLoading}
          aria-label={isActive ? 'Pause scan' : 'Activate scan'}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground min-w-[50px]">
        {isLoading
          ? 'Saving…'
          : localStatus === 'active'
            ? 'Active'
            : localStatus === 'paused'
              ? 'Paused'
              : 'Disabled'}
      </span>
    </div>
  )
}

// ============================================
// CONFIG ACTIONS CELL (simplified - no hooks to prevent re-renders)
// ============================================

type ConfigAction = 'trigger' | 'pause' | 'activate' | 'delete' | 'clone' | 'edit'

interface ConfigActionsCellProps {
  config: ScanConfig
  onAction: (action: ConfigAction, config: ScanConfig) => void
}

function ConfigActionsCell({ config, onAction }: ConfigActionsCellProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/scans/${config.id}`} className="flex items-center">
            <Eye className="me-2 h-4 w-4" />
            View details
          </Link>
        </DropdownMenuItem>
        <Can permission={Permission.ScansWrite}>
          <DropdownMenuItem onClick={() => onAction('edit', config)}>
            <Pencil className="me-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        </Can>
        <DropdownMenuItem onClick={() => onAction('trigger', config)}>
          <Play className="me-2 h-4 w-4" />
          Trigger scan
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('clone', config)}>
          <Copy className="me-2 h-4 w-4" />
          Clone
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {config.status === 'active' && (
          <DropdownMenuItem onClick={() => onAction('pause', config)}>
            <Pause className="me-2 h-4 w-4" />
            Pause
          </DropdownMenuItem>
        )}
        {config.status === 'paused' && (
          <DropdownMenuItem onClick={() => onAction('activate', config)}>
            <Play className="me-2 h-4 w-4" />
            Resume
          </DropdownMenuItem>
        )}
        <Can permission={Permission.ScansDelete}>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onAction('delete', config)}
          >
            <Trash2 className="me-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================
// CONFIGURATIONS TAB
// ============================================

function ConfigurationsTab() {
  const [selectedConfig, setSelectedConfig] = useState<ScanConfig | null>(null)
  // The whole view lives in the URL so a filtered list can be shared or
  // bookmarked. The hook returns plain strings; the casts keep the narrower
  // filter types downstream.
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [statusFilter, setStatusFilter] = useUrlFilter('status', 'all') as [
    ConfigStatusFilter,
    (v: ConfigStatusFilter) => void,
  ]
  const [typeFilter, setTypeFilter] = useUrlFilter('type', 'all') as [
    ConfigTypeFilter,
    (v: ConfigTypeFilter) => void,
  ]
  const [scheduleFilter, setScheduleFilter] = useUrlFilter('schedule', 'all') as [
    ConfigScheduleFilter,
    (v: ConfigScheduleFilter) => void,
  ]
  const [tagFilter, setTagFilter] = useUrlFilter('tag', '')
  const debouncedTag = useDebounce(tagFilter, 300)
  // Selection is owned by the DataTable; we mirror the selected ids for the
  // bulk-action bar and bump the epoch to clear the table's own checkboxes.
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionEpoch, setSelectionEpoch] = useState(0)
  const clearSelection = useCallback(() => {
    setSelectedIds([])
    setSelectionEpoch((e) => e + 1)
  }, [])
  const [filtersOpen, setFiltersOpen] = usePersistentFiltersOpen(CONFIG_FILTERS_OPEN_KEY)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<ScanConfig | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)
  const [configToClone, setConfigToClone] = useState<ScanConfig | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [configToEdit, setConfigToEdit] = useState<ScanConfig | null>(null)

  // Memoize filter object to prevent unnecessary re-renders
  const filters = useMemo(
    () => ({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      scan_type: typeFilter !== 'all' ? typeFilter : undefined,
      schedule_type: scheduleFilter !== 'all' ? scheduleFilter : undefined,
      tags: debouncedTag || undefined,
      search: debouncedSearch || undefined,
    }),
    [statusFilter, typeFilter, scheduleFilter, debouncedTag, debouncedSearch]
  )

  // API hooks with stable configuration
  const swrConfig = useMemo(
    () => ({
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      dedupingInterval: 5000,
    }),
    []
  )

  const { data: configsResponse, isLoading: isLoadingConfigs } = useScanConfigs(filters, swrConfig)
  const { data: stats, isLoading: isLoadingStats } = useScanConfigStats(swrConfig)

  // Bulk operation hooks
  const { trigger: bulkActivate, isMutating: isActivating } = useBulkActivateScanConfigs()
  const { trigger: bulkPause, isMutating: isPausing } = useBulkPauseScanConfigs()
  const { trigger: bulkDisable, isMutating: isDisabling } = useBulkDisableScanConfigs()
  const { trigger: bulkDelete, isMutating: isBulkDeleting } = useBulkDeleteScanConfigs()
  const isBulkOperating = isActivating || isPausing || isDisabling || isBulkDeleting

  // Memoize configs array with stable reference
  const configs = useMemo((): ScanConfig[] => {
    return configsResponse?.items ?? []
  }, [configsResponse?.items])

  // Sync selectedConfig with latest data from API
  // This ensures the detail popup shows updated status after actions
  useEffect(() => {
    if (selectedConfig && configs.length > 0) {
      const updatedConfig = configs.find((c) => c.id === selectedConfig.id)
      if (updatedConfig && updatedConfig.status !== selectedConfig.status) {
        setSelectedConfig(updatedConfig)
      }
    }
  }, [configs, selectedConfig])

  // Total runs across the listed configurations
  const totalRunsCount = useMemo(() => {
    return configs.reduce((sum, c) => sum + c.total_runs, 0)
  }, [configs])

  // Calculate progress for a config - memoized
  const getProgress = useCallback((config: ScanConfig) => {
    if (config.total_runs === 0) return 0
    return Math.round((config.successful_runs / config.total_runs) * 100)
  }, [])

  // Toggle handler for StatusToggleCell (returns Promise for loading state)
  const handleToggle = useCallback(async (action: 'pause' | 'activate', config: ScanConfig) => {
    const endpoint =
      action === 'pause' ? scanEndpoints.pause(config.id) : scanEndpoints.activate(config.id)
    await post(endpoint, {})
    toast.success(`Scan "${config.name}" ${action === 'pause' ? 'paused' : 'activated'}`)
    await invalidateScanConfigsCache()
  }, [])

  const handleAction = useCallback(async (action: ConfigAction, config: ScanConfig) => {
    // For delete, show confirmation dialog first
    if (action === 'delete') {
      setConfigToDelete(config)
      setDeleteConfirmOpen(true)
      return
    }

    // For clone, show clone dialog
    if (action === 'clone') {
      setConfigToClone(config)
      setCloneDialogOpen(true)
      return
    }

    // For edit, show edit dialog
    if (action === 'edit') {
      setConfigToEdit(config)
      setEditDialogOpen(true)
      return
    }

    try {
      switch (action) {
        case 'trigger':
          await post(scanEndpoints.trigger(config.id), {})
          toast.success(`Scan "${config.name}" triggered successfully`)
          break
        case 'pause':
          await post(scanEndpoints.pause(config.id), {})
          toast.success(`Scan "${config.name}" paused`)
          break
        case 'activate':
          await post(scanEndpoints.activate(config.id), {})
          toast.success(`Scan "${config.name}" activated`)
          break
      }
      // Invalidate caches to refresh the list
      await invalidateScanConfigsCache()
    } catch (error) {
      console.error(`Failed to ${action} scan:`, error)
      toast.error(getErrorMessage(error, `Failed to ${action} scan "${config.name}"`))
    }
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!configToDelete) return

    setIsDeleting(true)
    try {
      await del(scanEndpoints.delete(configToDelete.id))
      toast.success(`Scan "${configToDelete.name}" deleted`)
      setSelectedConfig(null)
      await invalidateScanConfigsCache()
    } catch (error) {
      console.error('Failed to delete scan:', error)
      toast.error(getErrorMessage(error, `Failed to delete scan "${configToDelete.name}"`))
    } finally {
      setIsDeleting(false)
      setDeleteConfirmOpen(false)
      setConfigToDelete(null)
    }
  }, [configToDelete])

  // One runner for the four bulk operations: same guard, toast and cleanup.
  const runBulk = useCallback(
    async (
      op: (arg: { scan_ids: string[] }) => Promise<{ message: string } | undefined>,
      failure: string
    ) => {
      if (selectedIds.length === 0) return
      try {
        const result = await op({ scan_ids: selectedIds })
        if (result) {
          toast.success(result.message)
          clearSelection()
          await invalidateScanConfigsCache()
        }
      } catch (error) {
        toast.error(getErrorMessage(error, failure))
      }
    },
    [selectedIds, clearSelection]
  )

  // Table columns - memoized to prevent infinite re-renders
  const columns: ColumnDef<ScanConfig>[] = useMemo(
    () => [
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
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium">{row.original.name}</p>
            {row.original.description && (
              <p className="max-w-[300px] truncate text-xs text-muted-foreground">
                {row.original.description}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'scan_type',
        header: 'Type',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="outline">{SCAN_TYPE_LABELS[row.original.scan_type]}</Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => <StatusToggleCell config={row.original} onToggle={handleToggle} />,
      },
      {
        id: 'success_rate',
        accessorFn: (c) => getProgress(c),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Success rate" />,
        cell: ({ row }) => {
          const progress = getProgress(row.original)
          return (
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-2 w-20 shrink-0" />
              <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">
                {progress}%
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'total_runs',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Runs" />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.total_runs}</span>,
      },
      {
        id: 'results',
        accessorFn: (c) => c.successful_runs,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Results" />,
        cell: ({ row }) => {
          const config = row.original
          if (config.total_runs === 0) return <span className="text-muted-foreground">-</span>
          return (
            <span className="text-sm tabular-nums">
              {config.successful_runs} passed
              {config.failed_runs > 0 && (
                <span className="text-destructive"> · {config.failed_runs} failed</span>
              )}
            </span>
          )
        },
      },
      {
        accessorKey: 'schedule_type',
        header: 'Schedule',
        enableSorting: false,
        cell: ({ row }) => {
          const config = row.original
          const nextRun = formatNextRun(config.next_run_at)
          const isPaused = config.status === 'paused'
          const isActive = config.status === 'active'
          return (
            <div className="flex flex-col">
              <span className="text-sm">{SCHEDULE_TYPE_LABELS[config.schedule_type]}</span>
              {nextRun && (isActive || isPaused) && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Next: {nextRun}
                  {isPaused && <span className="opacity-70">(if resumed)</span>}
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => <ConfigActionsCell config={row.original} onAction={handleAction} />,
      },
    ],
    [getProgress, handleAction, handleToggle]
  )

  const activeFiltersCount = [
    statusFilter !== 'all',
    typeFilter !== 'all',
    scheduleFilter !== 'all',
    tagFilter !== '',
  ].filter(Boolean).length

  const clearFilters = () => {
    setStatusFilter('all')
    setTypeFilter('all')
    setScheduleFilter('all')
    setTagFilter('')
  }

  // A status metric toggles its filter; "All" clears it.
  const toggleStatus = (value: ConfigStatusFilter) =>
    setStatusFilter(statusFilter === value ? 'all' : value)

  const metrics: MetricStripItem[] = [
    {
      key: 'all',
      label: 'Configurations',
      value: stats?.total ?? 0,
      onClick: () => setStatusFilter('all'),
      active: statusFilter === 'all',
    },
    {
      key: 'active',
      label: 'Active',
      value: stats?.active ?? 0,
      onClick: () => toggleStatus('active'),
      active: statusFilter === 'active',
    },
    {
      key: 'paused',
      label: 'Paused',
      value: stats?.paused ?? 0,
      onClick: () => toggleStatus('paused'),
      active: statusFilter === 'paused',
    },
    {
      key: 'disabled',
      label: 'Disabled',
      value: stats?.disabled ?? 0,
      onClick: () => toggleStatus('disabled'),
      active: statusFilter === 'disabled',
    },
    { key: 'runs', label: 'Runs (listed)', value: totalRunsCount },
  ]

  // Filters are single-valued in the API, so each section behaves like a radio
  // group: ticking an option replaces the previous one, unticking clears it.
  const facetPanel = (
    <FacetPanel activeCount={activeFiltersCount} onClearAll={clearFilters}>
      <FacetSection title="Status" selectedCount={statusFilter !== 'all' ? 1 : 0}>
        {configStatusFilters
          .filter((f) => f.value !== 'all')
          .map((f) => (
            <FacetOption
              key={f.value}
              label={f.label}
              checked={statusFilter === f.value}
              onCheckedChange={(on) => setStatusFilter(on ? f.value : 'all')}
            />
          ))}
      </FacetSection>
      <FacetSection title="Scan type" selectedCount={typeFilter !== 'all' ? 1 : 0}>
        {configTypeFilters
          .filter((f) => f.value !== 'all')
          .map((f) => (
            <FacetOption
              key={f.value}
              label={f.label}
              checked={typeFilter === f.value}
              onCheckedChange={(on) => setTypeFilter(on ? f.value : 'all')}
            />
          ))}
      </FacetSection>
      <FacetSection title="Schedule" selectedCount={scheduleFilter !== 'all' ? 1 : 0}>
        {configScheduleFilters
          .filter((f) => f.value !== 'all')
          .map((f) => (
            <FacetOption
              key={f.value}
              label={f.label}
              checked={scheduleFilter === f.value}
              onCheckedChange={(on) => setScheduleFilter(on ? f.value : 'all')}
            />
          ))}
      </FacetSection>
      <FacetSection title="Tag" selectedCount={tagFilter ? 1 : 0}>
        <div className="relative pe-1 pt-1">
          <Tag className="pointer-events-none absolute start-2.5 top-1/2 mt-0.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by tag…"
            aria-label="Filter by tag"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="h-8 ps-8 text-sm"
          />
        </div>
      </FacetSection>
    </FacetPanel>
  )

  const filterBadge =
    activeFiltersCount > 0 ? (
      <span className="ms-1.5 rounded-full bg-primary px-1.5 text-[11px] font-medium tabular-nums text-primary-foreground">
        {activeFiltersCount}
      </span>
    ) : null

  const toolbarStart = (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden h-9 lg:inline-flex"
        onClick={() => setFiltersOpen(!filtersOpen)}
        aria-pressed={filtersOpen}
        aria-controls="scan-config-filters"
      >
        {filtersOpen ? <PanelLeftClose className="h-4 w-4" /> : <ListFilter className="h-4 w-4" />}
        <span className="ms-2">Filters</span>
        {filterBadge}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-9 lg:hidden"
        onClick={() => setFilterSheetOpen(true)}
      >
        <ListFilter className="h-4 w-4" />
        <span className="ms-2">Filters</span>
        {filterBadge}
      </Button>
      <SearchBox
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search configurations…"
        label="Search scan configurations"
      />
    </>
  )

  return (
    <>
      <MetricStrip loading={isLoadingStats} items={metrics} />

      <div className="mt-5 flex items-start gap-5">
        {filtersOpen && (
          <aside
            id="scan-config-filters"
            aria-label="Scan configuration filters"
            className="sticky top-4 hidden h-[calc(100svh-7.5rem)] w-64 shrink-0 flex-col rounded-xl border bg-card p-4 shadow-sm lg:flex"
          >
            <div className="flex min-h-0 flex-1 flex-col">{facetPanel}</div>
          </aside>
        )}

        <div className="min-w-0 flex-1">
          {isLoadingConfigs && !configsResponse ? (
            <TableSkeleton />
          ) : (
            <DataTable
              columns={columns}
              data={configs}
              showSearch={false}
              toolbarStart={toolbarStart}
              getRowId={(c) => c.id}
              onRowClick={setSelectedConfig}
              onSelectionChange={(rows) => setSelectedIds(rows.map((c) => c.id))}
              resetSelectionKey={selectionEpoch}
              showSelectionCount={false}
              emptyMessage={
                activeFiltersCount > 0 || searchQuery
                  ? 'No configurations match these filters'
                  : 'No scan configurations yet'
              }
              emptyDescription={
                activeFiltersCount > 0 || searchQuery
                  ? 'Try removing a filter or clearing the search.'
                  : 'Create one with New scan to schedule recurring scans.'
              }
            />
          )}
        </div>
      </div>

      <BulkActionBar count={selectedIds.length} onClear={clearSelection}>
        <Button
          variant="ghost"
          size="sm"
          disabled={isBulkOperating}
          onClick={() => runBulk(bulkActivate, 'Failed to activate selected scans')}
        >
          <Play className="me-2 h-4 w-4" />
          Activate
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={isBulkOperating}
          onClick={() => runBulk(bulkPause, 'Failed to pause selected scans')}
        >
          <Pause className="me-2 h-4 w-4" />
          Pause
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={isBulkOperating}
          onClick={() => runBulk(bulkDisable, 'Failed to disable selected scans')}
        >
          <XCircle className="me-2 h-4 w-4" />
          Disable
        </Button>
        <Can permission={Permission.ScansDelete}>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={isBulkOperating}
            onClick={() => runBulk(bulkDelete, 'Failed to delete selected scans')}
          >
            {isBulkDeleting ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="me-2 h-4 w-4" />
            )}
            Delete
          </Button>
        </Can>
      </BulkActionBar>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="left" className="w-80 overflow-y-auto p-4">
          <SheetHeader className="sr-only">
            <SheetTitle>Scan configuration filters</SheetTitle>
          </SheetHeader>
          {facetPanel}
        </SheetContent>
      </Sheet>

      {/* Config Details Sheet */}
      <Sheet open={!!selectedConfig} onOpenChange={() => setSelectedConfig(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto p-0">
          <VisuallyHidden>
            <SheetTitle>Configuration details</SheetTitle>
          </VisuallyHidden>
          {selectedConfig && (
            <ConfigDetailSheet
              config={selectedConfig}
              onClose={() => setSelectedConfig(null)}
              onDelete={() => {
                setConfigToDelete(selectedConfig)
                setDeleteConfirmOpen(true)
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete scan configuration"
        desc={
          <>
            Are you sure you want to delete &quot;{configToDelete?.name}&quot;? This action cannot
            be undone and will remove all associated run history.
          </>
        }
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        destructive
        isLoading={isDeleting}
        handleConfirm={handleConfirmDelete}
      />

      {/* Clone Scan Dialog */}
      <CloneScanDialog
        scan={configToClone}
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
      />

      {/* Edit Scan Dialog */}
      <EditScanDialog
        scanConfig={configToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          setConfigToEdit(null)
        }}
      />
    </>
  )
}

// ============================================
// CONFIG DETAIL SHEET
// ============================================

interface ConfigDetailSheetProps {
  config: ScanConfig
  onClose: () => void
  onDelete?: () => void
}

function ConfigDetailSheet({ config, onClose: _onClose, onDelete }: ConfigDetailSheetProps) {
  const [isTriggering, setIsTriggering] = useState(false)
  const [isPausing, setIsPausing] = useState(false)
  const [isActivating, setIsActivating] = useState(false)

  // Calculate progress
  const progress = useMemo(() => {
    if (config.total_runs === 0) return 0
    return Math.round((config.successful_runs / config.total_runs) * 100)
  }, [config.total_runs, config.successful_runs])

  // Real API action handlers
  const handleTriggerScan = async () => {
    setIsTriggering(true)
    try {
      await post(scanEndpoints.trigger(config.id), {})
      toast.success(`Scan "${config.name}" triggered successfully`)
      await invalidateScanConfigsCache()
    } catch (error) {
      console.error('Failed to trigger scan:', error)
      toast.error(getErrorMessage(error, `Failed to trigger scan "${config.name}"`))
    } finally {
      setIsTriggering(false)
    }
  }

  const handlePauseConfig = async () => {
    setIsPausing(true)
    try {
      await post(scanEndpoints.pause(config.id), {})
      toast.success(`Scan "${config.name}" paused`)
      await invalidateScanConfigsCache()
    } catch (error) {
      console.error('Failed to pause scan:', error)
      toast.error(getErrorMessage(error, `Failed to pause scan "${config.name}"`))
    } finally {
      setIsPausing(false)
    }
  }

  const handleActivateConfig = async () => {
    setIsActivating(true)
    try {
      await post(scanEndpoints.activate(config.id), {})
      toast.success(`Scan "${config.name}" activated`)
      await invalidateScanConfigsCache()
    } catch (error) {
      console.error('Failed to activate scan:', error)
      toast.error(getErrorMessage(error, `Failed to activate scan "${config.name}"`))
    } finally {
      setIsActivating(false)
    }
  }

  const handleDeleteConfig = () => {
    // Use the parent's delete handler which shows confirmation dialog
    onDelete?.()
  }

  return (
    <>
      {/* Hero Header */}
      <div className="border-b px-6 pt-6 pb-4">
        {/* Status & Type Row - pe-14 to avoid overlap with close button */}
        <div className="flex items-center justify-between mb-4 pe-14">
          <Badge variant="outline" className="font-medium">
            {SCAN_TYPE_LABELS[config.scan_type]}
          </Badge>
          <StatusBadge
            status={
              config.status === 'active'
                ? 'active'
                : config.status === 'paused'
                  ? 'pending'
                  : 'inactive'
            }
          />
        </div>

        {/* Title with icon */}
        <div className="flex items-center gap-3 mb-2">
          <Radar className="h-5 w-5 shrink-0 text-muted-foreground" />
          <h2 className="text-lg font-semibold line-clamp-2">{config.name}</h2>
        </div>
        {config.description && (
          <p className="text-sm text-muted-foreground ps-8">{config.description}</p>
        )}

        {/* Progress Bar */}
        <div className="mt-5 rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Success rate</span>
            <span className="text-2xl font-semibold tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{config.total_runs} total runs</span>
            <span>{SCAN_CONFIG_STATUS_LABELS[config.status]}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-5">
          {config.status === 'active' && (
            <>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleTriggerScan}
                disabled={isTriggering || isPausing}
              >
                {isTriggering ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="me-2 h-4 w-4" />
                )}
                Trigger
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={handlePauseConfig}
                disabled={isPausing || isTriggering}
              >
                {isPausing ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="me-2 h-4 w-4" />
                )}
                Pause
              </Button>
            </>
          )}
          {config.status === 'paused' && (
            <>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleActivateConfig}
                disabled={isActivating || isTriggering}
              >
                {isActivating ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="me-2 h-4 w-4" />
                )}
                Resume
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={handleTriggerScan}
                disabled={isTriggering || isActivating}
              >
                {isTriggering ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="me-2 h-4 w-4" />
                )}
                Trigger
              </Button>
            </>
          )}
          {config.status === 'disabled' && (
            <Button
              size="sm"
              className="flex-1"
              onClick={handleActivateConfig}
              disabled={isActivating}
            >
              {isActivating ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="me-2 h-4 w-4" />
              )}
              Enable
            </Button>
          )}
        </div>
      </div>

      {/* Content with Tabs */}
      <Tabs defaultValue="overview" className="px-6 pb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SheetStatCard label="Total runs" value={config.total_runs} icon={Target} />
            <SheetStatCard label="Successful" value={config.successful_runs} icon={CheckCircle} />
          </div>

          {/* Results Breakdown */}
          {config.total_runs > 0 && (
            <div className="rounded-xl border p-4 bg-card">
              <h4 className="text-sm font-medium mb-3">Run results</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm flex-1">Successful</span>
                  <span className="font-semibold tabular-nums">{config.successful_runs}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm flex-1">Failed</span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      config.failed_runs > 0 && 'text-destructive'
                    )}
                  >
                    {config.failed_runs}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-xl border p-4 bg-card">
            <h4 className="text-sm font-medium mb-3">Timeline</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                  <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">{formatDate(config.created_at)}</p>
                </div>
              </div>
              {config.last_run_at && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    <Play className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Last run</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(config.last_run_at)}
                    </p>
                  </div>
                </div>
              )}
              {config.next_run_at && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Next scheduled</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(config.next_run_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4 mt-0">
          {/* Scan Type & Schedule */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4 bg-card">
              <p className="text-xs text-muted-foreground mb-1">Scan type</p>
              <p className="font-medium">{SCAN_TYPE_LABELS[config.scan_type]}</p>
            </div>
            <div className="rounded-xl border p-4 bg-card">
              <p className="text-xs text-muted-foreground mb-1">Schedule</p>
              <p className="font-medium capitalize">{SCHEDULE_TYPE_LABELS[config.schedule_type]}</p>
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="rounded-xl border p-4 bg-card">
            <h4 className="text-sm font-medium mb-3">Schedule settings</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Frequency</span>
                </div>
                <span className="text-sm font-medium">
                  {SCHEDULE_TYPE_LABELS[config.schedule_type]}
                </span>
              </div>
              {config.schedule_time && (
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Time</span>
                  </div>
                  <span className="text-sm font-medium">{config.schedule_time}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Timezone</span>
                </div>
                <span className="text-sm font-medium">{config.schedule_timezone}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {config.tags && config.tags.length > 0 && (
            <div className="rounded-xl border p-4 bg-card">
              <h4 className="text-sm font-medium mb-3">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {config.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4 mt-0">
          {/* Created By */}
          <div className="rounded-xl border p-4 bg-card">
            <h4 className="text-sm font-medium mb-3">Created by</h4>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {(config.created_by_name || 'S').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{config.created_by_name || 'System'}</p>
                <p className="text-xs text-muted-foreground">{formatDate(config.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Targets Summary */}
          {((config.asset_group_ids && config.asset_group_ids.length > 0) ||
            config.asset_group_id ||
            (config.targets && config.targets.length > 0)) && (
            <div className="rounded-xl border p-4 bg-card">
              <h4 className="text-sm font-medium mb-3">Targets</h4>
              <div className="space-y-2">
                {/* Asset Groups */}
                {config.asset_group_ids && config.asset_group_ids.length > 0 ? (
                  <div>
                    <span className="text-xs text-muted-foreground">Asset groups</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.asset_group_ids.map((id) => (
                        <Badge key={id} variant="outline" className="text-xs">
                          {id.slice(0, 8)}...
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : config.asset_group_id ? (
                  <div>
                    <span className="text-xs text-muted-foreground">Asset group</span>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs">
                        {config.asset_group_id.slice(0, 8)}...
                      </Badge>
                    </div>
                  </div>
                ) : null}
                {/* Direct Targets */}
                {config.targets && config.targets.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Direct targets ({config.targets.length})
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.targets.slice(0, 5).map((target, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {target.length > 30 ? `${target.slice(0, 30)}...` : target}
                        </Badge>
                      ))}
                      {config.targets.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{config.targets.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Technical Details */}
          <div className="rounded-xl border p-4 bg-card">
            <h4 className="text-sm font-medium mb-3">Technical details</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Configuration ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[150px]">
                    {config.id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    aria-label="Copy ID"
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(config.id)
                      toast.success('ID copied to clipboard')
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <Can permission={Permission.ScansDelete}>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <h4 className="text-sm font-medium text-destructive mb-2">Danger zone</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Permanently delete this configuration and all associated data.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleDeleteConfig}
              >
                <Trash2 className="me-2 h-4 w-4" />
                Delete configuration
              </Button>
            </div>
          </Can>
        </TabsContent>
      </Tabs>
    </>
  )
}

// ============================================
// RUN ACTIONS CELL (extracted to prevent re-renders)
// ============================================

interface RunActionsCellProps {
  session: ScanSession
  onViewDetails: (session: ScanSession) => void
}

function RunActionsCell({ session, onViewDetails }: RunActionsCellProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetails(session)}>
          <Eye className="me-2 h-4 w-4" />
          View details
        </DropdownMenuItem>
        {session.status === 'completed' && session.findings_total > 0 && (
          <DropdownMenuItem asChild>
            <Link href={`/findings?scan_id=${session.id}`}>
              <Shield className="me-2 h-4 w-4" />
              View {session.findings_total} findings
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================
// RUNS TAB
// ============================================

function RunsTab() {
  const [selectedSession, setSelectedSession] = useState<ScanSession | null>(null)
  // Own URL keys: the Configurations tab already uses `status` and `q`.
  const [statusFilter, setStatusFilter] = useUrlFilter('run_status', 'all') as [
    RunStatusFilter,
    (v: RunStatusFilter) => void,
  ]
  const [searchQuery, setSearchQuery] = useUrlFilter('run_q', '')

  // API filters
  const apiFilters = useMemo(
    () => ({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      per_page: 50,
    }),
    [statusFilter]
  )

  // Stable SWR config
  const swrConfig = useMemo(
    () => ({
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 30000, // Refresh every 30s for running scans
      dedupingInterval: 5000,
    }),
    []
  )

  // Real API hooks
  const { data: sessionsResponse, isLoading: isLoadingSessions } = useScanSessions(
    apiFilters,
    swrConfig
  )
  const { data: stats, isLoading: isLoadingStats } = useScanSessionStats(undefined, swrConfig)

  // Extract sessions from response
  const sessions = useMemo((): ScanSession[] => {
    return sessionsResponse?.data ?? []
  }, [sessionsResponse?.data])

  // Filter sessions by search (client-side over the loaded page)
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions
    const search = searchQuery.toLowerCase()
    return sessions.filter(
      (s) =>
        s.scanner_name.toLowerCase().includes(search) ||
        s.asset_value.toLowerCase().includes(search) ||
        s.asset_type.toLowerCase().includes(search)
    )
  }, [sessions, searchQuery])

  // Handlers
  const handleViewDetails = useCallback((session: ScanSession) => {
    setSelectedSession(session)
  }, [])

  // NOTE: the /api/v1/scan-sessions route group exposes only GET (list/stats/
  // {id}) and DELETE — there is no /stop and no /retry endpoint. The former Stop
  // and Retry controls POSTed to non-existent routes and always 404'd, so both
  // have been removed rather than left as dead actions. (The /{id}/retry route
  // that does exist belongs to the notification-outbox group, not scan sessions.)
  // Row selection went with them: no bulk action exists for runs, so a
  // checkbox column (and its "N selected" button) did nothing.

  // Export handlers
  const handleExportCSV = useCallback(() => {
    const dataToExport = filteredSessions.length > 0 ? filteredSessions : sessions
    if (dataToExport.length === 0) {
      toast.error('No data to export')
      return
    }

    const columns = {
      scanner_name: 'Scanner',
      scanner_version: 'Version',
      asset_type: 'Asset Type',
      asset_value: 'Target',
      status: 'Status',
      findings_total: 'Total Findings',
      findings_new: 'New Findings',
      findings_fixed: 'Fixed Findings',
      duration_ms: 'Duration (ms)',
      started_at: 'Started At',
      completed_at: 'Completed At',
      error_message: 'Error',
    }

    const timestamp = new Date().toISOString().split('T')[0]
    exportToCSV(dataToExport, `scan-sessions-${timestamp}`, columns)
    toast.success(`Exported ${dataToExport.length} scan sessions to CSV`)
  }, [filteredSessions, sessions])

  const handleExportJSON = useCallback(() => {
    const dataToExport = filteredSessions.length > 0 ? filteredSessions : sessions
    if (dataToExport.length === 0) {
      toast.error('No data to export')
      return
    }

    const timestamp = new Date().toISOString().split('T')[0]
    exportToJSON(
      { sessions: dataToExport, exported_at: new Date().toISOString() },
      `scan-sessions-${timestamp}`
    )
    toast.success(`Exported ${dataToExport.length} scan sessions to JSON`)
  }, [filteredSessions, sessions])

  // Table columns for ScanSession
  const columns: ColumnDef<ScanSession>[] = useMemo(
    () => [
      {
        accessorKey: 'scanner_name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Scanner" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.scanner_name}</p>
            {row.original.scanner_version && (
              <p className="text-xs text-muted-foreground">v{row.original.scanner_version}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'asset_value',
        header: 'Target',
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <p className="max-w-[200px] truncate font-medium">{row.original.asset_value}</p>
            <p className="text-xs text-muted-foreground">{row.original.asset_type}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => <RunStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'findings_total',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Findings" />,
        cell: ({ row }) => {
          const session = row.original
          if (session.findings_total === 0) {
            return <span className="text-muted-foreground">-</span>
          }
          const severities = session.findings_by_severity ?? {}
          const rest = (severities.medium ?? 0) + (severities.low ?? 0)
          return (
            <div className="flex items-center gap-1">
              {(severities.critical ?? 0) > 0 && (
                <Badge
                  variant="outline"
                  className={cn('px-1.5 text-xs tabular-nums', SEVERITY_BADGE_SOFT.critical)}
                >
                  C {severities.critical}
                </Badge>
              )}
              {(severities.high ?? 0) > 0 && (
                <Badge
                  variant="outline"
                  className={cn('px-1.5 text-xs tabular-nums', SEVERITY_BADGE_SOFT.high)}
                >
                  H {severities.high}
                </Badge>
              )}
              {rest > 0 && (
                <Badge variant="secondary" className="px-1.5 text-xs tabular-nums">
                  +{rest}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'findings_new',
        header: ({ column }) => <DataTableColumnHeader column={column} title="New" />,
        cell: ({ row }) => {
          const newFindings = row.original.findings_new
          if (newFindings === 0) return <span className="text-muted-foreground">-</span>
          return <span className="text-sm tabular-nums">{newFindings}</span>
        },
      },
      {
        accessorKey: 'duration_ms',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Duration" />,
        cell: ({ row }) => {
          const durationMs = row.original.duration_ms
          if (!durationMs) {
            return (
              <span className="text-xs text-muted-foreground">
                {row.original.status === 'running' ? 'Running…' : '-'}
              </span>
            )
          }
          return <span className="text-sm tabular-nums">{formatDuration(durationMs)}</span>
        },
      },
      {
        id: 'started',
        accessorFn: (s) => s.started_at || s.created_at,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Started" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.started_at || row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => (
          <RunActionsCell session={row.original} onViewDetails={handleViewDetails} />
        ),
      },
    ],
    [handleViewDetails]
  )

  const toggleStatus = (value: RunStatusFilter) =>
    setStatusFilter(statusFilter === value ? 'all' : value)

  const metrics: MetricStripItem[] = [
    {
      key: 'all',
      label: 'Runs',
      value: stats?.total ?? 0,
      onClick: () => setStatusFilter('all'),
      active: statusFilter === 'all',
    },
    {
      key: 'running',
      label: 'Running',
      value: stats?.by_status?.running ?? 0,
      onClick: () => toggleStatus('running'),
      active: statusFilter === 'running',
    },
    {
      key: 'completed',
      label: 'Completed',
      value: stats?.by_status?.completed ?? 0,
      onClick: () => toggleStatus('completed'),
      active: statusFilter === 'completed',
    },
    {
      key: 'failed',
      label: 'Failed',
      value: stats?.by_status?.failed ?? 0,
      tone: 'danger',
      onClick: () => toggleStatus('failed'),
      active: statusFilter === 'failed',
    },
    {
      key: 'timeout',
      label: 'Timed out',
      value: stats?.by_status?.timeout ?? 0,
      tone: 'danger',
      onClick: () => toggleStatus('timeout'),
      active: statusFilter === 'timeout',
    },
    { key: 'findings', label: 'Findings', value: stats?.findings_total ?? 0 },
  ]

  const toolbarStart = (
    <>
      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RunStatusFilter)}>
        <SelectTrigger className="h-9 w-auto min-w-36 gap-2" aria-label="Filter runs by status">
          <ListFilter className="h-4 w-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {runStatusFilters.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.value === 'all' ? 'All statuses' : f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SearchBox
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search scanner, target…"
        label="Search scan runs"
      />
    </>
  )

  const toolbarEnd = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Download className="h-4 w-4 sm:me-2" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="me-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON}>
          <FileJson className="me-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const filtered = statusFilter !== 'all' || !!searchQuery

  return (
    <>
      <MetricStrip loading={isLoadingStats} items={metrics} />

      <div className="mt-5">
        {isLoadingSessions && !sessionsResponse ? (
          <TableSkeleton />
        ) : (
          <DataTable
            columns={columns}
            data={filteredSessions}
            showSearch={false}
            toolbarStart={toolbarStart}
            toolbarEnd={toolbarEnd}
            getRowId={(s) => s.id}
            onRowClick={handleViewDetails}
            emptyMessage={filtered ? 'No runs match these filters' : 'No scan runs yet'}
            emptyDescription={
              filtered
                ? 'Try another status or clear the search.'
                : 'Runs appear here once a scan configuration or quick scan starts.'
            }
          />
        )}
      </div>

      {/* Session Details Sheet */}
      <Sheet open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto p-0">
          <VisuallyHidden>
            <SheetTitle>Run details</SheetTitle>
          </VisuallyHidden>
          {selectedSession && <SessionDetailSheet session={selectedSession} />}
        </SheetContent>
      </Sheet>
    </>
  )
}

// ============================================
// SESSION DETAIL SHEET
// ============================================

interface SessionDetailSheetProps {
  session: ScanSession
}

function SessionDetailSheet({ session }: SessionDetailSheetProps) {
  // Get severity counts from findings_by_severity
  const severities = session.findings_by_severity ?? {}
  const criticalCount = severities.critical ?? 0
  const highCount = severities.high ?? 0
  const mediumCount = severities.medium ?? 0
  const lowCount = severities.low ?? 0

  // Calculate progress based on status
  const progress =
    session.status === 'completed'
      ? 100
      : session.status === 'running'
        ? 50
        : session.status === 'pending'
          ? 0
          : session.status === 'failed' ||
              session.status === 'timeout' ||
              session.status === 'canceled'
            ? 100
            : 0

  return (
    <>
      {/* Hero Header */}
      <div className="border-b px-6 pt-6 pb-4">
        {/* Status & Scanner Row - pe-14 to avoid overlap with close button */}
        <div className="flex items-center justify-between mb-3 pe-14">
          <Badge variant="outline" className="font-medium">
            {session.scanner_name}
            {session.scanner_version && ` v${session.scanner_version}`}
          </Badge>
          <RunStatusBadge status={session.status} />
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold mb-1 truncate">{session.asset_value}</h2>
        <p className="text-sm text-muted-foreground">{session.asset_type}</p>

        {/* Progress Bar */}
        <div className="mt-4 rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Status</span>
            <span className="text-sm font-semibold">{SCAN_RUN_STATUS_LABELS[session.status]}</span>
          </div>
          <Progress
            value={progress}
            className={cn('h-2', session.status === 'running' && '[&>div]:animate-pulse')}
          />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{session.findings_total} findings</span>
            <span>
              {session.duration_ms
                ? formatDuration(session.duration_ms)
                : session.status === 'running'
                  ? 'In progress'
                  : '-'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          {session.status === 'completed' && session.findings_total > 0 && (
            <Button asChild size="sm" className="flex-1">
              <Link href={`/findings?scan_id=${session.id}`}>
                <Eye className="me-2 h-4 w-4" />
                View {session.findings_total} findings
              </Link>
            </Button>
          )}
          {(session.status === 'pending' ||
            (session.status === 'completed' && session.findings_total === 0)) && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => {
                copyToClipboard(session.id)
                toast.success('Session ID copied to clipboard')
              }}
            >
              <Copy className="me-2 h-4 w-4" />
              Copy ID
            </Button>
          )}
        </div>
      </div>

      {/* Content with Tabs */}
      <Tabs defaultValue="overview" className="px-6 pb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SheetStatCard label="Total findings" value={session.findings_total} icon={Target} />
            <SheetStatCard label="New findings" value={session.findings_new} icon={AlertTriangle} />
          </div>

          {/* Findings Breakdown */}
          {session.findings_total > 0 && (
            <div className="rounded-xl border p-4 bg-card">
              <h4 className="text-sm font-medium mb-3">Findings by severity</h4>
              <div className="space-y-2">
                {(
                  [
                    ['critical', 'Critical', criticalCount],
                    ['high', 'High', highCount],
                    ['medium', 'Medium', mediumCount],
                    ['low', 'Low', lowCount],
                  ] as const
                ).map(([level, label, count]) => (
                  <div key={level} className="flex items-center gap-3">
                    <div className={cn('h-2 w-2 rounded-full', SEVERITY_DOT_COLORS[level])} />
                    <span className="text-sm flex-1">{label}</span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixed Findings */}
          {session.findings_fixed > 0 && (
            <SheetStatCard
              label="Fixed since last scan"
              value={session.findings_fixed}
              icon={CheckCircle}
            />
          )}

          {/* Timeline */}
          <div className="rounded-xl border p-4 bg-card">
            <h4 className="text-sm font-medium mb-3">Timeline</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                  <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">{formatDate(session.created_at)}</p>
                </div>
              </div>
              {session.started_at && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    <Play className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Started</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(session.started_at)}
                    </p>
                  </div>
                </div>
              )}
              {session.completed_at && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    {session.status === 'completed' ? (
                      <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {session.status === 'completed' ? 'Completed' : 'Ended'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(session.completed_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Findings Tab */}
        <TabsContent value="findings" className="space-y-4 mt-0">
          {session.findings_total > 0 ? (
            <div className="rounded-xl border p-4 bg-card">
              <h4 className="text-sm font-medium mb-3">Findings summary</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {session.findings_total} vulnerabilities detected on {session.asset_value}.
                {session.findings_new > 0 && ` ${session.findings_new} are new.`}
              </p>
              <Button asChild size="sm" className="w-full">
                <Link href={`/findings?scan_id=${session.id}`}>View all findings</Link>
              </Button>
            </div>
          ) : (
            <EmptyState
              icon={Shield}
              title="No findings"
              description={
                session.status === 'completed'
                  ? 'This run detected no vulnerabilities.'
                  : 'The run is still in progress or has not started yet.'
              }
            />
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4 mt-0">
          {/* Scanner Info */}
          <div className="rounded-xl border p-4 bg-card">
            <h4 className="text-sm font-medium mb-3">Scanner</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Scanner</span>
                <span className="text-sm font-medium">{session.scanner_name}</span>
              </div>
              {session.scanner_version && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <Badge variant="outline">{session.scanner_version}</Badge>
                </div>
              )}
              {session.scanner_type && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm font-medium capitalize">{session.scanner_type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Target Info */}
          <div className="rounded-xl border p-4 bg-card">
            <h4 className="text-sm font-medium mb-3">Target</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Asset type</span>
                <Badge variant="outline" className="capitalize">
                  {session.asset_type}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Target</span>
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {session.asset_value}
                </span>
              </div>
              {session.branch && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Branch</span>
                  <Badge variant="secondary">{session.branch}</Badge>
                </div>
              )}
              {session.commit_sha && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Commit</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {session.commit_sha.substring(0, 7)}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Technical Details */}
          <div className="rounded-xl border p-4 bg-card">
            <h4 className="text-sm font-medium mb-3">Technical details</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Run ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[150px]">
                    {session.id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    aria-label="Copy ID"
                    onClick={() => {
                      copyToClipboard(session.id)
                      toast.success('ID copied to clipboard')
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {session.agent_id && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Agent ID</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[150px]">
                    {session.agent_id.substring(0, 8)}...
                  </code>
                </div>
              )}
              {session.duration_ms && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="text-sm font-medium">{formatDuration(session.duration_ms)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {session.error_message && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Run failed</AlertTitle>
              <AlertDescription>
                <p className="font-mono text-xs whitespace-pre-wrap">{session.error_message}</p>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
