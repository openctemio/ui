'use client'

import { useMemo } from 'react'

import { useSensors } from '@/lib/api/sensor-hooks'
import type { Sensor, SensorListFilters } from '@/lib/api/sensor-types'

// Stable key: one page large enough for a team's sensors (the API caps it).
const ZONE_SENSOR_FILTERS: SensorListFilters = { page_size: 100 }

/** The team's sensors, by id, for zone tables and dialogs. */
export function useZoneSensors(enabled = true) {
  const { data, isLoading, error } = useSensors(enabled ? ZONE_SENSOR_FILTERS : undefined)
  const sensors = useMemo<Sensor[]>(() => data?.items ?? [], [data?.items])
  const byId = useMemo(() => new Map(sensors.map((s) => [s.id, s])), [sensors])
  return { sensors, byId, isLoading, error }
}
