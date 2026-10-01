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
]

export const LEGACY_ROUTE_REDIRECTS: LegacyRouteRedirect[] = [
  ...LEGACY_SENSOR_ROUTE_REDIRECTS,
  ...LEGACY_SETTINGS_ROUTE_REDIRECTS,
]
