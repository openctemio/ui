'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Plus, RadioTower, Loader2, Search, Download, Trash2, Ban, Layers } from 'lucide-react'
import { toast } from 'sonner'

import { ScanZonesPanel } from '@/features/scan-zones'
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
import { useUrlFilter, useUrlFilterList } from '@/hooks/use-url-param'
import { useNow } from '@/hooks/use-now'
import { exportToCsv } from '@/hooks/use-csv-export'
import { Can, Permission, useHasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

import { AddSensorDialog } from './add-sensor-dialog'
import { EditSensorDialog } from './edit-sensor-dialog'
import { RegenerateKeyDialog } from './regenerate-key-dialog'
import { SensorConfigDialog } from './sensor-config-dialog'
import { SensorDetailSheet } from './sensor-detail-sheet'
import { SensorTable } from './sensor-table'
import { FleetHealthStrip } from './fleet-health-strip'
import { SensorFacetPanel } from './sensor-facet-panel'
import {
  useAllSensors,
  useTenantSensorStats,
  useDeleteSensor,
  useBulkDeleteSensors,
  useActivateSensor,
  useDeactivateSensor,
  useRevokeSensor,
  invalidateSensorsCache,
} from '@/lib/api/sensor-hooks'
import { useScanZones } from '@/lib/api/scan-zone-hooks'
import type { Sensor, SensorRole, SensorState, SensorVersionStatus } from '@/lib/api/sensor-types'
import { Tabs, TabsCount, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlatformSensorsLink } from '@/features/platform'
import { BulkActionBar, EmptyState, ErrorState, FilterSheet, PageHeader } from '@/features/shared'

import {
  DEFAULT_FLEET_THRESHOLDS,
  SENSOR_STATE_META,
  SENSOR_STATES,
  sensorState,
  type FleetThresholds,
} from '../lib/sensor-state'
import { normalizeSensorVersion, sensorVersionStatus } from '../lib/sensor-version'
import {
  activeFilterCount,
  filterSensors,
  groupSensors,
  summarizeFleet,
  tenantSensors,
  type FleetFilters,
  type FleetGroupBy,
  type ReleaseChannel,
  type SensorModeFilter,
  type SensorProtocolFilter,
} from '../lib/fleet'

type SensorTypeFilter = 'runner' | 'worker' | 'collector' | 'sensor'

interface SensorsSectionProps {
  typeFilter?: SensorTypeFilter
  /** Page title and description; the section renders the page header. */
  title?: string
  description?: string
}

const ROLES: SensorRole[] = ['scanner', 'collector']
const VERSION_STATUSES: SensorVersionStatus[] = [
  'latest',
  'update_available',
  'unsupported',
  'unknown',
]
const MODES: SensorModeFilter[] = ['daemon', 'ci']
const PROTOCOLS: SensorProtocolFilter[] = ['v2', 'v1', 'unknown']
const GROUP_LABELS: Record<Exclude<FleetGroupBy, 'none'>, string> = {
  zone: 'Zone',
  role: 'Role',
  version: 'Version',
}

/** Old single-value links (?status=, ?tab=scanners, ?mode=collector) keep working. */
function legacyStates(status: string): SensorState[] {
  switch (status) {
    case '':
    case 'all':
      return []
    case 'online':
      return ['online', 'degraded']
    case 'offline':
      return ['stale', 'offline', 'never_connected']
    case 'error':
      return ['degraded']
    default:
      return (SENSOR_STATES as string[]).includes(status) ? [status as SensorState] : []
  }
}

/** "Live · updated 3s ago": the list refreshes every 15s while the tab is visible. */
function LiveIndicator({ updatedAt, now }: { updatedAt: number | null; now: number }) {
  if (!updatedAt) return null
  const secs = Math.max(0, Math.round((now - updatedAt) / 1000))
  return (
    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      Live · updated {secs < 5 ? 'just now' : `${secs}s ago`}
    </span>
  )
}

export function SensorsSection({
  typeFilter,
  title = 'Sensors',
  description = 'The scanners and collectors that run inside your networks and report back to the platform.',
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
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [zoneCreateOpen, setZoneCreateOpen] = useState(false)

  // Selected sensor for dialogs. The drawer follows the live list (and re-reads
  // GET /sensors/{id}), so it never shows a snapshot from when it was opened.
  const [selectedSensorSnapshot, setSelectedSensor] = useState<Sensor | null>(null)

  // Filters, search and grouping live in the URL so a view can be shared.
  const [tabParam, setTabParam] = useUrlFilter('tab', '')
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const [roleParam, setRoleParam] = useUrlFilterList('role')
  const [stateParam, setStateParam] = useUrlFilterList('state')
  const [versionParam, setVersionParam] = useUrlFilterList('version')
  const [modeParam, setModeParam] = useUrlFilterList('mode')
  const [protocolParam, setProtocolParam] = useUrlFilterList('protocol')
  const [attentionParam, setAttentionParam] = useUrlFilter('attention', '')
  const [groupParam, setGroupParam] = useUrlFilter('group', '')
  // Pre-redesign links: ?status=online, ?tab=scanners|collectors, ?mode=collector.
  const [legacyStatus, setLegacyStatus] = useUrlFilter('status', '')

  const canReadZones = useHasPermission(Permission.ScanZonesRead)
  const zonesTab = tabParam === 'zones' && canReadZones && !typeFilter

  const filters = useMemo<FleetFilters>(() => {
    const roles = roleParam.filter((r): r is SensorRole => (ROLES as string[]).includes(r))
    if (roles.length === 0 && tabParam === 'scanners') roles.push('scanner')
    if (roles.length === 0 && (tabParam === 'collectors' || modeParam.includes('collector'))) {
      roles.push('collector')
    }
    const states = stateParam.filter((s): s is SensorState =>
      (SENSOR_STATES as string[]).includes(s)
    )
    const modes = modeParam
      .map((m) => (m === 'standalone' ? 'ci' : m))
      .filter((m): m is SensorModeFilter => (MODES as string[]).includes(m))
    return {
      q: searchQuery,
      roles,
      states: states.length ? states : legacyStates(legacyStatus),
      versions: versionParam.filter((v): v is SensorVersionStatus =>
        (VERSION_STATUSES as string[]).includes(v)
      ),
      modes,
      protocols: protocolParam.filter((p): p is SensorProtocolFilter =>
        (PROTOCOLS as string[]).includes(p)
      ),
      attention: attentionParam === '1',
    }
  }, [
    protocolParam,
    roleParam,
    stateParam,
    versionParam,
    modeParam,
    attentionParam,
    searchQuery,
    tabParam,
    legacyStatus,
  ])

  // Writing any facet drops the legacy single-value params it replaces.
  const clearLegacy = useCallback(() => {
    if (legacyStatus) setLegacyStatus('')
    if (tabParam === 'scanners' || tabParam === 'collectors') setTabParam('')
  }, [legacyStatus, setLegacyStatus, tabParam, setTabParam])

  const setFilters = useCallback(
    (next: FleetFilters) => {
      clearLegacy()
      setRoleParam(next.roles)
      setStateParam(next.states)
      setVersionParam(next.versions)
      setModeParam(next.modes)
      setProtocolParam(next.protocols)
      setAttentionParam(next.attention ? '1' : '')
    },
    [
      clearLegacy,
      setRoleParam,
      setStateParam,
      setVersionParam,
      setModeParam,
      setProtocolParam,
      setAttentionParam,
    ]
  )

  // Row selection (owned by the table; mirrored here for the bulk-action bar)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionEpoch, setSelectionEpoch] = useState(0)
  const clearSelection = useCallback(() => setSelectionEpoch((n) => n + 1), [])

  // The clock the state ladder and "4s ago" read (ticks every 5s).
  const now = useNow()

  // API data: the whole fleet (every page), refreshed every 15s.
  const { data: sensorsData, error, isLoading, mutate } = useAllSensors()
  const sensors: Sensor[] = useMemo(() => sensorsData?.items ?? [], [sensorsData?.items])
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  useEffect(() => {
    if (sensorsData) setUpdatedAt(Date.now())
  }, [sensorsData])

  const selectedSensor = useMemo(
    () =>
      selectedSensorSnapshot
        ? (sensors.find((s) => s.id === selectedSensorSnapshot.id) ?? selectedSensorSnapshot)
        : null,
    [sensors, selectedSensorSnapshot]
  )

  // Ladder thresholds and the release channel the API uses.
  const { data: tenantSensorStats } = useTenantSensorStats()
  const thresholds = useMemo<FleetThresholds>(
    () => ({
      onlineWindowSeconds:
        tenantSensorStats?.online_window_seconds ?? DEFAULT_FLEET_THRESHOLDS.onlineWindowSeconds,
      offlineAfterSeconds:
        tenantSensorStats?.offline_after_seconds ?? DEFAULT_FLEET_THRESHOLDS.offlineAfterSeconds,
    }),
    [tenantSensorStats?.online_window_seconds, tenantSensorStats?.offline_after_seconds]
  )
  const channel = useMemo<ReleaseChannel>(
    () => ({
      latest: normalizeSensorVersion(tenantSensorStats?.latest_version),
      min: normalizeSensorVersion(tenantSensorStats?.min_version),
    }),
    [tenantSensorStats?.latest_version, tenantSensorStats?.min_version]
  )

  // Zones, for grouping and the coverage metric.
  const { data: zonesData } = useScanZones(canReadZones && !typeFilter)
  const zones = useMemo(() => zonesData?.data ?? [], [zonesData?.data])

  // Mutations. Each takes the target sensor's id when triggered: the row
  // handlers below select a sensor and trigger in the same call, so a hook
  // bound to `selectedSensor` would act on the previously selected one.
  const { trigger: deleteSensorTrigger, isMutating: isDeleting } = useDeleteSensor()
  const { trigger: bulkDeleteSensorsTrigger, isMutating: isBulkDeleting } = useBulkDeleteSensors()
  const { trigger: activateSensorTrigger } = useActivateSensor()
  const { trigger: deactivateSensorTrigger } = useDeactivateSensor()
  const { trigger: revokeSensorTrigger } = useRevokeSensor()

  // The tenant's own sensors (platform sensors have their own page); the
  // /runners page shows one type.
  const scopedSensors = useMemo(() => {
    const own = tenantSensors(sensors)
    return typeFilter ? own.filter((a) => a.type === typeFilter) : own
  }, [sensors, typeFilter])

  const summary = useMemo(
    () => summarizeFleet(scopedSensors, now, thresholds, channel, zones),
    [scopedSensors, now, thresholds, channel, zones]
  )

  const filteredSensors = useMemo(
    () => filterSensors(scopedSensors, filters, now, thresholds, channel),
    [scopedSensors, filters, now, thresholds, channel]
  )

  const groupBy: FleetGroupBy =
    groupParam === 'role' || groupParam === 'version' || (groupParam === 'zone' && zones.length)
      ? (groupParam as FleetGroupBy)
      : 'none'

  const groups = useMemo(
    () => groupSensors(filteredSensors, groupBy, zones),
    [filteredSensors, groupBy, zones]
  )
  const rowGroups = useMemo(() => {
    if (groupBy === 'none') return undefined
    const keyOf = new Map<string, string>()
    for (const g of groups) for (const s of g.sensors) keyOf.set(s.id, g.key)
    const byKey = new Map(groups.map((g) => [g.key, g]))
    return {
      getKey: (s: Sensor) => keyOf.get(s.id) ?? '',
      order: groups.map((g) => g.key),
      renderHeader: (key: string, rows: Sensor[]) => {
        const g = byKey.get(key)
        if (!g) return null
        const online = rows.filter((s) => {
          const st = sensorState(s, now, thresholds)
          return st === 'online' || st === 'degraded'
        }).length
        const zoneGap = g.zone && online === 0
        return (
          <span className="flex flex-wrap items-center gap-x-1.5">
            <span className="font-medium text-foreground">{g.label}</span>
            {g.zone && g.zone.ranges.length > 0 && (
              <span className="font-mono">· {g.zone.ranges.slice(0, 2).join(', ')}</span>
            )}
            <span>
              · {rows.length} {rows.length === 1 ? 'sensor' : 'sensors'}
            </span>
            {zoneGap ? (
              <span className="text-destructive">· no online sensor, scans here will wait</span>
            ) : (
              <span>· {online} online</span>
            )}
            {key === '__none__' && groupBy === 'zone' && (
              <span>· takes jobs that no zone claims</span>
            )}
          </span>
        )
      },
    }
  }, [groupBy, groups, now, thresholds])

  const roleCount = scopedSensors.length

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
      await deleteSensorTrigger(selectedSensor.id)
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
        const updatedSensor = await activateSensorTrigger(sensor.id)
        toast.success(`Sensor "${sensor.name}" enabled`)
        await invalidateSensorsCache()
        await mutate()
        if (updatedSensor) setSelectedSensor(updatedSensor)
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to enable sensor'))
      }
    },
    [activateSensorTrigger, mutate]
  )

  const handleDeactivateSensor = useCallback(
    async (sensor: Sensor) => {
      setSelectedSensor(sensor)
      try {
        const updatedSensor = await deactivateSensorTrigger(sensor.id)
        toast.success(`Sensor "${sensor.name}" disabled`)
        await invalidateSensorsCache()
        await mutate()
        if (updatedSensor) setSelectedSensor(updatedSensor)
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to disable sensor'))
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
      const updatedSensor = await revokeSensorTrigger(selectedSensor.id)
      toast.success(`Sensor "${selectedSensor.name}" access revoked`)
      await invalidateSensorsCache()
      await mutate()
      setRevokeDialogOpen(false)
      if (updatedSensor) setSelectedSensor(updatedSensor)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to revoke sensor'))
    } finally {
      setIsRevoking(false)
    }
  }, [selectedSensor, revokeSensorTrigger, mutate])

  const handleExport = useCallback(() => {
    exportToCsv(
      filteredSensors,
      [
        { header: 'Name', accessor: (s) => s.name },
        {
          header: 'Status',
          accessor: (s) => SENSOR_STATE_META[sensorState(s, now, thresholds)].label,
        },
        { header: 'Type', accessor: (s) => s.type },
        { header: 'Mode', accessor: (s) => s.execution_mode },
        { header: 'Version', accessor: (s) => normalizeSensorVersion(s.version) ?? '' },
        {
          header: 'Version status',
          accessor: (s) => sensorVersionStatus(s, channel.latest, channel.min),
        },
        { header: 'Hostname', accessor: (s) => s.hostname ?? '' },
        { header: 'IP address', accessor: (s) => s.ip_address ?? '' },
        { header: 'Current jobs', accessor: (s) => s.current_jobs ?? 0 },
        { header: 'Max jobs', accessor: (s) => s.max_concurrent_jobs },
        { header: 'Outbox pending', accessor: (s) => s.outbox?.pending_count ?? '' },
        { header: 'Key expires', accessor: (s) => s.key_expires_at ?? '' },
        { header: 'Tools', accessor: (s) => (s.tools ?? []).join(' ') },
        { header: 'Last heartbeat', accessor: (s) => s.last_seen_at ?? '' },
        { header: 'Scans', accessor: (s) => s.total_scans },
        { header: 'Findings', accessor: (s) => s.total_findings },
      ],
      'sensors'
    )
  }, [filteredSensors, now, thresholds, channel])

  const toggleAttention = () => setFilters({ ...filters, attention: !filters.attention })
  const updatesActive =
    filters.versions.length === 2 &&
    filters.versions.includes('update_available') &&
    filters.versions.includes('unsupported')
  const toggleUpdates = () =>
    setFilters({
      ...filters,
      versions: updatesActive ? [] : ['update_available', 'unsupported'],
    })
  const toggleZoneGrouping = () => setGroupParam(groupBy === 'zone' ? '' : 'zone')
  const protocolV1Active = filters.protocols.length === 1 && filters.protocols[0] === 'v1'
  const toggleProtocolV1 = () =>
    setFilters({ ...filters, protocols: protocolV1Active ? [] : ['v1'] })

  const filterCount = activeFilterCount(filters)
  const facetPanel = (
    <SensorFacetPanel
      filters={filters}
      onChange={setFilters}
      activeCount={filterCount}
      hasChannel={!!channel.latest || !!channel.min}
      hasProtocolInfo={summary.hasProtocolInfo}
    />
  )

  const toolbarStart = (
    <>
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, host, IP, version or tool…"
          aria-label="Search sensors"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 ps-9"
        />
      </div>
      <Select value={groupBy} onValueChange={(v) => setGroupParam(v === 'none' ? '' : v)}>
        <SelectTrigger className="h-9 w-auto gap-2 sm:min-w-36" aria-label="Group sensors">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="hidden sm:inline">
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="none">No grouping</SelectItem>
          {zones.length > 0 && <SelectItem value="zone">{GROUP_LABELS.zone}</SelectItem>}
          <SelectItem value="role">{GROUP_LABELS.role}</SelectItem>
          <SelectItem value="version">{GROUP_LABELS.version}</SelectItem>
        </SelectContent>
      </Select>
    </>
  )

  const toolbarEnd = (
    <>
      <LiveIndicator updatedAt={updatedAt} now={now} />
      <RefreshButton onClick={handleRefresh} loading={isLoading} />
    </>
  )

  const fleetEmpty = !isLoading && !error && scopedSensors.length === 0

  let body: React.ReactNode
  if (error) {
    body = <ErrorState title="sensors" error={error} onRetry={handleRefresh} />
  } else if (isLoading) {
    body = <TableSkeleton rows={5} />
  } else if (fleetEmpty) {
    body = (
      <EmptyState
        icon={RadioTower}
        title="No sensors yet"
        description="A sensor runs inside your network, scans what the platform cannot reach and sends the results back over HTTPS."
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
        thresholds={thresholds}
        now={now}
        channel={channel}
        rowGroups={rowGroups}
        filterToggle={{
          open: filtersOpen,
          onToggle: () => setFiltersOpen((o) => !o),
          onOpenSheet: () => setFilterSheetOpen(true),
          activeCount: filterCount,
          controlsId: 'sensor-filters',
        }}
        toolbarStart={toolbarStart}
        toolbarEnd={toolbarEnd}
      />
    )
  }

  const onlineWindow = thresholds.onlineWindowSeconds
  const offlineAfter = thresholds.offlineAfterSeconds
  const secondsLabel = (s: number) => (s % 60 === 0 && s >= 60 ? `${s / 60} min` : `${s}s`)

  return (
    <>
      <PageHeader title={title} description={description}>
        {zonesTab ? (
          <Can permission={Permission.ScanZonesWrite}>
            <Button size="sm" onClick={() => setZoneCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add zone
            </Button>
          </Can>
        ) : (
          <>
            {/* Shared platform sensors have their own page, linked only where
                the tenant has them (the same condition the old card used). */}
            {!typeFilter && <PlatformSensorsLink />}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredSensors.length === 0}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Can permission={Permission.SensorsWrite}>
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Add sensor
              </Button>
            </Can>
          </>
        )}
      </PageHeader>

      {!typeFilter && canReadZones && (
        <Tabs
          value={zonesTab ? 'zones' : 'sensors'}
          onValueChange={(v) => setTabParam(v === 'zones' ? 'zones' : '')}
          className="mt-4"
        >
          <TabsList>
            <TabsTrigger value="sensors">
              Sensors <TabsCount value={isLoading ? null : roleCount} />
            </TabsTrigger>
            <TabsTrigger value="zones">
              Scan zones <TabsCount value={zonesData ? zones.length : null} />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {zonesTab ? (
        <ScanZonesPanel createOpen={zoneCreateOpen} onCreateOpenChange={setZoneCreateOpen} />
      ) : (
        <>
          {!fleetEmpty && (
            <FleetHealthStrip
              className="mt-5"
              loading={isLoading}
              summary={summary}
              channel={channel}
              attentionActive={filters.attention}
              onToggleAttention={toggleAttention}
              updatesActive={updatesActive}
              onToggleUpdates={toggleUpdates}
              zoneGroupingActive={groupBy === 'zone'}
              onToggleZoneGrouping={toggleZoneGrouping}
              protocolV1Active={protocolV1Active}
              onToggleProtocolV1={toggleProtocolV1}
            />
          )}

          <div className="mt-5 flex items-start">
            {/* The facet panel, as on Findings: a floating card beside the
                table from lg up, a sheet below. */}
            {!fleetEmpty && !error && (
              <div
                inert={!filtersOpen}
                className={cn(
                  'sticky top-4 hidden shrink-0 overflow-hidden transition-[width,margin-inline-end,opacity] duration-300 ease-in-out motion-reduce:transition-none lg:block',
                  filtersOpen ? 'me-5 w-60 opacity-100' : 'me-0 w-0 opacity-0'
                )}
              >
                <aside
                  id="sensor-filters"
                  aria-label="Sensor filters"
                  className="flex max-h-[calc(100svh-7.5rem)] w-60 flex-col rounded-xl border bg-card p-4 shadow-sm"
                >
                  {facetPanel}
                </aside>
              </div>
            )}
            <div className="min-w-0 flex-1">
              {body}
              {!fleetEmpty && !error && !isLoading && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Online: heartbeat within {secondsLabel(onlineWindow)} · Stale:{' '}
                  {secondsLabel(onlineWindow)} to {secondsLabel(offlineAfter)} · Offline: over{' '}
                  {secondsLabel(offlineAfter)} · Idle (CI): a CI sensor between runs
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        title="Sensor filters"
        resultLabel={`Show ${filteredSensors.length} ${filteredSensors.length === 1 ? 'sensor' : 'sensors'}`}
      >
        {facetPanel}
      </FilterSheet>

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
            sensor={selectedSensor}
          />

          <SensorDetailSheet
            sensor={selectedSensor}
            thresholds={thresholds}
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
                  Use <strong>Disable</strong> for temporary suspension.
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
              Disable
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
