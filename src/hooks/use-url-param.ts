'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

/**
 * Emitted after we rewrite the query string ourselves.
 *
 * history.replaceState does not fire popstate — that event is for user
 * navigation only. Without this, a filter written to the URL would update the
 * address bar and nothing else on the page would notice.
 */
const URL_PARAMS_CHANGED = 'openctem:url-params-changed'

function subscribeToUrl(cb: () => void) {
  window.addEventListener('popstate', cb)
  window.addEventListener(URL_PARAMS_CHANGED, cb)
  return () => {
    window.removeEventListener('popstate', cb)
    window.removeEventListener(URL_PARAMS_CHANGED, cb)
  }
}

/**
 * Rewrite the query string in place.
 *
 * replaceState, not pushState: a filter change is a refinement of the current
 * view, not a new destination. Typing six characters into a search box should
 * not cost six presses of the Back button to escape.
 */
function writeSearch(params: URLSearchParams) {
  const qs = params.toString()
  // Keep the hash. Rebuilding the URL from pathname + query alone silently
  // dropped it, so changing any filter threw away a deep link like
  // /findings#evidence-3 — and the anchor is often the reason the link was
  // shared in the first place.
  const { pathname, search, hash } = window.location
  const next = `${pathname}${qs ? `?${qs}` : ''}${hash}`
  if (next === `${pathname}${search}${hash}`) return
  window.history.replaceState(window.history.state, '', next)
  window.dispatchEvent(new Event(URL_PARAMS_CHANGED))
}

/**
 * Read a URL search parameter reactively without useSearchParams (avoids Suspense).
 */
export function useUrlParam(key: string): string | null {
  const getSnapshot = useCallback(() => new URLSearchParams(window.location.search).get(key), [key])
  const getServerSnapshot = useCallback(() => null, [])
  return useSyncExternalStore(subscribeToUrl, getSnapshot, getServerSnapshot)
}

/**
 * Read all URL search parameters as URLSearchParams.
 */
export function useUrlParams(): URLSearchParams {
  const getSnapshot = useCallback(() => window.location.search, [])
  const getServerSnapshot = useCallback(() => '', [])
  const search = useSyncExternalStore(subscribeToUrl, getSnapshot, getServerSnapshot)
  return useMemo(() => new URLSearchParams(search), [search])
}

/**
 * A filter value that lives in the URL, so the view can be linked to.
 *
 * Reads like useState. The difference is that the value survives a reload and
 * travels when someone pastes the address into chat — which is the whole point:
 * "the criticals from our VA scanner" should be a link, not a set of clicks to
 * reproduce.
 *
 * The parameter is omitted from the URL when it equals `fallback`, so a default
 * view stays a clean `/findings` rather than a wall of redundant query string.
 */
export function useUrlFilter(key: string, fallback: string): [string, (next: string) => void] {
  const raw = useUrlParam(key)
  const value = raw ?? fallback

  const setValue = useCallback(
    (next: string) => {
      const params = new URLSearchParams(window.location.search)
      if (next === fallback || next === '') {
        params.delete(key)
      } else {
        params.set(key, next)
      }
      writeSearch(params)
    },
    [key, fallback]
  )

  return [value, setValue]
}

/**
 * A multi-value filter in the URL, serialised comma-separated.
 *
 * Comma rather than repeated keys because that is what the findings API already
 * accepts (`?sources=sast,secret`), so the address bar and the request agree.
 */
export function useUrlFilterList(
  key: string
): [string[], (next: string[] | ((prev: string[]) => string[])) => void] {
  const raw = useUrlParam(key)

  const value = useMemo(
    () =>
      (raw ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    [raw]
  )

  const setValue = useCallback(
    (next: string[] | ((prev: string[]) => string[])) => {
      const params = new URLSearchParams(window.location.search)
      // Accept an updater so callers can toggle without closing over a stale
      // snapshot. Reading `prev` back out of the URL rather than from render
      // scope means two changes in one tick compose instead of clobbering.
      const prev = (params.get(key) ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      const resolved = typeof next === 'function' ? next(prev) : next
      const cleaned = resolved.map((v) => v.trim()).filter(Boolean)
      if (cleaned.length === 0) {
        params.delete(key)
      } else {
        params.set(key, cleaned.join(','))
      }
      writeSearch(params)
    },
    [key]
  )

  return [value, setValue]
}

/**
 * A numeric filter in the URL — page numbers, mostly.
 *
 * Pages are 1-based in the URL because that is what a person reading the
 * address expects, even though the table state is 0-based.
 */
export function useUrlFilterNumber(
  key: string,
  fallback: number
): [number, (next: number) => void] {
  const raw = useUrlParam(key)
  // Plain decimal digits only, checked on the raw string rather than the parsed
  // number. Number() accepts '2.5', '1e9' and '0x10' — and Number.isInteger is
  // no defence against the last two, since 0x10 parses to a perfectly good 16.
  // A hand-edited or truncated link should land on the default, not in an
  // undefined state.
  const value = raw !== null && /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : fallback

  const setValue = useCallback(
    (next: number) => {
      const params = new URLSearchParams(window.location.search)
      if (next === fallback) {
        params.delete(key)
      } else {
        params.set(key, String(next))
      }
      writeSearch(params)
    },
    [key, fallback]
  )

  return [value, setValue]
}
