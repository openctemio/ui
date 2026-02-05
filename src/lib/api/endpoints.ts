/**
 * API Endpoints
 *
 * Centralized API endpoint definitions for Rediver
 * Type-safe URL builders for backend API
 */

import { buildQueryString } from './client'
import type { SearchFilters, UserListFilters } from './types'

// ============================================
// BASE ENDPOINTS
// ============================================

/**
 * API base paths
 */
export const API_BASE = {
  AUTH: '/api/v1/auth',
  USERS: '/api/v1/users',
  TENANTS: '/api/v1/tenants',
  INVITATIONS: '/api/v1/invitations',
  ASSETS: '/api/v1/assets',
  VULNERABILITIES: '/api/v1/vulnerabilities',
  DASHBOARD: '/api/v1/dashboard',
  AUDIT_LOGS: '/api/v1/audit-logs',
  AGENTS: '/api/v1/agents',
  SCAN_PROFILES: '/api/v1/scan-profiles',
  SCANNER_TEMPLATES: '/api/v1/scanner-templates',
  TEMPLATE_SOURCES: '/api/v1/template-sources',
  TOOLS: '/api/v1/tools',
  PLATFORM_TOOLS: '/api/v1/tools/platform',
  CUSTOM_TOOLS: '/api/v1/custom-tools',
  TENANT_TOOLS: '/api/v1/tenant-tools',
  TOOL_STATS: '/api/v1/tool-stats',
  TOOL_CATEGORIES: '/api/v1/tool-categories',
  CUSTOM_TOOL_CATEGORIES: '/api/v1/custom-tool-categories',
  CAPABILITIES: '/api/v1/capabilities',
  CUSTOM_CAPABILITIES: '/api/v1/custom-capabilities',
  SCANS: '/api/v1/scans',
  EXPOSURES: '/api/v1/exposures',
  AGENT_INGEST: '/api/v1/agent/ingest',
  THREAT_INTEL: '/api/v1/threat-intel',
  PLATFORM: '/api/v1/platform',
} as const

// ============================================
// AUTH ENDPOINTS
// ============================================

/**
 * Authentication endpoints
 */
export const authEndpoints = {
  /**
   * Get auth provider info
   */
  info: () => `${API_BASE.AUTH}/info`,

  /**
   * Refresh access token
   */
  refresh: () => `${API_BASE.AUTH}/refresh`,

  /**
   * Exchange refresh token for tenant-scoped access token
   */
  token: () => `${API_BASE.AUTH}/token`,

  /**
   * Logout
   */
  logout: () => `${API_BASE.AUTH}/logout`,

  // ============================================
  // LOCAL AUTH
  // ============================================

  /**
   * Register new user (local auth)
   */
  register: () => `${API_BASE.AUTH}/register`,

  /**
   * Login with email/password (local auth)
   */
  login: () => `${API_BASE.AUTH}/login`,

  /**
   * Verify email with token
   */
  verifyEmail: (token: string) => `${API_BASE.AUTH}/verify-email?token=${token}`,

  /**
   * Resend verification email
   */
  resendVerification: () => `${API_BASE.AUTH}/resend-verification`,

  /**
   * Request password reset
   */
  forgotPassword: () => `${API_BASE.AUTH}/forgot-password`,

  /**
   * Reset password with token
   */
  resetPassword: () => `${API_BASE.AUTH}/reset-password`,

  /**
   * Create first team for new user (uses refresh token)
   */
  createFirstTeam: () => `${API_BASE.AUTH}/create-first-team`,

  /**
   * Get short-lived WebSocket token for cross-origin WebSocket connections
   * Required when frontend and backend are on different ports (development)
   */
  wsToken: () => `${API_BASE.AUTH}/ws-token`,

  // ============================================
  // SOCIAL/OAUTH AUTH
  // ============================================

  /**
   * Get OAuth authorization URL for a provider
   * @param provider - OAuth provider (google, github, microsoft)
   */
  oauthAuthorize: (provider: string) => `${API_BASE.AUTH}/oauth/${provider}/authorize`,

  /**
   * OAuth callback endpoint (handled by backend, redirects to frontend)
   * @param provider - OAuth provider (google, github, microsoft)
   */
  oauthCallback: (provider: string) => `${API_BASE.AUTH}/oauth/${provider}/callback`,
} as const

// ============================================
// USER ENDPOINTS
// ============================================

/**
 * User endpoints
 */
