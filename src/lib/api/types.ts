/**
 * API Types & Interfaces
 *
 * Type definitions for Rediver API requests and responses
 */

// ============================================
// COMMON TYPES
// ============================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
}

/**
 * API error structure
 */
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  statusCode?: number
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * API request options
 */
export interface ApiRequestOptions extends RequestInit {
  /**
   * Skip auth header injection
   */
  skipAuth?: boolean

  /**
   * Custom base URL (override default)
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds
   */
  timeout?: number

  /**
   * Retry failed requests
   */
  retry?: {
    count: number
    delay: number
  }

  /**
   * Internal: Skip automatic token refresh on 401
   * Used to prevent infinite retry loops
   */
  _skipRefreshRetry?: boolean
}

// ============================================
// USER TYPES
// ============================================

/**
 * User entity from backend
 */
export interface User {
  id: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  avatar?: string
  roles: string[]
  emailVerified: boolean
  authProvider?: 'local' | 'google' | 'github' | 'microsoft'
  createdAt: string
  updatedAt: string
}

/**
 * Create user request
 */
export interface CreateUserRequest {
  email: string
  name: string
  password: string
  roles?: string[]
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  name?: string
  firstName?: string
  lastName?: string
  avatar?: string
  roles?: string[]
}

/**
 * User list filters
 */
export interface UserListFilters {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  sortBy?: 'name' | 'email' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

// ============================================
// TENANT TYPES
// ============================================

/**
 * Tenant/Team entity
 */
export interface Tenant {
  id: string
  name: string
  slug: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

/**
 * Tenant member
 */
export interface TenantMember {
  id: string
  userId: string
  tenantId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  user: User
  joinedAt: string
}

/**
 * Tenant invitation
 */
export interface TenantInvitation {
  id: string
  email: string
  tenantId: string
  role: 'admin' | 'member' | 'viewer'
  invitedBy: string
  expiresAt: string
  createdAt: string
}

// ============================================
// VULNERABILITY TYPES
// ============================================

/**
 * Vulnerability entity (CVE database)
 */
export interface Vulnerability {
  id: string
  cveId: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  cvssScore?: number
  cvssVector?: string
  cweId?: string
  publishedAt?: string
  modifiedAt?: string
  references?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Finding entity (tenant-scoped vulnerability instance)
 */
export interface Finding {
  id: string
  tenantId: string
  vulnerabilityId: string
  vulnerability?: Vulnerability
  projectId?: string
  componentId?: string
  status: 'open' | 'in_progress' | 'resolved' | 'false_positive' | 'risk_accepted'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  title: string
  description?: string
  remediation?: string
  dueDate?: string
  assigneeId?: string
  assignee?: User
  foundAt: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

// ============================================
// PROJECT TYPES
// ============================================

/**
 * Project entity (tenant-scoped)
 */
export interface Project {
  id: string
  tenantId: string
  name: string
  description?: string
  repositoryUrl?: string
  defaultBranch?: string
  language?: string
  createdAt: string
  updatedAt: string
}

// ============================================
// COMPONENT TYPES
// ============================================

/**
 * Component entity (dependency/package)
 */
export interface Component {
  id: string
  tenantId: string
  projectId?: string
  name: string
  version: string
  type: 'library' | 'framework' | 'application' | 'container' | 'os'
  purl?: string // Package URL
  license?: string
  createdAt: string
  updatedAt: string
}

// ============================================
// ASSET TYPES
// ============================================

/**
 * Asset entity (global resource)
 */
export interface Asset {
  id: string
  name: string
  type: 'server' | 'workstation' | 'network_device' | 'cloud_resource' | 'container' | 'application'
  hostname?: string
  ipAddresses?: string[]
  operatingSystem?: string
  owner?: string
  criticality?: 'critical' | 'high' | 'medium' | 'low'
  status: 'active' | 'inactive' | 'decommissioned'
  createdAt: string
  updatedAt: string
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Validation error from backend
 */
export interface ValidationError {
  field: string
  message: string
  code: string
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse {
  errors: ValidationError[]
  message: string
}

// ============================================
// SEARCH & FILTER TYPES
// ============================================

/**
 * Common search filters
 */
export interface SearchFilters {
  query?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, unknown>
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string
  order: 'asc' | 'desc'
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Extract data type from ApiResponse
 */
export type UnwrapApiResponse<T> = T extends ApiResponse<infer U> ? U : never

/**
 * Make all properties optional except specified
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

/**
 * Request with required auth
 */
export type AuthenticatedRequest<T = unknown> = T & {
  userId: string
}
