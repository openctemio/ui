'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Network } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useScanZones } from '@/lib/api/scan-zone-hooks'
import { Permission, useHasPermission } from '@/lib/permissions'

import { RangeChips } from './range-chips'

/**
 * Sensor detail: the scan zones this sensor serves. Hidden without
 * sensors:zones:read.
 */
export function SensorZonesSection({ sensorId }: { sensorId: string }) {
  const canRead = useHasPermission(Permission.ScanZonesRead)
  const { data, isLoading } = useScanZones(canRead)
  const zones = useMemo(
    () => (data?.data ?? []).filter((z) => z.sensor_ids.includes(sensorId)),
    [data?.data, sensorId]
  )
  if (!canRead) return null

  return (
    <div className="rounded-xl border bg-card p-4" data-testid="sensor-zones">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Network className="h-4 w-4" />
          Scan zones
        </h4>
        <Link href="/sensors?tab=zones" className="text-xs text-muted-foreground hover:underline">
          Manage zones
        </Link>
      </div>
      {isLoading ? (
        <Skeleton className="h-6 w-2/3" />
      ) : zones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Serves no zone: it only takes jobs that are not routed to a zone.
        </p>
      ) : (
        <ul className="space-y-2">
          {zones.map((z) => (
            <li key={z.id} className="min-w-0 space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="truncate">{z.name}</span>
                {z.is_default && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Default
                  </Badge>
                )}
              </p>
              <RangeChips
                ranges={z.ranges}
                max={3}
                emptyLabel={z.is_default ? 'Public targets' : 'No ranges'}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