export const userEndpoints = {
  // ============================================
  // CURRENT USER (Profile)
  // ============================================

  /**
   * Get current user's profile
   */
  me: () => `${API_BASE.USERS}/me`,

  /**
   * Update current user's profile
   */
  updateMe: () => `${API_BASE.USERS}/me`,

  /**
   * Update current user's preferences
   */
  updatePreferences: () => `${API_BASE.USERS}/me/preferences`,

  /**
   * Get current user's tenants/teams
   */
  myTenants: () => `${API_BASE.USERS}/me/tenants`,

  // ============================================
  // SESSION MANAGEMENT (Local Auth)
  // ============================================

  /**
   * Change password (authenticated user)
   */
  changePassword: () => `${API_BASE.USERS}/me/change-password`,

  /**
   * List active sessions
   */
  sessions: () => `${API_BASE.USERS}/me/sessions`,

  /**
   * Revoke all sessions except current
   */
  revokeAllSessions: () => `${API_BASE.USERS}/me/sessions`,

  /**
   * Revoke specific session
   */
  revokeSession: (sessionId: string) => `${API_BASE.USERS}/me/sessions/${sessionId}`,

  // ============================================
  // USER MANAGEMENT (Admin)
  // ============================================

  /**
   * List users with filters (admin)
   */
  list: (filters?: UserListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.USERS}${queryString}`
  },

  /**
   * Get single user by ID (admin)
   */
  get: (userId: string) => `${API_BASE.USERS}/${userId}`,

  /**
   * Create new user (admin)
   */
  create: () => API_BASE.USERS,

  /**
   * Update user by ID (admin)
   */
  update: (userId: string) => `${API_BASE.USERS}/${userId}`,

  /**
   * Delete user by ID (admin)
   */
  delete: (userId: string) => `${API_BASE.USERS}/${userId}`,
} as const

// ============================================
// TENANT ENDPOINTS (Teams)
// ============================================

/**
 * Tenant endpoints (API uses "tenant", UI displays "Team")
 */
export const tenantEndpoints = {
  /**
   * List user's tenants/teams
   */
  list: (filters?: SearchFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.TENANTS}${queryString}`
  },

  /**
   * Create a new tenant/team
   */
  create: () => API_BASE.TENANTS,

  /**
   * Get tenant by ID or slug
   */
  get: (tenantIdOrSlug: string) => `${API_BASE.TENANTS}/${tenantIdOrSlug}`,

  /**
   * Update tenant
   */
  update: (tenantIdOrSlug: string) => `${API_BASE.TENANTS}/${tenantIdOrSlug}`,

  /**
   * Delete tenant
   */
  delete: (tenantIdOrSlug: string) => `${API_BASE.TENANTS}/${tenantIdOrSlug}`,

  // ============================================
  // MEMBER MANAGEMENT
  // ============================================

  /**
   * List tenant members
   */
  members: (tenantIdOrSlug: string) => `${API_BASE.TENANTS}/${tenantIdOrSlug}/members`,

  /**
   * Get member statistics
   */
  memberStats: (tenantIdOrSlug: string) => `${API_BASE.TENANTS}/${tenantIdOrSlug}/members/stats`,

  /**
   * Add member to tenant
   */
  addMember: (tenantIdOrSlug: string) => `${API_BASE.TENANTS}/${tenantIdOrSlug}/members`,

  /**
   * Update member (alias for updateMemberRole)
   */
  updateMember: (tenantIdOrSlug: string, memberId: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/members/${memberId}`,

  /**
   * Update member role
   */
  updateMemberRole: (tenantIdOrSlug: string, memberId: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/members/${memberId}`,

  /**
   * Remove member from tenant
   */
  removeMember: (tenantIdOrSlug: string, memberId: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/members/${memberId}`,

  // ============================================
  // INVITATION MANAGEMENT
  // ============================================

  /**
   * List tenant invitations
   */
  invitations: (tenantIdOrSlug: string) => `${API_BASE.TENANTS}/${tenantIdOrSlug}/invitations`,

  /**
   * Create invitation
   */
  createInvitation: (tenantIdOrSlug: string) => `${API_BASE.TENANTS}/${tenantIdOrSlug}/invitations`,

  /**
   * Delete invitation
   */
  deleteInvitation: (tenantIdOrSlug: string, invitationId: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/invitations/${invitationId}`,

  // ============================================
  // SETTINGS MANAGEMENT
  // ============================================

  /**
   * Get tenant settings
   */
  settings: (tenantIdOrSlug: string) => `${API_BASE.TENANTS}/${tenantIdOrSlug}/settings`,

  /**
   * Update general settings
   */
  updateGeneralSettings: (tenantIdOrSlug: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/settings/general`,

  /**
   * Update security settings
   */
  updateSecuritySettings: (tenantIdOrSlug: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/settings/security`,

  /**
   * Update API settings
   */
  updateAPISettings: (tenantIdOrSlug: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/settings/api`,

  /**
   * Update branding settings
   */
  updateBrandingSettings: (tenantIdOrSlug: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/settings/branding`,
} as const

// ============================================
// INVITATION ENDPOINTS (Public)
// ============================================

/**
 * Invitation endpoints for accepting invitations
 */
export const invitationEndpoints = {
  /**
   * Get invitation details by token
   */
  get: (token: string) => `${API_BASE.INVITATIONS}/${token}`,

  /**
   * Accept invitation
   */
  accept: (token: string) => `${API_BASE.INVITATIONS}/${token}/accept`,
} as const

// ============================================
// ASSET ENDPOINTS (Global)
// ============================================

/**
 * Asset endpoints (global resources)
 * Supports unified asset types including repositories (git repos)
 */
export const assetEndpoints = {
  // ============================================
  // BASIC CRUD
  // ============================================

  /**
   * List assets
   */
  list: (filters?: SearchFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.ASSETS}${queryString}`
  },

  /**
   * Get asset by ID
   */
  get: (assetId: string) => `${API_BASE.ASSETS}/${assetId}`,

  /**
   * Create asset
   */
  create: () => API_BASE.ASSETS,

  /**
   * Update asset
   */
  update: (assetId: string) => `${API_BASE.ASSETS}/${assetId}`,

  /**
   * Delete asset
   */
  delete: (assetId: string) => `${API_BASE.ASSETS}/${assetId}`,

  // ============================================
  // REPOSITORY EXTENSION
  // ============================================

  /**
   * Get asset with repository extension (full data)
   */
  getFull: (assetId: string) => `${API_BASE.ASSETS}/${assetId}/full`,

  /**
   * Get repository extension for an asset
   */
  getRepository: (assetId: string) => `${API_BASE.ASSETS}/${assetId}/repository`,

  /**
   * Create repository asset (creates asset + repository extension)
   */
  createRepository: () => `${API_BASE.ASSETS}/repository`,

  /**
   * Update repository extension
   */
  updateRepository: (assetId: string) => `${API_BASE.ASSETS}/${assetId}/repository`,

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  /**
   * Activate asset (set status to active)
   */
  activate: (assetId: string) => `${API_BASE.ASSETS}/${assetId}/activate`,

  /**
   * Deactivate asset (set status to inactive)
   */
  deactivate: (assetId: string) => `${API_BASE.ASSETS}/${assetId}/deactivate`,

  /**
   * Archive asset (set status to archived)
   */
  archive: (assetId: string) => `${API_BASE.ASSETS}/${assetId}/archive`,

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get asset statistics (comprehensive stats with all breakdowns)
   * Includes: by_type, by_status, by_criticality, by_scope, by_exposure,
   * high_risk_count, findings_total, risk_score_avg
   */
  stats: () => `${API_BASE.ASSETS}/stats`,
} as const

// ============================================
// PROJECT ENDPOINTS (Tenant-scoped)
// @deprecated Use assetEndpoints with type="repository" instead
// ============================================

/**
 * Project endpoints (tenant-scoped repositories/code projects)
 * @deprecated Use assetEndpoints with type="repository" instead.
 * Projects are now unified under the Asset domain as repository type assets.
 */
export const projectEndpoints = {
  /**
   * List projects in tenant
   */
  list: (tenantIdOrSlug: string, filters?: SearchFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.TENANTS}/${tenantIdOrSlug}/projects${queryString}`
  },

  /**
   * Get project by ID
   */
  get: (tenantIdOrSlug: string, projectId: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/projects/${projectId}`,

  /**
   * Create project (member+ role)
   */
  create: (tenantIdOrSlug: string) => `${API_BASE.TENANTS}/${tenantIdOrSlug}/projects`,

  /**
   * Update project (member+ role)
   */
  update: (tenantIdOrSlug: string, projectId: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/projects/${projectId}`,

  /**
   * Delete project (admin+ role)
   */
  delete: (tenantIdOrSlug: string, projectId: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/projects/${projectId}`,
} as const

// ============================================
// COMPONENT ENDPOINTS (Tenant-scoped)
// ============================================

/**
 * Component endpoints (tenant-scoped dependencies/packages)
 */
export const componentEndpoints = {
  /**
   * List components in tenant
   */
  list: (tenantIdOrSlug: string, filters?: SearchFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.TENANTS}/${tenantIdOrSlug}/components${queryString}`
  },

  /**
   * Get component by ID
   */
  get: (tenantIdOrSlug: string, componentId: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/components/${componentId}`,

  /**
   * Create component (member+ role)
   */
  create: (tenantIdOrSlug: string) => `${API_BASE.TENANTS}/${tenantIdOrSlug}/components`,

  /**
   * Update component (member+ role)
   */
  update: (tenantIdOrSlug: string, componentId: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/components/${componentId}`,

  /**
   * Delete component (admin+ role)
   */
  delete: (tenantIdOrSlug: string, componentId: string) =>
    `${API_BASE.TENANTS}/${tenantIdOrSlug}/components/${componentId}`,

  /**
   * List components by project
   */
  listByProject: (tenantIdOrSlug: string, projectId: string, filters?: SearchFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.TENANTS}/${tenantIdOrSlug}/projects/${projectId}/components${queryString}`
  },
} as const

// ============================================
// VULNERABILITY ENDPOINTS (Global CVE database)
// ============================================

/**
 * Vulnerability endpoints (global CVE database)
 */
export const vulnerabilityEndpoints = {
  /**
   * List vulnerabilities
   */
  list: (filters?: SearchFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.VULNERABILITIES}${queryString}`
  },

  /**
   * Get vulnerability by ID
   */
  get: (vulnId: string) => `${API_BASE.VULNERABILITIES}/${vulnId}`,

  /**
   * Get vulnerability by CVE ID
   */
  getByCVE: (cveId: string) => `${API_BASE.VULNERABILITIES}/cve/${cveId}`,

  /**
   * Create vulnerability (admin only)
   */
  create: () => API_BASE.VULNERABILITIES,

  /**
   * Update vulnerability (admin only)
   */
  update: (vulnId: string) => `${API_BASE.VULNERABILITIES}/${vulnId}`,

  /**
   * Delete vulnerability (admin only)
   */
  delete: (vulnId: string) => `${API_BASE.VULNERABILITIES}/${vulnId}`,
} as const

// ============================================
// FINDING ENDPOINTS (Tenant from JWT token)
// ============================================

import type { FindingListFilters } from './finding-types'

/**
 * Finding endpoints (tenant extracted from JWT, not URL path)
 */
export const findingEndpoints = {
  /**
   * List findings (tenant from JWT)
   */
  list: (filters?: FindingListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `/api/v1/findings${queryString}`
  },

  /**
   * Get finding by ID
   */
  get: (findingId: string) => `/api/v1/findings/${findingId}`,

  /**
   * Create finding
   */
  create: () => '/api/v1/findings',

  /**
   * Update finding status
   */
  updateStatus: (findingId: string) => `/api/v1/findings/${findingId}/status`,

  /**
   * Delete finding
   */
  delete: (findingId: string) => `/api/v1/findings/${findingId}`,

  /**
   * List findings for an asset
   */
  listByAsset: (assetId: string, filters?: FindingListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `/api/v1/assets/${assetId}/findings${queryString}`
  },

  /**
   * List comments for a finding
   */
  comments: (findingId: string) => `/api/v1/findings/${findingId}/comments`,

  /**
   * Add comment to a finding
   */
  addComment: (findingId: string) => `/api/v1/findings/${findingId}/comments`,

  /**
   * Update comment
   */
  updateComment: (findingId: string, commentId: string) =>
    `/api/v1/findings/${findingId}/comments/${commentId}`,

  /**
   * Delete comment
   */
  deleteComment: (findingId: string, commentId: string) =>
    `/api/v1/findings/${findingId}/comments/${commentId}`,
} as const

// ============================================
// DASHBOARD ENDPOINTS
// ============================================

/**
 * Dashboard endpoints for aggregated statistics
 */
export const dashboardEndpoints = {
  /**
   * Get tenant-scoped dashboard stats
   */
  stats: () => `${API_BASE.DASHBOARD}/stats`,
} as const

// ============================================
// UTILITIES
// ============================================

/**
 * Build paginated endpoint
 */
export function buildPaginatedEndpoint(
  baseUrl: string,
  page: number = 1,
  pageSize: number = 10
): string {
  return `${baseUrl}${buildQueryString({ page, pageSize })}`
}

/**
 * Build search endpoint
 */
export function buildSearchEndpoint(
  baseUrl: string,
  query: string,
  filters?: Record<string, unknown>
): string {
  return `${baseUrl}${buildQueryString({ query, ...filters })}`
}

/**
 * Build sort endpoint
 */
export function buildSortEndpoint(
  baseUrl: string,
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'asc'
): string {
  return `${baseUrl}${buildQueryString({ sortBy, sortOrder })}`
}

// ============================================
// AUDIT LOG ENDPOINTS
// ============================================

/**
 * Audit log endpoints (tenant from JWT token, not URL path)
 * Backend uses /api/v1/audit-logs with tenant extracted from JWT
 */
export const auditLogEndpoints = {
  /**
   * List audit logs with optional filters
   */
  list: (filters?: SearchFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.AUDIT_LOGS}${queryString}`
  },

  /**
   * Get audit log statistics
   */
  stats: () => `${API_BASE.AUDIT_LOGS}/stats`,

  /**
   * Get single audit log by ID
   */
  get: (logId: string) => `${API_BASE.AUDIT_LOGS}/${logId}`,

  /**
   * Get resource audit history
   */
  resourceHistory: (resourceType: string, resourceId: string) =>
    `${API_BASE.AUDIT_LOGS}/resource/${resourceType}/${resourceId}`,

  /**
   * Get user activity
   */
  userActivity: (userId: string) => `${API_BASE.AUDIT_LOGS}/user/${userId}`,
} as const

// ============================================
// AGENT ENDPOINTS
// ============================================

import type {
  AgentListFilters,
  AgentSessionListFilters,
  AgentDailyStatsListFilters,
} from './agent-types'

/**
 * Agent endpoints for managing agents (runners, workers, collectors, sensors)
 */
export const agentEndpoints = {
  /**
   * List agents with optional filters
   */
  list: (filters?: AgentListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.AGENTS}${queryString}`
  },

  /**
   * Get agent by ID
   */
  get: (agentId: string) => `${API_BASE.AGENTS}/${agentId}`,

  /**
   * Create a new agent
   */
  create: () => API_BASE.AGENTS,

  /**
   * Update agent
   */
  update: (agentId: string) => `${API_BASE.AGENTS}/${agentId}`,

  /**
   * Delete agent
   */
  delete: (agentId: string) => `${API_BASE.AGENTS}/${agentId}`,

  /**
   * Regenerate agent API key
   */
  regenerateKey: (agentId: string) => `${API_BASE.AGENTS}/${agentId}/regenerate-key`,

  /**
   * Get agent statistics
   */
  stats: (agentId: string) => `${API_BASE.AGENTS}/${agentId}/stats`,

  /**
   * Activate agent (set status to active)
   */
  activate: (agentId: string) => `${API_BASE.AGENTS}/${agentId}/activate`,

  /**
   * Deactivate agent (set status to disabled)
   */
  deactivate: (agentId: string) => `${API_BASE.AGENTS}/${agentId}/deactivate`,

  /**
   * Revoke agent (permanently revoke access)
   */
  revoke: (agentId: string) => `${API_BASE.AGENTS}/${agentId}/revoke`,

  /**
   * Get available capabilities for tenant
   * Returns unique capability names from all agents (tenant + platform) accessible to the tenant
   * @param includePlatform - Whether to include platform agents (default: true)
   */
  availableCapabilities: (includePlatform: boolean = true) =>
    `${API_BASE.AGENTS}/available-capabilities?include_platform=${includePlatform}`,

  // ============================================
  // AGENT ANALYTICS (Sessions & Daily Stats)
  // ============================================

  /**
   * List agent sessions
   */
  listSessions: (agentId: string, filters?: AgentSessionListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.AGENTS}/${agentId}/sessions${queryString}`
  },

  /**
   * Get active session for an agent
   */
  getActiveSession: (agentId: string) => `${API_BASE.AGENTS}/${agentId}/sessions/active`,

  /**
   * Get session stats for an agent
   */
  getSessionStats: (agentId: string, filters?: { started_at?: string; ended_at?: string }) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.AGENTS}/${agentId}/sessions/stats${queryString}`
  },

  /**
   * List daily stats for an agent
   */
  listDailyStats: (agentId: string, filters?: AgentDailyStatsListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.AGENTS}/${agentId}/stats/daily${queryString}`
  },

  /**
   * Get time series data for an agent
   */
  getTimeSeries: (agentId: string, filters?: { from?: string; to?: string }) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.AGENTS}/${agentId}/stats/timeseries${queryString}`
  },
} as const

