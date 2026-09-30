'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { get } from '@/lib/api/client'
import type { StateChangeResponse } from '@/lib/api/generated'

/**
 * The five "What changed" views. Each maps to one /api/v1/state-history
 * endpoint; all of them take the same from / limit / offset / internet_facing
 * parameters and return `{ data, total, limit, offset }` with a real total.
 */
export const CHANGE_VIEWS = [
  'appeared',
  'disappeared',
  'newly_exposed',
  'exposure_changes',
  'shadow_it',
] as const

export type ChangeView = (typeof CHANGE_VIEWS)[number]

const VIEW_ENDPOINT: Record<ChangeView, string> = {
  appeared: '/api/v1/state-history/appearances',
  disappeared: '/api/v1/state-history/disappearances',
  newly_exposed: '/api/v1/state-history/newly-exposed',
  exposure_changes: '/api/v1/state-history/exposure-changes',
  shadow_it: '/api/v1/state-history/shadow-it',
}

export function isChangeView(v: string): v is ChangeView {
  return (CHANGE_VIEWS as readonly string[]).includes(v)
}

export interface ChangeListPage {
  data: StateChangeResponse[]
  total: number
  limit: number
  offset: number
}

export interface ChangeQuery {
  /** RFC3339 lower bound on changed_at. */
  from: string
  /** Only assets that are internet-facing now. */
  internetOnly: boolean
}

/** The request URL for one page of a view (exported for tests). */
export function changeUrl(view: ChangeView, q: ChangeQuery, limit: number, offset: number): string {
  const params = new URLSearchParams({ from: q.from, limit: String(limit) })
  if (offset > 0) params.set('offset', String(offset))
  if (q.internetOnly) params.set('internet_facing', 'true')
  return `${VIEW_ENDPOINT[view]}?${params.toString()}`
}

const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  keepPreviousData: true,
  shouldRetryOnError: (error) => !(error?.statusCode >= 400 && error?.statusCode < 500),
}

/** One server-paginated page of a view. `enabled` false skips the request. */
export function useAssetChanges(
  view: ChangeView,
  q: ChangeQuery,
  page: { pageIndex: number; pageSize: number },
  enabled = true
) {
  const key = enabled ? changeUrl(view, q, page.pageSize, page.pageIndex * page.pageSize) : null
  const { data, error, isLoading, mutate } = useSWR<ChangeListPage>(
    key,
    (url: string) => get<ChangeListPage>(url),
    swrConfig
  )
  return {
    changes: data?.data ?? [],
    total: data?.total ?? 0,
    error,
    isLoading,
    mutate,
  }
}

export type ChangeCounts = Record<ChangeView, number>

/**
 * The count of every view for the period, for the metric strip. Each is a
 * `limit=1` request that reads `total`, fetched in parallel under one key so
 * the strip loads (and refreshes) as a unit.
 */
export function useAssetChangeCounts(q: ChangeQuery, enabled = true) {
  const key = enabled ? ['asset-change-counts', q.from, q.internetOnly] : null
  const { data, error, isLoading, mutate } = useSWR<ChangeCounts>(
    key,
    async () => {
      const totals = await Promise.all(
        CHANGE_VIEWS.map((v) =>
          // Newly exposed is internet-facing by definition; the page never
          // applies the toggle to it, so neither does its count.
          get<ChangeListPage>(
            changeUrl(v, v === 'newly_exposed' ? { ...q, internetOnly: false } : q, 1, 0)
          ).then((r) => r.total ?? 0)
        )
      )
      return Object.fromEntries(CHANGE_VIEWS.map((v, i) => [v, totals[i]])) as ChangeCounts
    },
    swrConfig
  )
  return { counts: data, error, isLoading, mutate }
}
