import { describe, expect, it } from 'vitest'

import type { SensorContent } from '@/lib/api/sensor-types'

import {
  contentAgeText,
  contentByTool,
  contentCheckSummary,
  contentLabel,
  contentProblemText,
  contentState,
  formatHours,
  shortDigest,
  worstContentState,
} from '../content'

const NOW = new Date('2026-10-05T00:00:00Z').getTime()

function item(over: Partial<SensorContent> = {}): SensorContent {
  return {
    tool: 'trivy',
    name: 'trivy-db',
    version: '2026-10-04T01:05:41Z',
    updated_at: '2026-10-04T00:00:00Z',
    managed: true,
    stale: false,
    ...over,
  }
}

describe('contentState', () => {
  it('reads each state', () => {
    expect(contentState(item())).toBe('fresh')
    expect(contentState(item({ stale: true }))).toBe('stale')
    expect(contentState(item({ error: 'registry unreachable' }))).toBe('failed')
    expect(contentState(item({ error: 'x', stale: true }))).toBe('failed')
    expect(contentState(item({ pin_mismatch: true, pinned_version: 'sha256:aa' }))).toBe('mismatch')
    expect(contentState(item({ version: '' }))).toBe('missing')
    // Unmanaged content is not judged: the tool fetches it on each scan.
    expect(contentState(item({ managed: false, stale: true, version: '' }))).toBe('unmanaged')
  })

  it('takes the worst state of a sensor', () => {
    expect(worstContentState(undefined)).toBeNull()
    expect(worstContentState([])).toBeNull()
    expect(worstContentState([item(), item({ name: 'nuclei-templates' })])).toBe('fresh')
    expect(worstContentState([item(), item({ managed: false })])).toBe('unmanaged')
    expect(worstContentState([item({ stale: true }), item({ error: 'boom' })])).toBe('failed')
    expect(worstContentState([item({ managed: false }), item({ stale: true })])).toBe('stale')
  })
})

describe('formatting', () => {
  it('labels known content and passes others through', () => {
    expect(contentLabel('trivy-db')).toBe('Trivy vulnerability DB')
    expect(contentLabel('nuclei-templates')).toBe('Nuclei templates')
    expect(contentLabel('custom-feed')).toBe('custom-feed')
  })

  it('shows the age from the API, else from the timestamps', () => {
    expect(contentAgeText(item({ age_seconds: 3 * 86400 }), NOW)).toBe('3d old')
    expect(contentAgeText(item({ age_seconds: null }), NOW)).toBe('1d old')
    expect(contentAgeText(item({ updated_at: null, fetched_at: null }), NOW)).toBeNull()
  })

  it('formats limits and digests', () => {
    expect(formatHours(48)).toBe('2d')
    expect(formatHours(36)).toBe('36h')
    expect(formatHours(0)).toBeNull()
    expect(shortDigest('sha256:3b169afdc4a0862bcd1dd493d9fedb5b')).toBe('sha256:3b169afdc4a0')
    expect(shortDigest('abcdef0123456789')).toBe('abcdef012345')
    expect(shortDigest('')).toBeNull()
  })

  it('groups by tool in reported order', () => {
    const g = contentByTool([
      item(),
      item({ tool: 'nuclei', name: 'nuclei-templates' }),
      item({ name: 'trivy-java-db' }),
    ])
    expect(g.map((x) => [x.tool, x.items.length])).toEqual([
      ['trivy', 2],
      ['nuclei', 1],
    ])
  })
})

describe('problems and the checklist line', () => {
  it('says what is wrong', () => {
    expect(
      contentProblemText(item({ stale: true, age_seconds: 3 * 86400, max_age_hours: 48 }), NOW)
    ).toBe('Trivy vulnerability DB is 3d old (limit 2d).')
    expect(contentProblemText(item({ error: 'timeout' }), NOW)).toContain(
      'the last refresh failed (timeout)'
    )
    expect(
      contentProblemText(
        item({
          name: 'nuclei-templates',
          version: 'v10.4.8',
          pin_mismatch: true,
          pinned_version: 'v10.4.9',
        }),
        NOW
      )
    ).toBe('Nuclei templates runs v10.4.8, not the pinned v10.4.9.')
    expect(contentProblemText(item(), NOW)).toBeNull()
    expect(contentProblemText(item({ managed: false }), NOW)).toBeNull()
  })

  it('summarizes for the drawer checklist', () => {
    expect(contentCheckSummary({ content: undefined }, NOW)).toBeNull()
    expect(contentCheckSummary({ content: [item({ error: 'x' })] }, NOW)?.status).toBe('critical')
    expect(contentCheckSummary({ content: [item({ stale: true })] }, NOW)?.status).toBe('warning')
    const ok = contentCheckSummary({ content: [item()] }, NOW)
    expect(ok).toEqual({ status: 'ok', text: 'Trivy vulnerability DB 2026-10-04T01:05:41Z' })
    const mixed = contentCheckSummary(
      { content: [item(), item({ tool: 'semgrep', name: 'semgrep-rules', managed: false })] },
      NOW
    )
    expect(mixed?.status).toBe('info')
    expect(mixed?.text).toContain('not controlled')
  })
})