// ============================================
// SCAN PROFILE ENDPOINTS
// ============================================

import type { ScanProfileListFilters } from './scan-profile-types'

/**
 * Scan profile endpoints for managing reusable scan configurations
 */
export const scanProfileEndpoints = {
  /**
   * List scan profiles with optional filters
   */
  list: (filters?: ScanProfileListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.SCAN_PROFILES}${queryString}`
  },

  /**
   * Get scan profile by ID
   */
  get: (profileId: string) => `${API_BASE.SCAN_PROFILES}/${profileId}`,

  /**
   * Get default scan profile for tenant
   */
  getDefault: () => `${API_BASE.SCAN_PROFILES}/default`,

  /**
   * Create a new scan profile
   */
  create: () => API_BASE.SCAN_PROFILES,

  /**
   * Update scan profile
   */
  update: (profileId: string) => `${API_BASE.SCAN_PROFILES}/${profileId}`,

  /**
   * Delete scan profile
   */
  delete: (profileId: string) => `${API_BASE.SCAN_PROFILES}/${profileId}`,

  /**
   * Set scan profile as default
   */
  setDefault: (profileId: string) => `${API_BASE.SCAN_PROFILES}/${profileId}/set-default`,

  /**
   * Clone a scan profile
   */
  clone: (profileId: string) => `${API_BASE.SCAN_PROFILES}/${profileId}/clone`,

  /**
   * Update quality gate configuration
   */
  updateQualityGate: (profileId: string) => `${API_BASE.SCAN_PROFILES}/${profileId}/quality-gate`,

  /**
   * Evaluate quality gate against finding counts
   */
  evaluateQualityGate: (profileId: string) =>
    `${API_BASE.SCAN_PROFILES}/${profileId}/evaluate-quality-gate`,
} as const

// ============================================
// SCANNER TEMPLATE ENDPOINTS
// ============================================

import type { ScannerTemplateListFilters } from './scanner-template-types'

/**
 * Scanner template endpoints for managing custom detection rules
 * Supports Nuclei (YAML), Semgrep (YAML), and Gitleaks (TOML) templates
 */
export const scannerTemplateEndpoints = {
  /**
   * List scanner templates with optional filters
   */
  list: (filters?: ScannerTemplateListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.SCANNER_TEMPLATES}${queryString}`
  },

  /**
   * Get scanner template by ID
   */
  get: (templateId: string) => `${API_BASE.SCANNER_TEMPLATES}/${templateId}`,

  /**
   * Create a new scanner template
   */
  create: () => API_BASE.SCANNER_TEMPLATES,

  /**
   * Update scanner template
   */
  update: (templateId: string) => `${API_BASE.SCANNER_TEMPLATES}/${templateId}`,

  /**
   * Delete scanner template
   */
  delete: (templateId: string) => `${API_BASE.SCANNER_TEMPLATES}/${templateId}`,

  /**
   * Validate template content before upload
   */
  validate: () => `${API_BASE.SCANNER_TEMPLATES}/validate`,

  /**
   * Download template content
   */
  download: (templateId: string) => `${API_BASE.SCANNER_TEMPLATES}/${templateId}/download`,

  /**
   * Deprecate template (mark as deprecated)
   */
  deprecate: (templateId: string) => `${API_BASE.SCANNER_TEMPLATES}/${templateId}/deprecate`,

  /**
   * Get template usage and quota information for the tenant
   */
  usage: () => `${API_BASE.SCANNER_TEMPLATES}/usage`,
} as const

