import type { NavItem, NavLink, NavSectionLink } from '@/components/types'

/**
 * Which sidebar row is the current page. Kept free of React so the rules are
 * unit-tested (see __tests__/nav-active.test.ts) against the real sidebar config.
 */

/**
 * A nav url is active for the current path on an exact match OR a child route
 * (`/assets/repositories` is active on `/assets/repositories/<id>`, `/exposures`
 * on `/exposures/secrets`), but never on a mere string prefix (`/scans` is NOT
 * active on `/scan-profiles`).
 */
export function isUrlActive(pathname: string, url: unknown): boolean {
  return typeof url === 'string' && (pathname === url || pathname.startsWith(`${url}/`))
}

type MatchableLink = { url: NavLink['url']; sections?: readonly NavSectionLink[] }

/**
 * Every url a nav link stands for: its own, plus its in-page section tabs (the
 * Remediation row covers its "Solution families" tab at /remediations, which is
 * not a child route of /remediation).
 */
function linkUrls(item: MatchableLink): string[] {
  const own = typeof item.url === 'string' ? [item.url] : []
  return own.concat(item.sections?.map((s) => s.href) ?? [])
}

/** The length of the longest url of `item` that is active, or -1. */
function matchLength(pathname: string, item: MatchableLink): number {
  return linkUrls(item).reduce(
    (best, url) => (isUrlActive(pathname, url) && url.length > best ? url.length : best),
    -1
  )
}

/**
 * Of a group's sub-items, the url of the one that best matches the current path
 * — the longest active url wins. Prevents a short url (`/assets`) from lighting
 * up alongside a deeper sibling (`/assets/changes`).
 */
export function activeSubItemUrl(
  pathname: string,
  items: readonly MatchableLink[]
): string | undefined {
  let best: { url: string; length: number } | undefined
  for (const item of items) {
    if (typeof item.url !== 'string') continue
    const length = matchLength(pathname, item)
    if (length >= 0 && (!best || length > best.length)) best = { url: item.url, length }
  }
  return best?.url
}

/**
 * Whether any leaf route within a section (including nested subsections) matches
 * the current path. Drives the section's active highlight + auto-expand.
 */
export function sectionHasActiveRoute(pathname: string, items: readonly NavItem[]): boolean {
  return items.some((item) => {
    if ('items' in item) {
      return item.items.some((child) => isUrlActive(pathname, child.url))
    }
    return matchLength(pathname, item) >= 0
  })
}

export function checkIsActive(pathname: string, item: NavItem, mainNav = false): boolean {
  // For collapsible items with sub-items, active if any sub-item matches —
  // including child/detail routes — so the group highlights + auto-opens.
  if ('items' in item) {
    return item.items.some((i) => isUrlActive(pathname, i.url))
  }

  // For leaf items with a url
  if ('url' in item && typeof item.url === 'string') {
    // Exact match or a child route (keeps the item active on its detail
    // pages), of the item or of one of its section tabs.
    if (matchLength(pathname, item) >= 0) {
      return true
    }

    // For mainNav items only (top-level, not sub-items), also use startsWith
    // This allows top-level items to stay highlighted when on child pages
    if (mainNav && pathname.startsWith(`/${item.url.split('/')[1]}`)) {
      return true
    }

    return false
  }

  return false
}
