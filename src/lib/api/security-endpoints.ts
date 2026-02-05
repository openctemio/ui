/**
 * Security Platform API Endpoints
 *
 * Centralized endpoint definitions for the security platform features
 * Aligned with CTEM (Continuous Threat Exposure Management) framework
 */

import { buildQueryString } from './client'

// ============================================
// BASE PATHS
// ============================================

export const SECURITY_API_BASE = {
  // Discovery
  ASSETS: '/api/v1/assets',
  ASSET_GROUPS: '/api/v1/asset-groups',
  COMPONENTS: '/api/v1/components',
  CREDENTIALS: '/api/v1/credentials',
  SCANS: '/api/v1/scans',
  RUNNERS: '/api/v1/runners',

  // Prioritization
  FINDINGS: '/api/v1/findings',
  RISKS: '/api/v1/risks',
  THREATS: '/api/v1/threats',

  // Validation
  PENTEST: '/api/v1/pentest',

  // Mobilization
  REMEDIATION: '/api/v1/remediation',
  WORKFLOWS: '/api/v1/workflows',

  // Insights
  REPORTS: '/api/v1/reports',
  ANALYTICS: '/api/v1/analytics',

  // Settings
  INTEGRATIONS: '/api/v1/integrations',
  ORGANIZATION: '/api/v1/organization',
} as const

// ============================================
// COMMON FILTER TYPES
// ============================================

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface AssetFilters extends PaginationParams {
  type?: string
  status?: string
  groupId?: string
  search?: string
  exposure?: string
  scope?: string
}

export interface FindingFilters extends PaginationParams {
  severity?: string
  status?: string
  assetId?: string
  search?: string
  category?: string
}

export interface ComponentFilters extends PaginationParams {
  ecosystem?: string
  hasVulnerabilities?: boolean
  isOutdated?: boolean
  isDirect?: boolean
  search?: string
  licenseRisk?: string
}

export interface ScanFilters extends PaginationParams {
  status?: string
  type?: string
  runnerId?: string
}

// ============================================
// ASSET ENDPOINTS
// ============================================

export const assetEndpoints = {
  // List all assets with filters
  list: (filters?: AssetFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.ASSETS}${queryString}`
  },

  // Get assets by type (domains, websites, services, etc.)
  listByType: (type: string, filters?: AssetFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.ASSETS}/${type}${queryString}`
  },

  // Get single asset by ID
  get: (assetId: string) => `${SECURITY_API_BASE.ASSETS}/${assetId}`,

  // Create new asset
  create: () => SECURITY_API_BASE.ASSETS,

  // Update asset
  update: (assetId: string) => `${SECURITY_API_BASE.ASSETS}/${assetId}`,

  // Delete asset
  delete: (assetId: string) => `${SECURITY_API_BASE.ASSETS}/${assetId}`,

  // Get asset relationships
  relationships: (assetId: string) => `${SECURITY_API_BASE.ASSETS}/${assetId}/relationships`,

  // Get asset findings
  findings: (assetId: string) => `${SECURITY_API_BASE.ASSETS}/${assetId}/findings`,

  // Get asset components
  components: (assetId: string) => `${SECURITY_API_BASE.ASSETS}/${assetId}/components`,

  // Get asset scan history
  scans: (assetId: string) => `${SECURITY_API_BASE.ASSETS}/${assetId}/scans`,

  // Get asset statistics
  stats: () => `${SECURITY_API_BASE.ASSETS}/stats`,
} as const

// ============================================
// ASSET GROUP ENDPOINTS
// ============================================

export const assetGroupEndpoints = {
  list: (filters?: PaginationParams) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.ASSET_GROUPS}${queryString}`
  },

  get: (groupId: string) => `${SECURITY_API_BASE.ASSET_GROUPS}/${groupId}`,

  create: () => SECURITY_API_BASE.ASSET_GROUPS,

  update: (groupId: string) => `${SECURITY_API_BASE.ASSET_GROUPS}/${groupId}`,

  delete: (groupId: string) => `${SECURITY_API_BASE.ASSET_GROUPS}/${groupId}`,

  // Get assets in group
  assets: (groupId: string, filters?: AssetFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.ASSET_GROUPS}/${groupId}/assets${queryString}`
  },

  // Add assets to group
  addAssets: (groupId: string) => `${SECURITY_API_BASE.ASSET_GROUPS}/${groupId}/assets`,

  // Remove assets from group
  removeAssets: (groupId: string) => `${SECURITY_API_BASE.ASSET_GROUPS}/${groupId}/assets`,

  stats: () => `${SECURITY_API_BASE.ASSET_GROUPS}/stats`,
} as const

