import type { Activity } from '../types/finding.types'

/**
 * The activity feed of a finding page, and the count its header shows.
 *
 * The feed merges three sources: activities that arrived over the live stream
 * since the last fetch, the fetched (paged) activities, and the synthetic
 * "Recorded by ..." entry built from the finding itself when the API has no
 * creation activity. The header used to count only the API total plus the raw
 * live list, so a finding whose feed showed just the synthetic entry read
 * "Activity (0)", and a live activity already refetched was counted twice.
 */
export function mergeFindingActivities(input: {
  fetched: Activity[]
  fetchedTotal: number
  realtime: Activity[]
  fromFinding: Activity[] | undefined
}): { activities: Activity[]; count: number } {
  const fetchedIds = new Set(input.fetched.map((a) => a.id))
  const realtime = input.realtime.filter((a) => !fetchedIds.has(a.id))
  const synthetic = (input.fromFinding ?? []).filter(
    (a) => a.type === 'created' && !fetchedIds.has(a.id)
  )
  return {
    activities: [...realtime, ...input.fetched, ...synthetic],
    count: Math.max(input.fetchedTotal, input.fetched.length) + realtime.length + synthetic.length,
  }
}
