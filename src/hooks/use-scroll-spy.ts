'use client'

import * as React from 'react'

/**
 * Tracks which of a set of on-page section elements (looked up by `id`) is
 * currently the "active" one as the user scrolls — used to drive a section-nav
 * active state (scroll-spy). Uses a single IntersectionObserver; the active
 * section is the top-most one intersecting the detection band near the top of
 * the viewport.
 *
 * The detection band is created with a `rootMargin` that shrinks the viewport
 * to a horizontal strip below the sticky app header, so a section becomes
 * "active" once its top reaches that strip.
 */
export function useScrollSpy(ids: string[], options?: { rootMargin?: string }): string | null {
  const [activeId, setActiveId] = React.useState<string | null>(ids[0] ?? null)
  // Stable dependency: re-run only when the actual id list changes, not when a
  // new array with identical contents is passed in.
  const idsKey = ids.join('|')
  const rootMargin = options?.rootMargin ?? '-15% 0px -70% 0px'

  React.useEffect(() => {
    const idList = idsKey ? idsKey.split('|') : []
    const elements = idList
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    // Track the latest intersection ratio/visibility per element so we can pick
    // a sensible active section even when several are in the band at once.
    const visible = new Map<string, boolean>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.isIntersecting)
        }
        // Pick the first section (in document order) that is currently visible.
        const firstVisible = idList.find((id) => visible.get(id))
        if (firstVisible) {
          setActiveId(firstVisible)
        }
      },
      { rootMargin, threshold: 0 }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [idsKey, rootMargin])

  return activeId
}

/**
 * Smoothly scrolls to a section by id, honoring `prefers-reduced-motion`
 * (falls back to an instant jump when the user has reduced-motion set).
 */
export function scrollToSection(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
}
