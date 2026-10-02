import { describe, expect, it } from 'vitest'

import type { Sensor } from '@/lib/api/sensor-types'

import {
  capacityLabel,
  dispatchTools,
  hasReportedTools,
  sensorCapacity,
  sensorToolRows,
  toolsNotInstalled,
} from '../capabilities'
import { TEST_SENSOR_KEY_PREFIX } from '@/test/sensor-keys'

type S = Pick<
  Sensor,
  'tools' | 'reported' | 'effective' | 'max_concurrent_jobs' | 'capability_mismatch'
>

const base = (over: Partial<S> = {}): S => ({
  tools: [],
  max_concurrent_jobs: 5,
  ...over,
})

const report = (
  tools: { name: string; version?: string; installed: boolean }[] | null,
  max: number | null = null
): Sensor['reported'] => ({
  tools,
  capabilities: null,
  max_concurrent_jobs: max,
  reported_at: '2026-10-02T05:00:00Z',
})

describe('sensorToolRows', () => {
  it('shows the set tools as declared when the sensor reports nothing', () => {
    const s = base({ tools: ['trivy', 'nuclei'] as never[] })
    expect(hasReportedTools(s)).toBe(false)
    expect(sensorToolRows(s)).toEqual([
      { name: 'nuclei', status: 'declared' },
      { name: 'trivy', status: 'declared' },
    ])
    // An API from before the report: reported is absent, effective too.
    expect(dispatchTools(s)).toEqual(['trivy', 'nuclei'])
  })

  it('combines the inventory with the limit', () => {
    const s = base({
      tools: ['semgrep', 'nuclei', 'checkov'] as never[],
      reported: report([
        { name: 'semgrep', version: '1.90.0', installed: true },
        { name: 'nuclei', installed: false },
        { name: 'trivy', version: '0.68.2', installed: true },
      ]),
      effective: { tools: ['semgrep'], capabilities: [], max_concurrent_jobs: 5 },
    })
    expect(sensorToolRows(s)).toEqual([
      { name: 'semgrep', version: '1.90.0', status: 'ready' },
      { name: 'trivy', version: '0.68.2', status: 'excluded' },
      { name: 'checkov', status: 'not_installed' },
      { name: 'nuclei', status: 'not_installed' },
    ])
    expect(toolsNotInstalled(s)).toEqual(['checkov', 'nuclei'])
    expect(dispatchTools(s)).toEqual(['semgrep'])
  })

  it('prefers the API mismatch list', () => {
    const s = base({
      tools: ['nuclei'] as never[],
      reported: report([]),
      capability_mismatch: { tools_not_installed: ['nuclei'] },
    })
    expect(toolsNotInstalled(s)).toEqual(['nuclei'])
  })

  it('treats an empty inventory as reported', () => {
    const s = base({
      reported: report([]),
      effective: { tools: [], capabilities: [], max_concurrent_jobs: 5 },
    })
    expect(hasReportedTools(s)).toBe(true)
    expect(sensorToolRows(s)).toEqual([])
    expect(dispatchTools(s)).toEqual([])
  })
})

describe('sensorCapacity', () => {
  it('uses the effective capacity from the API', () => {
    const s = base({
      reported: report(null, 3),
      effective: { tools: [], capabilities: [], max_concurrent_jobs: 3 },
    })
    expect(sensorCapacity(s)).toEqual({ effective: 3, reported: 3, limit: 5 })
    expect(capacityLabel(s)).toBe('reported 3 · limit 5')
  })

  it('computes the smaller one without an effective block', () => {
    expect(sensorCapacity(base({ reported: report(null, 8) }))).toEqual({
      effective: 5,
      reported: 8,
      limit: 5,
    })
  })

  it('is the limit when nothing is reported', () => {
    const s = base({ reported: null })
    expect(sensorCapacity(s)).toEqual({ effective: 5, reported: null, limit: 5 })
    expect(capacityLabel(s)).toBe('limit 5')
  })
})

describe('fleet capacity', () => {
  it('counts the effective slots', async () => {
    const { summarizeFleet } = await import('../fleet')
    const NOW = new Date('2026-10-02T12:00:00Z').getTime()
    const s = {
      id: 'a',
      tenant_id: 't',
      name: 'a',
      type: 'worker',
      capabilities: [],
      tools: [],
      execution_mode: 'daemon',
      status: 'active',
      health: 'online',
      api_key_prefix: TEST_SENSOR_KEY_PREFIX,
      cpu_percent: 0,
      memory_percent: 0,
      max_concurrent_jobs: 5,
      current_jobs: 1,
      labels: {},
      config: {},
      metadata: {},
      total_findings: 0,
      total_scans: 0,
      error_count: 0,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      last_seen_at: new Date(NOW - 5000).toISOString(),
      reported: report([], 2),
      effective: { tools: [], capabilities: [], max_concurrent_jobs: 2 },
    } as Sensor
    expect(summarizeFleet([s], NOW, undefined, { latest: 'v0.4.2', min: 'v0.4.0' }).jobSlots).toBe(
      2
    )
  })
})
