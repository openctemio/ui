import { describe, expect, it } from 'vitest'

import { sensorRoleOf, type SensorType } from '../sensor-types'

// RFC-023 §9.1: until the API sends a role, it is derived from the legacy type.
describe('sensorRoleOf', () => {
  it.each<[SensorType, string]>([
    ['worker', 'scanner'],
    ['runner', 'scanner'],
    ['sensor', 'scanner'], // the old EASM type is an internet-facing scanner
    ['collector', 'collector'],
  ])('%s -> %s', (type, role) => {
    expect(sensorRoleOf(type)).toBe(role)
  })
})
