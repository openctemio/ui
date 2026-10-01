/**
 * Every renamed or retired UI route, served as a permanent (308) redirect by
 * next.config.ts `redirects()`. Next.js keeps the query string, and `:path*`
 * keeps the rest of the path. Redirects run before proxy.ts, so a signed-out
 * visitor lands on /login with the NEW path as the return URL.
 *
 * Rules, enforced by __tests__/legacy-routes.test.ts:
 * - every destination is a page that exists, and every source is not;
 * - no chains (a destination never matches another source) and no loops;
 * - a source is listed once.
 *
 * Keep entries until at least the minor release after their sunset; old links
 * live on in bookmarks, runbooks and stored in-app notifications.
 */
import { LEGACY_SENSOR_ROUTE_REDIRECTS, type LegacyRouteRedirect } from './legacy-sensor-routes'

export type { LegacyRouteRedirect }
export { LEGACY_SENSOR_ROUTE_REDIRECTS }

/** Settings pages that moved or were retired by the Settings IA work. */
export const LEGACY_SETTINGS_ROUTE_REDIRECTS: LegacyRouteRedirect[] = [
  // "Connected Apps" was a ComingSoonPage that nothing linked to. Deleted; an
  // old bookmark lands on the integrations catalog instead of a 404.
  { source: '/settings/integrations/apps', destination: '/settings/integrations', permanent: true },
  // Personal notification settings moved to the user's own area.
  { source: '/settings/notifications', destination: '/account/notifications', permanent: true },
  // Access group: identity and machine access, out of Integrations.
  { source: '/settings/users/:path*', destination: '/settings/members/:path*', permanent: true },
  {
    source: '/settings/access-control/groups/:path*',
    destination: '/settings/teams/:path*',
    permanent: true,
  },
  {
    source: '/settings/access-control/assignment-rules',
    destination: '/settings/teams?tab=assignment-rules',
    permanent: true,
  },
  { source: '/settings/integrations/api-keys', destination: '/settings/api-keys', permanent: true },
  { source: '/settings/integrations/scim-tokens', destination: '/settings/scim', permanent: true },
  { source: '/settings/integrations/mcp', destination: '/settings/mcp', permanent: true },
  // Organization: /settings/tenant split into General and Authentication. The
  // query-conditioned rule must come first (first match wins). Exact source,
  // so /settings/tenant/create (new organization) is untouched. ?tab=storage
  // carries over to General's storage tab; ?tab=api lands on General (the
  // API & Webhooks tab is gone).
  {
    source: '/settings/tenant',
    has: [{ type: 'query', key: 'tab', value: 'security' }],
    destination: '/settings/authentication',
    permanent: true,
  },
  { source: '/settings/tenant', destination: '/settings/general', permanent: true },
  { source: '/settings/audit/:path*', destination: '/settings/audit-log/:path*', permanent: true },
]

export const LEGACY_ROUTE_REDIRECTS: LegacyRouteRedirect[] = [
  ...LEGACY_SENSOR_ROUTE_REDIRECTS,
  ...LEGACY_SETTINGS_ROUTE_REDIRECTS,
]

/**
 * Apply the redirect list to a URL the way Next.js does (first matching rule;
 * `:path*` keeps the rest of the path; the incoming query is appended to the
 * destination's). Returns null when no rule matches. Used by tests and by any
 * code that needs a link's current home.
 */
export function resolveLegacyRoute(
  url: string,
  rules: readonly LegacyRouteRedirect[] = LEGACY_ROUTE_REDIRECTS
): string | null {
  for (const r of rules) {
    const hit = applyLegacyRoute(r, url)
    if (hit !== null) return hit
  }
  return null
}

/** Apply one rule to `path?query`; null when it does not match. */
export function applyLegacyRoute(r: LegacyRouteRedirect, url: string): string | null {
  const [path, qs = ''] = url.split('?')
  const query = new URLSearchParams(qs)
  for (const h of r.has ?? []) {
    if (!query.has(h.key) || (h.value !== undefined && query.get(h.key) !== h.value)) return null
  }
  for (const m of r.missing ?? []) {
    if (query.has(m.key) && (m.value === undefined || query.get(m.key) === m.value)) return null
  }
  let dest: string
  if (r.source.endsWith('/:path*')) {
    const prefix = r.source.slice(0, -'/:path*'.length)
    if (path !== prefix && !path.startsWith(`${prefix}/`)) return null
    dest = r.destination.replace('/:path*', path.slice(prefix.length))
  } else {
    if (path !== r.source) return null
    dest = r.destination
  }
  const [dPath, dQs = ''] = dest.split('?')
  const merged = new URLSearchParams(dQs)
  query.forEach((v, k) => {
    if (!merged.has(k)) merged.set(k, v)
  })
  const out = merged.toString()
  return out ? `${dPath}?${out}` : dPath
}
