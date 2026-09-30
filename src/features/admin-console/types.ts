/**
 * Platform admin console types (RFC-022). The console talks only to
 * /api/v1/admin/* through its own proxy; nothing here is tenant-scoped.
 */

export type AdminRole = 'super_admin' | 'ops_admin' | 'readonly'

export interface AdminIdentity {
  id: string
  email: string
  name: string
  role: AdminRole
}

export type AdminLoginStatus = 'mfa_required' | 'mfa_enrollment_required'

export interface AdminLoginResult {
  status: AdminLoginStatus
  /** Only for mfa_enrollment_required. */
  otpauth_uri?: string
  secret?: string
}

export interface AdminOrganization {
  id: string
  name: string
  slug: string
  description?: string
  created_at: string
  active_members: number
  owner_emails: string[]
  saml_enabled: boolean
  active_identity_providers: number
  verified_domains: number
  sso_enforced: boolean
}

export interface AdminOrganizationList {
  data: AdminOrganization[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface CreateOrganizationInput {
  name: string
  slug: string
  description?: string
  owner_email: string
}

/** super_admin > ops_admin > readonly. */
export function adminCan(role: AdminRole | undefined, needed: AdminRole): boolean {
  const rank: Record<AdminRole, number> = { readonly: 0, ops_admin: 1, super_admin: 2 }
  return role !== undefined && rank[role] >= rank[needed]
}

export interface AdminUserRecord {
  id: string
  email: string
  name: string
  role: AdminRole
  is_active: boolean
  last_used_at?: string
  last_used_ip?: string
  created_at: string
  updated_at: string
}

export interface Paged<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface AdminAuditEntry {
  id: string
  admin_id?: string
  admin_email: string
  action: string
  resource_type?: string
  resource_id?: string
  resource_name?: string
  request_method?: string
  request_path?: string
  response_status?: number
  ip_address?: string
  success: boolean
  error_message?: string
  created_at: string
}
