'use client'

import * as React from 'react'
import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Main } from '@/components/layout'
import { PageHeader, StatusBadge } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { toast } from 'sonner'
import {
  Plus,
  SearchIcon,
  Filter,
  MoreHorizontal,
  Eye,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  XCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Radar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  Target,
  Shield,
  Calendar,
  Layers,
  Copy,
  Tag,
  Settings,
  Loader2,
  Download,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react'
import { Can, Permission } from '@/lib/permissions'
import { exportToCSV, exportToJSON } from '@/lib/utils'
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
  invalidateScanSessionsCache,
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
import { PlatformUsageCard, NewScanDialog, CloneScanDialog } from '@/features/scans/components'
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
  { value: 'all', label: 'All Types' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'single', label: 'Single Scanner' },
]

type ConfigScheduleFilter = ScheduleType | 'all'

const configScheduleFilters: { value: ConfigScheduleFilter; label: string }[] = [
  { value: 'all', label: 'All Schedules' },
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
  { value: 'timeout', label: 'Timed Out' },
]

// Map API status to UI-friendly status for StatusBadge
function mapSessionStatusToUI(
  status: ScanRunStatus
): 'active' | 'completed' | 'pending' | 'failed' | 'inactive' {
  switch (status) {
    case 'running':
      return 'active'
    case 'completed':
      return 'completed'
    case 'queued':
    case 'pending':
      return 'pending'
    case 'failed':
    case 'timeout':
    case 'canceled':
      return 'failed'
    default:
      return 'inactive'
  }
}

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
// MAIN PAGE COMPONENT
// ============================================

