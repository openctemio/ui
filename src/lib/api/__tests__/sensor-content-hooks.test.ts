import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('../client', () => client)
vi.mock('@/context/tenant-provider', () => ({ useTenant: () => ({ currentTenant: { id: 't' } }) }))

import { sensorEndpoints } from '../endpoints'
import {
  refreshFleetContent,
  refreshSensorContent,
  updateContentPolicy,
} from '../sensor-content-hooks'

beforeEach(() => vi.clearAllMocks())

describe('scanner content API (RFC-031)', () => {
  it('builds the routes', () => {
    expect(sensorEndpoints.contentPolicy()).toBe('/api/v1/sensors/content-policy')
    expect(sensorEndpoints.refreshContent('s1')).toBe('/api/v1/sensors/s1/content/refresh')
    expect(sensorEndpoints.refreshFleetContent()).toBe('/api/v1/sensors/content/refresh')
  })

  it('refreshes one sensor, everything by default and forced', async () => {
    client.post.mockResolvedValueOnce({ command_id: 'c', already_pending: false })
    await refreshSensorContent('s1')
    expect(client.post).toHaveBeenCalledWith('/api/v1/sensors/s1/content/refresh', {
      content: [],
      force: true,
    })
    await refreshSensorContent('s1', { content: ['trivy-db'], force: false })
    expect(client.post).toHaveBeenLastCalledWith('/api/v1/sensors/s1/content/refresh', {
      content: ['trivy-db'],
      force: false,
    })
  })

  it('refreshes the fleet', async () => {
    client.post.mockResolvedValueOnce({ commands_created: 2, skipped: 0 })
    await expect(refreshFleetContent()).resolves.toEqual({ commands_created: 2, skipped: 0 })
    expect(client.post).toHaveBeenCalledWith('/api/v1/sensors/content/refresh', {
      content: [],
      force: true,
    })
  })

  it('saves the policy with PUT', async () => {
    const req = { policy: { content: { 'trivy-db': { max_age_hours: 48 } } }, apply_now: true }
    client.put.mockResolvedValueOnce({ policy: req.policy, commands_created: 1, skipped: 0 })
    await updateContentPolicy(req)
    expect(client.put).toHaveBeenCalledWith('/api/v1/sensors/content-policy', req)
  })
})