// ============================================
// TOOL ENDPOINTS
// ============================================

import type {
  ToolListFilters,
  TenantToolConfigListFilters,
  ToolExecutionListFilters,
} from './tool-types'

/**
 * Tool endpoints for managing system-wide tool definitions
 */
export const toolEndpoints = {
  /**
   * List tools with optional filters
   */
  list: (filters?: ToolListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.TOOLS}${queryString}`
  },

  /**
   * Get tool by ID
   */
  get: (toolId: string) => `${API_BASE.TOOLS}/${toolId}`,

  /**
   * Get tool by name
   */
  getByName: (name: string) => `${API_BASE.TOOLS}/name/${name}`,

  /**
   * Create a new tool
   */
  create: () => API_BASE.TOOLS,

  /**
   * Update tool
   */
  update: (toolId: string) => `${API_BASE.TOOLS}/${toolId}`,

  /**
   * Delete tool
   */
  delete: (toolId: string) => `${API_BASE.TOOLS}/${toolId}`,

  /**
   * Activate tool
   */
  activate: (toolId: string) => `${API_BASE.TOOLS}/${toolId}/activate`,

  /**
   * Deactivate tool
   */
  deactivate: (toolId: string) => `${API_BASE.TOOLS}/${toolId}/deactivate`,

  /**
   * Check tool version
   */
  checkVersion: (toolId: string) => `${API_BASE.TOOLS}/${toolId}/check-version`,
} as const

/**
 * Platform tools endpoints (system-wide tools available to all tenants)
 * Platform tools are managed by admins and cannot be enabled/disabled by tenants
 */
export const platformToolEndpoints = {
  /**
   * List platform tools with optional filters
   */
  list: (filters?: ToolListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.PLATFORM_TOOLS}${queryString}`
  },
} as const

