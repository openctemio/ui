/**
 * Component API Types
 *
 * Type definitions matching backend API responses
 * These are separate from the richer frontend types
 */

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
 * Component entity from API
 */
export interface ApiComponent {
  id: string
  tenant_id: string
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
  purl: string
  vulnerability_count: number
  status?: ApiComponentStatus
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

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
export interface ApiComponentStats {
  total_components: number
  direct_dependencies: number
  transitive_dependencies: number
  vulnerable_components: number

  // Extended stats
  total_vulnerabilities: number
  outdated_components: number
  cisa_kev_components: number
  vuln_by_severity: Record<string, number> // { critical: N, high: N, medium: N, low: N }
  license_risks: Record<string, number> // { critical: N, high: N, medium: N, low: N, unknown: N }
}

/**
 * Ecosystem stats from API
 */
export interface ApiEcosystemStats {
  ecosystem: string
  total: number
  vulnerable: number
  outdated: number
  manifest_file: string
}

/**
 * Vulnerable component with details from API
 */
export interface ApiVulnerableComponent {
  id: string
  name: string
  version: string
  ecosystem: string
  purl: string
  license?: string

  // Vulnerability breakdown
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  total_count: number
  in_cisa_kev: boolean
}

/**
 * Asset that uses a given component (blast-radius reverse lookup).
 * Returned by GET /api/v1/components/{id}/assets.
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
export interface ApiLicenseStats {
  license_id: string // SPDX identifier (e.g., MIT, Apache-2.0)
  name: string // Human-readable name
  category: string // permissive, copyleft, weak-copyleft, proprietary, public-domain, unknown
  risk: string // critical, high, medium, low, none, unknown
  url?: string | null // Link to license text (SPDX URL)
  count: number // Number of components using this license
}
