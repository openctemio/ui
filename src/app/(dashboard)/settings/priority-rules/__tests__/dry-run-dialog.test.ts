import { describe, expect, test } from 'vitest'
import { buildApproximateFilter, serverOnlyConditions, CLIENT_EVALUABLE } from '../dry-run-dialog'

describe('buildApproximateFilter', () => {
  test('always excludes closed statuses so preview covers only open findings', () => {
    const p = buildApproximateFilter([])
    expect(p.get('exclude_statuses')).toContain('resolved')
    expect(p.get('exclude_statuses')).toContain('verified')
    expect(p.get('exclude_statuses')).toContain('false_positive')
  })

  test('translates severity eq to a severities filter', () => {
    const p = buildApproximateFilter([{ field: 'severity', operator: 'eq', value: 'critical' }])
    expect(p.getAll('severities')).toEqual(['critical'])
  })

  test('translates severity in [array] to multiple severities params', () => {
    const p = buildApproximateFilter([
      { field: 'severity', operator: 'in', value: ['critical', 'high'] },
    ])
    expect(p.getAll('severities').sort()).toEqual(['critical', 'high'])
  })

  test('ignores server-only fields (is_in_kev, epss_score, etc.)', () => {
    const p = buildApproximateFilter([
      { field: 'is_in_kev', operator: 'eq', value: true },
      { field: 'epss_score', operator: 'gte', value: 0.5 },
      { field: 'asset_is_crown_jewel', operator: 'eq', value: true },
    ])
    // Only the baseline exclude_statuses + pagination should be set.
    expect(p.has('severities')).toBe(false)
  })

  test('paginates — per_page 10 is a preview, not a full pull', () => {
    const p = buildApproximateFilter([])
    expect(p.get('per_page')).toBe('10')
    expect(p.get('page')).toBe('1')
  })
})

describe('serverOnlyConditions', () => {
  test('returns empty when every predicate is client-evaluable', () => {
    const out = serverOnlyConditions([{ field: 'severity', operator: 'eq', value: 'high' }])
    expect(out).toEqual([])
  })

  test('extracts every non-client-evaluable field', () => {
    const out = serverOnlyConditions([
      { field: 'severity', operator: 'eq', value: 'high' },
      { field: 'is_in_kev', operator: 'eq', value: true },
      { field: 'asset_is_crown_jewel', operator: 'eq', value: true },
    ])
    expect(out.map((c) => c.field)).toEqual(['is_in_kev', 'asset_is_crown_jewel'])
  })
})

describe('CLIENT_EVALUABLE', () => {
  test('contract — only severity is client-evaluable today', () => {
    // If this test fails it means a field was added/removed from
    // CLIENT_EVALUABLE without matching the buildApproximateFilter
    // branch below — keep them in lockstep so the preview count
    // stays honest.
    expect(CLIENT_EVALUABLE).toEqual(['severity'])
  })
})
