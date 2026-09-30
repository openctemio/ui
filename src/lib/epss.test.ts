import { describe, expect, it } from 'vitest'

import {
  epssScoreToPercent,
  epssTopPercent,
  formatEpssPercentile,
  formatEpssScore,
  formatEpssTopPercent,
} from './epss'

describe('formatEpssScore (0–1 probability)', () => {
  it('renders a probability as a percentage', () => {
    expect(formatEpssScore(0.97565)).toBe('97.6%')
    expect(formatEpssScore(0.97443, 2)).toBe('97.44%')
    expect(formatEpssScore(0)).toBe('0.0%')
    expect(formatEpssScore(1)).toBe('100.0%')
  })
  it('clamps out-of-range input', () => {
    expect(formatEpssScore(1.5)).toBe('100.0%')
    expect(formatEpssScore(-0.2)).toBe('0.0%')
  })
  it('returns the placeholder for missing values', () => {
    expect(formatEpssScore(null)).toBe('—')
    expect(formatEpssScore(undefined)).toBe('—')
    expect(formatEpssScore(Number.NaN)).toBe('—')
    expect(formatEpssScore(null, 1, 'N/A')).toBe('N/A')
  })
  it('converts to a bar width', () => {
    expect(epssScoreToPercent(0.25)).toBe(25)
    expect(epssScoreToPercent(null)).toBe(0)
    expect(epssScoreToPercent(3)).toBe(100)
  })
})

describe('formatEpssPercentile (0–100 rank)', () => {
  it('renders the canonical 0–100 value without rescaling', () => {
    expect(formatEpssPercentile(99.9)).toBe('99.9th')
    expect(formatEpssPercentile(87.3)).toBe('87.3th')
  })
  it('does not mistake a bottom-1% value for a fraction', () => {
    expect(formatEpssPercentile(0.9)).toBe('0.9th')
  })
  it('floors instead of rounding up to 100', () => {
    expect(formatEpssPercentile(99.96)).toBe('99.9th')
    expect(formatEpssPercentile(99.9, 0)).toBe('99th')
  })
  it('uses English ordinals for whole numbers', () => {
    expect(formatEpssPercentile(1, 0)).toBe('1st')
    expect(formatEpssPercentile(42, 0)).toBe('42nd')
    expect(formatEpssPercentile(73, 0)).toBe('73rd')
    expect(formatEpssPercentile(11, 0)).toBe('11th')
    expect(formatEpssPercentile(100, 0)).toBe('100th')
  })
  it('returns the placeholder for missing values', () => {
    expect(formatEpssPercentile(null)).toBe('—')
    expect(formatEpssPercentile(undefined, 0, '')).toBe('')
  })
})

describe('formatEpssTopPercent', () => {
  it('renders CVE-2021-44228 (99.9th) as Top 0.1% — it used to be "Top -9890.0%"', () => {
    expect(formatEpssTopPercent(99.9)).toBe('Top 0.1%')
  })
  it('uses one decimal under 10% and none above', () => {
    expect(formatEpssTopPercent(95)).toBe('Top 5.0%')
    expect(formatEpssTopPercent(98.5)).toBe('Top 1.5%')
    expect(formatEpssTopPercent(75)).toBe('Top 25%')
    expect(formatEpssTopPercent(0)).toBe('Top 100%')
  })
  it('never places a CVE in a smaller bucket than it is in', () => {
    expect(formatEpssTopPercent(99.85)).toBe('Top 0.2%')
    expect(formatEpssTopPercent(72.1)).toBe('Top 28%')
  })
  it('handles the very top', () => {
    expect(formatEpssTopPercent(100)).toBe('Top <0.1%')
    expect(formatEpssTopPercent(99.97)).toBe('Top <0.1%')
  })
  it('returns the placeholder for missing values', () => {
    expect(formatEpssTopPercent(null)).toBe('—')
  })
  it('computes the raw share without float noise', () => {
    expect(epssTopPercent(99.9)).toBe(0.1)
    expect(epssTopPercent(120)).toBe(0)
  })
})
