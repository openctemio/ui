/**
 * Finding Status Tests
 *
 * Tests for pentest CTEM status integration:
 * - getStatusesForSource returns correct statuses per source type
 * - All pentest statuses exist in FINDING_STATUS_CONFIG
 * - STATUS_TRANSITIONS for pentest statuses have valid targets
 * - PENTEST_STATUSES and AUTOMATED_STATUSES overlap only on shared statuses
 */

import { describe, it, expect } from 'vitest'
import {
  getStatusesForSource,
  PENTEST_STATUSES,
  AUTOMATED_STATUSES,
  STATUS_TRANSITIONS,
  FINDING_STATUS_CONFIG,
} from '../finding.types'
import type { FindingStatus } from '../finding.types'

// ============================================
// getStatusesForSource
// ============================================

describe('getStatusesForSource', () => {
  it('returns PENTEST_STATUSES for pentest source', () => {
    const result = getStatusesForSource('pentest')
    expect(result).toEqual(PENTEST_STATUSES)
  })

  it('returns AUTOMATED_STATUSES for sast source', () => {
    const result = getStatusesForSource('sast')
    expect(result).toEqual(AUTOMATED_STATUSES)
  })

  it('returns AUTOMATED_STATUSES for dast source', () => {
    const result = getStatusesForSource('dast')
    expect(result).toEqual(AUTOMATED_STATUSES)
  })

  it('returns AUTOMATED_STATUSES for unknown source', () => {
    const result = getStatusesForSource('unknown_scanner')
    expect(result).toEqual(AUTOMATED_STATUSES)
  })

  it('returns AUTOMATED_STATUSES for sca source', () => {
    const result = getStatusesForSource('sca')
    expect(result).toEqual(AUTOMATED_STATUSES)
  })
})

// ============================================
// FINDING_STATUS_CONFIG completeness
// ============================================

describe('FINDING_STATUS_CONFIG completeness', () => {
  it('has config entry for every pentest status', () => {
    for (const status of PENTEST_STATUSES) {
      const config = FINDING_STATUS_CONFIG[status]
      expect(config, `Missing config for pentest status: ${status}`).toBeDefined()
      expect(config.label).toBeTruthy()
      expect(config.color).toBeTruthy()
      expect(config.icon).toBeTruthy()
      expect(config.category).toBeTruthy()
    }
  })

  it('has config entry for every automated status', () => {
    for (const status of AUTOMATED_STATUSES) {
      const config = FINDING_STATUS_CONFIG[status]
      expect(config, `Missing config for automated status: ${status}`).toBeDefined()
      expect(config.label).toBeTruthy()
      expect(config.icon).toBeTruthy()
    }
  })

  it('pentest statuses have valid category values', () => {
    const validCategories = ['open', 'in_progress', 'closed']
    for (const status of PENTEST_STATUSES) {
      const config = FINDING_STATUS_CONFIG[status]
      expect(validCategories).toContain(config.category)
    }
  })

  it('draft status is in open category', () => {
    expect(FINDING_STATUS_CONFIG.draft.category).toBe('open')
  })

  it('in_review status is in open category', () => {
    expect(FINDING_STATUS_CONFIG.in_review.category).toBe('open')
  })

  it('remediation status is in in_progress category', () => {
    expect(FINDING_STATUS_CONFIG.remediation.category).toBe('in_progress')
  })

  it('retest status is in in_progress category', () => {
    expect(FINDING_STATUS_CONFIG.retest.category).toBe('in_progress')
  })

  it('verified status is in closed category', () => {
    expect(FINDING_STATUS_CONFIG.verified.category).toBe('closed')
  })

  it('accepted_risk status is in closed category', () => {
    expect(FINDING_STATUS_CONFIG.accepted_risk.category).toBe('closed')
  })
})

// ============================================
// STATUS_TRANSITIONS validity
// ============================================

describe('STATUS_TRANSITIONS for pentest statuses', () => {
  it('every pentest status has a transitions entry', () => {
    for (const status of PENTEST_STATUSES) {
      expect(
        STATUS_TRANSITIONS[status],
        `Missing transitions for pentest status: ${status}`
      ).toBeDefined()
      expect(Array.isArray(STATUS_TRANSITIONS[status])).toBe(true)
    }
  })

  it('all transition targets are valid FindingStatus values', () => {
    const allStatuses = Object.keys(FINDING_STATUS_CONFIG) as FindingStatus[]
    for (const status of PENTEST_STATUSES) {
      const targets = STATUS_TRANSITIONS[status]
      for (const target of targets) {
        expect(
          allStatuses,
          `Invalid transition target "${target}" from status "${status}"`
        ).toContain(target)
      }
    }
  })

  it('draft can transition to in_review', () => {
    expect(STATUS_TRANSITIONS.draft).toContain('in_review')
  })

  it('in_review can transition to confirmed', () => {
    expect(STATUS_TRANSITIONS.in_review).toContain('confirmed')
  })

  it('retest can transition to verified', () => {
    expect(STATUS_TRANSITIONS.retest).toContain('verified')
  })

  it('retest can transition back to remediation', () => {
    expect(STATUS_TRANSITIONS.retest).toContain('remediation')
  })

  it('verified can transition to remediation (reopen)', () => {
    expect(STATUS_TRANSITIONS.verified).toContain('remediation')
  })

  it('accepted_risk can transition to draft or confirmed', () => {
    expect(STATUS_TRANSITIONS.accepted_risk).toContain('draft')
    expect(STATUS_TRANSITIONS.accepted_risk).toContain('confirmed')
  })
})

// ============================================
// PENTEST_STATUSES and AUTOMATED_STATUSES overlap
// ============================================

describe('PENTEST_STATUSES and AUTOMATED_STATUSES disjointness', () => {
  const expectedShared: FindingStatus[] = ['confirmed', 'false_positive']

  it('shared statuses are exactly confirmed and false_positive', () => {
    const pentestSet = new Set(PENTEST_STATUSES)
    const automatedSet = new Set(AUTOMATED_STATUSES)
    const overlap: FindingStatus[] = []

    for (const status of pentestSet) {
      if (automatedSet.has(status)) {
        overlap.push(status)
      }
    }

    // Sort both for stable comparison
    expect(overlap.sort()).toEqual(expectedShared.sort())
  })

  it('pentest-only statuses do not appear in AUTOMATED_STATUSES', () => {
    const pentestOnly = PENTEST_STATUSES.filter((s) => !expectedShared.includes(s))
    for (const status of pentestOnly) {
      expect(AUTOMATED_STATUSES).not.toContain(status)
    }
  })

  it('automated-only statuses do not appear in PENTEST_STATUSES', () => {
    const automatedOnly = AUTOMATED_STATUSES.filter((s) => !expectedShared.includes(s))
    for (const status of automatedOnly) {
      expect(PENTEST_STATUSES).not.toContain(status)
    }
  })

  it('PENTEST_STATUSES contains pentest-specific statuses', () => {
    const pentestSpecific: FindingStatus[] = [
      'draft',
      'in_review',
      'remediation',
      'retest',
      'verified',
      'accepted_risk',
    ]
    for (const status of pentestSpecific) {
      expect(PENTEST_STATUSES).toContain(status)
    }
  })

  it('AUTOMATED_STATUSES contains automated-specific statuses', () => {
    const automatedSpecific: FindingStatus[] = [
      'new',
      'in_progress',
      'resolved',
      'accepted',
      'duplicate',
    ]
    for (const status of automatedSpecific) {
      expect(AUTOMATED_STATUSES).toContain(status)
    }
  })
})
