/**
 * Project API Types
 *
 * Type definitions for project API requests and responses
 */

// ============================================
// PROJECT TYPES
// ============================================

/**
 * Project provider types
 */
export type ProjectProvider = 'github' | 'gitlab' | 'bitbucket' | 'azure_devops'

/**
 * Project visibility types
 */
export type ProjectVisibility = 'public' | 'private' | 'internal'

/**
 * Project status types
 */
export type ProjectStatus = 'active' | 'archived' | 'scanning' | 'inactive'

/**
 * Project scope classification
 */
export type ProjectScope = 'internal' | 'external' | 'critical'

/**
 * Project exposure classification
 */
export type ProjectExposure = 'internet' | 'internal' | 'restricted'

/**
 * Project entity from backend
 */
export interface Project {
  id: string
  tenant_id: string
  name: string
  provider: ProjectProvider
  visibility: ProjectVisibility
  default_branch?: string
  clone_url?: string
  web_url?: string
  language?: string
  description?: string
  stars: number
  status: ProjectStatus
  finding_count: number
  risk_score: number
  scope?: ProjectScope
  exposure?: ProjectExposure
  last_scanned_at?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

/**
 * Create project request
 */
export interface CreateProjectRequest {
  name: string
  provider: ProjectProvider
  visibility: ProjectVisibility
  default_branch?: string
  clone_url?: string
  web_url?: string
  language?: string
  description?: string
  stars?: number
  tags?: string[]
}

/**
 * Update project request
 */
export interface UpdateProjectRequest {
  name?: string
  visibility?: ProjectVisibility
  default_branch?: string
  clone_url?: string
  web_url?: string
  language?: string
  description?: string
  stars?: number
  status?: ProjectStatus
  tags?: string[]
}

/**
 * Project list filters
 */
export interface ProjectFilters {
  name?: string
  providers?: ProjectProvider[]
  visibilities?: ProjectVisibility[]
  statuses?: ProjectStatus[]
  languages?: string[]
  tags?: string[]
  has_findings?: boolean
  page?: number
  per_page?: number
}

/**
 * Paginated project response
 */
export interface ProjectListResponse {
  data: Project[]
  total: number
  page: number
  per_page: number
  total_pages: number
}
