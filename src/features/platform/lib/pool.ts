/**
 * What GET /api/v1/platform/stats says, in the terms a tenant can act on.
 *
 * Read the fields for what the API computes (api: internal/app/sensor/service.go
 * GetPlatformStats, postgres GetPlatformSensorStats), not for what their names
 * suggest:
 * - `max_concurrent` / `current_active` / `available_slots` are the whole shared
 *   pool (every organization's jobs), not a per-tenant quota. There is no quota.
 * - `current_queued` is this organization's platform jobs waiting for a slot.
 * - `max_queued` is `3 x max_concurrent`, a number nothing enforces: not shown.
 * - `max_tier` / `accessible_tiers` are the tiers that have sensors, not what
 *   the organization's plan includes, and a tier does not change how jobs are
 *   dispatched: tiers are shown as parts of the pool only.
 * - `available_slots` counts the capacity of offline sensors too, so free
 *   slots are worked out per tier here, and are 0 while no sensor is online.
 */

import {
  PLATFORM_SENSOR_TIERS,
  PLATFORM_TIER_LABELS,
  type PlatformStatsResponse,
  type TierStats,
} from '@/lib/api/platform-types'

/**
 * How long a platform job may wait for a slot before the API fails it as
 * PLATFORM_JOB_EXPIRED_IN_QUEUE (api: cmd/server/workers.go MaxQueueMinutes,
 * fixed at 60). Not in the stats response yet: keep in step by hand.
 */
export const PLATFORM_QUEUE_LIMIT = 'an hour'

export type PoolState = 'healthy' | 'degraded' | 'full' | 'down'

export interface PoolTier {
  key: string
  label: string
  online: number
  total: number
  slots: number
  inUse: number
  state: PoolState
}

export interface PlatformPool {
  /** Platform sensors that are online / registered (active ones only). */
  online: number
  total: number
  offline: number
  /** Job slots of the whole pool and how many run a job now (all organizations). */
  slots: number
  inUse: number
  /** Slots a new job can take now: none while no sensor is online. */
  free: number
  /** This organization's platform jobs waiting for a slot. */
  queued: number
  /** The pool's state, worst first: down > full > degraded > healthy. */
  state: PoolState
  /** Tiers that have sensors, known tiers in their order first. */
  tiers: PoolTier[]
}

const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)

function tierLabel(key: string): string {
  if ((PLATFORM_SENSOR_TIERS as readonly string[]).includes(key)) {
    return PLATFORM_TIER_LABELS[key as keyof typeof PLATFORM_TIER_LABELS]
  }
  // An operator label outside the three known tiers: sentence case it.
  return key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/[_-]+/g, ' ') : 'Unlabelled'
}

function tierState(online: number, total: number, slots: number, inUse: number): PoolState {
  if (online === 0) return 'down'
  if (slots > 0 && inUse >= slots) return 'full'
  return online < total ? 'degraded' : 'healthy'
}

/** Summarise the stats response; `null` when the installation has no platform sensors. */
export function summarizePlatformPool(
  stats: PlatformStatsResponse | undefined | null
): PlatformPool | null {
  if (!stats?.enabled) return null
  const raw = stats.tier_stats ?? {}
  const known = PLATFORM_SENSOR_TIERS.filter((t) => raw[t])
  const other = Object.keys(raw)
    .filter((k) => !(PLATFORM_SENSOR_TIERS as readonly string[]).includes(k))
    .sort()
  const tiers: PoolTier[] = [...known, ...other]
    .map((key) => {
      const t = raw[key] as TierStats
      const online = n(t.online_sensors)
      const total = Math.max(n(t.total_sensors), online)
      const slots = n(t.total_capacity)
      const inUse = n(t.current_load)
      return {
        key,
        label: tierLabel(key),
        online,
        total,
        slots,
        inUse,
        state: tierState(online, total, slots, inUse),
      }
    })
    .filter((t) => t.total > 0)

  const online = tiers.reduce((s, t) => s + t.online, 0)
  const total = tiers.reduce((s, t) => s + t.total, 0)
  const slots = tiers.length > 0 ? tiers.reduce((s, t) => s + t.slots, 0) : n(stats.max_concurrent)
  const inUse = tiers.length > 0 ? tiers.reduce((s, t) => s + t.inUse, 0) : n(stats.current_active)
  // A tier with no sensor online offers no slot. Within a tier the API does not
  // say how much capacity the offline sensors hold, so a partly offline tier
  // can over-count (API follow-up: capacity of online sensors).
  const free =
    online === 0
      ? 0
      : tiers.length > 0
        ? tiers.reduce((s, t) => s + (t.online > 0 ? Math.max(0, t.slots - t.inUse) : 0), 0)
        : Math.max(0, slots - inUse)

  let state: PoolState = 'healthy'
  if (online === 0) state = 'down'
  else if (slots > 0 && free === 0) state = 'full'
  else if (online < total) state = 'degraded'

  return {
    online,
    total,
    offline: total - online,
    slots,
    inUse,
    free,
    queued: n(stats.current_queued),
    state,
    tiers,
  }
}
