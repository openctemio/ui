'use client'

import { useSyncExternalStore } from 'react'

/**
 * How many nav links are waiting for their route right now. NavPendingHint
 * counts itself in while its link is pending; NavProgressBar shows while the
 * count is above zero.
 *
 * A module store rather than CSS `body:has([data-nav-pending])`: toggling an
 * attribute under a `body:has()` rule made Chrome recalculate style for the
 * whole document on every click (~45 ms, ~180 ms at 4x CPU, measured), while
 * this re-renders one element.
 */
let pendingLinks = 0
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export const navPendingStore = {
  /** Count one pending link in; returns the matching "done" callback. */
  begin(): () => void {
    pendingLinks += 1
    emit()
    let done = false
    return () => {
      if (done) return
      done = true
      pendingLinks = Math.max(0, pendingLinks - 1)
      emit()
    }
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  isPending(): boolean {
    return pendingLinks > 0
  },
}

/**
 * Page-wide navigation progress bar along the top of the window. It shows
 * (after a short delay, see `.nav-progress` in globals.css) while any link with
 * a NavPendingHint is waiting for its route.
 */
export function NavProgressBar() {
  const pending = useSyncExternalStore(
    navPendingStore.subscribe,
    navPendingStore.isPending,
    () => false
  )
  return <div aria-hidden className="nav-progress" data-active={pending ? 'true' : undefined} />
}
