import { describe, expect, it } from 'vitest'

import type { Sensor } from '@/lib/api/sensor-types'
import type { ScanZone } from '@/lib/api/scan-zone-types'

import {
  activeFilterCount,
  EMPTY_FLEET_FILTERS,
  filterSensors,
  groupSensors,
  summarizeFleet,
  tenantSensors,
  type FleetFilters,
} from '../fleet'

const NOW = new Date('2026-10-02T12:00:00Z').getTime()
const ago = (s: number) => new Date(NOW - s * 1000).toISOString()

let seq = 0
function sensor(over: Partial<Sensor> = {}): Sensor {
  seq++
  return {
    id: `s${seq}`,
    tenant_id: 't',
    name: `sensor-${seq}`,
    type: 'worker',
    capabilities: [],
    tools: ['nuclei'],
    execution_mode: 'daemon',
    status: 'active',
    health: 'online',
    api_key_prefix: 'rda_x',
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
    updated_at: ago(5),
    last_seen_at: ago(5),
    version: 'v0.4.2',
    ...over,
  }
}

const fleet = () => {
  seq = 0
  return [
    sensor({
      name: 'dmz-scanner-01',
      state: 'degraded',
      current_jobs: 3,
      version: 'v0.4.0',
      health_reasons: [{ code: 'outbox_backlog', severity: 'warning', message: 'm' }],
      hostname: 'dmz-scan-01.corp.local',
      ip_address: '203.0.113.10',
    }),
    sensor({ name: 'k8s-scanner-a', current_jobs: 1, max_concurrent_jobs: 8 }),
    sensor({ name: 'k8s-scanner-b', last_seen_at: ago(240) }),
    sensor({ name: 'branch-hn-01', last_seen_at: ago(12 * 3600), version: 'v0.3.0' }),
    sensor({
      name: 'ci-runner',
      type: 'runner',
      execution_mode: 'standalone',
      last_seen_at: ago(3 * 3600),
    }),
    sensor({
      name: 'cloud-collector',
      type: 'collector',
      status: 'disabled',
      version: 'v0.4.1',
      tools: [],
    }),
  ]
}

const channel = { latest: 'v0.4.2', min: 'v0.4.0' }

describe('summarizeFleet', () => {
  it('counts the health strip from the same ladder the rows use', () => {
    const s = summarizeFleet(fleet(), NOW, undefined, channel)
    expect(s.total).toBe(6)
    expect(s.enabled).toBe(5)
    expect(s.canTakeJobs).toBe(2) // online + degraded long-running
    expect(s.byState.online).toBe(1)
    expect(s.byState.degraded).toBe(1)
    expect(s.byState.stale).toBe(1)
    expect(s.byState.offline).toBe(1)
    expect(s.byState.idle).toBe(1)
    expect(s.byState.disabled).toBe(1)
    expect(s.jobsRunning).toBe(4)
    expect(s.jobSlots).toBe(13)
  })

  it('needs attention: enabled sensors with a health reason or below the minimum', () => {
    const s = summarizeFleet(fleet(), NOW, undefined, channel)
    // dmz (outbox backlog) and branch-hn-01 (v0.3.0 below v0.4.0); the
    // disabled collector does not count.
    expect(s.needsAttention).toBe(2)
    expect(s.attentionKinds).toEqual(['backlog', 'version'])
  })

  it('content reasons count as scanner-content attention (RFC-031)', () => {
    const f = fleet()
    f[1] = {
      ...f[1],
      health_reasons: [{ code: 'content_stale', severity: 'warning', message: 'm' }],
    }
    const s = summarizeFleet(f, NOW, undefined, channel)
    expect(s.needsAttention).toBe(3)
    expect(s.attentionKinds).toContain('content')
  })

  it('an unsupported SDK (sdk_unsupported) counts as SDK attention', () => {
    const f = fleet()
    f[1] = {
      ...f[1],
      health_reasons: [{ code: 'sdk_unsupported', severity: 'warning', message: 'm' }],
    }
    const s = summarizeFleet(f, NOW, undefined, channel)
    expect(s.needsAttention).toBe(3)
    expect(s.attentionKinds).toContain('sdk')
  })

  it('updates: below latest, with the unsupported ones counted apart', () => {
    const s = summarizeFleet(fleet(), NOW, undefined, channel)
    expect(s.updates).toBe(3) // v0.4.0, v0.3.0, v0.4.1
    expect(s.unsupported).toBe(1)
  })

  it('zone coverage: zones with at least one sensor that can take jobs', () => {
    const f = fleet()
    const zones = [
      { id: 'z1', name: 'dmz', sensor_ids: [f[0].id] },
      { id: 'z2', name: 'branch-hanoi', sensor_ids: [f[3].id] },
      { id: 'z3', name: 'empty', sensor_ids: [] },
    ] as ScanZone[]
    const s = summarizeFleet(f, NOW, undefined, channel, zones)
    expect(s.zones).toEqual({ total: 3, covered: 1, uncovered: ['branch-hanoi', 'empty'] })
  })
})

