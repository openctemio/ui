/**
 * Types for asset lifecycle management — stale detection, snooze,
 * manual-status-override. Shapes mirror the backend struct
 * `AssetLifecycleSettings` and the worker's `LifecycleRunReport`.
 */

export interface AssetLifecycleSettings {
  enabled: boolean
  stale_threshold_days?: number
  grace_period_days?: number
  manual_reactivation_grace_days?: number
  excluded_source_types?: string[]
  pause_on_integration_failure?: boolean
  dry_run_completed_at?: number | null
}

export const DEFAULT_LIFECYCLE_SETTINGS: AssetLifecycleSettings = {
  enabled: false,
  stale_threshold_days: 14,
  grace_period_days: 3,
  manual_reactivation_grace_days: 30,
  excluded_source_types: ['manual', 'import'],
  pause_on_integration_failure: true,
}

export const MIN_THRESHOLD_DAYS = 3
export const MAX_THRESHOLD_DAYS = 365
export const MIN_GRACE_DAYS = 0
export const MAX_GRACE_DAYS = 90

export const KNOWN_SOURCE_TYPES = [
  'integration',
  'collector',
  'scanner',
  'manual',
  'import',
] as const

export type KnownSourceType = (typeof KNOWN_SOURCE_TYPES)[number]

/**
 * Worker run report returned by the dry-run endpoint. The same shape
 * is persisted in audit events when the feature is running live.
 */
export interface LifecycleRunReport {
  tenant_id: string
  dry_run: boolean
  enabled: boolean
  skipped: boolean
  skip_reason?: string
  started_at: string
  completed_at: string
  stale_threshold_days: number
  grace_period_days: number
  excluded_source_types: string[]
  transitioned_to_stale: number
  affected_asset_ids?: string[]
}

export interface SnoozeRequest {
  days: number
  /**
   * When true and the asset is currently stale/inactive, the snooze
   * also flips the status back to active. Used when the operator is
   * reactivating an asset the worker demoted by mistake.
   */
  reactivate: boolean
}

/**
 * Preset snooze durations surfaced in the UI dropdown. Custom input
 * remains available via the "Custom" entry that opens a day-count
 * field.
 */
export const SNOOZE_PRESETS: { label: string; days: number }[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
]
