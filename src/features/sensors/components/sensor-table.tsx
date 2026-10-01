'use client'

import type * as React from 'react'
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Eye,
  Settings,
  KeyRound,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Power,
  PowerOff,
} from 'lucide-react'
import { Permission } from '@/lib/permissions'
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  type RowAction,
} from '@/features/shared'

import type { Sensor } from '@/lib/api/sensor-types'
import { SensorTypeIcon, SENSOR_TYPE_LABELS } from './sensor-type-icon'

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
  emptyMessage?: string
}

/**
 * Admin status first (disabled / revoked), then heartbeat health. Only an
 * error is coloured; online carries a check icon, everything else is muted.
 */
function SensorStatusBadge({ sensor }: { sensor: Sensor }) {
  if (sensor.status === 'disabled' || sensor.status === 'revoked') {
    return (
      <Badge variant="secondary" className="gap-1">
        <XCircle className="h-3.5 w-3.5" />
        {sensor.status === 'disabled' ? 'Disabled' : 'Revoked'}
      </Badge>
    )
  }
  if (sensor.health === 'error') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3.5 w-3.5" />
        Error
      </Badge>
    )
  }
  if (sensor.health === 'online') {
    return (
      <Badge variant="outline" className="gap-1">
        <CheckCircle className="h-3.5 w-3.5" />
        Online
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <XCircle className="h-3.5 w-3.5" />
      Offline
    </Badge>
  )
}

function UsageCell({ percent }: { percent: number }) {
  return (
    <div className="flex w-24 items-center gap-2">
      <span className="w-8 text-xs tabular-nums">{percent.toFixed(0)}%</span>
      <Progress value={percent} className="h-1.5 flex-1" />
    </div>
  )
}

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
  emptyMessage = 'No sensors match these filters',
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
        accessorFn: (a) =>
          `${a.name} ${a.description ?? ''} ${a.hostname ?? ''} ${a.ip_address ?? ''}`,
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sensor" />,
        cell: ({ row }) => {
          const sensor = row.original
          const host = sensor.ip_address || sensor.hostname
          return (
            <div className="flex min-w-0 items-center gap-3">
              <SensorTypeIcon type={sensor.type} className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-medium">{sensor.name}</p>
                {host ? (
                  <p className="truncate font-mono text-xs text-muted-foreground">{host}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">No host info</p>
                )}
              </div>
            </div>
          )
        },
      },
      {
        id: 'type',
        // Older sensors can carry a type the UI has no label for; show it raw.
        accessorFn: (a) => SENSOR_TYPE_LABELS[a.type] ?? a.type ?? '—',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        id: 'status',
        accessorFn: (a) => (a.status === 'active' ? a.health : a.status),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <SensorStatusBadge sensor={row.original} />,
      },
      {
        id: 'activeJobs',
        accessorFn: (a) => a.active_jobs || 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Active jobs" />,
        cell: ({ getValue }) => <span className="text-sm tabular-nums">{getValue<number>()}</span>,
      },
      {
        id: 'cpuUsage',
        accessorFn: (a) => a.cpu_percent || 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="CPU" />,
        cell: ({ getValue }) => <UsageCell percent={getValue<number>()} />,
      },
      {
        id: 'memoryUsage',
        accessorFn: (a) => a.memory_percent || 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Memory" />,
        cell: ({ getValue }) => <UsageCell percent={getValue<number>()} />,
      },
      {
        id: 'version',
        accessorFn: (a) => a.version ?? '',
        enableSorting: false,
        header: 'Version',
        cell: ({ row }) => (
          <span className="text-xs tabular-nums text-muted-foreground">
            {row.original.version ? `v${row.original.version}` : '—'}
          </span>
        ),
      },
      {
        id: 'region',
        accessorFn: (a) => a.region || a.labels?.region || a.labels?.env || 'local',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Region" />,
        cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const sensor = row.original
          const actions: RowAction[] = [
            { label: 'View details', icon: Eye, onClick: () => onViewSensor(sensor) },
            {
              label: 'Edit',
              icon: Settings,
              onClick: () => onEditSensor(sensor),
              permission: Permission.SensorsWrite,
            },
            {
              label: 'Regenerate API key',
              icon: KeyRound,
              onClick: () => onRegenerateKey(sensor),
              permission: Permission.SensorsWrite,
            },
          ]
          if (sensor.status === 'disabled' || sensor.status === 'revoked') {
            actions.push({
              label: 'Activate',
              icon: Power,
              onClick: () => onActivateSensor(sensor),
              separatorBefore: true,
              permission: Permission.SensorsWrite,
            })
          } else if (sensor.status === 'active') {
            actions.push({
              label: 'Deactivate',
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
      toolbarStart={toolbarStart}
      toolbarEnd={toolbarEnd}
      emptyMessage={emptyMessage}
    />
  )
}