/**
 * Custom tools endpoints for tenant-specific custom tool definitions
 * Custom tools are created and managed by tenants
 */
export const customToolEndpoints = {
  /**
   * List custom tools with optional filters
   */
  list: (filters?: ToolListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.CUSTOM_TOOLS}${queryString}`
  },

  /**
   * Get custom tool by ID
   */
  get: (toolId: string) => `${API_BASE.CUSTOM_TOOLS}/${toolId}`,

  /**
   * Create a new custom tool
   */
  create: () => API_BASE.CUSTOM_TOOLS,

  /**
   * Update custom tool
   */
  update: (toolId: string) => `${API_BASE.CUSTOM_TOOLS}/${toolId}`,

  /**
   * Delete custom tool
   */
  delete: (toolId: string) => `${API_BASE.CUSTOM_TOOLS}/${toolId}`,

  /**
   * Activate custom tool
   */
  activate: (toolId: string) => `${API_BASE.CUSTOM_TOOLS}/${toolId}/activate`,

  /**
   * Deactivate custom tool
   */
  deactivate: (toolId: string) => `${API_BASE.CUSTOM_TOOLS}/${toolId}/deactivate`,
} as const

/**
 * Tenant tool config endpoints for tenant-specific tool configurations
 */
export const tenantToolEndpoints = {
  /**
   * List tenant tool configs
   */
  list: (filters?: TenantToolConfigListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.TENANT_TOOLS}${queryString}`
  },

  /**
   * Get tenant tool config by tool ID
   */
  get: (toolId: string) => `${API_BASE.TENANT_TOOLS}/${toolId}`,

  /**
   * Get tool with effective config (combines system tool + tenant config)
   */
  getWithConfig: (toolId: string) => `${API_BASE.TENANT_TOOLS}/${toolId}/with-config`,

  /**
   * Update tenant tool config
   */
  update: (toolId: string) => `${API_BASE.TENANT_TOOLS}/${toolId}`,

  /**
   * Delete tenant tool config (reset to defaults)
   */
  delete: (toolId: string) => `${API_BASE.TENANT_TOOLS}/${toolId}`,

  /**
   * Bulk enable tools for tenant
   */
  bulkEnable: () => `${API_BASE.TENANT_TOOLS}/bulk-enable`,

  /**
   * Bulk disable tools for tenant
   */
  bulkDisable: () => `${API_BASE.TENANT_TOOLS}/bulk-disable`,

  /**
   * List all tools with tenant-specific enabled status
   * Returns tools joined with tenant configs, where is_enabled defaults to true if no config exists
   */
  allTools: (filters?: ToolListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.TENANT_TOOLS}/all-tools${queryString}`
  },
} as const

/**
 * Tool stats and execution endpoints
 */
export const toolStatsEndpoints = {
  /**
   * Get stats for a specific tool
   */
  toolStats: (toolId: string) => `${API_BASE.TOOL_STATS}/${toolId}`,

  /**
   * Get tenant tool stats summary
   */
  tenantStats: () => `${API_BASE.TOOL_STATS}/tenant`,

  /**
   * List tool executions
   */
  executions: (filters?: ToolExecutionListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.TOOL_STATS}/executions${queryString}`
  },

  /**
   * Get tool execution by ID
   */
  execution: (executionId: string) => `${API_BASE.TOOL_STATS}/executions/${executionId}`,
} as const

// ============================================
// TOOL CATEGORY ENDPOINTS
// ============================================

import type { ToolCategoryListFilters } from './tool-category-types'

/**
 * Tool Category endpoints (read-only for platform + tenant custom)
 */
