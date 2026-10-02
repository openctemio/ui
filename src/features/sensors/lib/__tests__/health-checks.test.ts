import { describe, expect, it } from 'vitest'

import type { Sensor } from '@/lib/api/sensor-types'
import type { ScanZone } from '@/lib/api/scan-zone-types'

import { sensorHealthChecks, type HealthCheck } from '../health-checks'

const NOW = new Date('2026-10-02T12:00:00Z').getTime()
const ago = (s: number) => new Date(NOW - s * 1000).toISOString()
const inDays = (d: number) => new Date(NOW + d * 86_400_000).toISOString()

function sensor(over: Partial<Sensor> = {}): Sensor {
  return {
    id: 's1',
    tenant_id: 't',
    name: 'k8s-scanner-a',
    type: 'worker',
    capabilities: [],
    tools: ['nuclei', 'trivy'],
    execution_mode: 'daemon',
    status: 'active',
    health: 'online',
    api_key_prefix: 'rda_x',
    cpu_percent: 0,
    memory_percent: 0,
    max_concurrent_jobs: 8,
    current_jobs: 1,
    labels: {},
    config: {},
    metadata: {},
    total_findings: 0,
    total_scans: 0,
    error_count: 0,
    created_at: ago(86400),
    updated_at: ago(4),
    last_seen_at: ago(4),
    version: 'v0.4.2',
    outbox: {
      pending_count: 0,
      pending_bytes: 0,
      oldest_age_seconds: 0,
      dead_letter_count: 0,
      evicted_count: 0,
      reported_at: ago(4),
    },
    key_expires_at: null,
    uptime_seconds: 6 * 86400 + 3 * 3600,
    ...over,
  }
}

const ctx = {
  now: NOW,
  channel: { latest: 'v0.4.2', min: 'v0.4.0' },
  protocolV2Version: 'v0.5.0',
  protocolV1Sunset: '2027-04-01',
}
const byKey = (checks: HealthCheck[]) => Object.fromEntries(checks.map((c) => [c.key, c]))

describe('sensorHealthChecks', () => {
  it('a healthy sensor: every line ok, with uptime beside the heartbeat', () => {
    const c = byKey(sensorHealthChecks(sensor(), ctx))
    expect(c.heartbeat).toMatchObject({ status: 'ok', text: '4s ago', aside: 'up 6d 3h' })
    expect(c.outbox).toMatchObject({ status: 'ok', text: 'Empty, nothing waiting to upload' })
    expect(c.key).toMatchObject({ status: 'ok', text: 'Never expires' })
    expect(c.version).toMatchObject({ status: 'ok', text: 'v0.4.2, the latest release' })
    expect(c.tools).toMatchObject({ status: 'ok', text: 'nuclei, trivy' })
    expect(c.protocol).toBeUndefined() // the API does not report it yet
  })

  it('says what is wrong and offers the fix', () => {
    const c = byKey(
      sensorHealthChecks(
        sensor({
          key_expires_at: inDays(6),
          version: 'v0.3.0',
          tools: [],
          outbox_warning: true,
          outbox: {
            pending_count: 148,
            pending_bytes: 1,
            oldest_age_seconds: 8040,
            dead_letter_count: 0,
            evicted_count: 0,
            reported_at: ago(8),
          },
          protocol: { version: 1, user_agent: 'sdk/0.6', seen_at: ago(8), deprecated: true },
        }),
        ctx
      )
    )
    expect(c.key).toMatchObject({ status: 'warning', action: 'rotate_key' })
    expect(c.key.text).toContain('Expires in 6 days')
    expect(c.version).toMatchObject({ status: 'critical', action: 'install' })
    expect(c.tools).toMatchObject({ status: 'warning', action: 'edit' })
    expect(c.outbox.status).toBe('warning')
    expect(c.outbox.text).toContain('148 results waiting to upload, the oldest for 2h 14m')
    expect(c.protocol).toMatchObject({ status: 'warning', action: 'install' })
    expect(c.protocol.text).toContain('v0.5.0 or later before 2027-04-01')
  })

  it('lost results are critical', () => {
    const c = byKey(
      sensorHealthChecks(
        sensor({
          outbox: {
            pending_count: 0,
            pending_bytes: 0,
            oldest_age_seconds: 0,
            dead_letter_count: 2,
            evicted_count: 0,
            reported_at: ago(4),
          },
        }),
        ctx
      )
    )
    expect(c.outbox.status).toBe('critical')
  })

  it('offline, never connected, disabled, a CI runner between runs', () => {
    expect(
      byKey(sensorHealthChecks(sensor({ last_seen_at: ago(43200) }), ctx)).heartbeat.status
    ).toBe('critical')
    expect(
      byKey(sensorHealthChecks(sensor({ last_seen_at: undefined, health: 'unknown' }), ctx))
        .heartbeat
    ).toMatchObject({ status: 'warning', action: 'install' })
    expect(
      byKey(sensorHealthChecks(sensor({ status: 'disabled', status_message: 'migration' }), ctx))
        .heartbeat.text
    ).toContain('Disabled: migration')
    const ci = byKey(
      sensorHealthChecks(
        sensor({
          type: 'runner',
          execution_mode: 'standalone',
          last_seen_at: ago(3 * 3600),
          outbox: null,
        }),
        ctx
      )
    )
    expect(ci.heartbeat).toMatchObject({ status: 'info' })
    expect(ci.heartbeat.text).toContain('Last run 3h ago')
    expect(ci.outbox).toBeUndefined() // one-shot sensors keep no outbox
  })

  it('zones: membership with how many of the zone are online', () => {
    const me = sensor()
    const other = sensor({ id: 's2', last_seen_at: ago(600) })
    const zones = [
      { id: 'z', name: 'prod-k8s', ranges: ['10.40.0.0/16'], sensor_ids: ['s1', 's2'] },
    ] as ScanZone[]
    const c = byKey(sensorHealthChecks(me, { ...ctx, zones, fleet: [me, other] }))
    expect(c.zone.text).toBe('prod-k8s · 10.40.0.0/16 (1 of 2 online)')
    const none = byKey(sensorHealthChecks(me, { ...ctx, zones: [{ ...zones[0], sensor_ids: [] }] }))
    expect(none.zone).toMatchObject({ status: 'info', action: 'zones' })
  })
})
