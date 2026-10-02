/**
 * Platform sensors: the shared scanning pool the platform operator runs, as
 * one organization sees it (GET /api/v1/platform/stats).
 */

export { PlatformStatsCard } from './components/platform-stats-card'
export { PlatformSensorsPage, PlatformSensorsLink } from './components/platform-sensors-page'
export { PoolCallout, PoolStatePill } from './components/pool-state'
export { summarizePlatformPool, type PlatformPool, type PoolState } from './lib/pool'
