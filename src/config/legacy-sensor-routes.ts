/**
 * UI routes renamed by the sensor rename (RFC-023 §9.5,
 * openctemio/api docs/rfcs/RFC-023-sensor-rename-contract.md §11).
 *
 * The product ran under the old name for a long time, so people have /agents
 * bookmarked, linked from runbooks and in browser history. Each old route
 * answers a permanent redirect (308) to its /sensors equivalent; Next.js keeps
 * the rest of the path and the query string (/agents?status=offline ->
 * /sensors?status=offline). next.config.ts serves this list; redirects run
 * before proxy.ts, so a signed-out visitor lands on /login with /sensors as
 * the return path.
 *
 * Kept until the API retires its own /api/v1/agents redirect (sunset
 * 2027-04-01); dropping it earlier breaks bookmarks for no gain.
 */
export interface LegacyRouteRedirect {
  source: string
  destination: string
  permanent: true
}

export const LEGACY_SENSOR_ROUTE_REDIRECTS: LegacyRouteRedirect[] = [
  // `:path*` matches zero or more segments, so this covers /agents itself,
  // /agents/<id> and anything below it.
  { source: '/agents/:path*', destination: '/sensors/:path*', permanent: true },
]
