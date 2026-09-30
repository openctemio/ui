/**
 * The asset detail sheet showed almost nothing because transformAsset dropped
 * fields the API always returns. This pins the mapping using a real
 * GET /api/v1/assets/{id} payload (the gitleaks repository from the live
 * inventory), so a future edit to the transform cannot silently drop them.
 */

import { describe, it, expect, vi, type Mock } from 'vitest'

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

import { get } from '@/lib/api/client'
import { getAsset } from '../use-assets'

const liveGitleaksPayload = {
  id: '019f5efa-3cd1-75cc-8804-0b00ff896af8',
  tenant_id: '019d9095-a3fb-75dd-bc23-a244713dcc51',
  name: 'github.com/gitleaks/gitleaks',
  type: 'repository',
  category: 'code',
  provider: 'other',
  criticality: 'high',
  status: 'active',
  scope: 'internal',
  exposure: 'unknown',
  risk_score: 73,
  finding_count: 22,
  finding_severity_counts: { critical: 0, high: 16, medium: 6, low: 0, info: 0 },
  properties: { source: 'parse_options' },
  discovery_source: 'agent',
  discovery_tool: 'gitleaks',
  discovered_at: '2026-07-14T04:54:45.713383Z',
  pii_data_exposed: false,
  phi_data_exposed: false,
  is_internet_accessible: false,
  sync_status: 'synced',
  first_seen: '2026-07-14T04:54:45.713378Z',
  last_seen: '2026-07-14T05:57:44.236867Z',
  created_at: '2026-07-14T04:54:45.713378Z',
  updated_at: '2026-07-16T08:53:44.467306Z',
  manual_status_override: false,
}

describe('getAsset mapping', () => {
  it('keeps the detail fields the API returns', async () => {
    ;(get as Mock).mockResolvedValueOnce(liveGitleaksPayload)

    const a = await getAsset(liveGitleaksPayload.id)

    expect(a.riskScore).toBe(73)
    expect(a.findingCount).toBe(22)
    expect(a.findingSeverityCounts).toEqual({ critical: 0, high: 16, medium: 6, low: 0, info: 0 })
    expect(a.discoverySource).toBe('agent')
    expect(a.discoveryTool).toBe('gitleaks')
    expect(a.discoveredAt).toBe('2026-07-14T04:54:45.713383Z')
    expect(a.piiDataExposed).toBe(false)
    expect(a.phiDataExposed).toBe(false)
    expect(a.isInternetAccessible).toBe(false)
    expect(a.syncStatus).toBe('synced')
    expect(a.metadata).toEqual({ source: 'parse_options' })
  })

  it('treats omitted optional fields as absent, not empty', async () => {
    ;(get as Mock).mockResolvedValueOnce({
      ...liveGitleaksPayload,
      compliance_scope: [],
      data_classification: '',
      external_id: '',
      finding_severity_counts: undefined,
    })

    const a = await getAsset(liveGitleaksPayload.id)

    expect(a.complianceScope).toBeUndefined()
    expect(a.dataClassification).toBeUndefined()
    expect(a.externalId).toBeUndefined()
    expect(a.findingSeverityCounts).toBeUndefined()
  })
})
