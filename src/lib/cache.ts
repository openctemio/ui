/**
 * Server-side Caching Utilities
 *
 * Provides caching mechanisms for server-side data fetching.
 * Uses Next.js unstable_cache for request-level caching.
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/unstable_cache
 */

import { unstable_cache } from "next/cache";

/**
 * Cache duration presets (in seconds)
 */
export const CACHE_DURATIONS = {
  /** 30 seconds - for rapidly changing data */
  SHORT: 30,
  /** 5 minutes - for moderately dynamic data */
  MEDIUM: 300,
  /** 1 hour - for semi-static data */
  LONG: 3600,
  /** 2 hours - for mostly static data */
  VERY_LONG: 7200,
  /** 24 hours - for static reference data */
  DAY: 86400,
} as const;

/**
 * Cache tags for invalidation
 */
export const CACHE_TAGS = {
  // Assets
  ASSETS: "assets",
  DOMAINS: "assets:domains",
  HOSTS: "assets:hosts",
  CONTAINERS: "assets:containers",
  CLOUD: "assets:cloud",

  // Findings
  FINDINGS: "findings",
  FINDINGS_STATS: "findings:stats",

  // Scans
  SCANS: "scans",
  ACTIVE_SCANS: "scans:active",

  // Remediation
  TASKS: "tasks",
  WORKFLOWS: "workflows",

  // Settings
  SETTINGS: "settings",
  INTEGRATIONS: "integrations",

  // Reports
  REPORTS: "reports",
} as const;

/**
 * Create a cached fetch function for server-side data
 *
 * @example
 * ```ts
 * const getAssets = cachedFetch(
 *   async () => {
 *     const res = await fetch('/api/assets');
 *     return res.json();
 *   },
 *   ['assets'],
 *   { revalidate: CACHE_DURATIONS.MEDIUM, tags: [CACHE_TAGS.ASSETS] }
 * );
 * ```
 */
export function cachedFetch<T>(
  fetchFn: () => Promise<T>,
  keyParts: string[],
  options: {
    revalidate?: number;
    tags?: string[];
  } = {}
): () => Promise<T> {
  const { revalidate = CACHE_DURATIONS.MEDIUM, tags = [] } = options;

  return unstable_cache(fetchFn, keyParts, {
    revalidate,
    tags,
  });
}

/**
 * Predefined cached data fetchers for common use cases
 * These are ready to use once API endpoints are implemented
 */

/**
 * Cached asset statistics fetcher
 * Use in Server Components for dashboard stats
 */
export const getCachedAssetStats = cachedFetch(
  async () => {
    // TODO: Replace with actual API call
    // const res = await fetch(`${process.env.BACKEND_API_URL}/api/assets/stats`);
    // return res.json();

    // Placeholder - import from mock data for now
    const { getAssetStats } = await import("@/features/assets");
    return getAssetStats();
  },
  ["asset-stats"],
  { revalidate: CACHE_DURATIONS.MEDIUM, tags: [CACHE_TAGS.ASSETS] }
);

/**
 * Cached findings statistics fetcher
 */
export const getCachedFindingStats = cachedFetch(
  async () => {
    // TODO: Replace with actual API call
    const { getFindingStats } = await import("@/features/findings");
    return getFindingStats();
  },
  ["finding-stats"],
  { revalidate: CACHE_DURATIONS.MEDIUM, tags: [CACHE_TAGS.FINDINGS_STATS] }
);

/**
 * Cached scan statistics fetcher
 */
export const getCachedScanStats = cachedFetch(
  async () => {
    // TODO: Replace with actual API call
    const { getScanStats } = await import("@/features/scans");
    return getScanStats();
  },
  ["scan-stats"],
  { revalidate: CACHE_DURATIONS.SHORT, tags: [CACHE_TAGS.SCANS] }
);

/**
 * Helper to create a cached API fetcher with automatic error handling
 */
export function createCachedApiClient<T>(
  endpoint: string,
  options: {
    revalidate?: number;
    tags?: string[];
    fallback?: T;
  } = {}
): () => Promise<T> {
  const { revalidate = CACHE_DURATIONS.MEDIUM, tags = [], fallback } = options;

  return unstable_cache(
    async () => {
      try {
        const baseUrl = process.env.BACKEND_API_URL || "http://localhost:8080";
        const res = await fetch(`${baseUrl}${endpoint}`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          console.error(`API error: ${res.status} ${res.statusText}`);
          if (fallback !== undefined) return fallback;
          throw new Error(`API error: ${res.status}`);
        }

        return res.json();
      } catch (error) {
        console.error(`Failed to fetch ${endpoint}:`, error);
        if (fallback !== undefined) return fallback;
        throw error;
      }
    },
    [endpoint],
    { revalidate, tags }
  );
}
