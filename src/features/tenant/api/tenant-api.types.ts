/**
 * Tenant API Types
 *
 * Type definitions for tenant/team API requests and responses
 */

import type { TenantPlan, TenantRole } from '@/lib/api/user-tenant-types'

/**
 * Tenant entity from API
 */
export interface ApiTenant {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  plan: TenantPlan
  created_at: string
  updated_at: string
}

/**
 * Tenant with membership info
 */
export interface ApiTenantWithMembership extends ApiTenant {
  role: TenantRole
  joined_at: string
}

/**
 * Create tenant request body
 */
export interface CreateTenantRequest {
  name: string
  slug: string
  description?: string
}

/**
 * Create tenant response
 */
export interface CreateTenantResponse {
  id: string
  name: string
  slug: string
  description?: string
  plan: TenantPlan
  created_at: string
}

/**
 * Check slug availability response
 */
export interface CheckSlugResponse {
  available: boolean
  suggestion?: string
}
