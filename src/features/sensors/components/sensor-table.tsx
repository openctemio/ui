'use client'

import type * as React from 'react'
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Eye, Settings, KeyRound, Trash2, Power, PowerOff } from 'lucide-react'
import { Permission } from '@/lib/permissions'
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  type DataTableRowGroups,
  type FilterPanelToggleProps,
  type RowAction,
} from '@/features/shared'

import type { Sensor } from '@/lib/api/sensor-types'
import { sensorRoleOf } from '@/lib/api/sensor-types'
import { SENSOR_TYPE_LABELS } from './sensor-type-icon'
import { SensorStateBadge } from './sensor-state-badge'
import {
  SensorJobsCell,
  SensorKeyCell,
  SensorNameCell,
  SensorOutboxCell,
  SensorToolsCell,
  SensorVersionCell,
} from './sensor-cells'
import { SensorMobileCard } from './sensor-mobile-card'
import { normalizeSensorVersion } from '../lib/sensor-version'
import { sensorState, SENSOR_STATES, type FleetThresholds } from '../lib/sensor-state'
import type { ReleaseChannel } from '../lib/fleet'

interface SensorTableProps {
  sensors: Sensor[]
  onViewSensor: (sensor: Sensor) => void
  onEditSensor: (sensor: Sensor) => void
  onActivateSensor: (sensor: Sensor) => void
  onDeactivateSensor: (sensor: Sensor) => void
  onDeleteSensor: (sensor: Sensor) => void
  onRegenerateKey: (sensor: Sensor) => void
  /** Selected rows, for the page's bulk-action bar. */
  onSelectionChange?: (sensors: Sensor[]) => void
  /** Bump to clear the selection (e.g. after a bulk delete). */
  resetSelectionKey?: number
  toolbarStart?: React.ReactNode
  toolbarEnd?: React.ReactNode
  filterToggle?: FilterPanelToggleProps
  emptyMessage?: string
  emptyDescription?: string
  /** State ladder thresholds from GET /sensors/stats. */
  thresholds?: FleetThresholds
  /** The current time (useNow). */
  now: number
  /** Release channel from GET /sensors/stats. */
  channel: ReleaseChannel
  /** Group header rows (zone, role, version). */
  rowGroups?: DataTableRowGroups<Sensor>
}

/** CPU / memory as reported; a sensor that reports nothing shows a dash, not 0%. */
function UsageCell({ percent }: { percent: number }) {
  if (!percent) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <div className="flex w-24 items-center gap-2">
      <span className="w-8 text-xs tabular-nums">{percent.toFixed(0)}%</span>
      <Progress value={percent} className="h-1.5 flex-1" />
    </div>
  )
}

/**
 * Off by default, available under Columns: metrics most sensors do not report
 * yet (CPU, memory, region; showing 0% and an invented "local" for every
 * sensor said nothing) and the role, which the Role filter and grouping carry.
 */
const HIDDEN_BY_DEFAULT = { type: false, cpuUsage: false, memoryUsage: false, region: false }

const STATE_RANK = new Map(SENSOR_STATES.map((s, i) => [s, i]))

