'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Persist an active-tab value in the URL hash so it survives a page reload and is
 * shareable/bookmarkable. Returns `[value, setValue]`; `defaultValue` is used when
 * the hash is empty. Reactive to hashchange/popstate (back-forward, manual edits).
 *
 * Mirrors the useSyncExternalStore style of use-url-param.ts. Uses replaceState (no
 * history spam, no scroll jump) + a manual hashchange dispatch to notify subscribers.
 *
 * Note: the hash holds ONE value — use it for a page's primary tab. For multiple
 * independent tab-states on one page, prefer query params.
 */
export function useHashTab(defaultValue: string): [string, (value: string) => void] {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener('hashchange', cb)
    window.addEventListener('popstate', cb)
    return () => {
      window.removeEventListener('hashchange', cb)
      window.removeEventListener('popstate', cb)
    }
  }, [])

  const getSnapshot = useCallback(
    () => window.location.hash.replace(/^#/, '') || defaultValue,
    [defaultValue]
  )
  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue])

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setValue = useCallback(
    (next: string) => {
      const url =
        next === defaultValue
          ? window.location.pathname + window.location.search
          : `#${encodeURIComponent(next)}`
      window.history.replaceState(null, '', url)
      // replaceState does not emit hashchange — notify subscribers manually.
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    },
    [defaultValue]
  )

  return [value, setValue]
}