export const toolCategoryEndpoints = {
  /**
   * List all categories (platform + tenant custom, with pagination)
   */
  list: (filters?: ToolCategoryListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.TOOL_CATEGORIES}${queryString}`
  },

  /**
   * List all categories for dropdowns (no pagination)
   */
  all: () => `${API_BASE.TOOL_CATEGORIES}/all`,

  /**
   * Get category by ID
   */
  get: (categoryId: string) => `${API_BASE.TOOL_CATEGORIES}/${categoryId}`,
} as const

/**
 * Custom Tool Category endpoints (tenant custom categories management)
 */
export const customToolCategoryEndpoints = {
  /**
   * Create a new custom category
   */
  create: () => API_BASE.CUSTOM_TOOL_CATEGORIES,

  /**
   * Update a custom category
   */
  update: (categoryId: string) => `${API_BASE.CUSTOM_TOOL_CATEGORIES}/${categoryId}`,

  /**
   * Delete a custom category
   */
  delete: (categoryId: string) => `${API_BASE.CUSTOM_TOOL_CATEGORIES}/${categoryId}`,
} as const

// ============================================
// CAPABILITY ENDPOINTS
// ============================================

import type { CapabilityListFilters } from './capability-types'

/**
 * Capability endpoints (read-only for platform + tenant custom)
 */
export const capabilityEndpoints = {
  /**
   * List all capabilities (platform + tenant custom, with pagination)
   */
  list: (filters?: CapabilityListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.CAPABILITIES}${queryString}`
  },

  /**
   * List all capabilities for dropdowns (no pagination)
   */
  all: () => `${API_BASE.CAPABILITIES}/all`,

  /**
   * Get capability by ID
   */
  get: (capabilityId: string) => `${API_BASE.CAPABILITIES}/${capabilityId}`,

  /**
   * Get all capability categories (security, recon, analysis)
   */
  categories: () => `${API_BASE.CAPABILITIES}/categories`,

  /**
   * List capabilities by category
   */
  byCategory: (category: string) => `${API_BASE.CAPABILITIES}/by-category/${category}`,

  /**
   * Get usage stats for a single capability
   */
  usageStats: (capabilityId: string) => `${API_BASE.CAPABILITIES}/${capabilityId}/usage-stats`,

  /**
   * Get usage stats for multiple capabilities (batch)
   */
  usageStatsBatch: () => `${API_BASE.CAPABILITIES}/usage-stats`,
} as const

/**
 * Custom Capability endpoints (tenant custom capabilities management)
 */
export const customCapabilityEndpoints = {
  /**
   * Create a new custom capability
   */
  create: () => API_BASE.CUSTOM_CAPABILITIES,

  /**
   * Update a custom capability
   */
  update: (capabilityId: string) => `${API_BASE.CUSTOM_CAPABILITIES}/${capabilityId}`,

  /**
   * Delete a custom capability
   * @param force - Force delete even if capability is in use
   */
  delete: (capabilityId: string, force?: boolean) =>
    `${API_BASE.CUSTOM_CAPABILITIES}/${capabilityId}${force ? '?force=true' : ''}`,
} as const

// ============================================
// PIPELINE ENDPOINTS
// ============================================

import type { PipelineListFilters, PipelineRunListFilters } from './pipeline-types'
import type { WorkflowListFilters, WorkflowRunListFilters } from './workflow-types'

/**
 * Pipeline endpoints for managing workflow pipelines
 * Pipelines are templates for multi-step scan orchestration
 */
export const pipelineEndpoints = {
  /**
   * List pipelines with optional filters
   */
  list: (filters?: PipelineListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `/api/v1/pipelines${queryString}`
  },

  /**
   * Get pipeline by ID
   */
  get: (pipelineId: string) => `/api/v1/pipelines/${pipelineId}`,

  /**
   * Create a new pipeline
   */
  create: () => '/api/v1/pipelines',

  /**
   * Update pipeline
   */
  update: (pipelineId: string) => `/api/v1/pipelines/${pipelineId}`,

  /**
   * Delete pipeline
   */
  delete: (pipelineId: string) => `/api/v1/pipelines/${pipelineId}`,

  /**
   * Activate pipeline
   */
  activate: (pipelineId: string) => `/api/v1/pipelines/${pipelineId}/activate`,

  /**
   * Deactivate pipeline
   */
  deactivate: (pipelineId: string) => `/api/v1/pipelines/${pipelineId}/deactivate`,

  /**
   * Clone pipeline
   */
  clone: (pipelineId: string) => `/api/v1/pipelines/${pipelineId}/clone`,

  /**
   * Add step to pipeline
   */
  addStep: (pipelineId: string) => `/api/v1/pipelines/${pipelineId}/steps`,

  /**
   * Update step
   */
  updateStep: (pipelineId: string, stepId: string) =>
    `/api/v1/pipelines/${pipelineId}/steps/${stepId}`,

  /**
   * Delete step
   */
  deleteStep: (pipelineId: string, stepId: string) =>
    `/api/v1/pipelines/${pipelineId}/steps/${stepId}`,
} as const

/**
 * Pipeline Run endpoints
 */
export const pipelineRunEndpoints = {
  /**
   * List pipeline runs with optional filters
   */
  list: (filters?: PipelineRunListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `/api/v1/pipeline-runs${queryString}`
  },

  /**
   * Get pipeline run by ID
   */
  get: (runId: string) => `/api/v1/pipeline-runs/${runId}`,

  /**
   * Get step runs for a pipeline run
   */
  stepRuns: (runId: string) => `/api/v1/pipeline-runs/${runId}/steps`,

  /**
   * Trigger a new pipeline run
   * Note: Uses /api/v1/pipelines/{id}/runs endpoint
   */
  trigger: (pipelineId: string) => `/api/v1/pipelines/${pipelineId}/runs`,

  /**
   * Cancel a running pipeline
   */
  cancel: (runId: string) => `/api/v1/pipeline-runs/${runId}/cancel`,

  /**
   * Retry a failed pipeline run
   */
  retry: (runId: string) => `/api/v1/pipeline-runs/${runId}/retry`,
} as const

/**
 * Scan Management stats endpoint
 */
export const scanManagementEndpoints = {
  /**
   * Get overview stats (pipelines, scans, jobs)
   */
  stats: () => '/api/v1/scan-management/stats',

  /**
   * Quick scan targets
   */
  quickScan: () => '/api/v1/quick-scan',
} as const

// ============================================
// WORKFLOW ENDPOINTS (Automation Workflows)
// ============================================

/**
 * Workflow endpoints for managing automation workflows
 * Workflows are event-driven automation pipelines with visual graph builder
 */
