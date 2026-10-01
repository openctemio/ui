'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, RadioTower } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/features/shared'
import {
  assignSensorToZone,
  invalidateScanZonesCache,
  unassignSensorFromZone,
} from '@/lib/api/scan-zone-hooks'
import type { ScanZone } from '@/lib/api/scan-zone-types'
import { sensorRoleOf, type Sensor } from '@/lib/api/sensor-types'

import { describeScanZoneError } from '../lib/errors'
import { useZoneSensors } from '../hooks/use-zone-sensors'
import { sensorHealthLabel } from '../lib/sensor-health'
import { SensorHealthChip } from './sensor-health-dot'

interface ZoneSensorsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  zone: ScanZone | null
}

/**
 * Assign and unassign the team's own sensors. Platform (shared) sensors are
 * never listed: the API refuses them, since a zone's targets must stay on the
 * tenant's sensors (RFC-023 D14). Each change is saved at once.
 */
export function ZoneSensorsDialog({ open, onOpenChange, zone }: ZoneSensorsDialogProps) {
  const { sensors: allSensors, isLoading } = useZoneSensors()
  const [pending, setPending] = useState<string | null>(null)
  const [assigned, setAssigned] = useState<Set<string> | null>(null)

  // Local copy so the checkboxes move immediately; reset whenever the zone changes.
  const current = useMemo(
    () => assigned ?? new Set(zone?.sensor_ids ?? []),
    [assigned, zone?.sensor_ids]
  )

  const sensors = useMemo<Sensor[]>(() => {
    // Only the zone's own tenant's sensors (platform sensors have another tenant).
    return allSensors
      .filter((s) => !zone || s.tenant_id === zone.tenant_id)
      .sort((a, b) => {
        const ra = sensorRoleOf(a.type) === 'scanner' ? 0 : 1
        const rb = sensorRoleOf(b.type) === 'scanner' ? 0 : 1
        return ra - rb || a.name.localeCompare(b.name)
      })
  }, [allSensors, zone])

  const toggle = async (sensor: Sensor, next: boolean) => {
    if (!zone) return
    setPending(sensor.id)
    try {
      if (next) {
        await assignSensorToZone(zone.id, sensor.id)
      } else {
        await unassignSensorFromZone(zone.id, sensor.id)
      }
      const s = new Set(current)
      if (next) s.add(sensor.id)
      else s.delete(sensor.id)
      setAssigned(s)
      toast.success(
        next
          ? `"${sensor.name}" now scans zone "${zone.name}"`
          : `"${sensor.name}" removed from zone "${zone.name}"`
      )
      await invalidateScanZonesCache()
    } catch (err) {
      const d = describeScanZoneError(err, 'Failed to change the zone sensors')
      toast.error(d.message, { description: d.hint })
    } finally {
      setPending(null)
    }
  }

  const close = (o: boolean) => {
    if (!o) setAssigned(null)
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sensors for {zone?.name}</DialogTitle>
          <DialogDescription>
            Jobs for this zone go to the least busy online sensor checked here. Unchecking a sensor
            moves its queued jobs of this zone back to the zone pool.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sensors.length === 0 ? (
          <EmptyState
            icon={RadioTower}
            title="No sensors yet"
            description="Add a sensor in your network first, then assign it here."
            card={false}
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/sensors?tab=scanners">Go to scanners</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y rounded-md border" data-testid="zone-sensor-list">
            {sensors.map((s) => {
              const checked = current.has(s.id)
              const id = `zone-sensor-${s.id}`
              return (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Checkbox
                    id={id}
                    checked={checked}
                    disabled={pending !== null}
                    onCheckedChange={(v) => void toggle(s, v === true)}
                    aria-label={`Assign ${s.name}`}
                  />
                  <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col">
                    <span className="flex min-w-0 items-center gap-2">
                      <SensorHealthChip sensor={s} className="border-0 px-0 text-sm" />
                      {sensorRoleOf(s.type) === 'collector' && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          Collector
                        </Badge>
                      )}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {sensorHealthLabel(s)}
                      {s.tools?.length ? ` · ${s.tools.join(', ')}` : ''}
                    </span>
                  </label>
                  {pending === s.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
