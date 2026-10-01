'use client'

import type * as React from 'react'
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, RadioTower, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  type RowAction,
} from '@/features/shared'
import { Permission, useHasPermission } from '@/lib/permissions'
import type { ScanZone, ScanZoneCoverageZone } from '@/lib/api/scan-zone-types'
import type { Sensor } from '@/lib/api/sensor-types'

import { isPrivateRange } from '../lib/ranges'
import { isSensorHealthy } from '../lib/sensor-health'
import { RangeChips } from './range-chips'
import { SensorHealthChip } from './sensor-health-dot'

interface ScanZoneTableProps {
  zones: ScanZone[]
  coverageByZone: Map<string, ScanZoneCoverageZone>
  sensorsById: Map<string, Sensor>
  onEdit: (zone: ScanZone) => void
  onSensors: (zone: ScanZone) => void
  onDelete: (zone: ScanZone) => void
  toolbarStart?: React.ReactNode
  toolbarEnd?: React.ReactNode
}

function SensorsCell({ zone, sensorsById }: { zone: ScanZone; sensorsById: Map<string, Sensor> }) {
  if (zone.sensor_ids.length === 0) {
    return <span className="text-xs text-warning">No sensors assigned</span>
  }
  const known = zone.sensor_ids.map((id) => sensorsById.get(id))
  const shown = known.slice(0, 2)
  const rest = known.length - shown.length
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {shown.map((s, i) =>
        s ? (
          <SensorHealthChip key={s.id} sensor={s} className="max-w-[10rem]" />
        ) : (
          <Badge key={zone.sensor_ids[i]} variant="outline" className="font-normal">
            Unknown sensor
          </Badge>
        )
      )}
      {rest > 0 && (
        <Badge variant="secondary" className="text-xs font-normal tabular-nums">
          +{rest}
        </Badge>
      )}
    </div>
  )
}

function CoverageCell({
  zone,
  coverage,
  sensorsById,
}: {
  zone: ScanZone
  coverage?: ScanZoneCoverageZone
  sensorsById: Map<string, Sensor>
}) {
  const healthy =
    coverage?.healthy_sensors ??
    zone.sensor_ids.filter((id) => {
      const s = sensorsById.get(id)
      return s ? isSensorHealthy(s) : false
    }).length
  const assigned = coverage?.assigned_sensors ?? zone.sensor_ids.length
  const hasPrivate = coverage?.has_private_range ?? zone.ranges.some(isPrivateRange)
  const noHealthy = assigned > 0 && healthy === 0
  return (
    <div className="space-y-0.5 text-sm">
      <p className="tabular-nums">
        {coverage ? coverage.addresses.toLocaleString() : '—'}{' '}
        <span className="text-xs text-muted-foreground">addresses</span>
      </p>
      <p
        className={
          noHealthy && (hasPrivate || zone.is_default)
            ? 'text-xs text-destructive'
            : 'text-xs text-muted-foreground'
        }
      >
        <span className="tabular-nums">
          {healthy}/{assigned}
        </span>{' '}
        sensors online
      </p>
    </div>
  )
}

export function ScanZoneTable({
  zones,
  coverageByZone,
  sensorsById,
  onEdit,
  onSensors,
  onDelete,
  toolbarStart,
  toolbarEnd,
}: ScanZoneTableProps) {
  const canWrite = useHasPermission(Permission.ScanZonesWrite)
  const canDelete = useHasPermission(Permission.ScanZonesDelete)
  const columns = useMemo<ColumnDef<ScanZone>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (z) => `${z.name} ${z.description} ${z.ranges.join(' ')}`,
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Zone" />,
        cell: ({ row }) => {
          const z = row.original
          return (
            <div className="min-w-0 max-w-[16rem]">
              <p className="flex items-center gap-2">
                <span className="truncate font-medium">{z.name}</span>
                {z.is_default && (
                  <Badge variant="secondary" className="shrink-0 text-xs font-normal">
                    Default
                  </Badge>
                )}
              </p>
              {z.description && (
                <p className="truncate text-xs text-muted-foreground">{z.description}</p>
              )}
            </div>
          )
        },
      },
      {
        id: 'ranges',
        accessorFn: (z) => z.ranges.length,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ranges" />,
        cell: ({ row }) => (
          <RangeChips
            ranges={row.original.ranges}
            emptyLabel={row.original.is_default ? 'Public targets' : 'No ranges'}
          />
        ),
      },
      {
        id: 'sensors',
        accessorFn: (z) => z.sensor_ids.length,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sensors" />,
        cell: ({ row }) => <SensorsCell zone={row.original} sensorsById={sensorsById} />,
      },
      {
        id: 'coverage',
        accessorFn: (z) => coverageByZone.get(z.id)?.addresses ?? 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Coverage" />,
        cell: ({ row }) => (
          <CoverageCell
            zone={row.original}
            coverage={coverageByZone.get(row.original.id)}
            sensorsById={sensorsById}
          />
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const z = row.original
          // Only the actions this user may take; a read-only user gets no menu.
          const actions: RowAction[] = []
          if (canWrite) {
            actions.push(
              { label: 'Edit', icon: Pencil, onClick: () => onEdit(z) },
              { label: 'Assign sensors', icon: RadioTower, onClick: () => onSensors(z) }
            )
          }
          if (canDelete) {
            actions.push({
              label: 'Delete',
              icon: Trash2,
              onClick: () => onDelete(z),
              destructive: true,
              separatorBefore: actions.length > 0,
            })
          }
          return <DataTableRowActions actions={actions} label={`Actions for ${z.name}`} />
        },
      },
    ],
    [coverageByZone, sensorsById, onEdit, onSensors, onDelete, canWrite, canDelete]
  )

  return (
    <DataTable
      columns={columns}
      data={zones}
      getRowId={(z) => z.id}
      showSearch={false}
      showColumnToggle={false}
      toolbarStart={toolbarStart}
      toolbarEnd={toolbarEnd}
      emptyMessage="No zones match this search"
    />
  )
}