export const workflowEndpoints = {
  /**
   * List workflows with optional filters
   */
  list: (filters?: WorkflowListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `/api/v1/workflows${queryString}`
  },

  /**
   * Get workflow by ID
   */
  get: (workflowId: string) => `/api/v1/workflows/${workflowId}`,

  /**
   * Create a new workflow
   */
  create: () => '/api/v1/workflows',

  /**
   * Update workflow
   */
  update: (workflowId: string) => `/api/v1/workflows/${workflowId}`,

  /**
   * Delete workflow
   */
  delete: (workflowId: string) => `/api/v1/workflows/${workflowId}`,

  /**
   * Update workflow graph (atomic replacement of all nodes and edges)
   */
  updateGraph: (workflowId: string) => `/api/v1/workflows/${workflowId}/graph`,

  /**
   * Add node to workflow
   */
  addNode: (workflowId: string) => `/api/v1/workflows/${workflowId}/nodes`,

  /**
   * Update node
   */
  updateNode: (workflowId: string, nodeId: string) =>
    `/api/v1/workflows/${workflowId}/nodes/${nodeId}`,

  /**
   * Delete node
   */
  deleteNode: (workflowId: string, nodeId: string) =>
    `/api/v1/workflows/${workflowId}/nodes/${nodeId}`,

  /**
   * Add edge to workflow
   */
  addEdge: (workflowId: string) => `/api/v1/workflows/${workflowId}/edges`,

  /**
   * Delete edge
   */
  deleteEdge: (workflowId: string, edgeId: string) =>
    `/api/v1/workflows/${workflowId}/edges/${edgeId}`,

  /**
   * Trigger workflow run
   */
  trigger: (workflowId: string) => `/api/v1/workflows/${workflowId}/runs`,
} as const

/**
 * Workflow Run endpoints
 */
export const workflowRunEndpoints = {
  /**
   * List workflow runs with optional filters
   */
  list: (filters?: WorkflowRunListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `/api/v1/workflow-runs${queryString}`
  },

  /**
   * Get workflow run by ID
   */
  get: (runId: string) => `/api/v1/workflow-runs/${runId}`,

  /**
   * Cancel a running workflow
   */
  cancel: (runId: string) => `/api/v1/workflow-runs/${runId}/cancel`,
} as const

// ============================================
// SCAN ENDPOINTS
// ============================================

import type { ScanConfigListFilters } from './scan-types'

/**
 * Scan endpoints for managing scans
 * Scans bind asset groups with scanners/workflows and schedules.
 */
export const scanEndpoints = {
  /**
   * List scans with optional filters
   */
  list: (filters?: ScanConfigListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.SCANS}${queryString}`
  },

  /**
   * Get scan by ID
   */
  get: (scanId: string) => `${API_BASE.SCANS}/${scanId}`,

  /**
   * Get scan stats
   */
  stats: () => `${API_BASE.SCANS}/stats`,

  /**
   * Create a new scan
   */
  create: () => API_BASE.SCANS,

  /**
   * Update scan
   */
  update: (scanId: string) => `${API_BASE.SCANS}/${scanId}`,

  /**
   * Delete scan
   */
  delete: (scanId: string) => `${API_BASE.SCANS}/${scanId}`,

  /**
   * Activate scan
   */
  activate: (scanId: string) => `${API_BASE.SCANS}/${scanId}/activate`,

  /**
   * Pause scan
   */
  pause: (scanId: string) => `${API_BASE.SCANS}/${scanId}/pause`,

  /**
   * Disable scan
   */
  disable: (scanId: string) => `${API_BASE.SCANS}/${scanId}/disable`,

  /**
   * Trigger scan execution
   */
  trigger: (scanId: string) => `${API_BASE.SCANS}/${scanId}/trigger`,

  /**
   * Clone scan
   */
  clone: (scanId: string) => `${API_BASE.SCANS}/${scanId}/clone`,

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Bulk activate scans
   */
  bulkActivate: () => `${API_BASE.SCANS}/bulk/activate`,

  /**
   * Bulk pause scans
   */
  bulkPause: () => `${API_BASE.SCANS}/bulk/pause`,

  /**
   * Bulk disable scans
   */
  bulkDisable: () => `${API_BASE.SCANS}/bulk/disable`,

  /**
   * Bulk delete scans
   */
  bulkDelete: () => `${API_BASE.SCANS}/bulk/delete`,

  /**
   * List runs for a scan
   */
  listRuns: (scanId: string, page?: number, perPage?: number) => {
    let url = `${API_BASE.SCANS}/${scanId}/runs`
    const params: string[] = []
    if (page) params.push(`page=${page}`)
    if (perPage) params.push(`per_page=${perPage}`)
    if (params.length > 0) url += `?${params.join('&')}`
    return url
  },

  /**
   * Get latest run for a scan
   */
  latestRun: (scanId: string) => `${API_BASE.SCANS}/${scanId}/runs/latest`,

  /**
   * Get specific run for a scan
   */
  getRun: (scanId: string, runId: string) => `${API_BASE.SCANS}/${scanId}/runs/${runId}`,
} as const

// ============================================
// EXPOSURE EVENT ENDPOINTS
// ============================================

import type { ExposureListFilters } from './exposure-types'

/**
 * Exposure Event endpoints for attack surface monitoring.
 * Exposures track non-CVE attack surface changes (port opens, misconfigs, etc.)
 */
export const exposureEndpoints = {
  /**
   * List exposures with optional filters
   */
  list: (filters?: ExposureListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.EXPOSURES}${queryString}`
  },

  /**
   * Get exposure by ID
   */
  get: (exposureId: string) => `${API_BASE.EXPOSURES}/${exposureId}`,

  /**
   * Get exposure statistics
   */
  stats: () => `${API_BASE.EXPOSURES}/stats`,

  /**
   * Create a new exposure event
   */
  create: () => API_BASE.EXPOSURES,

  /**
   * Delete exposure
   */
  delete: (exposureId: string) => `${API_BASE.EXPOSURES}/${exposureId}`,

  /**
   * Bulk ingest exposures
   */
  bulkIngest: () => `${API_BASE.EXPOSURES}/ingest`,

  /**
   * Resolve an exposure (mark as fixed)
   */
  resolve: (exposureId: string) => `${API_BASE.EXPOSURES}/${exposureId}/resolve`,

  /**
   * Accept an exposure (acknowledge risk)
   */
  accept: (exposureId: string) => `${API_BASE.EXPOSURES}/${exposureId}/accept`,

  /**
   * Mark exposure as false positive
   */
  markFalsePositive: (exposureId: string) => `${API_BASE.EXPOSURES}/${exposureId}/false-positive`,

  /**
   * Reactivate a resolved/accepted exposure
   */
  reactivate: (exposureId: string) => `${API_BASE.EXPOSURES}/${exposureId}/reactivate`,

  /**
   * Get exposure state change history
   */
  history: (exposureId: string) => `${API_BASE.EXPOSURES}/${exposureId}/history`,
} as const