// ============================================
// COMPONENT (SBOM) ENDPOINTS
// ============================================

export const componentEndpoints = {
  list: (filters?: ComponentFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.COMPONENTS}${queryString}`
  },

  get: (componentId: string) => `${SECURITY_API_BASE.COMPONENTS}/${componentId}`,

  // Get vulnerable components
  vulnerable: (filters?: ComponentFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.COMPONENTS}/vulnerable${queryString}`
  },

  // Get components by ecosystem
  byEcosystem: (ecosystem: string, filters?: ComponentFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.COMPONENTS}/ecosystem/${ecosystem}${queryString}`
  },

  // Get component vulnerabilities
  vulnerabilities: (componentId: string) =>
    `${SECURITY_API_BASE.COMPONENTS}/${componentId}/vulnerabilities`,

  // Get component sources (where it's used)
  sources: (componentId: string) =>
    `${SECURITY_API_BASE.COMPONENTS}/${componentId}/sources`,

  // Get component statistics
  stats: () => `${SECURITY_API_BASE.COMPONENTS}/stats`,

  // Get ecosystem statistics
  ecosystemStats: () => `${SECURITY_API_BASE.COMPONENTS}/ecosystems/stats`,

  // Get license statistics
  licenseStats: () => `${SECURITY_API_BASE.COMPONENTS}/licenses/stats`,

  // Export SBOM
  exportSbom: (format: string) => `${SECURITY_API_BASE.COMPONENTS}/export?format=${format}`,
} as const

// ============================================
// FINDING ENDPOINTS
// ============================================

export const findingEndpoints = {
  list: (filters?: FindingFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.FINDINGS}${queryString}`
  },

  get: (findingId: string) => `${SECURITY_API_BASE.FINDINGS}/${findingId}`,

  create: () => SECURITY_API_BASE.FINDINGS,

  update: (findingId: string) => `${SECURITY_API_BASE.FINDINGS}/${findingId}`,

  delete: (findingId: string) => `${SECURITY_API_BASE.FINDINGS}/${findingId}`,

  // Update finding status
  updateStatus: (findingId: string) => `${SECURITY_API_BASE.FINDINGS}/${findingId}/status`,

  // Assign finding to user
  assign: (findingId: string) => `${SECURITY_API_BASE.FINDINGS}/${findingId}/assign`,

  // Get finding remediation history
  history: (findingId: string) => `${SECURITY_API_BASE.FINDINGS}/${findingId}/history`,

  // Get finding comments
  comments: (findingId: string) => `${SECURITY_API_BASE.FINDINGS}/${findingId}/comments`,

  // Add comment to finding
  addComment: (findingId: string) => `${SECURITY_API_BASE.FINDINGS}/${findingId}/comments`,

  // Get finding statistics
  stats: () => `${SECURITY_API_BASE.FINDINGS}/stats`,

  // Get findings by severity
  bySeverity: (severity: string, filters?: FindingFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.FINDINGS}/severity/${severity}${queryString}`
  },
} as const

// ============================================
// SCAN ENDPOINTS
// ============================================

export const scanEndpoints = {
  list: (filters?: ScanFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.SCANS}${queryString}`
  },

  get: (scanId: string) => `${SECURITY_API_BASE.SCANS}/${scanId}`,

  // Start new scan
  start: () => `${SECURITY_API_BASE.SCANS}/start`,

  // Stop running scan
  stop: (scanId: string) => `${SECURITY_API_BASE.SCANS}/${scanId}/stop`,

  // Get scan results
  results: (scanId: string) => `${SECURITY_API_BASE.SCANS}/${scanId}/results`,

  // Get scan findings
  findings: (scanId: string) => `${SECURITY_API_BASE.SCANS}/${scanId}/findings`,

  // Get scan logs
  logs: (scanId: string) => `${SECURITY_API_BASE.SCANS}/${scanId}/logs`,

  // Get scan statistics
  stats: () => `${SECURITY_API_BASE.SCANS}/stats`,

  // Get scheduled scans
  scheduled: () => `${SECURITY_API_BASE.SCANS}/scheduled`,

  // Schedule new scan
  schedule: () => `${SECURITY_API_BASE.SCANS}/schedule`,
} as const

// ============================================
// RUNNER ENDPOINTS
// ============================================

