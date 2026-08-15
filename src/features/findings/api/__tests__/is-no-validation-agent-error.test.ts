/**
 * Tests for isNoValidationAgentError — the guard that lets the finding detail
 * page turn the API's "no validation-capable agent is online" 400 into an
 * actionable deploy-an-agent hint instead of a generic failure toast.
 */

import { describe, it, expect } from 'vitest'
import { isNoValidationAgentError } from '../use-findings-api'

describe('isNoValidationAgentError', () => {
  it('matches the API error message (Error instance)', () => {
    const err = new Error(
      'no validation-capable agent is online for this tenant; deploy a validation agent to run this check'
    )
    expect(isNoValidationAgentError(err)).toBe(true)
  })

  it('matches case-insensitively', () => {
    const err = new Error('No Validation-Capable Agent is online')
    expect(isNoValidationAgentError(err)).toBe(true)
  })

  it('matches a raw string message', () => {
    expect(isNoValidationAgentError('no validation-capable agent is online')).toBe(true)
  })

  it('does not match unrelated validation errors', () => {
    expect(isNoValidationAgentError(new Error('finding is not a network-addressable asset'))).toBe(
      false
    )
  })

  it('is false for null/undefined/non-error values', () => {
    expect(isNoValidationAgentError(null)).toBe(false)
    expect(isNoValidationAgentError(undefined)).toBe(false)
    expect(isNoValidationAgentError({ foo: 'bar' })).toBe(false)
  })
})