// ============================================
// THREAT INTELLIGENCE ENDPOINTS
// ============================================

import type { ThreatIntelSource } from './threatintel-types'

/**
 * Threat Intelligence endpoints for EPSS and KEV data
 */
export const threatIntelEndpoints = {
  // ============================================
  // UNIFIED STATS
  // ============================================

  /**
   * Get unified threat intel stats (EPSS + KEV + sync status in one call)
   */
  stats: () => `${API_BASE.THREAT_INTEL}/stats`,

  // ============================================
  // SYNC STATUS
  // ============================================

  /**
   * Get sync status for all sources
   */
  syncStatuses: () => `${API_BASE.THREAT_INTEL}/sync`,

  /**
   * Get sync status for a specific source
   */
  syncStatus: (source: ThreatIntelSource) => `${API_BASE.THREAT_INTEL}/sync/${source}`,

  /**
   * Trigger sync for a source
   */
  triggerSync: (source: ThreatIntelSource) => `${API_BASE.THREAT_INTEL}/sync/${source}/trigger`,

  /**
   * Enable/disable sync for a source
   */
  setSyncEnabled: (source: ThreatIntelSource) => `${API_BASE.THREAT_INTEL}/sync/${source}/enabled`,

  // ============================================
  // CVE ENRICHMENT
  // ============================================

  /**
   * Enrich a single CVE with threat intel
   */
  enrichCVE: (cveId: string) => `${API_BASE.THREAT_INTEL}/enrich/${cveId}`,

  /**
   * Bulk enrich multiple CVEs
   */
  enrichCVEs: () => `${API_BASE.THREAT_INTEL}/enrich/bulk`,

  // ============================================
  // EPSS
  // ============================================

  /**
   * Get EPSS score for a CVE
   */
  epssScore: (cveId: string) => `${API_BASE.THREAT_INTEL}/epss/${cveId}`,

  /**
   * Get EPSS statistics
   */
  epssStats: () => `${API_BASE.THREAT_INTEL}/epss/stats`,

  // ============================================
  // KEV
  // ============================================

  /**
   * Get KEV entry for a CVE
   */
  kevEntry: (cveId: string) => `${API_BASE.THREAT_INTEL}/kev/${cveId}`,

  /**
   * Get KEV statistics
   */
  kevStats: () => `${API_BASE.THREAT_INTEL}/kev/stats`,
} as const

// ============================================
// INGEST ENDPOINTS
// ============================================

/**
 * Ingest endpoints for importing security data from various sources.
 */
export const ingestEndpoints = {
  /**
   * Ingest SARIF format data (Static Analysis Results Interchange Format)
   */
  sarif: () => `${API_BASE.AGENT_INGEST}/sarif`,

  /**
   * Ingest RIS format data (Rediver Ingest Schema)
   */
  ris: () => `${API_BASE.AGENT_INGEST}/ris`,
} as const

// ============================================
// PLATFORM AGENT ENDPOINTS
// ============================================

import type { PlatformAgentListFilters } from './platform-types'

/**
 * Platform agent endpoints for tiered platform agents
 * Supports three tiers: shared, dedicated, premium
 */
export const platformEndpoints = {
  /**
   * Get platform stats (usage, limits, tier stats)
   */
  stats: () => `${API_BASE.PLATFORM}/stats`,

  /**
   * List platform agents with optional filters
   */
  agents: (filters?: PlatformAgentListFilters) => {
    const queryString = filters ? buildQueryString(filters as Record<string, unknown>) : ''
    return `${API_BASE.PLATFORM}/agents${queryString}`
  },
} as const

// ============================================
// ENDPOINT COLLECTIONS
// ============================================

/**
 * All API endpoints grouped by resource
 */
export const endpoints = {
  auth: authEndpoints,
  users: userEndpoints,
  tenants: tenantEndpoints,
  invitations: invitationEndpoints,
  assets: assetEndpoints,
  projects: projectEndpoints,
  components: componentEndpoints,
  vulnerabilities: vulnerabilityEndpoints,
  findings: findingEndpoints,
  dashboard: dashboardEndpoints,
  auditLogs: auditLogEndpoints,
  agents: agentEndpoints,
  scanProfiles: scanProfileEndpoints,
  scannerTemplates: scannerTemplateEndpoints,
  tools: toolEndpoints,
  platformTools: platformToolEndpoints,
  customTools: customToolEndpoints,
  tenantTools: tenantToolEndpoints,
  toolStats: toolStatsEndpoints,
  pipelines: pipelineEndpoints,
  pipelineRuns: pipelineRunEndpoints,
  scanManagement: scanManagementEndpoints,
  scans: scanEndpoints,
  exposures: exposureEndpoints,
  threatIntel: threatIntelEndpoints,
  ingest: ingestEndpoints,
  workflows: workflowEndpoints,
  workflowRuns: workflowRunEndpoints,
  platform: platformEndpoints,
} as const

/**
 * Export individual collections for convenience
 */
export {
  authEndpoints as auth,
  userEndpoints as users,
  tenantEndpoints as tenants,
  invitationEndpoints as invitations,
  assetEndpoints as assets,
  projectEndpoints as projects,
  componentEndpoints as components,
  vulnerabilityEndpoints as vulnerabilities,
  findingEndpoints as findings,
  dashboardEndpoints as dashboard,
  auditLogEndpoints as auditLogs,
  agentEndpoints as agents,
  scanProfileEndpoints as scanProfiles,
  scannerTemplateEndpoints as scannerTemplates,
  toolEndpoints as tools,
  platformToolEndpoints as platformTools,
  customToolEndpoints as customTools,
  tenantToolEndpoints as tenantTools,
  toolStatsEndpoints as toolStats,
  pipelineEndpoints as pipelines,
  pipelineRunEndpoints as pipelineRuns,
  scanManagementEndpoints as scanManagement,
  scanEndpoints as scans,
  exposureEndpoints as exposures,
  threatIntelEndpoints as threatIntel,
  ingestEndpoints as ingest,
  workflowEndpoints as workflows,
  workflowRunEndpoints as workflowRuns,
  platformEndpoints as platform,
}