export const runnerEndpoints = {
  list: (filters?: PaginationParams) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.RUNNERS}${queryString}`
  },

  get: (runnerId: string) => `${SECURITY_API_BASE.RUNNERS}/${runnerId}`,

  create: () => SECURITY_API_BASE.RUNNERS,

  update: (runnerId: string) => `${SECURITY_API_BASE.RUNNERS}/${runnerId}`,

  delete: (runnerId: string) => `${SECURITY_API_BASE.RUNNERS}/${runnerId}`,

  // Get runner status
  status: (runnerId: string) => `${SECURITY_API_BASE.RUNNERS}/${runnerId}/status`,

  // Get runner scans
  scans: (runnerId: string) => `${SECURITY_API_BASE.RUNNERS}/${runnerId}/scans`,

  // Download runner agent
  download: () => `${SECURITY_API_BASE.RUNNERS}/download`,

  // Generate runner token
  generateToken: (runnerId: string) => `${SECURITY_API_BASE.RUNNERS}/${runnerId}/token`,

  stats: () => `${SECURITY_API_BASE.RUNNERS}/stats`,
} as const

// ============================================
// CREDENTIAL LEAK ENDPOINTS
// ============================================

export const credentialEndpoints = {
  list: (filters?: PaginationParams & { source?: string; status?: string }) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.CREDENTIALS}${queryString}`
  },

  get: (credentialId: string) => `${SECURITY_API_BASE.CREDENTIALS}/${credentialId}`,

  // Mark as resolved
  resolve: (credentialId: string) => `${SECURITY_API_BASE.CREDENTIALS}/${credentialId}/resolve`,

  // Mark as false positive
  falsePositive: (credentialId: string) =>
    `${SECURITY_API_BASE.CREDENTIALS}/${credentialId}/false-positive`,

  stats: () => `${SECURITY_API_BASE.CREDENTIALS}/stats`,
} as const

// ============================================
// PENTEST ENDPOINTS
// ============================================

export const pentestEndpoints = {
  // Campaigns
  campaigns: {
    list: (filters?: PaginationParams) => {
      const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
      return `${SECURITY_API_BASE.PENTEST}/campaigns${queryString}`
    },
    get: (campaignId: string) => `${SECURITY_API_BASE.PENTEST}/campaigns/${campaignId}`,
    create: () => `${SECURITY_API_BASE.PENTEST}/campaigns`,
    update: (campaignId: string) => `${SECURITY_API_BASE.PENTEST}/campaigns/${campaignId}`,
    delete: (campaignId: string) => `${SECURITY_API_BASE.PENTEST}/campaigns/${campaignId}`,
    stats: () => `${SECURITY_API_BASE.PENTEST}/campaigns/stats`,
  },

  // Findings
  findings: {
    list: (filters?: FindingFilters) => {
      const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
      return `${SECURITY_API_BASE.PENTEST}/findings${queryString}`
    },
    get: (findingId: string) => `${SECURITY_API_BASE.PENTEST}/findings/${findingId}`,
    create: () => `${SECURITY_API_BASE.PENTEST}/findings`,
    update: (findingId: string) => `${SECURITY_API_BASE.PENTEST}/findings/${findingId}`,
    delete: (findingId: string) => `${SECURITY_API_BASE.PENTEST}/findings/${findingId}`,
    stats: () => `${SECURITY_API_BASE.PENTEST}/findings/stats`,
  },

  // Retests
  retests: {
    list: (filters?: PaginationParams) => {
      const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
      return `${SECURITY_API_BASE.PENTEST}/retests${queryString}`
    },
    create: (findingId: string) => `${SECURITY_API_BASE.PENTEST}/findings/${findingId}/retest`,
    update: (retestId: string) => `${SECURITY_API_BASE.PENTEST}/retests/${retestId}`,
  },

  // Reports
  reports: {
    list: (filters?: PaginationParams) => {
      const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
      return `${SECURITY_API_BASE.PENTEST}/reports${queryString}`
    },
    get: (reportId: string) => `${SECURITY_API_BASE.PENTEST}/reports/${reportId}`,
    generate: (campaignId: string) => `${SECURITY_API_BASE.PENTEST}/campaigns/${campaignId}/report`,
    download: (reportId: string) => `${SECURITY_API_BASE.PENTEST}/reports/${reportId}/download`,
  },

  // Templates
  templates: {
    list: () => `${SECURITY_API_BASE.PENTEST}/templates`,
    get: (templateId: string) => `${SECURITY_API_BASE.PENTEST}/templates/${templateId}`,
    create: () => `${SECURITY_API_BASE.PENTEST}/templates`,
    update: (templateId: string) => `${SECURITY_API_BASE.PENTEST}/templates/${templateId}`,
    delete: (templateId: string) => `${SECURITY_API_BASE.PENTEST}/templates/${templateId}`,
  },
} as const

// ============================================
// REMEDIATION ENDPOINTS
// ============================================

