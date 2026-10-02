/**
 * Platform sensor API types: GET /api/v1/platform/stats.
 *
 * Platform sensors are shared scanning capacity the platform operator runs
 * (`is_platform_sensor`, no tenant). What each field really measures is
 * written down in `src/features/platform/lib/pool.ts`.
 */

// =============================================================================
// Tiers
// =============================================================================

/**
 * The tier labels the API knows (the `tier` check constraint on sensors). A
 * tier is a label on a platform sensor; it does not change how jobs are
 * dispatched.
 */
export const PLATFORM_SENSOR_TIERS = ['shared', 'dedicated', 'premium'] as const
export type PlatformSensorTier = (typeof PLATFORM_SENSOR_TIERS)[number]

export const PLATFORM_TIER_LABELS: Record<PlatformSensorTier, string> = {
  shared: 'Shared',
  dedicated: 'Dedicated',
  premium: 'Premium',
}

// =============================================================================
// Stats
// =============================================================================

/** One tier of the pool (all organizations). */
export interface TierStats {
  total_sensors: number
  online_sensors: number
  offline_sensors: number
  total_capacity: number
  current_load: number
  available_slots: number
}

/** GET /api/v1/platform/stats. */
export interface PlatformStatsResponse {
  /** The installation has at least one active platform sensor. */
  enabled: boolean
  /** The highest tier that has sensors (not a plan entitlement). */
  max_tier: string
  /** Tiers that have sensors (not a plan entitlement). */
  accessible_tiers: string[]
  /** Job slots of the whole pool. */
  max_concurrent: number
  /** 3 x max_concurrent; nothing enforces it. */
  max_queued: number
  /** Jobs running on the pool now, all organizations. */
  current_active: number
  /** This organization's platform jobs waiting for a slot. */
  current_queued: number
  /** max_concurrent - current_active, offline sensors included. */
  available_slots: number
  /** Keyed by the sensor's tier label; any label the operator set can appear. */
  tier_stats: Partial<Record<string, TierStats>>
}