export default function ScansPage() {
  const [mainTab, setMainTab] = useState<'configurations' | 'runs'>('configurations')
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <NewScanDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <Main>
        <PageHeader
          title="Scan Management"
          description={
            mainTab === 'configurations'
              ? 'Manage scheduled and recurring scan configurations'
              : 'Monitor scan executions and results'
          }
        >
          <Can permission={Permission.ScansWrite} mode="disable">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Scan
            </Button>
          </Can>
        </PageHeader>

        {/* Main Tabs: Configurations vs Runs */}
        <Tabs
          value={mainTab}
          onValueChange={(v) => setMainTab(v as 'configurations' | 'runs')}
          className="mt-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="configurations" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurations
            </TabsTrigger>
            <TabsTrigger value="runs" className="gap-2">
              <Play className="h-4 w-4" />
              Runs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configurations" className="mt-6">
            <ConfigurationsTab />
          </TabsContent>

          <TabsContent value="runs" className="mt-6">
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
          className="data-[state=checked]:bg-green-500"
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground min-w-[50px]">
        {isLoading
          ? 'Saving...'
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

interface ConfigActionsCellProps {
  config: ScanConfig
  onAction: (
    action: 'trigger' | 'pause' | 'activate' | 'delete' | 'clone',
    config: ScanConfig
  ) => void
}

function ConfigActionsCell({ config, onAction }: ConfigActionsCellProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/scans/${config.id}`} className="flex items-center">
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('trigger', config)}>
          <Play className="mr-2 h-4 w-4" />
          Trigger Scan
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('clone', config)}>
          <Copy className="mr-2 h-4 w-4" />
          Clone
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {config.status === 'active' && (
          <DropdownMenuItem onClick={() => onAction('pause', config)}>
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </DropdownMenuItem>
        )}
        {config.status === 'paused' && (
          <DropdownMenuItem onClick={() => onAction('activate', config)}>
            <Play className="mr-2 h-4 w-4" />
            Resume
          </DropdownMenuItem>
        )}
        <Can permission={Permission.ScansDelete}>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-400" onClick={() => onAction('delete', config)}>
            <Trash2 className="mr-2 h-4 w-4" />
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
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<ConfigStatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<ConfigTypeFilter>('all')
  const [scheduleFilter, setScheduleFilter] = useState<ConfigScheduleFilter>('all')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [rowSelection, setRowSelection] = useState({})
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<ScanConfig | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)
  const [configToClone, setConfigToClone] = useState<ScanConfig | null>(null)

  // Memoize filter object to prevent unnecessary re-renders
  const filters = useMemo(
    () => ({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      scan_type: typeFilter !== 'all' ? typeFilter : undefined,
      schedule_type: scheduleFilter !== 'all' ? scheduleFilter : undefined,
      tags: tagFilter || undefined,
      search: globalFilter || undefined,
    }),
    [statusFilter, typeFilter, scheduleFilter, tagFilter, globalFilter]
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

  // Status counts from stats - memoized with individual deps
  const statusCounts = useMemo(
    () => ({
      all: stats?.total ?? 0,
      active: stats?.active ?? 0,
      paused: stats?.paused ?? 0,
      disabled: stats?.disabled ?? 0,
    }),
    [stats?.total, stats?.active, stats?.paused, stats?.disabled]
  )

  // Total runs count - memoized to prevent recalculation on every render
  const totalRunsCount = useMemo(() => {
    return configs.reduce((sum, c) => sum + c.total_runs, 0)
  }, [configs])

  // Calculate progress for a config - memoized
  const getProgress = useCallback((config: ScanConfig) => {
    if (config.total_runs === 0) return 0
    return Math.round((config.successful_runs / config.total_runs) * 100)
  }, [])

  // Memoized handlers
  const handleViewDetails = useCallback((config: ScanConfig) => {
    setSelectedConfig(config)
  }, [])

  // Toggle handler for StatusToggleCell (returns Promise for loading state)
  const handleToggle = useCallback(async (action: 'pause' | 'activate', config: ScanConfig) => {
    const endpoint =
      action === 'pause' ? scanEndpoints.pause(config.id) : scanEndpoints.activate(config.id)
    await post(endpoint, {})
    toast.success(`Scan "${config.name}" ${action === 'pause' ? 'paused' : 'activated'}`)
    await invalidateScanConfigsCache()
  }, [])

  const handleAction = useCallback(
    async (action: 'trigger' | 'pause' | 'activate' | 'delete' | 'clone', config: ScanConfig) => {
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
    },
    []
  )

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

  // Get selected scan IDs from table
  const getSelectedScanIds = useCallback((): string[] => {
    const selectedRows = Object.keys(rowSelection)
    return selectedRows
      .map((rowIndex) => configs[parseInt(rowIndex)]?.id)
      .filter(Boolean) as string[]
  }, [rowSelection, configs])

  // Bulk action handlers
  const handleBulkActivate = useCallback(async () => {
    const scanIds = getSelectedScanIds()
    if (scanIds.length === 0) return

    try {
      const result = await bulkActivate({ scan_ids: scanIds })
      if (result) {
        toast.success(result.message)
        setRowSelection({})
        await invalidateScanConfigsCache()
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to activate selected scans'))
    }
  }, [bulkActivate, getSelectedScanIds])

  const handleBulkPause = useCallback(async () => {
    const scanIds = getSelectedScanIds()
    if (scanIds.length === 0) return

    try {
      const result = await bulkPause({ scan_ids: scanIds })
      if (result) {
        toast.success(result.message)
        setRowSelection({})
        await invalidateScanConfigsCache()
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to pause selected scans'))
    }
  }, [bulkPause, getSelectedScanIds])

  const handleBulkDisable = useCallback(async () => {
    const scanIds = getSelectedScanIds()
    if (scanIds.length === 0) return

    try {
      const result = await bulkDisable({ scan_ids: scanIds })
      if (result) {
        toast.success(result.message)
        setRowSelection({})
        await invalidateScanConfigsCache()
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to disable selected scans'))
    }
  }, [bulkDisable, getSelectedScanIds])

  const handleBulkDelete = useCallback(async () => {
    const scanIds = getSelectedScanIds()
    if (scanIds.length === 0) return

    try {
      const result = await bulkDelete({ scan_ids: scanIds })
      if (result) {
        toast.success(result.message)
        setRowSelection({})
        await invalidateScanConfigsCache()
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete selected scans'))
    }
  }, [bulkDelete, getSelectedScanIds])

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
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.description && (
              <p className="text-muted-foreground max-w-[300px] truncate text-xs">
                {row.original.description}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'scan_type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant="outline">{SCAN_TYPE_LABELS[row.original.scan_type]}</Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusToggleCell config={row.original} onToggle={handleToggle} />,
      },
      {
        accessorKey: 'progress',
        header: 'Progress',
        cell: ({ row }) => {
          const progress = getProgress(row.original)
          const isActive = row.original.status === 'active'
          return (
            <div className="flex items-center gap-2">
              <Progress
                value={progress}
                className={`h-2 w-20 shrink-0 ${isActive ? '[&>div]:animate-pulse' : ''}`}
              />
              <span className="text-muted-foreground text-xs w-10 shrink-0">{progress}%</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'total_runs',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Runs
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="text-sm">{row.original.total_runs}</span>,
      },
      {
        accessorKey: 'findings',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Results
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const config = row.original
          if (config.total_runs === 0) return <span className="text-muted-foreground">-</span>
          return (
            <div className="flex items-center gap-1">
              {config.successful_runs > 0 && (
                <Badge className="bg-green-500 px-1 text-xs">{config.successful_runs}</Badge>
              )}
              {config.failed_runs > 0 && (
                <Badge className="bg-red-500 px-1 text-xs">{config.failed_runs}</Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'schedule_type',
        header: 'Schedule',
        cell: ({ row }) => {
          const config = row.original
          const nextRun = formatNextRun(config.next_run_at)
          const isPaused = config.status === 'paused'
          const isActive = config.status === 'active'
          return (
            <div className="flex flex-col">
              <span className="text-sm">{SCHEDULE_TYPE_LABELS[config.schedule_type]}</span>
              {nextRun && isActive && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Next: {nextRun}
                </span>
              )}
              {nextRun && isPaused && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 opacity-50" />
                  <span className="opacity-70">Next: {nextRun}</span>
                  <span className="text-[10px] italic">(if activated)</span>
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => <ConfigActionsCell config={row.original} onAction={handleAction} />,
      },
    ],
    [getProgress, handleAction, handleToggle]
  )

  const table = useReactTable({
    data: configs,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Active filters count
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

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {isLoadingStats ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setStatusFilter('all')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Radar className="h-4 w-4" />
                  Total Configs
                </CardDescription>
                <CardTitle className="text-3xl">{statusCounts.all}</CardTitle>
              </CardHeader>
            </Card>
            <Card
              className={`cursor-pointer hover:border-blue-500 transition-colors ${statusFilter === 'active' ? 'border-blue-500' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  Active
                </CardDescription>
                <CardTitle className="text-3xl text-blue-500">{statusCounts.active}</CardTitle>
              </CardHeader>
            </Card>
            <Card
              className={`cursor-pointer hover:border-yellow-500 transition-colors ${statusFilter === 'paused' ? 'border-yellow-500' : ''}`}
              onClick={() => setStatusFilter('paused')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Pause className="h-4 w-4 text-yellow-500" />
                  Paused
                </CardDescription>
                <CardTitle className="text-3xl text-yellow-500">{statusCounts.paused}</CardTitle>
              </CardHeader>
            </Card>
            <Card
              className={`cursor-pointer hover:border-gray-500 transition-colors ${statusFilter === 'disabled' ? 'border-gray-500' : ''}`}
              onClick={() => setStatusFilter('disabled')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-500" />
                  Disabled
                </CardDescription>
                <CardTitle className="text-3xl text-gray-500">{statusCounts.disabled}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Total Runs
                </CardDescription>
                <CardTitle className="text-3xl">{totalRunsCount}</CardTitle>
              </CardHeader>
            </Card>
          </>
        )}
      </div>

      {/* Table Card */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scan Configurations</CardTitle>
              <CardDescription>Manage scheduled and recurring scans</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Filter Tabs */}
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ConfigStatusFilter)}
            className="mb-4"
          >
            <TabsList>
              {configStatusFilters.map((filter) => (
                <TabsTrigger key={filter.value} value={filter.value} className="gap-1.5">
                  {filter.label}
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {statusCounts[filter.value as keyof typeof statusCounts]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Search and Filters */}
          <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search configurations..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 sm:w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filters</h4>
                      {activeFiltersCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-muted-foreground hover:text-foreground"
                          onClick={clearFilters}
                        >
                          Clear all
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs uppercase">Scan Type</Label>
                      <div className="flex flex-wrap gap-2">
                        {configTypeFilters.map((filter) => (
                          <Badge
                            key={filter.value}
                            variant={typeFilter === filter.value ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => setTypeFilter(filter.value)}
                          >
                            {filter.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs uppercase">
                        Schedule Type
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {configScheduleFilters.map((filter) => (
                          <Badge
                            key={filter.value}
                            variant={scheduleFilter === filter.value ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => setScheduleFilter(filter.value)}
                          >
                            {filter.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs uppercase">Tags</Label>
                      <div className="relative">
                        <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Filter by tag..."
                          value={tagFilter}
                          onChange={(e) => setTagFilter(e.target.value)}
                          className="pl-8 h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {Object.keys(rowSelection).length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isBulkOperating}>
                      {isBulkOperating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `${Object.keys(rowSelection).length} selected`
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleBulkActivate} disabled={isBulkOperating}>
                      <Play className="mr-2 h-4 w-4" />
                      Activate Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBulkPause} disabled={isBulkOperating}>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBulkDisable} disabled={isBulkOperating}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Disable Selected
                    </DropdownMenuItem>
                    <Can permission={Permission.ScansDelete}>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-400"
                        onClick={handleBulkDelete}
                        disabled={isBulkOperating}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected
                      </DropdownMenuItem>
                    </Can>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {typeFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Type: {configTypeFilters.find((f) => f.value === typeFilter)?.label}
                  <button
                    onClick={() => setTypeFilter('all')}
                    className="ml-1 hover:text-foreground"
                  >
                    x
                  </button>
                </Badge>
              )}
              {scheduleFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Schedule: {configScheduleFilters.find((f) => f.value === scheduleFilter)?.label}
                  <button
                    onClick={() => setScheduleFilter('all')}
                    className="ml-1 hover:text-foreground"
                  >
                    x
                  </button>
                </Badge>
              )}
              {tagFilter && (
                <Badge variant="secondary" className="gap-1">
                  Tag: {tagFilter}
                  <button onClick={() => setTagFilter('')} className="ml-1 hover:text-foreground">
                    x
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
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
                {isLoadingConfigs ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className="cursor-pointer"
                      onClick={(e) => {
                        // Ignore clicks on interactive elements to prevent popup from opening
                        const target = e.target as HTMLElement
                        if (
                          target.closest('[role="checkbox"]') ||
                          target.closest('button') ||
                          target.closest('[role="menu"]') ||
                          target.closest('[role="menuitem"]') ||
                          target.closest('[data-radix-popper-content-wrapper]')
                        ) {
                          return
                        }
                        setSelectedConfig(row.original)
                      }}
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
                      No configurations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{' '}
              {table.getFilteredRowModel().rows.length} row(s) selected
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config Details Sheet */}
      <Sheet open={!!selectedConfig} onOpenChange={() => setSelectedConfig(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto p-0">
          <VisuallyHidden>
            <SheetTitle>Configuration Details</SheetTitle>
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
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scan Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{configToDelete?.name}&quot;? This action cannot
              be undone and will remove all associated run history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone Scan Dialog */}
      <CloneScanDialog
        scan={configToClone}
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
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
      <div
        className={`px-6 pt-6 pb-4 ${
          config.status === 'active'
            ? 'bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent'
            : config.status === 'paused'
              ? 'bg-gradient-to-br from-yellow-500/20 via-yellow-500/10 to-transparent'
              : 'bg-gradient-to-br from-gray-500/20 via-gray-500/10 to-transparent'
        }`}
      >
        {/* Status & Type Row - pr-14 to avoid overlap with close button */}
        <div className="flex items-center justify-between mb-4 pr-14">
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
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Radar className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold line-clamp-2">{config.name}</h2>
        </div>
        {config.description && (
          <p className="text-sm text-muted-foreground pl-[52px]">{config.description}</p>
        )}

        {/* Progress Bar */}
        <div className="mt-5 p-4 rounded-xl bg-background/80 backdrop-blur border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Success Rate</span>
            <span
              className={`text-2xl font-bold ${
                progress >= 80
                  ? 'text-green-500'
                  : progress >= 50
                    ? 'text-yellow-500'
                    : progress === 0
                      ? 'text-muted-foreground'
                      : 'text-red-500'
              }`}
            >
              {progress}%
            </span>
          </div>
          <Progress
            value={progress}
            className={`h-3 ${
              config.status === 'active'
                ? '[&>div]:animate-pulse [&>div]:bg-blue-500'
                : progress >= 80
                  ? '[&>div]:bg-green-500'
                  : progress >= 50
                    ? '[&>div]:bg-yellow-500'
                    : '[&>div]:bg-red-500'
            }`}
          />
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
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
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
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="mr-2 h-4 w-4" />
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
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
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
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
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
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Enable
            </Button>
          )}
        </div>
      </div>

      {/* Content with Tabs */}
      <Tabs defaultValue="overview" className="px-6 pb-6">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4 bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{config.total_runs}</p>
                  <p className="text-xs text-muted-foreground">Total Runs</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border p-4 bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{config.successful_runs}</p>
                  <p className="text-xs text-muted-foreground">Successful</p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Breakdown */}
          {config.total_runs > 0 && (
            <div className="rounded-xl border p-4 bg-card">
              <h4 className="text-sm font-medium mb-3">Run Results</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm flex-1">Successful</span>
                  <span className="font-bold text-green-500">{config.successful_runs}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-sm flex-1">Failed</span>
                  <span className="font-bold text-red-500">{config.failed_runs}</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-xl border p-4 bg-card">
            <h4 className="text-sm font-medium mb-3">Timeline</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">{formatDate(config.created_at)}</p>
                </div>
              </div>
              {config.last_run_at && (
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                    <Play className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Last Run</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(config.last_run_at)}
                    </p>
                  </div>
                </div>
              )}
              {config.next_run_at && (
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-yellow-500/20 flex items-center justify-center mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Next Scheduled</p>
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
              <p className="text-xs text-muted-foreground mb-1">Scan Type</p>
              <p className="font-medium">{SCAN_TYPE_LABELS[config.scan_type]}</p>
            </div>
            <div className="rounded-xl border p-4 bg-card">
              <p className="text-xs text-muted-foreground mb-1">Schedule</p>
              <p className="font-medium capitalize">{SCHEDULE_TYPE_LABELS[config.schedule_type]}</p>
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="rounded-xl border p-4 bg-card">
            <h4 className="text-sm font-medium mb-3">Schedule Settings</h4>
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
            <h4 className="text-sm font-medium mb-3">Created By</h4>
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
                    <span className="text-xs text-muted-foreground">Asset Groups</span>
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
                    <span className="text-xs text-muted-foreground">Asset Group</span>
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
                      Direct Targets ({config.targets.length})
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
            <h4 className="text-sm font-medium mb-3">Technical Details</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Config ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[150px]">
                    {config.id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(config.id)
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
            <div className="rounded-xl border border-red-500/30 p-4 bg-red-500/5">
              <h4 className="text-sm font-medium text-red-500 mb-2">Danger Zone</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Permanently delete this configuration and all associated data.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleDeleteConfig}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Configuration
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
  onStop: (session: ScanSession) => void
  onRetry: (session: ScanSession) => void
  isActioning?: boolean
}

function RunActionsCell({
  session,
  onViewDetails,
  onStop,
  onRetry,
  isActioning,
}: RunActionsCellProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isActioning}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetails(session)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        {session.status === 'running' && (
          <DropdownMenuItem onClick={() => onStop(session)} disabled={isActioning}>
            <XCircle className="mr-2 h-4 w-4" />
            Stop
          </DropdownMenuItem>
        )}
        {session.status === 'failed' && (
          <DropdownMenuItem onClick={() => onRetry(session)} disabled={isActioning}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </DropdownMenuItem>
        )}
        {session.status === 'completed' && session.findings_total > 0 && (
          <DropdownMenuItem onClick={() => toast.info(`View ${session.findings_total} findings`)}>
            <Shield className="mr-2 h-4 w-4" />
            View Findings
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
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<RunStatusFilter>('all')
  const [rowSelection, setRowSelection] = useState({})

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

  // Filter sessions by search (client-side for better UX)
  const filteredSessions = useMemo(() => {
    if (!globalFilter) return sessions
    const search = globalFilter.toLowerCase()
    return sessions.filter(
      (s) =>
        s.scanner_name.toLowerCase().includes(search) ||
        s.asset_value.toLowerCase().includes(search) ||
        s.asset_type.toLowerCase().includes(search)
    )
  }, [sessions, globalFilter])

  // Status counts from stats
  const statusCounts = useMemo(
    () => ({
      all: stats?.total ?? 0,
      running: stats?.by_status?.running ?? 0,
      completed: stats?.by_status?.completed ?? 0,
      pending: stats?.by_status?.pending ?? 0,
      failed: (stats?.by_status?.failed ?? 0) + (stats?.by_status?.timeout ?? 0),
    }),
    [stats]
  )

  // Action states
  const [actioningSessionId, setActioningSessionId] = useState<string | null>(null)

  // Handlers
  const handleViewDetails = useCallback((session: ScanSession) => {
    setSelectedSession(session)
  }, [])

  const handleStopSession = useCallback(async (session: ScanSession) => {
    setActioningSessionId(session.id)
    try {
      await post(`/api/v1/scan-sessions/${session.id}/stop`, {})
      toast.success('Scan session stopped')
      await invalidateScanSessionsCache()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to stop session'))
    } finally {
      setActioningSessionId(null)
    }
  }, [])

  const handleRetrySession = useCallback(async (session: ScanSession) => {
    setActioningSessionId(session.id)
    try {
      await post(`/api/v1/scan-sessions/${session.id}/retry`, {})
      toast.success('Scan session retry started')
      await invalidateScanSessionsCache()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to retry session'))
    } finally {
      setActioningSessionId(null)
    }
  }, [])

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
        accessorKey: 'scanner_name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Scanner
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.scanner_name}</p>
            {row.original.scanner_version && (
              <p className="text-muted-foreground text-xs">v{row.original.scanner_version}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'asset_value',
        header: 'Target',
        cell: ({ row }) => (
          <div>
            <p className="font-medium truncate max-w-[200px]">{row.original.asset_value}</p>
            <p className="text-muted-foreground text-xs">{row.original.asset_type}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={mapSessionStatusToUI(row.original.status)} />,
      },
      {
        accessorKey: 'findings_total',
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
          const session = row.original
          if (session.findings_total === 0) {
            return <span className="text-muted-foreground">-</span>
          }
          const severities = session.findings_by_severity ?? {}
          return (
            <div className="flex items-center gap-1">
              {(severities.critical ?? 0) > 0 && (
                <Badge className="bg-red-600 px-1.5 text-xs">C {severities.critical}</Badge>
              )}
              {(severities.high ?? 0) > 0 && (
                <Badge className="bg-orange-500 px-1.5 text-xs">H {severities.high}</Badge>
              )}
              {((severities.medium ?? 0) > 0 || (severities.low ?? 0) > 0) && (
                <Badge variant="secondary" className="px-1.5 text-xs">
                  +{(severities.medium ?? 0) + (severities.low ?? 0)}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'findings_new',
        header: 'New',
        cell: ({ row }) => {
          const newFindings = row.original.findings_new
          if (newFindings === 0) return <span className="text-muted-foreground">-</span>
          return (
            <Badge variant="destructive" className="px-1.5 text-xs">
              {newFindings}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'duration_ms',
        header: 'Duration',
        cell: ({ row }) => {
          const durationMs = row.original.duration_ms
          if (!durationMs) {
            return row.original.status === 'running' ? (
              <span className="text-blue-500 text-xs">Running...</span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )
          }
          const seconds = Math.floor(durationMs / 1000)
          const minutes = Math.floor(seconds / 60)
          const hours = Math.floor(minutes / 60)
          if (hours > 0)
            return (
              <span className="text-sm">
                {hours}h {minutes % 60}m
              </span>
            )
          if (minutes > 0)
            return (
              <span className="text-sm">
                {minutes}m {seconds % 60}s
              </span>
            )
          return <span className="text-sm">{seconds}s</span>
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Started',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.started_at || row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <RunActionsCell
            session={row.original}
            onViewDetails={handleViewDetails}
            onStop={handleStopSession}
            onRetry={handleRetrySession}
            isActioning={actioningSessionId === row.original.id}
          />
        ),
      },
    ],
    [handleViewDetails, handleStopSession, handleRetrySession, actioningSessionId]
  )

  const table = useReactTable({
    data: filteredSessions,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {isLoadingStats ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setStatusFilter('all')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Radar className="h-4 w-4" />
                  Total Runs
                </CardDescription>
                <CardTitle className="text-3xl">{statusCounts.all}</CardTitle>
              </CardHeader>
            </Card>
            <Card
              className={`cursor-pointer hover:border-blue-500 transition-colors ${statusFilter === 'running' ? 'border-blue-500' : ''}`}
              onClick={() => setStatusFilter('running')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  Running
                </CardDescription>
                <CardTitle className="text-3xl text-blue-500">{statusCounts.running}</CardTitle>
              </CardHeader>
            </Card>
            <Card
              className={`cursor-pointer hover:border-green-500 transition-colors ${statusFilter === 'completed' ? 'border-green-500' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Completed
                </CardDescription>
                <CardTitle className="text-3xl text-green-500">{statusCounts.completed}</CardTitle>
              </CardHeader>
            </Card>
            <Card
              className={`cursor-pointer hover:border-red-500 transition-colors ${statusFilter === 'failed' ? 'border-red-500' : ''}`}
              onClick={() => setStatusFilter('failed')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Failed
                </CardDescription>
                <CardTitle className="text-3xl text-red-500">{statusCounts.failed}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Total Findings
                </CardDescription>
                <CardTitle className="text-3xl">{stats?.findings_total ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <PlatformUsageCard variant="compact" />
          </>
        )}
      </div>

      {/* Table Card */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scan Sessions</CardTitle>
              <CardDescription>Monitor scan executions and results</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Filter Tabs */}
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as RunStatusFilter)}
            className="mb-4"
          >
            <TabsList>
              {runStatusFilters.map((filter) => (
                <TabsTrigger key={filter.value} value={filter.value} className="gap-1.5">
                  {filter.label}
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {statusCounts[filter.value as keyof typeof statusCounts] ?? 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Search and Export */}
          <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search scanner, target..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              {Object.keys(rowSelection).length > 0 && (
                <Button variant="outline" size="sm">
                  {Object.keys(rowSelection).length} selected
                </Button>
              )}

              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJSON}>
                    <FileJson className="mr-2 h-4 w-4" />
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
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
                {isLoadingSessions ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className="cursor-pointer"
                      onClick={(e) => {
                        if (
                          (e.target as HTMLElement).closest('[role="checkbox"]') ||
                          (e.target as HTMLElement).closest('button')
                        ) {
                          return
                        }
                        setSelectedSession(row.original)
                      }}
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
                      No scan sessions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{' '}
              {table.getFilteredRowModel().rows.length} row(s) selected
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Details Sheet */}
      <Sheet open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto p-0">
          <VisuallyHidden>
            <SheetTitle>Session Details</SheetTitle>
          </VisuallyHidden>
          {selectedSession && (
            <SessionDetailSheet
              session={selectedSession}
              onStop={handleStopSession}
              onRetry={handleRetrySession}
              isActioning={actioningSessionId === selectedSession.id}
            />
          )}
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
  onStop: (session: ScanSession) => void
  onRetry: (session: ScanSession) => void
  isActioning?: boolean
}

function SessionDetailSheet({ session, onStop, onRetry, isActioning }: SessionDetailSheetProps) {
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

  // Format duration from ms
  const formatDurationMs = (ms?: number): string => {
    if (!ms) return '-'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <>
      {/* Hero Header */}
      <div
        className={`px-6 pt-6 pb-4 ${
          session.status === 'running'
            ? 'bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent'
            : session.status === 'completed'
              ? 'bg-gradient-to-br from-green-500/20 via-green-500/10 to-transparent'
              : session.status === 'pending'
                ? 'bg-gradient-to-br from-yellow-500/20 via-yellow-500/10 to-transparent'
                : 'bg-gradient-to-br from-red-500/20 via-red-500/10 to-transparent'
        }`}
      >
        {/* Status & Scanner Row */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="font-medium">
            {session.scanner_name}
            {session.scanner_version && ` v${session.scanner_version}`}
          </Badge>
          <StatusBadge status={mapSessionStatusToUI(session.status)} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold mb-1 truncate">{session.asset_value}</h2>
        <p className="text-sm text-muted-foreground">{session.asset_type}</p>

        {/* Progress Bar */}
        <div className="mt-4 p-4 rounded-xl bg-background/80 backdrop-blur border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Status</span>
            <span
              className={`text-lg font-bold ${
                session.status === 'completed'
                  ? 'text-green-500'
                  : session.status === 'failed' ||
                      session.status === 'timeout' ||
                      session.status === 'canceled'
                    ? 'text-red-500'
                    : session.status === 'running'
                      ? 'text-blue-500'
                      : 'text-yellow-500'
              }`}
            >
              {SCAN_RUN_STATUS_LABELS[session.status]}
            </span>
          </div>
          <Progress
            value={progress}
            className={`h-3 ${
              session.status === 'running'
                ? '[&>div]:animate-pulse [&>div]:bg-blue-500'
                : session.status === 'completed'
                  ? '[&>div]:bg-green-500'
                  : session.status === 'failed' ||
                      session.status === 'timeout' ||
                      session.status === 'canceled'
                    ? '[&>div]:bg-red-500'
                    : '[&>div]:bg-yellow-500'
            }`}
          />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{session.findings_total} findings</span>
            <span>
              {session.duration_ms
                ? formatDurationMs(session.duration_ms)
                : session.status === 'running'
                  ? 'In progress'
                  : '-'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          {session.status === 'running' && (
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => onStop(session)}
              disabled={isActioning}
            >
              {isActioning ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Stop
            </Button>
          )}
          {session.status === 'failed' && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onRetry(session)}
              disabled={isActioning}
            >
              {isActioning ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Retry
            </Button>
          )}
          {session.status === 'completed' && session.findings_total > 0 && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => toast.info(`View ${session.findings_total} findings`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Findings
            </Button>
          )}
          {(session.status === 'pending' ||
            (session.status === 'completed' && session.findings_total === 0)) && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => {
                navigator.clipboard.writeText(session.id)
                toast.success('Session ID copied to clipboard')
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy ID
            </Button>
          )}
        </div>
      </div>

      {/* Content with Tabs */}
      <Tabs defaultValue="overview" className="px-6 pb-6">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4 bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{session.findings_total}</p>
                  <p className="text-xs text-muted-foreground">Total Findings</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border p-4 bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{session.findings_new}</p>
                  <p className="text-xs text-muted-foreground">New Findings</p>
                </div>
              </div>
            </div>
          </div>

          {/* Findings Breakdown */}
          {session.findings_total > 0 && (
            <div className="rounded-xl border p-4 bg-card">
              <h4 className="text-sm font-medium mb-3">Findings by Severity</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-600" />
                  <span className="text-sm flex-1">Critical</span>
                  <span className="font-bold text-red-600">{criticalCount}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <span className="text-sm flex-1">High</span>
                  <span className="font-bold text-orange-500">{highCount}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-sm flex-1">Medium</span>
                  <span className="font-bold text-yellow-500">{mediumCount}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm flex-1">Low</span>
                  <span className="font-bold text-blue-500">{lowCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Fixed Findings */}
          {session.findings_fixed > 0 && (
            <div className="rounded-xl border p-4 bg-card border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{session.findings_fixed}</p>
                  <p className="text-xs text-muted-foreground">Fixed since last scan</p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-xl border p-4 bg-card">
            <h4 className="text-sm font-medium mb-3">Timeline</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">{formatDate(session.created_at)}</p>
                </div>
              </div>
              {session.started_at && (
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                    <Play className="h-3.5 w-3.5 text-blue-500" />
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
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center mt-0.5 ${
                      session.status === 'completed' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}
                  >
                    {session.status === 'completed' ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
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
              <h4 className="text-sm font-medium mb-3">Findings Summary</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {session.findings_total} vulnerabilities detected on {session.asset_value}.
                {session.findings_new > 0 && ` ${session.findings_new} are new.`}
              </p>
              <Button className="w-full" onClick={() => toast.info('Navigating to findings')}>
                View All Findings
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border p-8 bg-card text-center">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h4 className="font-medium mb-1">No Findings</h4>
              <p className="text-sm text-muted-foreground">
                {session.status === 'completed'
                  ? 'Great news! No vulnerabilities were detected.'
                  : 'Scan is still in progress or has not started yet.'}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4 mt-0">
          {/* Scanner Info */}
          <div className="rounded-xl border p-4 bg-card">
            <h4 className="text-sm font-medium mb-3">Scanner Information</h4>
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
            <h4 className="text-sm font-medium mb-3">Target Information</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Asset Type</span>
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
            <h4 className="text-sm font-medium mb-3">Technical Details</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Session ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[150px]">
                    {session.id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      navigator.clipboard.writeText(session.id)
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
                  <span className="text-sm font-medium">
                    {formatDurationMs(session.duration_ms)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {session.error_message && (
            <div className="rounded-xl border border-red-500/30 p-4 bg-red-500/5">
              <h4 className="text-sm font-medium text-red-500 mb-2">Error</h4>
              <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                {session.error_message}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
