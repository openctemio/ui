'use client'

import { useEffect, useState, type ComponentProps } from 'react'
import Link, { useLinkStatus } from 'next/link'
import { navPendingStore } from './nav-progress'

type SidebarLinkProps = Omit<ComponentProps<typeof Link>, 'prefetch'>

/**
 * A navigation-rail link that prefetches on intent (hover, focus or touch)
 * instead of on render.
 *
 * The sidebar renders ~60 links, so prefetching every one in the viewport would
 * fire ~60 route requests on each page load; with no prefetch at all, a click
 * starts from nothing. Arming the prefetch on intent gives the route the
 * 100-300 ms between pointing and clicking, the pattern Next recommends
 * ("prefetch only on hover", linking-and-navigating docs).
 */
export function SidebarLink({ onMouseEnter, onFocus, onTouchStart, ...props }: SidebarLinkProps) {
  const [intent, setIntent] = useState(false)
  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={(e) => {
        setIntent(true)
        onMouseEnter?.(e)
      }}
      onFocus={(e) => {
        setIntent(true)
        onFocus?.(e)
      }}
      onTouchStart={(e) => {
        setIntent(true)
        onTouchStart?.(e)
      }}
    />
  )
}

/**
 * Immediate feedback for a link click: a thin indeterminate bar along the bottom
 * of the clicked row, plus the page-wide top bar (NavProgressBar, which shows
 * while any hint is pending).
 *
 * Render it inside a `<Link>` (useLinkStatus reads the nearest one) and inside an
 * element of a `relative` row; it is absolutely positioned, so it never moves
 * the row's layout. Both bars fade in after a short delay (globals.css), so a
 * fast navigation does not flash them.
 *
 * `quiet`: no row bar, for inline text links such as breadcrumbs; the top bar
 * still shows.
 */
export function NavPendingHint({ quiet = false }: { quiet?: boolean }) {
  const { pending } = useLinkStatus()
  useEffect(() => (pending ? navPendingStore.begin() : undefined), [pending])
  if (quiet) return null
  return (
    <span
      aria-hidden
      data-nav-pending={pending ? 'true' : undefined}
      className="nav-pending-hint"
    />
  )
}
