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

/**
 * Validation, campaign-first: a campaign's findings, retests and report are
 * tabs of its page. An old list link that carried ?campaign= lands on that
 * campaign's tab; without it, findings go to the main Findings list filtered
 * to pentest, reports to Insights › Reports › Pentest.
 */
export const LEGACY_VALIDATION_ROUTE_REDIRECTS: LegacyRouteRedirect[] = [
  {
    source: '/pentest/findings',
    has: [{ type: 'query', key: 'campaign' }],
    destination: '/pentest/campaigns/:campaign?view=findings',
    permanent: true,
  },
  { source: '/pentest/findings', destination: '/findings?sources=pentest', permanent: true },
  {
    source: '/pentest/reports',
    has: [{ type: 'query', key: 'campaign' }],
    destination: '/pentest/campaigns/:campaign?view=report',
    permanent: true,
  },
  { source: '/pentest/reports', destination: '/reports?tab=pentest', permanent: true },
  { source: '/pentest/retests', destination: '/validation/retests', permanent: true },
  // In-app notifications (api compliance/pentest.go) link to a campaign as
  // /pentest/campaigns?id=X and to a finding as /pentest/findings/X. The
  // first opened the list, the second had no page at all; a pentest finding
  // is a row of the unified findings table, so it opens at /findings/X.
  {
    source: '/pentest/campaigns',
    has: [{ type: 'query', key: 'id' }],
    destination: '/pentest/campaigns/:id',
    permanent: true,
  },
  {
    source: '/pentest/findings/:id((?!new$)[^/]+)',
    destination: '/findings/:id',
    permanent: true,
  },
  {
    source: '/pentest/mitre-coverage',
    destination: '/validation/attack-coverage',
    permanent: true,
  },
  {
    source: '/pentest/templates/:path*',
    destination: '/settings/pentest/templates/:path*',
    permanent: true,
  },
]

export const LEGACY_ROUTE_REDIRECTS: LegacyRouteRedirect[] = [
  ...LEGACY_SENSOR_ROUTE_REDIRECTS,
  ...LEGACY_SETTINGS_ROUTE_REDIRECTS,
  ...LEGACY_VALIDATION_ROUTE_REDIRECTS,
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
  const captured: Record<string, string> = {}
  for (const h of r.has ?? []) {
    if (!query.has(h.key) || (h.value !== undefined && query.get(h.key) !== h.value)) return null
    // Next.js makes a `has` value without a fixed `value` available to the
    // destination as :key.
    if (h.value === undefined) captured[h.key] = query.get(h.key) ?? ''
  }
  for (const m of r.missing ?? []) {
    if (query.has(m.key) && (m.value === undefined || query.get(m.key) === m.value)) return null
  }
  const params = matchSource(r.source, path)
  if (!params) return null
  let dest = r.destination.replace('/:path*', params.rest)
  for (const [k, v] of Object.entries({ ...params.named, ...captured })) {
    dest = dest.replace(`:${k}`, encodeURIComponent(v))
  }
  const [dPath, dQs = ''] = dest.split('?')
  const merged = new URLSearchParams(dQs)
  query.forEach((v, k) => {
    if (!merged.has(k)) merged.set(k, v)
  })
  const out = merged.toString()
  return out ? `${dPath}?${out}` : dPath
}

/**
 * Match a Next.js redirect source against a path, segment by segment:
 * literals, `:name` (one segment), `:name(regex)` (one segment matching the
 * regex, e.g. `:id((?!new$)[^/]+)`) and a trailing `:path*` (the rest, zero
 * or more segments). Returns the captured params, or null.
 */
function matchSource(
  source: string,
  path: string
): { named: Record<string, string>; rest: string } | null {
  const src = splitSource(source)
  const segs = path.split('/').filter(Boolean)
  const named: Record<string, string> = {}
  for (let i = 0; i < src.length; i++) {
    const part = src[i]
    if (part === ':path*' && i === src.length - 1) {
      const rest = segs.slice(i)
      return { named, rest: rest.length ? `/${rest.join('/')}` : '' }
    }
    const seg = segs[i]
    if (seg === undefined) return null
    const param = /^:([A-Za-z_]+)(?:\((.+)\))?$/.exec(part)
    if (param) {
      if (param[2] && !new RegExp(`^(?:${param[2]})$`).test(seg)) return null
      named[param[1]] = decodeURIComponent(seg)
    } else if (part !== seg) {
      return null
    }
  }
  return segs.length === src.length ? { named, rest: '' } : null
}

/** Split a redirect source on "/" outside parentheses (a param regex may contain "/"). */
export function splitSource(source: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of source) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === '/' && depth === 0) {
      if (cur) out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur) out.push(cur)
  return out
}
