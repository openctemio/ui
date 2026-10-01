import { describe, it, expect } from 'vitest'
import { runTriggeredByLabel, scanRunCounts, isRunInProgress } from '../lib/run-display'

const USER_ID = '76df42a3-72d0-45da-a1c8-5a8b2a01f658'

describe('runTriggeredByLabel', () => {
  it("shows the user's name, not their id", () => {
    expect(runTriggeredByLabel({ triggered_by: USER_ID, triggered_by_name: 'Olivia Owner' })).toBe(
      'Olivia Owner'
    )
  })

  it('never shows a raw user id', () => {
    expect(runTriggeredByLabel({ triggered_by: USER_ID })).toBe('Unknown user')
  })

  it('keeps non-user triggers as sent, and nothing when there is none', () => {
    expect(runTriggeredByLabel({ triggered_by: 'system' })).toBe('system')
    expect(runTriggeredByLabel({})).toBeNull()
  })
})

describe('scanRunCounts', () => {
  const fresh = { total_runs: 0, successful_runs: 0, failed_runs: 0 }

  it('counts a run in progress (was "Total runs 0" next to a running run)', () => {
    const c = scanRunCounts(fresh, [{ status: 'running' }])
    expect(c.total).toBe(1)
    expect(c.inProgress).toBe(1)
    expect(c.successRate).toBe(0)
  })

  it('adds in-progress runs to the finished ones; success rate is over finished runs', () => {
    const c = scanRunCounts({ total_runs: 4, successful_runs: 3, failed_runs: 1 }, [
      { status: 'queued' },
      { status: 'pending' },
      { status: 'completed' },
      { status: 'failed' },
    ])
    expect(c).toEqual({ total: 6, inProgress: 2, successful: 3, failed: 1, successRate: 75 })
  })

  it('knows which statuses are in progress', () => {
    expect(['pending', 'queued', 'running'].every((status) => isRunInProgress({ status }))).toBe(
      true
    )
    expect(
      ['completed', 'failed', 'cancelled', 'timeout'].some((status) => isRunInProgress({ status }))
    ).toBe(false)
  })
})
