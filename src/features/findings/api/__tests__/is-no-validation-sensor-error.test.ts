/**
 * Tests for isNoValidationSensorError — the guard that lets the finding detail
 * page turn the API's "no validation-capable sensor is online" 400 into an
 * actionable deploy-a-sensor hint instead of a generic failure toast.
 */

import { describe, it, expect } from 'vitest'
import { isNoValidationSensorError } from '../use-findings-api'

describe('isNoValidationSensorError', () => {
  it('matches the API error message (Error instance)', () => {
    const err = new Error(
      'no validation-capable sensor is online for this tenant; deploy a validation sensor to run this check'
    )
    expect(isNoValidationSensorError(err)).toBe(true)
  })

  it('matches case-insensitively', () => {
    const err = new Error('No Validation-Capable Sensor is online')
    expect(isNoValidationSensorError(err)).toBe(true)
  })

  it('matches a raw string message', () => {
    expect(isNoValidationSensorError('no validation-capable sensor is online')).toBe(true)
  })

  it('does not match unrelated validation errors', () => {
    expect(isNoValidationSensorError(new Error('finding is not a network-addressable asset'))).toBe(
      false
    )
  })

  it('is false for null/undefined/non-error values', () => {
    expect(isNoValidationSensorError(null)).toBe(false)
    expect(isNoValidationSensorError(undefined)).toBe(false)
    expect(isNoValidationSensorError({ foo: 'bar' })).toBe(false)
  })
})
