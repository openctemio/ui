import { describe, it, expect } from 'vitest'
import {
  CONTROL_TYPES,
  CONTROL_TYPE_VALUES,
  CONTROL_STATUSES,
  TEST_RESULTS,
  factorToPercent,
  percentToFactor,
  isValidReductionPercent,
  MAX_REDUCTION_PERCENT,
  MIN_REDUCTION_PERCENT,
} from '../vocabulary'

/**
 * These values mirror CHECK constraints on the compensating_controls table.
 * They are duplicated here deliberately: if someone edits the vocabulary, this
 * literal list is what refuses to move with them.
 *
 * Source of truth:
 *   api/migrations/000146_compensating_controls.up.sql
 *   api/pkg/domain/compensatingcontrol/entity.go
 */
const BACKEND_CONTROL_TYPES = ['segmentation', 'identity', 'runtime', 'detection', 'other']
const BACKEND_CONTROL_STATUSES = ['active', 'inactive', 'expired', 'untested']
const BACKEND_TEST_RESULTS = ['pass', 'fail', 'partial']

// The vocabulary the create form used to offer. It has ZERO overlap with what
// the database accepts, which is why every create failed with a 500.
const REJECTED_BY_BACKEND = ['preventive', 'detective', 'corrective', 'compensating', 'pending']

describe('compensating control vocabulary', () => {
  it('offers exactly the control types the backend accepts', () => {
    expect(CONTROL_TYPE_VALUES).toEqual(BACKEND_CONTROL_TYPES)
  })

  it('never offers a control type the backend rejects', () => {
    for (const bad of REJECTED_BY_BACKEND) {
      expect(CONTROL_TYPE_VALUES).not.toContain(bad)
    }
  })

  it('gives every control type a label for the dropdown', () => {
    for (const type of CONTROL_TYPES) {
      expect(type.label.length).toBeGreaterThan(0)
      expect(type.value).toBe(type.value.toLowerCase())
    }
  })

  it('matches the backend status and test-result vocabularies', () => {
    expect([...CONTROL_STATUSES]).toEqual(BACKEND_CONTROL_STATUSES)
    expect([...TEST_RESULTS]).toEqual(BACKEND_TEST_RESULTS)
  })
})

describe('reduction factor unit conversion', () => {
  it('converts the form percent to the 0-1 fraction the column stores', () => {
    // The old form sent 20 for "20%", which is 20x the CHECK ceiling of 1.
    expect(percentToFactor(20)).toBe(0.2)
    expect(percentToFactor(30)).toBe(0.3)
    expect(percentToFactor(100)).toBe(1)
    expect(percentToFactor(1)).toBe(0.01)
  })

  it('renders a stored fraction back as a percent', () => {
    // The list used to render a stored 0.3 as "0.3%".
    expect(factorToPercent(0.3)).toBe(30)
    expect(factorToPercent(1)).toBe(100)
    expect(factorToPercent(0.05)).toBe(5)
  })

  it('round-trips every whole percent losslessly', () => {
    for (let percent = MIN_REDUCTION_PERCENT; percent <= MAX_REDUCTION_PERCENT; percent++) {
      expect(factorToPercent(percentToFactor(percent))).toBe(percent)
    }
  })

  it('always produces a fraction the CHECK constraint accepts', () => {
    for (let percent = MIN_REDUCTION_PERCENT; percent <= MAX_REDUCTION_PERCENT; percent++) {
      const factor = percentToFactor(percent)
      expect(factor).toBeGreaterThan(0)
      expect(factor).toBeLessThanOrEqual(1)
      // DECIMAL(3,2): at most two decimal places, or Postgres rounds silently.
      expect(Number(factor.toFixed(2))).toBe(factor)
    }
  })

  it('rejects percentages the API would refuse', () => {
    // 0 is storable but a silent no-op: the classifier only treats an asset as
    // protected when the factor is > 0.
    expect(isValidReductionPercent(0)).toBe(false)
    expect(isValidReductionPercent(-10)).toBe(false)
    expect(isValidReductionPercent(101)).toBe(false)
    expect(isValidReductionPercent(Number.NaN)).toBe(false)
    expect(isValidReductionPercent(20)).toBe(true)
    expect(isValidReductionPercent(100)).toBe(true)
  })
})
