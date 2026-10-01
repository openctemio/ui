/**
 * Which breadcrumb parents can be links.
 *
 * The trail is built from the URL, so every parent segment used to become a
 * link. Some parents are only folders in `src/app` with no page of their own
 * (`/insights`, `/pentest`, `/settings/access-control`, ...): their crumb led
 * to the 404 page, and Next.js prefetched each of them (a 404 in the network
 * log on every page under them). Those parents render as plain text instead.
 *
 * PATHS_WITHOUT_PAGE lists them; `__tests__/breadcrumb-routes.test.ts` rebuilds
 * the list from `src/app` and fails when a page is added or removed without
 * updating it.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True for a segment that is a record id (UUID, ObjectId or a long number). */
export function isIdSegment(segment: string): boolean {
  if (UUID_PATTERN.test(segment)) return true
  if (/^[0-9a-f]{24}$/i.test(segment)) return true // MongoDB ObjectId
  if (/^[0-9]+$/.test(segment) && segment.length > 5) return true // Long numeric IDs
  return false
}

/**
 * Parent paths in `src/app` that have no page.tsx (route groups removed, any
 * dynamic segment written as `[id]`).
 */
export const PATHS_WITHOUT_PAGE: ReadonlySet<string> = new Set([
  '/admin/scanning',
  '/admin/system',
  '/auth',
  '/auth/callback',
  '/auth/sso',
  '/auth/sso/callback',
  '/insights',
  '/insights/analytics',
  '/insights/reports',
  '/invitations',
  '/onboarding',
  '/pentest',
  '/pentest/findings/[id]',
  '/pentest/templates/[id]',
  '/pipelines/[id]',
  '/relationships',
  '/settings/access-control',
  '/simulation',
])

/** Whether `path` (a real URL path, ids included) has a page to link to. */
export function breadcrumbHasPage(path: string): boolean {
  const pattern = path
    .split('/')
    .map((s) => (isIdSegment(s) ? '[id]' : s))
    .join('/')
  return !PATHS_WITHOUT_PAGE.has(pattern)
}
