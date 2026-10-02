'use client'

import { useMemo } from 'react'

import { useAllSensors } from '@/lib/api/sensor-hooks'
import type { Sensor } from '@/lib/api/sensor-types'

/**
 * The team's sensors, by id, for zone tables and dialogs: every page of the
 * list (this used to send page_size=100, which the API ignores, so it saw only
 * the first 20), shared with the Sensors tab through the same SWR key.
 */
export function useZoneSensors(enabled = true) {
  const { data, isLoading, error } = useAllSensors(undefined, enabled)
  const sensors = useMemo<Sensor[]>(() => data?.items ?? [], [data?.items])
  const byId = useMemo(() => new Map(sensors.map((s) => [s.id, s])), [sensors])
  return { sensors, byId, isLoading, error }
}
