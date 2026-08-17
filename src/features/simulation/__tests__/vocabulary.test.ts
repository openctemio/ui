import { describe, it, expect } from 'vitest'

import { CONTROL_TEST_STATUSES, CONTROL_TEST_RESULTS } from '../vocabulary'

// The exact list simulation.AllControlTestStatuses() returns in the API
// (pkg/domain/simulation/control.go). Written out rather than imported, because
// the point is to catch the two sides drifting apart.
const BACKEND_CONTROL_TEST_STATUSES = ['untested', 'pass', 'fail', 'partial', 'not_applicable']

// What a form would offer if someone typed the labels instead of the wire
// values. None of these are accepted, and before api#417 nothing rejected them
// either — control_tests has no CHECK constraint, so the string was stored and
// then matched no status filter.
const REJECTED_BY_BACKEND = ['Pass', 'passed', 'PARTIAL', 'not-applicable', 'failed', '']

describe('control test vocabulary', () => {
  it('matches the statuses the backend accepts, exactly', () => {
    expect([...CONTROL_TEST_STATUSES]).toEqual(BACKEND_CONTROL_TEST_STATUSES)
  })

  it('offers only recordable outcomes in the form', () => {
    const offered = CONTROL_TEST_RESULTS.map((r) => r.value)

    for (const value of offered) {
      expect(
        BACKEND_CONTROL_TEST_STATUSES,
        `the form offers "${value}", which the API rejects`
      ).toContain(value)
    }

    // untested is the initial state, not an outcome. Offering it would let a
    // user set a control back to untested while stamping last_tested_at, which
    // reads as "tested, result: not tested".
    expect(offered).not.toContain('untested')

    // Every other status must be offered — a backend status with no way to
    // record it is a value the product claims to support and cannot reach.
    const recordable = BACKEND_CONTROL_TEST_STATUSES.filter((s) => s !== 'untested')
    expect([...offered].sort()).toEqual([...recordable].sort())
  })

  it('never offers a near-miss the backend would reject', () => {
    const offered = CONTROL_TEST_RESULTS.map((r) => r.value)
    for (const bad of REJECTED_BY_BACKEND) {
      expect(offered, `"${bad}" would be rejected by the API`).not.toContain(bad)
    }
  })

  it('gives every option a human label', () => {
    for (const r of CONTROL_TEST_RESULTS) {
      expect(r.label.length, `${r.value} has no label`).toBeGreaterThan(0)
      // The label must not be the raw wire value — 'not_applicable' in a
      // dropdown is a leaked implementation detail.
      expect(r.label).not.toBe(r.value)
    }
  })
})
