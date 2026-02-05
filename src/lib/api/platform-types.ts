/**
 * Platform Agent API Types
 *
 * TypeScript types for Tiered Platform Agents feature
 * Supports three tiers: shared, dedicated, premium
 */

// =============================================================================
// Platform Agent Tiers
// =============================================================================

/**
 * Platform agent tier levels
 */
export const PLATFORM_AGENT_TIERS = ['shared', 'dedicated', 'premium'] as const
export type PlatformAgentTier = (typeof PLATFORM_AGENT_TIERS)[number]

/**
 * Human-readable labels for each tier
 */
export const PLATFORM_TIER_LABELS: Record<PlatformAgentTier, string> = {
  shared: 'Shared',
  dedicated: 'Dedicated',
  premium: 'Premium',
}

/**
 * Descriptions for each tier
 */
export const PLATFORM_TIER_DESCRIPTIONS: Record<PlatformAgentTier, string> = {
  shared: 'Shared agents with best-effort processing',
  dedicated: 'Dedicated agents with faster processing and less queue',
  premium: 'Premium high-performance agents with priority processing',
}

/**
 * Tailwind color classes for each tier
 */
export const PLATFORM_TIER_COLORS: Record<PlatformAgentTier, string> = {
  shared: 'text-muted-foreground',
  dedicated: 'text-blue-500',
  premium: 'text-purple-500',
}

/**
 * Background color classes for tier badges
 */
export const PLATFORM_TIER_BG_COLORS: Record<PlatformAgentTier, string> = {
  shared: 'bg-muted/50',
  dedicated: 'bg-blue-500/10',
  premium: 'bg-purple-500/10',
}

/**
 * Border color classes for tier badges
 */
export const PLATFORM_TIER_BORDER_COLORS: Record<PlatformAgentTier, string> = {
  shared: 'border-muted-foreground/30',
  dedicated: 'border-blue-500/30',
  premium: 'border-purple-500/30',
}

/**
 * Lucide icon names for each tier
 */
export const PLATFORM_TIER_ICONS: Record<PlatformAgentTier, string> = {
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
  total_agents: number
  online_agents: number
  offline_agents: number
  total_capacity: number
  current_load: number
  available_slots: number
}

/**
 * Platform stats response from API
 */
export interface PlatformStatsResponse {
  enabled: boolean
  max_tier: PlatformAgentTier
  max_concurrent: number
  max_queued: number
  current_active: number
  current_queued: number
  available_slots: number
  accessible_tiers: PlatformAgentTier[]
  tier_stats: Record<PlatformAgentTier, TierStats>
}

// =============================================================================
// Platform Agent Types
// =============================================================================

/**
 * Platform agent entity
 */
export interface PlatformAgent {
  id: string
  name: string
  tier: PlatformAgentTier
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
 * Platform agent list filters
 */
export interface PlatformAgentListFilters {
  tier?: PlatformAgentTier
  status?: 'active' | 'disabled' | 'revoked'
  health?: 'online' | 'offline' | 'unknown'
  search?: string
  page?: number
  per_page?: number
}

/**
 * Platform agent list response
 */
export interface PlatformAgentListResponse {
  items: PlatformAgent[]
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
export function getTierPriority(tier: PlatformAgentTier): number {
  const priorities: Record<PlatformAgentTier, number> = {
    shared: 0,
    dedicated: 50,
    premium: 100,
  }
  return priorities[tier]
}

/**
 * Check if a tier is accessible based on max tier
 */
export function isTierAccessible(tier: PlatformAgentTier, maxTier: PlatformAgentTier): boolean {
  return getTierPriority(tier) <= getTierPriority(maxTier)
}

/**
 * Get all accessible tiers based on max tier
 */
export function getAccessibleTiers(maxTier: PlatformAgentTier): PlatformAgentTier[] {
  const maxPriority = getTierPriority(maxTier)
  return PLATFORM_AGENT_TIERS.filter((tier) => getTierPriority(tier) <= maxPriority)
}
