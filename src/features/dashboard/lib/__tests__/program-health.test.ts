import { describe, it, expect } from 'vitest'
import {
  remediationCompletionPct,
  remediationCompletionState,
  hoursToDays,
  remediationTimeState,
  ownerCoverageState,
  reopenRateState,
  slaComplianceState,
  exposureTrendDelta,
  exposureTrendState,
  downgradeState,
} from '../program-health'

describe('remediationCompletionPct', () => {
  it('is resolved / (open + resolved) as a percentage', () => {
    expect(remediationCompletionPct(1, 9)).toBe(90)
    expect(remediationCompletionPct(0, 10)).toBe(100)
  })
  it('returns null when there is nothing in the class (no denominator)', () => {
    expect(remediationCompletionPct(0, 0)).toBeNull()
  })
})

describe('remediationCompletionState', () => {
  it('is good at/above 90, warn 70-89, crit below 70', () => {
    expect(remediationCompletionState(90)).toBe('good')
    expect(remediationCompletionState(89.9)).toBe('warn')
    expect(remediationCompletionState(70)).toBe('warn')
    expect(remediationCompletionState(69.9)).toBe('crit')
  })
  it('is pending when unmeasurable', () => {
    expect(remediationCompletionState(null)).toBe('pending')
  })
})

describe('hoursToDays / remediationTimeState', () => {
  it('converts hours to days', () => {
    expect(hoursToDays(48)).toBe(2)
  })
  it('treats non-positive / missing as null', () => {
    expect(hoursToDays(0)).toBeNull()
    expect(hoursToDays(undefined)).toBeNull()
  })
  it('is good under 14d, warn under 30d, crit at/above 30d', () => {
    expect(remediationTimeState(13.9)).toBe('good')
    expect(remediationTimeState(14)).toBe('warn')
    expect(remediationTimeState(29.9)).toBe('warn')
    expect(remediationTimeState(30)).toBe('crit')
    expect(remediationTimeState(null)).toBe('pending')
  })
})

describe('ownerCoverageState', () => {
  it('is good at/above 95, warn 75-94, crit below 75', () => {
    expect(ownerCoverageState(100)).toBe('good')
    expect(ownerCoverageState(95)).toBe('good')
    expect(ownerCoverageState(94.9)).toBe('warn')
    expect(ownerCoverageState(74.9)).toBe('crit')
    expect(ownerCoverageState(undefined)).toBe('pending')
  })
})

describe('reopenRateState (lower is better)', () => {
  it('is good under 20, warn under 35, crit at/above 35', () => {
    expect(reopenRateState(0)).toBe('good')
    expect(reopenRateState(19.9)).toBe('good')
    expect(reopenRateState(20)).toBe('warn')
    expect(reopenRateState(34.9)).toBe('warn')
    expect(reopenRateState(35)).toBe('crit')
    expect(reopenRateState(undefined)).toBe('pending')
  })
})

describe('slaComplianceState (higher is better)', () => {
  it('is good at/above 90, warn 70-89, crit below 70', () => {
    expect(slaComplianceState(90)).toBe('good')
    expect(slaComplianceState(89.9)).toBe('warn')
    expect(slaComplianceState(69.9)).toBe('crit')
    expect(slaComplianceState(undefined)).toBe('pending')
  })
})

describe('exposureTrendDelta / exposureTrendState', () => {
  it('is last minus first of the open series', () => {
    expect(exposureTrendDelta([100, 90, 80])).toBe(-20)
    expect(exposureTrendDelta([80, 100])).toBe(20)
  })
  it('needs at least two points', () => {
    expect(exposureTrendDelta([])).toBeNull()
    expect(exposureTrendDelta([5])).toBeNull()
  })
  it('down is good, flat is warn, up is crit', () => {
    expect(exposureTrendState(-1)).toBe('good')
    expect(exposureTrendState(0)).toBe('warn')
    expect(exposureTrendState(1)).toBe('crit')
    expect(exposureTrendState(null)).toBe('pending')
  })
})

describe('downgradeState', () => {
  it('is pending when the denominator is absent (API predates the metric)', () => {
    expect(downgradeState(undefined, undefined)).toBe('pending')
    expect(downgradeState(0, null)).toBe('pending')
  })
  it('is pending — not measured — when wired but empty (0 validations yet)', () => {
    expect(downgradeState(0, 0)).toBe('pending')
  })
  it('is good inside the 25-40% band, warn adjacent, crit far off', () => {
    expect(downgradeState(25, 40)).toBe('good')
    expect(downgradeState(33, 40)).toBe('good')
    expect(downgradeState(40, 40)).toBe('good')
    expect(downgradeState(10, 40)).toBe('warn')
    expect(downgradeState(55, 40)).toBe('warn')
    expect(downgradeState(5, 40)).toBe('crit')
    expect(downgradeState(80, 40)).toBe('crit')
  })
})
