import { describe, expect, it, vi } from 'vitest'

import { fetchAllSensorPages, SENSOR_PAGE_SIZE } from '../sensor-hooks'
import { sensorEndpoints } from '../endpoints'
import type { Sensor, SensorListResponse } from '../sensor-types'

vi.mock('@/context/tenant-provider', () => ({ useTenant: () => ({ currentTenant: null }) }))

const fake = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `s${i}` }) as Sensor)

function pages(total: number) {
  const all = fake(total)
  return vi.fn(async (page: number): Promise<SensorListResponse> => {
    const items = all.slice((page - 1) * SENSOR_PAGE_SIZE, page * SENSOR_PAGE_SIZE)
    return { items, total, page, per_page: SENSOR_PAGE_SIZE }
  })
}

describe('fetchAllSensorPages', () => {
  it('reads one page when everything fits', async () => {
    const get = pages(7)
    const res = await fetchAllSensorPages(get)
    expect(res.items).toHaveLength(7)
    expect(res.total).toBe(7)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('keeps reading past the first page (the list used to stop at 20)', async () => {
    const get = pages(250)
    const res = await fetchAllSensorPages(get)
    expect(res.items).toHaveLength(250)
    expect(get.mock.calls.map((c) => c[0])).toEqual([1, 2, 3])
  })

  it('stops at an empty page even if total says more', async () => {
    const get = vi.fn(async (page: number) => ({
      items: page === 1 ? fake(SENSOR_PAGE_SIZE) : [],
      total: 999,
      page,
      per_page: SENSOR_PAGE_SIZE,
    }))
    const res = await fetchAllSensorPages(get)
    expect(res.items).toHaveLength(SENSOR_PAGE_SIZE)
    expect(get).toHaveBeenCalledTimes(2)
  })
})

describe('sensorEndpoints.list', () => {
  it('sends per_page, the parameter the API reads', () => {
    const url = sensorEndpoints.list({ per_page: 100, page: 2 })
    expect(url).toContain('per_page=100')
    expect(url).not.toContain('page_size')
  })
})
