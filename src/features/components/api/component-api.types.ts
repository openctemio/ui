/**
 * Component API Types
 *
 * Type definitions matching backend API responses
 * These are separate from the richer frontend types
 */
import type {
  ComponentResponse,
  ComponentStats,
  EcosystemStats,
  LicenseStats,
  VulnerableComponent,
} from '@/lib/api/generated'

// ============================================
// API Response Types (match backend)
// ============================================

/**
 * Component ecosystem from backend
 */
export type ApiComponentEcosystem =
  | 'npm'
  | 'pypi'
  | 'maven'
  | 'gradle'
  | 'nuget'
  | 'go'
  | 'cargo'
  | 'rubygems'
  | 'composer'
  | 'cocoapods'
  | 'swift'
  | 'pub'
  | 'hex'
  | 'apt'
  | 'yum'
  | 'apk'
  | 'homebrew'
  | 'docker'
  | 'oci'

/**
 * Component dependency type
 */
export type ApiDependencyType = 'direct' | 'transitive' | 'dev' | 'optional' | 'peer'

/**
 * Component status
 */
export type ApiComponentStatus = 'active' | 'deprecated' | 'vulnerable' | 'outdated'

/**
 * Component entity from API — GENERATED.
 *
 * The hand-written version omitted three fields the server does return:
 * `depth`, `is_direct` and `parent_component_id`. That is the dependency-tree
 * position of the component, which the UI could not see because the type did
 * not mention it.
 */
export type ApiComponent = ComponentResponse

// ============================================
// List Response Types
// ============================================

export interface PaginationLinks {
  first?: string
  prev?: string
  next?: string
  last?: string
}

export interface ApiComponentListResponse {
  data: ApiComponent[]
  total: number
  page: number
  per_page: number
  total_pages: number
  links?: PaginationLinks
}

// ============================================
// Input Types
// ============================================

export interface CreateComponentInput {
  asset_id: string
  name: string
  version: string
  ecosystem: ApiComponentEcosystem
  package_manager?: string
  namespace?: string
  manifest_file?: string
  manifest_path?: string
  dependency_type?: ApiDependencyType
  license?: string
}

export interface UpdateComponentInput {
  version?: string
  package_manager?: string
  namespace?: string
  manifest_file?: string
  manifest_path?: string
  dependency_type?: ApiDependencyType
  license?: string
  status?: ApiComponentStatus
  vulnerability_count?: number
}

// ============================================
// Filter Types
// ============================================

export interface ComponentApiFilters {
  asset_id?: string
  name?: string
  ecosystems?: ApiComponentEcosystem[]
  statuses?: ApiComponentStatus[]
  dependency_types?: ApiDependencyType[]
  has_vulnerabilities?: boolean
  licenses?: string[]
  page?: number
  per_page?: number
}

// ============================================
// Stats Types
// ============================================

/**
 * Component stats from API
 */
export type ApiComponentStats = ComponentStats

/**
 * Ecosystem stats from API
 */
export type ApiEcosystemStats = EcosystemStats

/**
 * Vulnerable component with details from API
 */
export type ApiVulnerableComponent = VulnerableComponent

/**
 * Asset that uses a given component (blast-radius reverse lookup).
 * Returned by GET /api/v1/components/{id}/assets.
 *
 * NOT GENERATED — that handler returns map[string]any, so the spec describes
 * the response only as "an object". Same for ApiComponentVulnerability and all
 * three list envelopes in this file. Generating them means giving those
 * handlers real response structs on the server.
 */
export interface ApiComponentAssetUsage {
  asset_id: string
  asset_name: string
  asset_type: string
  criticality: string
  asset_status: string
  exposure: string
  risk_score: number
  is_internet_accessible: boolean

  dependency_id: string
  dependency_type: string
  is_direct: boolean
  depth: number
  manifest_file?: string
  manifest_path?: string
  license?: string
  vulnerability_count: number
  highest_severity?: string
  linked_at: string
}

export interface ApiComponentAssetUsageListResponse {
  data: ApiComponentAssetUsage[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/**
 * CVE that affects a component (forward lookup from component detail).
 * Returned by GET /api/v1/components/{id}/vulnerabilities.
 * Aggregates findings GROUP BY vulnerability_id.
 */
export interface ApiComponentVulnerability {
  vulnerability_id: string
  cve_id: string
  title: string
  severity: string
  cvss_score?: number | null
  epss_score?: number | null
  in_cisa_kev: boolean
  exploit_maturity?: string
  exploit_available: boolean
  fixed_versions: string[]

  affected_assets_count: number
  open_finding_count: number
  total_finding_count: number
  worst_finding_status: string
  first_detected_at: string
  last_seen_at: string
}

export interface ApiComponentVulnerabilityListResponse {
  data: ApiComponentVulnerability[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/**
 * License stats from API
 */
export type ApiLicenseStats = LicenseStats
