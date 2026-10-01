'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, RadioTower, Loader2, Search, Download, Trash2, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RefreshButton, TableSkeleton } from '@/components/list-page-parts'
import { useUrlFilter } from '@/hooks/use-url-param'
import { Can, Permission } from '@/lib/permissions'

import { AddSensorDialog } from './add-sensor-dialog'
import { EditSensorDialog } from './edit-sensor-dialog'
import { RegenerateKeyDialog } from './regenerate-key-dialog'
import { SensorConfigDialog } from './sensor-config-dialog'
import { SensorDetailSheet } from './sensor-detail-sheet'
import { SensorTable } from './sensor-table'
import {
  useSensors,
  useTenantSensorStats,
  useDeleteSensor,
  useBulkDeleteSensors,
  useActivateSensor,
  useDeactivateSensor,
  useRevokeSensor,
  invalidateSensorsCache,
} from '@/lib/api/sensor-hooks'
import type { SensorListFilters, Sensor, SensorRole } from '@/lib/api/sensor-types'
import { sensorRoleOf } from '@/lib/api/sensor-types'
import { Tabs, TabsCount, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlatformStatsCard } from '@/features/platform'
import {
  BulkActionBar,
  EmptyState,
  ErrorState,
  MetricStrip,
  PageHeader,
  type MetricStripItem,
} from '@/features/shared'

type ModeFilter = 'all' | 'daemon' | 'standalone'
/** Settings → Sensors tabs: one per role the data supports today (RFC-023 §9.3 R0). */
type RoleTab = 'all' | 'scanners' | 'collectors'
const ROLE_OF_TAB: Record<Exclude<RoleTab, 'all'>, SensorRole> = {
  scanners: 'scanner',
  collectors: 'collector',
}
type SensorTypeFilter = 'runner' | 'worker' | 'collector' | 'sensor'

interface SensorsSectionProps {
  typeFilter?: SensorTypeFilter
  /** Page title and description; the section renders the page header. */
  title?: string
  description?: string
}

interface SensorStats {
  total: number
  online: number
  offline: number
  error: number
  activeJobs: number
  byMode: {
    daemon: number
    standalone: number
  }
  byType: {
    collector: number
  }
}

// Check if sensor is online using the health field from backend
function isSensorOnline(sensor: Sensor): boolean {
  // Only active sensors can be online
  if (sensor.status !== 'active') return false
  // Use the health field from backend (heartbeat-based)
  return sensor.health === 'online'
}

// Get metrics for a sensor - uses real data from backend
function getSensorMetrics(sensor: Sensor) {
  if (sensor.status !== 'active' || sensor.health !== 'online') {
    return { cpu: 0, memory: 0, activeJobs: 0 }
  }
  // Use real metrics from backend
  return {
    cpu: sensor.cpu_percent || 0,
    memory: sensor.memory_percent || 0,
    activeJobs: sensor.active_jobs || 0,
  }
}

function calculateStats(sensors: Sensor[]): SensorStats {
  const daemonSensors = sensors.filter((w) => w.execution_mode === 'daemon')
  const onlineSensors = sensors.filter(isSensorOnline)

  // Calculate total active jobs from online daemon sensors
  const totalActiveJobs = daemonSensors
    .filter(isSensorOnline)
    .reduce((sum, a) => sum + getSensorMetrics(a).activeJobs, 0)

  const total = sensors.length
  const online = onlineSensors.length
  const error = sensors.filter((w) => w.health === 'error').length

  return {
    total,
    online,
    // Offline is everything that is neither online nor errored (offline/unknown
    // health, disabled/revoked status, ...). Deriving it as the remainder keeps
    // the KPI buckets reconciling to Total (online + offline + error === total)
    // instead of double-counting e.g. a disabled sensor whose health is offline.
    offline: Math.max(total - online - error, 0),
    error,
    activeJobs: totalActiveJobs,
    byMode: {
      daemon: daemonSensors.length,
      standalone: sensors.filter((w) => w.execution_mode === 'standalone').length,
    },
    byType: {
      collector: sensors.filter((w) => w.type === 'collector').length,
    },
  }
}

