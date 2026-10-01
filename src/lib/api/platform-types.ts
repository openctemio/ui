/**
 * Platform Sensor API Types
 *
 * TypeScript types for Tiered Platform Sensors feature
 * Supports three tiers: shared, dedicated, premium
 */

// =============================================================================
// Platform Sensor Tiers
// =============================================================================

/**
 * Platform sensor tier levels
 */
export const PLATFORM_SENSOR_TIERS = ['shared', 'dedicated', 'premium'] as const
export type PlatformSensorTier = (typeof PLATFORM_SENSOR_TIERS)[number]

/**
 * Human-readable labels for each tier
 */
export const PLATFORM_TIER_LABELS: Record<PlatformSensorTier, string> = {
  shared: 'Shared',
  dedicated: 'Dedicated',
  premium: 'Premium',
}

/**
 * Descriptions for each tier
 */
export const PLATFORM_TIER_DESCRIPTIONS: Record<PlatformSensorTier, string> = {
  shared: 'Shared sensors with best-effort processing',
  dedicated: 'Dedicated sensors with faster processing and less queue',
  premium: 'Premium high-performance sensors with priority processing',
}

/**
 * Tailwind color classes for each tier
 */
export const PLATFORM_TIER_COLORS: Record<PlatformSensorTier, string> = {
  shared: 'text-muted-foreground',
  dedicated: 'text-blue-500',
  premium: 'text-purple-500',
}

/**
 * Background color classes for tier badges
 */
export const PLATFORM_TIER_BG_COLORS: Record<PlatformSensorTier, string> = {
  shared: 'bg-muted/50',
  dedicated: 'bg-blue-500/10',
  premium: 'bg-purple-500/10',
}

/**
 * Border color classes for tier badges
 */
export const PLATFORM_TIER_BORDER_COLORS: Record<PlatformSensorTier, string> = {
  shared: 'border-muted-foreground/30',
  dedicated: 'border-blue-500/30',
  premium: 'border-purple-500/30',
}

/**
 * Lucide icon names for each tier
 */
export const PLATFORM_TIER_ICONS: Record<PlatformSensorTier, string> = {
  shared: 'server',
  dedicated: 'cloud',
  premium: 'crown',
}

// =============================================================================
// Platform Stats Types
// =============================================================================

/**
 * Statistics for a single tier
 */
export interface TierStats {
  total_sensors: number
  online_sensors: number
  offline_sensors: number
  total_capacity: number
  current_load: number
  available_slots: number
}

/**
 * Platform stats response from API
 */
export interface PlatformStatsResponse {
  enabled: boolean
  max_tier: PlatformSensorTier
  max_concurrent: number
  max_queued: number
  current_active: number
  current_queued: number
  available_slots: number
  accessible_tiers: PlatformSensorTier[]
  tier_stats: Record<PlatformSensorTier, TierStats>
}

// =============================================================================
// Platform Sensor Types
// =============================================================================

/**
 * Platform sensor entity
 */
export interface PlatformSensor {
  id: string
  name: string
  tier: PlatformSensorTier
  tier_priority: number
  status: 'active' | 'disabled' | 'revoked'
  health: 'online' | 'offline' | 'unknown'
  current_jobs: number
  max_concurrent_jobs: number
  capabilities: string[]
  labels: Record<string, string>
  region?: string
  load_score: number
  last_seen_at?: string
  created_at: string
  updated_at: string
}

/**
 * Platform sensor list filters
 */
export interface PlatformSensorListFilters {
  tier?: PlatformSensorTier
  status?: 'active' | 'disabled' | 'revoked'
  health?: 'online' | 'offline' | 'unknown'
  search?: string
  page?: number
  per_page?: number
}

/**
 * Platform sensor list response
 */
export interface PlatformSensorListResponse {
  items: PlatformSensor[]
  total: number
  page: number
  per_page: number
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get tier priority for sorting (higher = better)
 */
export function getTierPriority(tier: PlatformSensorTier): number {
  const priorities: Record<PlatformSensorTier, number> = {
    shared: 0,
    dedicated: 50,
    premium: 100,
  }
  return priorities[tier]
}

/**
 * Check if a tier is accessible based on max tier
 */
export function isTierAccessible(tier: PlatformSensorTier, maxTier: PlatformSensorTier): boolean {
  return getTierPriority(tier) <= getTierPriority(maxTier)
}

/**
 * Get all accessible tiers based on max tier
 */
export function getAccessibleTiers(maxTier: PlatformSensorTier): PlatformSensorTier[] {
  const maxPriority = getTierPriority(maxTier)
  return PLATFORM_SENSOR_TIERS.filter((tier) => getTierPriority(tier) <= maxPriority)
}