export function SensorTable({
  sensors,
  onViewSensor,
  onEditSensor,
  onActivateSensor,
  onDeactivateSensor,
  onDeleteSensor,
  onRegenerateKey,
  onSelectionChange,
  resetSelectionKey,
  toolbarStart,
  toolbarEnd,
  filterToggle,
  emptyMessage = 'No sensors match these filters',
  emptyDescription = 'Clear a filter or search for something else',
  thresholds,
  now,
  channel,
  rowGroups,
}: SensorTableProps) {
  const columns = useMemo<ColumnDef<Sensor>[]>(
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
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'name',
        meta: { label: 'Sensor' },
        accessorFn: (a) => a.name,
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sensor" />,
        cell: ({ row }) => <SensorNameCell sensor={row.original} />,
      },
      {
        id: 'status',
        meta: { label: 'Status' },
        // Sort by the ladder (online first), not alphabetically.
        accessorFn: (a) => STATE_RANK.get(sensorState(a, now, thresholds)) ?? 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const reasons = row.original.health_reasons ?? []
          return (
            <span title={reasons.length ? reasons.map((r) => r.message).join('\n') : undefined}>
              <SensorStateBadge
                sensor={row.original}
                now={now}
                thresholds={thresholds}
                withLastSeen
              />
            </span>
          )
        },
      },
      {
        id: 'version',
        meta: { label: 'Version' },
        accessorFn: (a) => normalizeSensorVersion(a.version) ?? '',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Version" />,
        cell: ({ row }) => (
          <SensorVersionCell sensor={row.original} latest={channel.latest} min={channel.min} />
        ),
      },
      {
        id: 'jobs',
        meta: { label: 'Jobs' },
        // current_jobs is what the API reports; it never sent active_jobs.
        accessorFn: (a) => a.current_jobs ?? 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Jobs" />,
        cell: ({ row }) => <SensorJobsCell sensor={row.original} />,
      },
      {
        id: 'outbox',
        meta: { label: 'Outbox' },
        accessorFn: (a) => a.outbox?.pending_count ?? -1,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Outbox" />,
        cell: ({ row }) => <SensorOutboxCell sensor={row.original} />,
      },
      {
        id: 'key',
        meta: { label: 'Key' },
        accessorFn: (a) =>
          a.key_expires_at ? new Date(a.key_expires_at).getTime() : Number.MAX_SAFE_INTEGER,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Key" />,
        cell: ({ row }) => <SensorKeyCell sensor={row.original} now={now} />,
      },
      {
        id: 'tools',
        meta: { label: 'Tools' },
        accessorFn: (a) => (a.tools ?? []).join(', '),
        enableSorting: false,
        header: 'Tools',
        cell: ({ row }) => <SensorToolsCell tools={row.original.tools} />,
      },
      {
        id: 'type',
        meta: { label: 'Role' },
        accessorFn: (a) => SENSOR_TYPE_LABELS[a.type] ?? a.type,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
        cell: ({ row }) => (
          <span className="text-sm">
            {sensorRoleOf(row.original.type) === 'collector' ? 'Collector' : 'Scanner'}
            <span className="text-muted-foreground">
              {' · '}
              {SENSOR_TYPE_LABELS[row.original.type] ?? row.original.type}
            </span>
          </span>
        ),
      },
      {
        id: 'cpuUsage',
        meta: { label: 'CPU' },
        accessorFn: (a) => a.cpu_percent || 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="CPU" />,
        cell: ({ getValue }) => <UsageCell percent={getValue<number>()} />,
      },
      {
        id: 'memoryUsage',
        meta: { label: 'Memory' },
        accessorFn: (a) => a.memory_percent || 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Memory" />,
        cell: ({ getValue }) => <UsageCell percent={getValue<number>()} />,
      },
      {
        id: 'region',
        meta: { label: 'Region' },
        // Only what the sensor reported; nothing invented.
        accessorFn: (a) => a.region || '',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Region" />,
        cell: ({ getValue }) =>
          getValue<string>() ? (
            <span className="text-sm">{getValue<string>()}</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const sensor = row.original
          // Editing, keys and lifecycle are admin actions (sensors:write /
          // sensors:delete, admins and owners only since api#669).
          const actions: RowAction[] = [
            { label: 'View details', icon: Eye, onClick: () => onViewSensor(sensor) },
            {
              label: 'Edit',
              icon: Settings,
              onClick: () => onEditSensor(sensor),
              permission: Permission.SensorsWrite,
            },
            {
              label: 'Rotate key',
              icon: KeyRound,
              onClick: () => onRegenerateKey(sensor),
              permission: Permission.SensorsWrite,
            },
          ]
          if (sensor.status === 'disabled' || sensor.status === 'revoked') {
            actions.push({
              label: 'Enable',
              icon: Power,
              onClick: () => onActivateSensor(sensor),
              separatorBefore: true,
              permission: Permission.SensorsWrite,
            })
          } else if (sensor.status === 'active') {
            actions.push({
              label: 'Disable',
              icon: PowerOff,
              onClick: () => onDeactivateSensor(sensor),
              separatorBefore: true,
              permission: Permission.SensorsWrite,
            })
          }
          actions.push({
            label: 'Delete',
            icon: Trash2,
            onClick: () => onDeleteSensor(sensor),
            destructive: true,
            separatorBefore: true,
            permission: Permission.SensorsDelete,
          })
          return <DataTableRowActions actions={actions} />
        },
      },
    ],
    [
      onViewSensor,
      onEditSensor,
      onActivateSensor,
      onDeactivateSensor,
      onDeleteSensor,
      onRegenerateKey,
      thresholds,
      now,
      channel.latest,
      channel.min,
    ]
  )

  return (
    <DataTable
      columns={columns}
      data={sensors}
      getRowId={(a) => a.id}
      showSearch={false}
      onRowClick={onViewSensor}
      onSelectionChange={onSelectionChange}
      resetSelectionKey={resetSelectionKey}
      showSelectionCount={false}
      filterToggle={filterToggle}
      toolbarStart={toolbarStart}
      toolbarEnd={toolbarEnd}
      emptyMessage={emptyMessage}
      emptyDescription={emptyDescription}
      initialColumnVisibility={HIDDEN_BY_DEFAULT}
      // A fleet is small; grouping reads best on one page.
      pageSize={50}
      pageSizeOptions={[25, 50, 100]}
      rowGroups={rowGroups}
      mobileRow={(sensor) => (
        <SensorMobileCard
          sensor={sensor}
          now={now}
          thresholds={thresholds}
          channel={channel}
          onOpen={onViewSensor}
        />
      )}
    />
  )
}
