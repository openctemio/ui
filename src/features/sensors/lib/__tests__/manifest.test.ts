import { describe, expect, it } from 'vitest'

import type { SensorManifestDocument, SensorManifestVersion } from '@/lib/api/sensor-types'

import { describeSensorActivity } from '../activity'
import {
  concurrencyText,
  diffManifests,
  isEmptyDiff,
  manifestDiffLines,
  manifestHistory,
  resourcesText,
} from '../manifest'

const prev: SensorManifestDocument = {
  schema: 1,
  capabilities: ['validate'],
  concurrency: { ceiling: 0, model: 'dynamic' },
  tools: [
    {
      name: 'nuclei',
      version: 'v3.11.1',
      installed: true,
      capabilities: ['dast'],
      content: [{ name: 'nuclei-templates', version: 'v10.4.9', managed: true }],
    },
    { name: 'trivy', version: '0.75.0', installed: true, capabilities: ['sca'] },
  ],
}
const next: SensorManifestDocument = {
  schema: 1,
  capabilities: ['validate'],
  concurrency: { ceiling: 4, model: 'dynamic' },
  tools: [
    {
      name: 'nuclei',
      version: 'v3.12.0',
      installed: true,
      capabilities: ['dast', 'validate:nuclei'],
      content: [{ name: 'nuclei-templates', version: 'v10.5.0', managed: true }],
    },
    { name: 'semgrep', version: '1.179.0', installed: true, capabilities: ['sast'] },
  ],
}

describe('diffManifests', () => {
  // The same case as the API's TestDiffManifests.
  it('lists tools, versions, capabilities and other members, not content', () => {
    const d = diffManifests(prev, next)
    expect(d).toEqual({
      tools_added: ['semgrep'],
      tools_removed: ['trivy'],
      versions: [{ tool: 'nuclei', from: 'v3.11.1', to: 'v3.12.0' }],
      capabilities: [{ tool: 'nuclei', added: ['validate:nuclei'], removed: [] }],
      other: ['concurrency'],
    })
    expect(manifestDiffLines(d)).toEqual([
      'Added: semgrep',
      'Removed: trivy',
      'nuclei v3.11.1 → v3.12.0',
      'nuclei capabilities: +validate:nuclei',
      'Changed: concurrency',
    ])
  })

  it('a content version alone is not a change', () => {
    const same: SensorManifestDocument = {
      ...prev,
      tools: [
        {
          ...prev.tools[0],
          content: [{ name: 'nuclei-templates', version: 'v10.6.0', managed: true }],
        },
        prev.tools[1],
      ],
    }
    expect(isEmptyDiff(diffManifests(prev, same))).toBe(true)
  })
})

describe('manifestHistory', () => {
  const v = (
    digest: string,
    manifest: SensorManifestDocument,
    current = false
  ): SensorManifestVersion => ({
    digest,
    source: 'sensor',
    current,
    manifest,
    ignored: [],
    first_seen_at: '2026-10-02T10:00:00Z',
    current_since: '2026-10-02T10:00:00Z',
    last_seen_at: '2026-10-02T10:00:00Z',
  })
  it('diffs each version against the one before it', () => {
    const rows = manifestHistory([v('sha256:b', next, true), v('sha256:a', prev)])
    expect(rows[0].diff?.tools_added).toEqual(['semgrep'])
    expect(rows[1].diff).toBeNull()
  })
})

describe('manifest text', () => {
  it('words resources and concurrency', () => {
    expect(
      resourcesText({ ...next, resources: { cpu_cores: 4, mem_total_bytes: 8 * 1024 ** 3 } })
    ).toMatch(/^4 CPU cores · .+ memory$/)
    expect(resourcesText(next)).toBeNull()
    expect(concurrencyText(next)).toBe('operator cap 4 · slots sized from CPU and memory')
    expect(concurrencyText(prev)).toBe('no operator cap · slots sized from CPU and memory')
  })
})

describe('manifest_changed in the activity timeline', () => {
  it('shows the diff lines', () => {
    const view = describeSensorActivity(
      {
        id: 'e:1',
        at: '2026-10-02T10:00:00Z',
        category: 'updates',
        type: 'manifest_changed',
        source: 'sensor',
        summary: 'Manifest changed: nuclei v3.11.1 → v3.12.0',
        details: { diff: { versions: [{ tool: 'nuclei', from: 'v3.11.1', to: 'v3.12.0' }] } },
      },
      (_k, fallback = '', vars) =>
        fallback.replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? '')),
      'en'
    )
    expect(view.title).toBe('Manifest changed')
    expect(view.details).toEqual(['nuclei v3.11.1 → v3.12.0'])
  })
})
