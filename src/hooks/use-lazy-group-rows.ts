'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** One group's rows as the server returned them. */
export interface LazyGroupPage<T> {
  rows: T[]
  /** All rows in the group (for "Showing 5 of 22"). */
  total: number
}

export interface LazyGroupState<T> extends LazyGroupPage<T> {
  loading: boolean
  error?: unknown
  /** How many rows were asked for. */
  limit: number
}

interface Options<T> {
  /** Groups whose rows are wanted (the expanded ones). */
  keys: string[]
  /**
   * Loads the first `limit` rows of a group. Keep it stable (useCallback): a
   * new function does not refetch by itself, but the groups' rows follow the
   * one in effect when they were requested.
   */
  fetchGroup: (key: string, limit: number) => Promise<LazyGroupPage<T>>
  /**
   * Changing it drops every loaded group, e.g. a new grouping dimension or
   * filter: the old rows belong to other groups.
   */
  resetKey: string
  /** Rows per group at first. */
  initialLimit?: number
  /** Most rows a group loads ("Show more" stops here). */
  maxLimit?: number
}

/**
 * Rows of server-provided groups, loaded when a group expands (the grouped
 * DataTable's server mode). A collapsed group keeps the rows it loaded;
 * `reload` refreshes the expanded groups after a change, keeping their rows on
 * screen until the new ones arrive.
 */
export function useLazyGroupRows<T>({
  keys,
  fetchGroup,
  resetKey,
  initialLimit = 5,
  maxLimit = 100,
}: Options<T>) {
  const [state, setState] = useState<Record<string, LazyGroupState<T>>>({})
  const [limits, setLimits] = useState<Record<string, number>>({})
  const [epoch, setEpoch] = useState(0)
  // What each group was last asked for; a response for anything else is stale.
  const requested = useRef(new Map<string, string>())

  // Reset during render, so the old groups' rows never show under the new
  // groups. In-flight responses for the old key are dropped: their token
  // carries the old resetKey.
  const [prevReset, setPrevReset] = useState(resetKey)
  if (prevReset !== resetKey) {
    setPrevReset(resetKey)
    setState({})
    setLimits({})
  }

  const limitOf = useCallback(
    (key: string) => Math.min(maxLimit, limits[key] ?? initialLimit),
    [limits, initialLimit, maxLimit]
  )

  useEffect(() => {
    for (const key of keys) {
      const limit = limitOf(key)
      const token = `${resetKey}|${epoch}|${limit}`
      if (requested.current.get(key) === token) continue
      requested.current.set(key, token)
      setState((s) => ({
        ...s,
        [key]: {
          rows: s[key]?.rows ?? [],
          total: s[key]?.total ?? 0,
          loading: true,
          error: undefined,
          limit,
        },
      }))
      fetchGroup(key, limit).then(
        (page) => {
          if (requested.current.get(key) !== token) return
          setState((s) => ({ ...s, [key]: { ...page, loading: false, limit } }))
        },
        (error: unknown) => {
          if (requested.current.get(key) !== token) return
          setState((s) => ({
            ...s,
            [key]: {
              rows: s[key]?.rows ?? [],
              total: s[key]?.total ?? 0,
              loading: false,
              error,
              limit,
            },
          }))
        }
      )
    }
  }, [keys, limitOf, resetKey, epoch, fetchGroup])

  const showMore = useCallback(
    (key: string, step = 20) =>
      setLimits((l) => ({ ...l, [key]: Math.min(maxLimit, (l[key] ?? initialLimit) + step) })),
    [initialLimit, maxLimit]
  )

  /** Reload the groups' rows (after a change to the findings in them). */
  const reload = useCallback(() => setEpoch((e) => e + 1), [])

  /** Retry one group. */
  const retry = useCallback((key: string) => {
    requested.current.delete(key)
    setEpoch((e) => e + 1)
  }, [])

  return { groups: state, limitOf, showMore, reload, retry, maxLimit }
}
