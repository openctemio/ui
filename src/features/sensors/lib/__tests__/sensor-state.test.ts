import { describe, expect, it } from 'vitest'

import type { Sensor } from '@/lib/api/sensor-types'

import { canTakeJobs, isOneShotSensor, sensorState, SENSOR_STATE_META } from '../sensor-state'
import { TEST_SENSOR_KEY_PREFIX } from '@/test/sensor-keys'

const NOW = new Date('2026-10-02T12:00:00Z').getTime()
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()

function sensor(over: Partial<Sensor> = {}): Sensor {
  return {
    id: 's1',
    tenant_id: 't1',
    name: 'scanner',
    type: 'worker',
    capabilities: [],
    tools: ['nuclei'],
    execution_mode: 'daemon',
    status: 'active',
    health: 'online',
    api_key_prefix: TEST_SENSOR_KEY_PREFIX,
    cpu_percent: 0,
    memory_percent: 0,
    max_concurrent_jobs: 5,
    current_jobs: 0,
    labels: {},
    config: {},
    metadata: {},
    total_findings: 0,
    total_scans: 0,
    error_count: 0,
    created_at: ago(86400),
    updated_at: ago(10),
    last_seen_at: ago(10),
    ...over,
  }
}

describe('sensorState', () => {
  it('uses the state the API computed when present', () => {
    expect(sensorState(sensor({ state: 'degraded', last_seen_at: ago(5) }), NOW)).toBe('degraded')
  })

  describe('without an API state (older API) it computes the same ladder', () => {
    it.each<[string, Partial<Sensor>, ReturnType<typeof sensorState>]>([
      ['heartbeat 10s ago', {}, 'online'],
      ['at the 90s edge', { last_seen_at: ago(90) }, 'online'],
      ['just past the window', { last_seen_at: ago(91) }, 'stale'],
      ['past the heartbeat timeout', { last_seen_at: ago(301) }, 'offline'],
      [
        'marked offline by the health checker',
        { last_seen_at: ago(120), health: 'offline' },
        'offline',
      ],
      ['never heartbeated', { last_seen_at: undefined, health: 'unknown' }, 'never_connected'],
      ['disabled', { status: 'disabled' }, 'disabled'],
      ['revoked', { status: 'revoked', last_seen_at: undefined }, 'revoked'],
      ['outbox warning while heartbeating', { outbox_warning: true }, 'degraded'],
      [
        'a CI runner between runs is idle, not offline',
        { type: 'runner', execution_mode: 'standalone', last_seen_at: ago(3 * 3600) },
        'idle',
      ],
      [
        'a CI runner during a run',
        { type: 'runner', execution_mode: 'standalone', last_seen_at: ago(20) },
        'online',
      ],
      [
        'a CI runner that never ran',
        {
          type: 'runner',
          execution_mode: 'standalone',
          last_seen_at: undefined,
          health: 'unknown',
        },
        'never_connected',
      ],
    ])('%s', (_, over, want) => {
      expect(sensorState(sensor(over), NOW)).toBe(want)
    })

    it('follows the thresholds from the stats response', () => {
      const s = sensor({ last_seen_at: ago(150) })
      expect(sensorState(s, NOW)).toBe('stale')
      expect(sensorState(s, NOW, { onlineWindowSeconds: 180, offlineAfterSeconds: 600 })).toBe(
        'online'
      )
    })
  })

  it('has a label and tone for every state, with Idle (CI) for runners', () => {
    for (const meta of Object.values(SENSOR_STATE_META)) {
      expect(meta.label).toBeTruthy()
    }
    expect(SENSOR_STATE_META.idle.label).toBe('Idle (CI)')
    expect(SENSOR_STATE_META.never_connected.label).toBe('Never connected')
  })
})

describe('isOneShotSensor / canTakeJobs', () => {
  it('a standalone or runner sensor is one-shot', () => {
    expect(isOneShotSensor(sensor({ execution_mode: 'standalone' }))).toBe(true)
    expect(isOneShotSensor(sensor({ type: 'runner' }))).toBe(true)
    expect(isOneShotSensor(sensor())).toBe(false)
  })
  it('only enabled long-running sensors that are online or degraded take jobs', () => {
    expect(canTakeJobs(sensor(), NOW)).toBe(true)
    expect(canTakeJobs(sensor({ outbox_warning: true }), NOW)).toBe(true)
    expect(canTakeJobs(sensor({ last_seen_at: ago(200) }), NOW)).toBe(false)
    expect(canTakeJobs(sensor({ status: 'disabled' }), NOW)).toBe(false)
    expect(
      canTakeJobs(
        sensor({ type: 'runner', execution_mode: 'standalone', last_seen_at: ago(5) }),
        NOW
      )
    ).toBe(false)
  })
})
