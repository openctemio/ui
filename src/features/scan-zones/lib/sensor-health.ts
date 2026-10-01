import type { Sensor } from '@/lib/api/sensor-types'

/**
 * A sensor the router can pin jobs to: active and heartbeating (RFC-023
 * "healthy"; the API also requires an unexpired key and a daemon/worker mode,
 * and is the authority on routing).
 */
export function isSensorHealthy(sensor: Pick<Sensor, 'status' | 'health'>): boolean {
  return sensor.status === 'active' && sensor.health === 'online'
}

export type SensorHealthLabel = 'Online' | 'Offline' | 'Error' | 'Disabled' | 'Revoked'

export function sensorHealthLabel(sensor: Pick<Sensor, 'status' | 'health'>): SensorHealthLabel {
  if (sensor.status === 'disabled') return 'Disabled'
  if (sensor.status === 'revoked') return 'Revoked'
  if (sensor.health === 'error') return 'Error'
  if (sensor.health === 'online') return 'Online'
  return 'Offline'
}