describe('filterSensors', () => {
  const run = (over: Partial<FleetFilters>) =>
    filterSensors(fleet(), { ...EMPTY_FLEET_FILTERS, ...over }, NOW, undefined, channel).map(
      (s) => s.name
    )

  it('no filter keeps everything', () => {
    expect(run({})).toHaveLength(6)
  })
  it('search matches name, host, IP, version and tools', () => {
    expect(run({ q: 'corp.local' })).toEqual(['dmz-scanner-01'])
    expect(run({ q: '203.0.113' })).toEqual(['dmz-scanner-01'])
    expect(run({ q: 'v0.3' })).toEqual(['branch-hn-01'])
    expect(run({ q: 'K8S' })).toEqual(['k8s-scanner-a', 'k8s-scanner-b'])
  })
  it('role replaces the old Scanners / Collectors tabs', () => {
    expect(run({ roles: ['collector'] })).toEqual(['cloud-collector'])
    expect(run({ roles: ['scanner'] })).toHaveLength(5)
  })
  it('state (several at once)', () => {
    expect(run({ states: ['stale', 'offline'] })).toEqual(['k8s-scanner-b', 'branch-hn-01'])
  })
  it('version status', () => {
    expect(run({ versions: ['unsupported'] })).toEqual(['branch-hn-01'])
  })
  it('the "needs attention" metric', () => {
    expect(run({ attention: true })).toEqual(['dmz-scanner-01', 'branch-hn-01'])
  })
  it('protocol (RFC-029 telemetry; unknown until the API reports it)', () => {
    const f = fleet()
    f[0].protocol = { version: 1, user_agent: 'sdk/0.6', seen_at: ago(5), deprecated: true }
    f[1].protocol = { version: 2, user_agent: 'sdk/0.8', seen_at: ago(5), deprecated: false }
    const names = (p: FleetFilters['protocols']) =>
      filterSensors(f, { ...EMPTY_FLEET_FILTERS, protocols: p }, NOW, undefined, channel).map(
        (s) => s.name
      )
    expect(names(['v1'])).toEqual(['dmz-scanner-01'])
    expect(names(['v2'])).toEqual(['k8s-scanner-a'])
    expect(names(['unknown'])).toHaveLength(4)
    const s = summarizeFleet(f, NOW, undefined, channel)
    expect(s.protocolV1).toBe(1)
    expect(s.hasProtocolInfo).toBe(true)
    expect(summarizeFleet(fleet(), NOW, undefined, channel).hasProtocolInfo).toBe(false)
  })

  it('SDK version: the exact normalized version, or "unknown" when not reported', () => {
    const f = fleet()
    f[0].sdk_version = '0.9.0'
    f[1].sdk_version = 'v0.8.1'
    const names = (v: string[]) =>
      filterSensors(f, { ...EMPTY_FLEET_FILTERS, sdkVersions: v }, NOW, undefined, channel).map(
        (s) => s.name
      )
    expect(names(['v0.9.0'])).toEqual(['dmz-scanner-01'])
    expect(names(['v0.9.0', 'v0.8.1'])).toEqual(['dmz-scanner-01', 'k8s-scanner-a'])
    expect(names(['unknown'])).toHaveLength(4)
    expect(activeFilterCount({ ...EMPTY_FLEET_FILTERS, sdkVersions: ['v0.9.0', 'unknown'] })).toBe(
      2
    )
  })

  it('filters combine (AND across facets)', () => {
    expect(
      run({
        roles: ['scanner'],
        versions: ['update_available', 'unsupported'],
        states: ['offline'],
      })
    ).toEqual(['branch-hn-01'])
  })
})

describe('tenantSensors', () => {
  it('leaves shared platform sensors out of the tenant page and its counts', () => {
    const f = fleet()
    f[1].is_platform_sensor = true
    const own = tenantSensors(f)
    expect(own.map((s) => s.name)).not.toContain('k8s-scanner-a')
    expect(summarizeFleet(own, NOW, undefined, channel).total).toBe(5)
  })
})

describe('groupSensors', () => {
  it('none: one group', () => {
    const g = groupSensors(fleet(), 'none')
    expect(g).toHaveLength(1)
    expect(g[0].sensors).toHaveLength(6)
  })
  it('by role', () => {
    const g = groupSensors(fleet(), 'role')
    expect(g.map((x) => [x.label, x.sensors.length])).toEqual([
      ['Scanners', 5],
      ['Collectors', 1],
    ])
  })
  it('by version, newest first, unreported last', () => {
    const f = fleet()
    f.push(sensor({ name: 'nover', version: undefined }))
    const g = groupSensors(f, 'version')
    expect(g.map((x) => x.label)).toEqual(['v0.4.2', 'v0.4.1', 'v0.4.0', 'v0.3.0', 'Not reported'])
  })
  it('by zone: each sensor under its first zone, then "No zone"', () => {
    const f = fleet()
    const zones = [
      { id: 'z2', name: 'prod-k8s', sensor_ids: [f[1].id, f[2].id], ranges: ['10.40.0.0/16'] },
      { id: 'z1', name: 'dmz', sensor_ids: [f[0].id], ranges: ['203.0.113.0/24'] },
    ] as ScanZone[]
    const g = groupSensors(f, 'zone', zones)
    expect(g.map((x) => [x.label, x.sensors.map((s) => s.name)])).toEqual([
      ['dmz', ['dmz-scanner-01']],
      ['prod-k8s', ['k8s-scanner-a', 'k8s-scanner-b']],
      ['No zone', ['branch-hn-01', 'ci-runner', 'cloud-collector']],
    ])
    expect(g[0].zone?.ranges).toEqual(['203.0.113.0/24'])
  })
})
