import { describe, it, expect } from 'vitest'
import type { Activity } from '../../types/finding.types'
import { mergeFindingActivities } from '../finding-activities'

const act = (id: string, type: Activity['type'] = 'comment'): Activity =>
  ({ id, type, actor: 'system', content: id, createdAt: '2026-10-01T00:00:00Z' }) as Activity

describe('mergeFindingActivities', () => {
  it('counts the synthetic "Recorded by" entry it shows (was "Activity (0)")', () => {
    const { activities, count } = mergeFindingActivities({
      fetched: [],
      fetchedTotal: 0,
      realtime: [],
      fromFinding: [act('act-created-1', 'created')],
    })
    expect(activities).toHaveLength(1)
    expect(count).toBe(1)
  })

  it('does not count a live activity twice once it has been fetched', () => {
    const { activities, count } = mergeFindingActivities({
      fetched: [act('a1'), act('a2')],
      fetchedTotal: 2,
      realtime: [act('a2')],
      fromFinding: [act('act-created-1', 'created')],
    })
    expect(activities.map((a) => a.id)).toEqual(['a1', 'a2', 'act-created-1'])
    expect(count).toBe(3)
  })

  it('counts unseen live activities and the full server total across pages', () => {
    const { activities, count } = mergeFindingActivities({
      fetched: [act('a1')],
      fetchedTotal: 40,
      realtime: [act('new')],
      fromFinding: [],
    })
    expect(activities.map((a) => a.id)).toEqual(['new', 'a1'])
    expect(count).toBe(41)
  })

  it('drops the synthetic entry when the API has its own creation activity', () => {
    const { count } = mergeFindingActivities({
      fetched: [act('act-created-1', 'created')],
      fetchedTotal: 1,
      realtime: [],
      fromFinding: [act('act-created-1', 'created')],
    })
    expect(count).toBe(1)
  })
})
