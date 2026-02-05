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
