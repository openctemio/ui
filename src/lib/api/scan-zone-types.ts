/**
 * Scan zone API types (RFC-023): /api/v1/scan-zones.
 * Contract: openctemio/api docs/architecture/scan-zones.md ("UI contract").
 */

/** A tenant-owned set of address ranges and the sensors that may scan them. */
export interface ScanZone {
  id: string
  tenant_id: string
  name: string
  description: string
  is_default: boolean
  /** Normalised CIDRs, e.g. "10.230.0.0/16", "fd00:230::/48". */
  ranges: string[]
  sensor_ids: string[]
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ScanZoneListResponse {
  data: ScanZone[]
  total: number
}

export interface CreateScanZoneRequest {
  name: string
  description?: string
  is_default?: boolean
  ranges: string[]
}

export interface UpdateScanZoneRequest {
  name?: string
  description?: string
  is_default?: boolean
  ranges?: string[]
}

export interface ScanZoneCoverageZone {
  zone_id: string
  name: string
  is_default: boolean
  has_private_range: boolean
  assigned_sensors: number
  healthy_sensors: number
  /** Inventory addresses inside the zone's ranges. */
  addresses: number
}

export type ScanZoneCoverageWarningCode =
  | 'no_sensors_assigned'
  | 'private_ranges_without_healthy_sensor'
  | 'default_zone_without_healthy_sensor'
  | 'private_addresses_outside_zones'
  | 'public_addresses_without_default_zone'

export interface ScanZoneCoverageWarning {
  code: ScanZoneCoverageWarningCode | string
  zone_id?: string
  message: string
}

/** GET /api/v1/scan-zones/coverage */
export interface ScanZoneCoverage {
  inventory_addresses: number
  in_zones: number
  outside_public: number
  /** Private inventory addresses no zone holds: scans skip these. */
  outside_private: number
  has_default_zone: boolean
  zones: ScanZoneCoverageZone[]
  warnings: ScanZoneCoverageWarning[]
}

/** POST /api/v1/scan-zones/preview */
export interface ScanZonePreviewRequest {
  targets: string[]
  asset_group_ids: string[]
  scan_type: 'single' | 'workflow'
  scanner_name?: string
  /** Workflow scans. */
  pipeline_id?: string
  targets_per_job?: number
  /** null = Automatic (narrowest zone). */
  scan_zone_id?: string | null
}

export type ScanZonePreviewTargetStatus = 'zone' | 'unzoned' | 'uncovered'

export interface ScanZonePreviewTarget {
  target: string
  status: ScanZonePreviewTargetStatus
  zone_id?: string
  zone_name?: string
  /** The sensor the target's job would be pinned to (absent: waits in the zone, or unzoned). */
  sensor_id?: string
  reason?: string
  /** What a hostname resolved to from the platform. */
  addresses?: string[]
}

export interface ScanZonePreviewZone {
  zone_id: string
  zone_name: string
  targets: number
  jobs: number
  queued_jobs: number
  sensor_ids: string[]
}

export interface ScanZonePreview {
  zones_enabled: boolean
  /** false: the tenant has no zones, or the scanner is not a network tool. */
  routed: boolean
  not_routed_reason?: string
  resolved_targets: number
  excluded_targets: number
  /** Scope-excluded targets, first 100. */
  excluded: string[]
  /** First 500, in input order. */
  targets: ScanZonePreviewTarget[]
  zones: ScanZonePreviewZone[]
  unzoned_targets: number
  uncovered_targets: number
  jobs: number
  targets_per_job: number
  selected_zone_id?: string
  warnings: string[]
  /** What the trigger would refuse with, when it would. */
  error?: { code: string; message: string }
}