export function SensorsSection({
  typeFilter,
  title = 'Sensors',
  description = 'Sensors (formerly Agents) run your scans and collect data. Add one, then deploy it with its API key.',
}: SensorsSectionProps) {
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [regenerateKeyDialogOpen, setRegenerateKeyDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  // Selected sensor for dialogs
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null)

  // View and filter states
  // Filters and search live in the URL so a filtered view can be shared.
  const [modeParam, setModeFilter] = useUrlFilter('mode', 'all')
  const [tabParam, setTabParam] = useUrlFilter('tab', 'all')
  const [statusFilter, setStatusFilter] = useUrlFilter('status', 'all')
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  // Collectors used to be a value of the mode filter; a link or bookmark
  // carrying ?mode=collector now opens the Collectors tab.
  const legacyCollectorMode = modeParam === 'collector'
  const activeMode = (legacyCollectorMode ? 'all' : modeParam) as ModeFilter
  const activeRoleTab: RoleTab = legacyCollectorMode
    ? 'collectors'
    : tabParam in ROLE_OF_TAB
      ? (tabParam as RoleTab)
      : 'all'
  const setRoleTab = useCallback(
    (next: string) => {
      if (legacyCollectorMode) setModeFilter('all')
      setTabParam(next)
    },
    [legacyCollectorMode, setModeFilter, setTabParam]
  )
  const [_filters] = useState<SensorListFilters>({})

  // Row selection (owned by the table; mirrored here for the bulk-action bar)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionEpoch, setSelectionEpoch] = useState(0)
  const clearSelection = useCallback(() => setSelectionEpoch((n) => n + 1), [])

  // API data
  const { data: sensorsData, error, isLoading, mutate } = useSensors(_filters)
  const sensors: Sensor[] = useMemo(() => sensorsData?.items ?? [], [sensorsData?.items])

  // Tenant-wide aggregated stats — independent of pagination/filters so the
  // top stat cards always reflect the FULL dataset, not just the current page.
  const { data: tenantSensorStats } = useTenantSensorStats()

  // Mutations
  const { trigger: deleteSensorTrigger, isMutating: isDeleting } = useDeleteSensor(
    selectedSensor?.id || ''
  )
  const { trigger: bulkDeleteSensorsTrigger, isMutating: isBulkDeleting } = useBulkDeleteSensors()
  const { trigger: activateSensorTrigger } = useActivateSensor(selectedSensor?.id || '')
  const { trigger: deactivateSensorTrigger } = useDeactivateSensor(selectedSensor?.id || '')
  const { trigger: revokeSensorTrigger } = useRevokeSensor(selectedSensor?.id || '')

  // Apply type filter first if provided
  const typeFilteredSensors = useMemo(() => {
    if (!typeFilter) return sensors
    return sensors.filter((a) => a.type === typeFilter)
  }, [sensors, typeFilter])

  const roleCounts = useMemo(() => {
    const counts: Record<SensorRole, number> = { scanner: 0, collector: 0 }
    for (const s of typeFilteredSensors) counts[sensorRoleOf(s.type)]++
    return counts
  }, [typeFilteredSensors])

  // Stats — prefer the API-aggregated tenant stats (accurate across all
  // pages); fall back to per-page calculation if the stats request hasn't
  // resolved yet (or for the type-filtered case where we filter client-side).
  const stats = useMemo(() => {
    if (tenantSensorStats && !typeFilter) {
      // Single source of truth: derive every status bucket from the tenant
      // total so Total === Online + Offline + Error. `online_active` counts
      // sensors that are both active AND health='online'; Offline is the
      // remainder (offline/unknown health + disabled/revoked status), which
      // avoids double-counting a sensor across by_health and by_status.
      const total = tenantSensorStats.total
      const online = tenantSensorStats.online_active ?? tenantSensorStats.by_health?.online ?? 0
      const error = tenantSensorStats.by_health?.error ?? 0
      return {
        total,
        online,
        offline: Math.max(total - online - error, 0),
        error,
        activeJobs: tenantSensorStats.active_jobs,
        byMode: {
          daemon: tenantSensorStats.by_execution_mode?.daemon ?? 0,
          standalone: tenantSensorStats.by_execution_mode?.standalone ?? 0,
        },
        byType: {
          collector: tenantSensorStats.by_type?.collector ?? 0,
        },
      }
    }
    return calculateStats(typeFilteredSensors)
  }, [tenantSensorStats, typeFilter, typeFilteredSensors])

  // Filter sensors based on tab, status, and search
  const filteredSensors = useMemo(() => {
    let result = [...typeFilteredSensors]

    // Filter by role tab, then execution mode
    if (activeRoleTab !== 'all') {
      const role = ROLE_OF_TAB[activeRoleTab]
      result = result.filter((a) => sensorRoleOf(a.type) === role)
    }
    if (activeMode === 'daemon') {
      result = result.filter((a) => a.execution_mode === 'daemon')
    } else if (activeMode === 'standalone') {
      result = result.filter((a) => a.execution_mode === 'standalone')
    }

    // Filter by status/health
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'online':
          result = result.filter((a) => a.status === 'active' && a.health === 'online')
          break
        case 'offline':
          result = result.filter(
            (a) => a.status === 'active' && (a.health === 'offline' || a.health === 'unknown')
          )
          break
        case 'error':
          result = result.filter((a) => a.health === 'error')
          break
        case 'disabled':
          result = result.filter((a) => a.status === 'disabled')
          break
        case 'revoked':
          result = result.filter((a) => a.status === 'revoked')
          break
      }
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query) ||
          a.hostname?.toLowerCase().includes(query) ||
          a.ip_address?.toLowerCase().includes(query)
      )
    }

    return result
  }, [typeFilteredSensors, activeRoleTab, activeMode, statusFilter, searchQuery])

  // Handlers
  const handleRefresh = useCallback(async () => {
    await invalidateSensorsCache()
    await mutate()
    toast.success('Sensors refreshed')
  }, [mutate])

  const handleViewSensor = useCallback((sensor: Sensor) => {
    setSelectedSensor(sensor)
    setDetailSheetOpen(true)
  }, [])

  const handleEditSensor = useCallback((sensor: Sensor) => {
    setSelectedSensor(sensor)
    setDetailSheetOpen(false)
    setEditDialogOpen(true)
  }, [])

  const handleRegenerateKey = useCallback((sensor: Sensor) => {
    setSelectedSensor(sensor)
    setDetailSheetOpen(false)
    setRegenerateKeyDialogOpen(true)
  }, [])

  const handleViewConfig = useCallback((sensor: Sensor) => {
    setSelectedSensor(sensor)
    setDetailSheetOpen(false)
    setConfigDialogOpen(true)
  }, [])

  const handleDeleteClick = useCallback((sensor: Sensor) => {
    setSelectedSensor(sensor)
    setDetailSheetOpen(false)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedSensor) return
    try {
      await deleteSensorTrigger()
      toast.success(`Sensor "${selectedSensor.name}" deleted`)
      await invalidateSensorsCache()
      setDeleteDialogOpen(false)
      setSelectedSensor(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete sensor'))
    }
  }, [selectedSensor, deleteSensorTrigger])

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selectedIds.length === 0) return

    try {
      const results = await bulkDeleteSensorsTrigger(selectedIds)
      const successCount = results?.filter((r) => r.success).length || 0
      const failCount = results?.filter((r) => !r.success).length || 0

      if (failCount === 0) {
        toast.success(`${successCount} sensor(s) deleted successfully`)
      } else if (successCount > 0) {
        toast.warning(`${successCount} deleted, ${failCount} failed`)
      } else {
        toast.error('Failed to delete sensors')
      }

      await invalidateSensorsCache()
      setBulkDeleteDialogOpen(false)
      clearSelection()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete sensors'))
    }
  }, [selectedIds, bulkDeleteSensorsTrigger, clearSelection])

  const handleActivateSensor = useCallback(
    async (sensor: Sensor) => {
      setSelectedSensor(sensor)
      try {
        const updatedSensor = await activateSensorTrigger()
        toast.success(`Sensor "${sensor.name}" activated`)
        await invalidateSensorsCache()
        await mutate()
        // Update selectedSensor with the response from API
        if (updatedSensor) {
          setSelectedSensor(updatedSensor)
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to activate sensor'))
      }
    },
    [activateSensorTrigger, mutate]
  )

  const handleDeactivateSensor = useCallback(
    async (sensor: Sensor) => {
      setSelectedSensor(sensor)
      try {
        const updatedSensor = await deactivateSensorTrigger()
        toast.success(`Sensor "${sensor.name}" deactivated`)
        await invalidateSensorsCache()
        await mutate()
        // Update selectedSensor with the response from API
        if (updatedSensor) {
          setSelectedSensor(updatedSensor)
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to deactivate sensor'))
      }
    },
    [deactivateSensorTrigger, mutate]
  )

  const handleRevokeSensor = useCallback((sensor: Sensor) => {
    setSelectedSensor(sensor)
    setDetailSheetOpen(false)
    setRevokeDialogOpen(true)
  }, [])

  const [isRevoking, setIsRevoking] = useState(false)

  const handleRevokeConfirm = useCallback(async () => {
    if (!selectedSensor) return
    setIsRevoking(true)
    try {
      const updatedSensor = await revokeSensorTrigger()
      toast.success(`Sensor "${selectedSensor.name}" access revoked`)
      await invalidateSensorsCache()
      await mutate()
      setRevokeDialogOpen(false)
      // Update selectedSensor with the response from API
      if (updatedSensor) {
        setSelectedSensor(updatedSensor)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to revoke sensor'))
    } finally {
      setIsRevoking(false)
    }
  }, [selectedSensor, revokeSensorTrigger, mutate])

  const handleExport = useCallback(() => {
    const csv = [
      ['Name', 'Type', 'Status', 'Mode', 'Scans', 'Findings', 'Last Seen'].join(','),
      ...sensors.map((w) =>
        [
          w.name,
          w.type,
          w.status,
          w.execution_mode,
          w.total_scans,
          w.total_findings,
          w.last_seen_at || 'Never',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sensors.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Sensors exported')
  }, [sensors])

  // Each status metric toggles the matching status filter.
  const toggleStatus = (value: string) => setStatusFilter(statusFilter === value ? 'all' : value)
  const metrics: MetricStripItem[] = [
    { key: 'total', label: 'Sensors', value: stats.total },
    {
      key: 'online',
      label: 'Online',
      value: stats.online,
      onClick: () => toggleStatus('online'),
      active: statusFilter === 'online',
    },
    {
      key: 'offline',
      label: 'Offline',
      value: stats.offline,
      onClick: () => toggleStatus('offline'),
      active: statusFilter === 'offline',
    },
    {
      key: 'error',
      label: 'Error',
      value: stats.error,
      tone: 'danger',
      onClick: () => toggleStatus('error'),
      active: statusFilter === 'error',
    },
    { key: 'jobs', label: 'Active jobs', value: stats.activeJobs },
  ]

  const toolbarStart = (
    <>
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, host or IP…"
          aria-label="Search sensors"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 ps-9"
        />
      </div>
      <Select value={activeMode} onValueChange={setModeFilter}>
        <SelectTrigger className="h-9 w-[150px]" aria-label="Mode">
          <SelectValue placeholder="All modes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All modes ({stats.total})</SelectItem>
          <SelectItem value="daemon">Daemon ({stats.byMode.daemon})</SelectItem>
          <SelectItem value="standalone">CI/CD ({stats.byMode.standalone})</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9 w-[140px]" aria-label="Status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="online">Online</SelectItem>
          <SelectItem value="offline">Offline</SelectItem>
          <SelectItem value="error">Error</SelectItem>
          <SelectItem value="disabled">Disabled</SelectItem>
          <SelectItem value="revoked">Revoked</SelectItem>
        </SelectContent>
      </Select>
    </>
  )

  const hasFilter =
    !!searchQuery || activeMode !== 'all' || activeRoleTab !== 'all' || statusFilter !== 'all'

  let body: React.ReactNode
  if (error) {
    body = <ErrorState title="sensors" error={error} onRetry={handleRefresh} />
  } else if (isLoading) {
    body = <TableSkeleton rows={5} />
  } else if (typeFilteredSensors.length === 0 && !hasFilter) {
    body = (
      <EmptyState
        icon={RadioTower}
        title="No sensors"
        description="Create a sensor to start scanning and collecting data."
        action={
          <Can permission={Permission.SensorsWrite}>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add sensor
            </Button>
          </Can>
        }
      />
    )
  } else {
    body = (
      <SensorTable
        sensors={filteredSensors}
        onViewSensor={handleViewSensor}
        onEditSensor={handleEditSensor}
        onActivateSensor={handleActivateSensor}
        onDeactivateSensor={handleDeactivateSensor}
        onDeleteSensor={handleDeleteClick}
        onRegenerateKey={handleRegenerateKey}
        onSelectionChange={(rows) => setSelectedIds(rows.map((a) => a.id))}
        resetSelectionKey={selectionEpoch}
        toolbarStart={toolbarStart}
        toolbarEnd={<RefreshButton onClick={handleRefresh} loading={isLoading} />}
      />
    )
  }

  return (
    <>
      <PageHeader title={title} description={description}>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Can permission={Permission.SensorsWrite}>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add sensor
          </Button>
        </Can>
      </PageHeader>

      {!typeFilter && (
        <Tabs value={activeRoleTab} onValueChange={setRoleTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="all">
              All <TabsCount value={isLoading ? null : typeFilteredSensors.length} />
            </TabsTrigger>
            <TabsTrigger value="scanners">
              Scanners <TabsCount value={isLoading ? null : roleCounts.scanner} />
            </TabsTrigger>
            <TabsTrigger value="collectors">
              Collectors <TabsCount value={isLoading ? null : roleCounts.collector} />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <MetricStrip className="mt-5" loading={isLoading} items={metrics} />

      <div className="mt-5">{body}</div>

      {/* Cloud-hosted platform sensors: capacity and queue, separate from the
          tenant's own sensors listed above, so it follows the table. */}
      <PlatformStatsCard className="mt-5" />

      <Can permission={Permission.SensorsDelete}>
        <BulkActionBar count={selectedIds.length} onClear={clearSelection} noun="sensors selected">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </BulkActionBar>
      </Can>

      {/* Dialogs - Only render AddSensorDialog when open to avoid loading tools/capabilities on page load */}
      {addDialogOpen && (
        <AddSensorDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={handleRefresh}
        />
      )}

      {selectedSensor && (
        <>
          <EditSensorDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            sensor={selectedSensor}
          />

          <RegenerateKeyDialog
            open={regenerateKeyDialogOpen}
            onOpenChange={setRegenerateKeyDialogOpen}
            sensor={selectedSensor}
          />

          <SensorConfigDialog
            open={configDialogOpen}
            onOpenChange={setConfigDialogOpen}
            sensor={selectedSensor!}
          />

          <SensorDetailSheet
            sensor={selectedSensor}
            open={detailSheetOpen}
            onOpenChange={setDetailSheetOpen}
            onEdit={handleEditSensor}
            onRegenerateKey={handleRegenerateKey}
            onViewConfig={handleViewConfig}
            onDelete={handleDeleteClick}
            onActivate={handleActivateSensor}
            onDeactivate={handleDeactivateSensor}
            onRevoke={handleRevokeSensor}
          />
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete sensor"
        desc={
          <>
            Are you sure you want to delete <strong>{selectedSensor?.name}</strong>? This action
            cannot be undone and will invalidate the sensor&apos;s API key.
          </>
        }
        confirmText="Delete"
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDeleteConfirm}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete sensors"
        desc={
          <>
            Are you sure you want to delete <strong>{selectedIds.length}</strong> sensor(s)? This
            action cannot be undone and will invalidate all their API keys.
          </>
        }
        confirmText="Delete all"
        destructive
        isLoading={isBulkDeleting}
        handleConfirm={handleBulkDeleteConfirm}
      />

      {/* Revoke Confirmation */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Revoke sensor access
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Permanently revoke access for <strong>{selectedSensor?.name}</strong>?
                </p>
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
                  <p className="text-xs font-medium">This is permanent</p>
                  <ul className="mt-1.5 space-y-0.5 text-xs">
                    <li>- Sensor loses access immediately</li>
                    <li>- Cannot be undone</li>
                    <li>- Must create new sensor to restore</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use <strong>Deactivate</strong> for temporary suspension.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRevokeDialogOpen(false)
                if (selectedSensor) {
                  handleDeactivateSensor(selectedSensor)
                }
              }}
              disabled={isRevoking}
            >
              Deactivate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRevokeConfirm}
              disabled={isRevoking}
            >
              {isRevoking && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Revoke
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
