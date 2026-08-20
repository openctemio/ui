import { describe, it, expect } from 'vitest'
import {
  ownershipState,
  evidenceState,
  freshnessState,
  staleState,
  fmtPct,
  fmtAge,
} from '../data-quality'

describe('ownershipState', () => {
  it('is good at/above the 95% CTEM target', () => {
    expect(ownershipState(95)).toBe('good')
    expect(ownershipState(100)).toBe('good')
  })
  it('warns in the 75–95% band and is critical below', () => {
    expect(ownershipState(80)).toBe('warn')
    expect(ownershipState(50)).toBe('crit')
  })
  it('is pending when the metric is absent', () => {
    expect(ownershipState(undefined)).toBe('pending')
    expect(ownershipState(null)).toBe('pending')
    expect(ownershipState(NaN)).toBe('pending')
  })
})

describe('evidenceState', () => {
  it('is good at/above 90%, warns to 70%, crit below', () => {
    expect(evidenceState(90)).toBe('good')
    expect(evidenceState(75)).toBe('warn')
    expect(evidenceState(60)).toBe('crit')
  })
})

describe('freshnessState', () => {
  it('is good under 48h, warns under a week, crit beyond', () => {
    expect(freshnessState(12)).toBe('good')
    expect(freshnessState(100)).toBe('warn')
    expect(freshnessState(200)).toBe('crit')
  })
  it('is pending when absent', () => {
    expect(freshnessState(undefined)).toBe('pending')
  })
})

describe('staleState', () => {
  it('lower is better: good under 10%, warn under 25%, crit beyond', () => {
    expect(staleState(5)).toBe('good')
    expect(staleState(15)).toBe('warn')
    expect(staleState(40)).toBe('crit')
  })
})

describe('formatters', () => {
  it('fmtPct renders one decimal or null when absent', () => {
    expect(fmtPct(95)).toBe('95.0%')
    expect(fmtPct(undefined)).toBeNull()
  })
  it('fmtAge renders hours under 48h and days beyond', () => {
    expect(fmtAge(12)).toBe('12.0h')
    expect(fmtAge(72)).toBe('3.0d')
    expect(fmtAge(null)).toBeNull()
  })
})
