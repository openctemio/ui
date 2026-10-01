import { cn } from '@/lib/utils'
import type { Sensor } from '@/lib/api/sensor-types'

import { isSensorHealthy, sensorHealthLabel } from '../lib/sensor-health'

/** A sensor's name with its health: a filled dot when it can take jobs. */
export function SensorHealthChip({
  sensor,
  className,
}: {
  sensor: Pick<Sensor, 'name' | 'status' | 'health'>
  className?: string
}) {
  const healthy = isSensorHealthy(sensor)
  const label = sensorHealthLabel(sensor)
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs',
        className
      )}
      title={`${sensor.name}: ${label}`}
    >
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          healthy
            ? 'bg-success'
            : label === 'Error'
              ? 'bg-destructive'
              : 'border border-muted-foreground'
        )}
      />
      <span className="truncate">{sensor.name}</span>
      <span className="sr-only">({label})</span>
    </span>
  )
}
