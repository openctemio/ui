/**
 * Cache Configuration
 *
 * Defines TTL (time-to-live) rules and exclusion lists for the cache proxy.
 *
 * TTL values are in seconds. Paths are matched with startsWith for flexibility.
 * More specific paths should be listed before general ones.
 */

// ============================================
// CACHE TTL CONFIGURATION (seconds)
// ============================================

/**
 * Path-specific TTL overrides.
 * Paths are matched using startsWith, so order matters -- more specific first.
 */
export const CACHE_TTLS: Record<string, number> = {
  // Static/reference data - 5 minutes
  '/api/v1/tools': 300,
  '/api/v1/capabilities': 300,
  '/api/v1/tool-categories': 300,
  '/api/v1/asset-types': 300,
  '/api/v1/modules': 300,

  // Dashboard stats - 1 minute
  '/api/v1/dashboard': 60,

  // Lists with filters - 30 seconds
  '/api/v1/findings': 30,
  '/api/v1/assets': 30,
  '/api/v1/scans': 30,
  '/api/v1/exposures': 30,
}

/** Default TTL when no specific path matches */
export const DEFAULT_TTL = 30

// ============================================
// NEVER-CACHE PATHS
// ============================================

/**
 * Paths that must never be cached.
 * These include authentication endpoints, user-specific data,
 * and real-time endpoints.
 */
export const NEVER_CACHE_PATHS = [
  // Authentication
  '/api/v1/me',
  '/api/v1/auth',
  '/api/v1/session',

  // Mutations should not be cached (handled by GET-only in the route)
  // but also exclude write-related read endpoints
  '/api/v1/users/me',

  // Real-time data
  '/api/v1/ws',
  '/api/v1/sse',
  '/api/v1/notifications',

  // Settings and preferences (user-specific, frequently changed)
  '/api/v1/settings',
  '/api/v1/preferences',
]

// ============================================
// HELPERS
// ============================================

/**
 * Check if a path should never be cached
 */
export function shouldNeverCache(path: string): boolean {
  return NEVER_CACHE_PATHS.some((p) => path.startsWith(p))
}

/**
 * Get TTL for a given path.
 * Checks path-specific TTLs first, then falls back to default.
 */
export function getTTL(path: string): number {
  for (const [prefix, ttl] of Object.entries(CACHE_TTLS)) {
    if (path.startsWith(prefix)) {
      return ttl
    }
  }
  return DEFAULT_TTL
}
