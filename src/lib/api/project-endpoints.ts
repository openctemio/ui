/**
 * Project API Endpoints
 *
 * Endpoint definitions for project management
 * Tenant is now determined from JWT token (token-based tenant)
 */

import { buildQueryString } from './client'
import type { ProjectFilters } from './project-types'

// ============================================
// PROJECT ENDPOINTS
// ============================================

/**
 * Build project endpoints
 */
export const projectEndpoints = {
  /**
   * List projects with filters
   */
  list: (filters?: ProjectFilters) => {
    const queryParams: Record<string, unknown> = {}

    if (filters) {
      if (filters.name) queryParams.name = filters.name
      if (filters.providers?.length) queryParams.providers = filters.providers.join(',')
      if (filters.visibilities?.length) queryParams.visibilities = filters.visibilities.join(',')
      if (filters.statuses?.length) queryParams.statuses = filters.statuses.join(',')
      if (filters.languages?.length) queryParams.languages = filters.languages.join(',')
      if (filters.tags?.length) queryParams.tags = filters.tags.join(',')
      if (filters.has_findings !== undefined) queryParams.has_findings = filters.has_findings
      if (filters.page) queryParams.page = filters.page
      if (filters.per_page) queryParams.per_page = filters.per_page
    }

    const queryString = Object.keys(queryParams).length > 0
      ? buildQueryString(queryParams)
      : ''

    return `/api/v1/projects${queryString}`
  },

  /**
   * Get single project by ID
   */
  get: (projectId: string) =>
    `/api/v1/projects/${projectId}`,

  /**
   * Create new project
   */
  create: () =>
    `/api/v1/projects`,

  /**
   * Update project by ID
   */
  update: (projectId: string) =>
    `/api/v1/projects/${projectId}`,

  /**
   * Delete project by ID
   */
  delete: (projectId: string) =>
    `/api/v1/projects/${projectId}`,

  /**
   * Get project components
   */
  components: (projectId: string) =>
    `/api/v1/projects/${projectId}/components`,

  /**
   * Get project findings
   */
  findings: (projectId: string) =>
    `/api/v1/projects/${projectId}/findings`,

  /**
   * Import SARIF results
   */
  importSarif: (projectId: string) =>
    `/api/v1/projects/${projectId}/import/sarif`,
} as const
