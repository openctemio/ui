'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Read a URL search parameter reactively without useSearchParams (avoids Suspense).
 * Subscribes to popstate (back/forward) so the value updates on navigation.
 */
export function useUrlParam(key: string): string | null {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener('popstate', cb)
    return () => window.removeEventListener('popstate', cb)
  }, [])
  const getSnapshot = useCallback(() => new URLSearchParams(window.location.search).get(key), [key])
  const getServerSnapshot = useCallback(() => null, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Read all URL search parameters as URLSearchParams.
 * Reactive to popstate events.
 */
export function useUrlParams(): URLSearchParams {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener('popstate', cb)
    return () => window.removeEventListener('popstate', cb)
  }, [])
  const getSnapshot = useCallback(() => window.location.search, [])
  const getServerSnapshot = useCallback(() => '', [])
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return new URLSearchParams(search)
}
