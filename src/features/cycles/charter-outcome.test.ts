/**
 * Charter outcome presentation tests. The API judges each criterion; these
 * check that its numbers are rendered faithfully (units, comparators, the
 * "not measurable" reason) and that the summary never invents a rate.
 */

import { describe, it, expect } from 'vitest'

import {
  describeCriterion,
  formatCriterionValue,
  formatThreshold,
  summarizeEvaluation,
} from './charter-outcome'
import type { CriterionEvaluation } from './types'

describe('formatCriterionValue', () => {
  it('shows short durations in hours and long ones in days', () => {
    expect(formatCriterionValue(12, 'hours')).toBe('12 h')
    expect(formatCriterionValue(47.94, 'hours')).toBe('47.9 h')
    expect(formatCriterionValue(72, 'hours')).toBe('3 days')
    expect(formatCriterionValue(24 * 7, 'hours')).toBe('7 days')
  })

  it('formats percentages and counts', () => {
    expect(formatCriterionValue(66.666, 'percent')).toBe('66.7%')
    expect(formatCriterionValue(4, 'count')).toBe('4')
    expect(formatCriterionValue(45.123, 'score')).toBe('45.12')
  })
})

describe('describeCriterion', () => {
  const measured: CriterionEvaluation = {
    name: 'Fast fixes',
    metric: 'MTTR',
    target: '<= 1 day',
    metric_key: 'mttr_hours',
    comparator: '<=',
    threshold: 24,
    actual: 72,
    unit: 'hours',
    outcome: 'unmet',
  }

  it('states the measured value against the interpreted target', () => {
    expect(describeCriterion(measured)).toBe('Measured 3 days, target ≤ 24 h')
    expect(formatThreshold({ ...measured, comparator: '>=' })).toBe('≥ 24 h')
  })

  it('shows the API reason for a not-measurable criterion', () => {
    expect(
      describeCriterion({
        name: 'KEV',
        metric: 'open KEV findings',
        target: '0',
        outcome: 'not_measurable',
        reason: 'metric "open KEV findings" is not one the platform measures',
      })
    ).toBe('Metric "open KEV findings" is not one the platform measures')
  })

  it('has no threshold text when the target did not parse', () => {
    expect(formatThreshold({ outcome: 'not_measurable', unit: 'hours' })).toBe('')
  })
})

describe('summarizeEvaluation', () => {
  it('counts met against measurable criteria only', () => {
    expect(summarizeEvaluation({ met: 2, unmet: 1, not_measurable: 3, criteria: [] })).toBe(
      '2 of 3 met'
    )
  })

  it('does not invent a rate when nothing was measurable', () => {
    expect(
      summarizeEvaluation({
        met: 0,
        unmet: 0,
        not_measurable: 1,
        criteria: [{ outcome: 'not_measurable' }],
      })
    ).toBe('No measurable criteria')
  })

  it('returns null when there is no evaluation or no criteria', () => {
    expect(summarizeEvaluation(undefined)).toBeNull()
    expect(summarizeEvaluation({ met: 0, unmet: 0, not_measurable: 0, criteria: [] })).toBeNull()
  })
})
