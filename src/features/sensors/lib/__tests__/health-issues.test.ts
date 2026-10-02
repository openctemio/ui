import { describe, expect, it } from 'vitest'

import type { Sensor, SensorContent } from '@/lib/api/sensor-types'

import { sensorHealthChecks } from '../health-checks'
import { sensorHealthIssues, worstIssueSeverity } from '../health-issues'

const NOW = new Date('2026-10-02T08:10:00Z').getTime()

const base: Sensor = {
  id: 's1',
  tenant_id: 't',
  name: 'sensor-docker-01',
  type: 'worker',
  capabilities: [],
  tools: ['nuclei'],
  execution_mode: 'daemon',
  status: 'active',
  health: 'online',
  api_key_prefix: 'rda_1',
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
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  last_seen_at: new Date(NOW - 5000).toISOString(),
  key_expires_at: null,
  version: 'v0.6.0',
}

const failed: SensorContent = {
  tool: 'nuclei',
  name: 'nuclei-templates',
  version: '',
  managed: true,
  stale: true,
  max_age_hours: 336,
  error:
    'resolve: checksums: Get "https://release-assets.githubusercontent.com/github-production-release-asset/253044228/35da6c58?sp=r&sv=2018-11-09&se=2026-10-02T09%3A01%3A49Z',
}

function issuesOf(s: Sensor) {
  const checks = sensorHealthChecks(s, {
    now: NOW,
    channel: { latest: 'v0.6.0', min: 'v0.4.0' },
    protocolV2Version: 'v0.5.0',
    protocolV1Sunset: '2027-04-01',
  })
  return sensorHealthIssues(s, checks, NOW)
}

describe('sensorHealthIssues', () => {
  it('is empty for a healthy sensor', () => {
    expect(issuesOf(base)).toEqual([])
    expect(worstIssueSeverity([])).toBeNull()
  })

  it('names a failed content refresh in plain words and keeps the raw error aside', () => {
    const [issue, ...rest] = issuesOf({ ...base, state: 'degraded', content: [failed] })
    expect(rest).toEqual([])
    expect(issue).toMatchObject({
      key: 'content:nuclei-templates',
      severity: 'warning',
      title: 'Nuclei templates: refresh failed',
      text: 'None is installed yet, so scans cannot use it.',
      action: 'refresh_content',
    })
    expect(issue.error).toBe(failed.error)
    expect(issue.text).not.toContain('https://')
  })

  it('says scans keep the installed version when there is one', () => {
    const [issue] = issuesOf({ ...base, content: [{ ...failed, version: 'v10.4.9' }] })
    expect(issue.text).toBe('Scans keep using the installed v10.4.9.')
  })

  it('reports stale content against its limit', () => {
    const [issue] = issuesOf({
      ...base,
      content: [{ ...failed, error: '', version: 'v1', age_seconds: 20 * 86400 }],
    })
    expect(issue.title).toBe('Nuclei templates is out of date')
    expect(issue.text).toBe('20d old, over the 14d limit.')
  })

  it('asks a never connected sensor to be installed', () => {
    const [issue] = issuesOf({ ...base, last_seen_at: undefined })
    expect(issue).toMatchObject({ title: 'Not connected yet', action: 'install' })
  })

  it('puts an offline sensor first, with when it went quiet', () => {
    const lastSeen = new Date(NOW - 3600 * 1000).toISOString()
    const issues = issuesOf({
      ...base,
      last_seen_at: lastSeen,
      content: [failed],
    })
    expect(issues[0]).toMatchObject({
      title: 'No heartbeat',
      severity: 'critical',
      since: lastSeen,
    })
    expect(worstIssueSeverity(issues)).toBe('critical')
  })

  it('reports a disabled sensor as information', () => {
    const [issue] = issuesOf({ ...base, status: 'disabled' })
    expect(issue).toMatchObject({ title: 'Disabled', severity: 'info' })
  })

  it('falls back to the API reasons when the checklist finds nothing', () => {
    const issues = issuesOf({
      ...base,
      state: 'degraded',
      health_reasons: [{ code: 'something_new', severity: 'warning', message: 'Disk almost full' }],
    })
    expect(issues).toEqual([
      expect.objectContaining({ title: 'Needs attention', text: 'Disk almost full' }),
    ])
  })
})
