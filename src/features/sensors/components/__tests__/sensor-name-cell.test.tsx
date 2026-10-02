import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import type { Sensor } from '@/lib/api/sensor-types'

import { SensorNameCell, distinctHostname } from '../sensor-cells'

function cell(fields: Partial<Sensor>) {
  const sensor = {
    id: 's1',
    name: 'scanner-a',
    type: 'worker',
    status: 'active',
    ...fields,
  } as Sensor
  const { container } = render(<SensorNameCell sensor={sensor} />)
  return {
    host: container.querySelector('[data-slot="sensor-host"]')?.textContent ?? null,
    ip: container.querySelector('[data-slot="sensor-ip"]')?.textContent ?? null,
    text: container.textContent,
  }
}

describe('SensorNameCell', () => {
  it('puts host and address on lines of their own', () => {
    const c = cell({ hostname: 'node-7', ip_address: '10.40.3.17' })
    expect(c.host).toBe('node-7')
    expect(c.ip).toBe('10.40.3.17')
    expect(c.text).not.toContain('·')
  })

  it('leaves out a host name that repeats the sensor name', () => {
    const c = cell({
      name: 'sensor-docker-01',
      hostname: 'Sensor-Docker-01',
      ip_address: '172.18.0.1',
    })
    expect(c.host).toBeNull()
    expect(c.ip).toBe('172.18.0.1')
    expect(c.text).not.toContain('No host reported yet')
  })

  it('says so when nothing is reported', () => {
    expect(cell({}).text).toContain('No host reported yet')
  })
})

describe('distinctHostname', () => {
  it('is null when missing, blank or equal to the name', () => {
    expect(distinctHostname({ name: 'a', hostname: undefined })).toBeNull()
    expect(distinctHostname({ name: 'a', hostname: '  ' })).toBeNull()
    expect(distinctHostname({ name: 'a', hostname: 'A' })).toBeNull()
    expect(distinctHostname({ name: 'a', hostname: 'b' })).toBe('b')
  })
})
