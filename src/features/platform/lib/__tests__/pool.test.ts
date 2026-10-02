import { describe, expect, it } from 'vitest'

import type { PlatformStatsResponse, TierStats } from '@/lib/api/platform-types'
import { summarizePlatformPool } from '../pool'

const tier = (online: number, total: number, load = 0, cap = 0): TierStats => ({
  total_sensors: total,
  online_sensors: online,
  offline_sensors: total - online,
  total_capacity: cap,
  current_load: load,
  available_slots: cap - load,
})

const stats = (over: Partial<PlatformStatsResponse> = {}): PlatformStatsResponse => ({
  enabled: true,
  max_tier: 'shared',
  accessible_tiers: ['shared'],
  max_concurrent: 5,
  max_queued: 15,
  current_active: 0,
  current_queued: 0,
  available_slots: 5,
  tier_stats: { shared: tier(1, 1, 0, 5) },
  ...over,
})

describe('summarizePlatformPool', () => {
  it('no platform sensors: null', () => {
    expect(summarizePlatformPool(undefined)).toBeNull()
    expect(summarizePlatformPool(stats({ enabled: false, tier_stats: {} }))).toBeNull()
  })

  it('healthy: all online with free slots', () => {
    const p = summarizePlatformPool(stats({ tier_stats: { shared: tier(2, 2, 3, 10) } }))!
    expect(p).toMatchObject({ state: 'healthy', online: 2, total: 2, slots: 10, inUse: 3, free: 7 })
  })

  it('down: nothing online means no free slot, whatever available_slots says (live: 0 of 1)', () => {
    const p = summarizePlatformPool(
      stats({ available_slots: 5, tier_stats: { shared: tier(0, 1, 0, 5) } })
    )!
    expect(p.state).toBe('down')
    expect(p.free).toBe(0)
    expect(p.slots).toBe(5)
  })

  it('full beats degraded; degraded when some are offline', () => {
    expect(summarizePlatformPool(stats({ tier_stats: { shared: tier(1, 2, 4, 4) } }))!.state).toBe(
      'full'
    )
    expect(summarizePlatformPool(stats({ tier_stats: { shared: tier(1, 2, 1, 4) } }))!.state).toBe(
      'degraded'
    )
  })

  it('a tier with nothing online offers no free slot', () => {
    const p = summarizePlatformPool(
      stats({ tier_stats: { shared: tier(1, 1, 1, 3), premium: tier(0, 1, 0, 8) } })
    )!
    expect(p.free).toBe(2)
    expect(p.state).toBe('degraded')
    expect(p.tiers.map((t) => [t.key, t.state])).toEqual([
      ['shared', 'healthy'],
      ['premium', 'down'],
    ])
  })

  it('tiers: only those with sensors, known order first, operator labels after', () => {
    const p = summarizePlatformPool(
      stats({
        tier_stats: { gpu_pool: tier(1, 1, 0, 2), premium: tier(1, 1), shared: tier(1, 1) },
      })
    )!
    expect(p.tiers.map((t) => t.label)).toEqual(['Shared', 'Premium', 'Gpu pool'])
  })

  it('queued is the organization queue; max_queued is not carried', () => {
    const p = summarizePlatformPool(stats({ current_queued: 4 }))!
    expect(p.queued).toBe(4)
    expect(p).not.toHaveProperty('maxQueued')
  })
})