export const remediationEndpoints = {
  list: (filters?: PaginationParams & { status?: string; priority?: string; assignee?: string }) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.REMEDIATION}${queryString}`
  },

  get: (taskId: string) => `${SECURITY_API_BASE.REMEDIATION}/${taskId}`,

  create: () => SECURITY_API_BASE.REMEDIATION,

  update: (taskId: string) => `${SECURITY_API_BASE.REMEDIATION}/${taskId}`,

  delete: (taskId: string) => `${SECURITY_API_BASE.REMEDIATION}/${taskId}`,

  // Update task status
  updateStatus: (taskId: string) => `${SECURITY_API_BASE.REMEDIATION}/${taskId}/status`,

  // Assign task
  assign: (taskId: string) => `${SECURITY_API_BASE.REMEDIATION}/${taskId}/assign`,

  // Get overdue tasks
  overdue: () => `${SECURITY_API_BASE.REMEDIATION}/overdue`,

  // Get priority tasks
  priority: () => `${SECURITY_API_BASE.REMEDIATION}/priority`,

  stats: () => `${SECURITY_API_BASE.REMEDIATION}/stats`,
} as const

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

export const analyticsEndpoints = {
  // Dashboard overview
  dashboard: () => `${SECURITY_API_BASE.ANALYTICS}/dashboard`,

  // Risk score over time
  riskTrend: (period?: string) => {
    const queryString = period ? buildQueryString({ period }) : ''
    return `${SECURITY_API_BASE.ANALYTICS}/risk-trend${queryString}`
  },

  // Finding trends
  findingTrend: (period?: string) => {
    const queryString = period ? buildQueryString({ period }) : ''
    return `${SECURITY_API_BASE.ANALYTICS}/finding-trend${queryString}`
  },

  // Asset coverage
  coverage: () => `${SECURITY_API_BASE.ANALYTICS}/coverage`,

  // MTTR (Mean Time To Remediate)
  mttr: (period?: string) => {
    const queryString = period ? buildQueryString({ period }) : ''
    return `${SECURITY_API_BASE.ANALYTICS}/mttr${queryString}`
  },

  // Compliance status
  compliance: () => `${SECURITY_API_BASE.ANALYTICS}/compliance`,

  // Executive summary
  executive: () => `${SECURITY_API_BASE.ANALYTICS}/executive`,
} as const

// ============================================
// REPORT ENDPOINTS
// ============================================

export const reportEndpoints = {
  list: (filters?: PaginationParams & { type?: string }) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${SECURITY_API_BASE.REPORTS}${queryString}`
  },

  get: (reportId: string) => `${SECURITY_API_BASE.REPORTS}/${reportId}`,

  generate: () => `${SECURITY_API_BASE.REPORTS}/generate`,

  download: (reportId: string, format?: string) => {
    const queryString = format ? buildQueryString({ format }) : ''
    return `${SECURITY_API_BASE.REPORTS}/${reportId}/download${queryString}`
  },

  // Scheduled reports
  scheduled: () => `${SECURITY_API_BASE.REPORTS}/scheduled`,

  scheduleReport: () => `${SECURITY_API_BASE.REPORTS}/schedule`,

  // Report templates
  templates: () => `${SECURITY_API_BASE.REPORTS}/templates`,
} as const

// ============================================
// INTEGRATION ENDPOINTS
// ============================================

export const integrationEndpoints = {
  list: () => SECURITY_API_BASE.INTEGRATIONS,

  get: (integrationId: string) => `${SECURITY_API_BASE.INTEGRATIONS}/${integrationId}`,

  create: () => SECURITY_API_BASE.INTEGRATIONS,

  update: (integrationId: string) => `${SECURITY_API_BASE.INTEGRATIONS}/${integrationId}`,

  delete: (integrationId: string) => `${SECURITY_API_BASE.INTEGRATIONS}/${integrationId}`,

  // Test integration connection
  test: (integrationId: string) => `${SECURITY_API_BASE.INTEGRATIONS}/${integrationId}/test`,

  // Sync integration data
  sync: (integrationId: string) => `${SECURITY_API_BASE.INTEGRATIONS}/${integrationId}/sync`,

  // Available integration types
  types: () => `${SECURITY_API_BASE.INTEGRATIONS}/types`,
} as const

// ============================================
// EXPORT ALL ENDPOINTS
// ============================================

export const securityEndpoints = {
  assets: assetEndpoints,
  assetGroups: assetGroupEndpoints,
  components: componentEndpoints,
  findings: findingEndpoints,
  scans: scanEndpoints,
  runners: runnerEndpoints,
  credentials: credentialEndpoints,
  pentest: pentestEndpoints,
  remediation: remediationEndpoints,
  analytics: analyticsEndpoints,
  reports: reportEndpoints,
  integrations: integrationEndpoints,
} as const
