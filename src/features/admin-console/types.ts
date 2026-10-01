/**
 * Platform admin console types (RFC-022). The console talks only to
 * /api/v1/admin/* through its own proxy; nothing here is tenant-scoped.
 */

import type { SetupLinkOutcome } from '@/features/shared/components/one-time-setup-link'

export type AdminRole = 'super_admin' | 'ops_admin' | 'readonly'

export interface AdminIdentity {
  id: string
  email: string
  name: string
  role: AdminRole
  /** How this console session was opened. */
  auth_method?: 'password' | 'idp'
  /** Emergency-access (break-glass) administrator: every sign-in is alerted. */
  is_break_glass?: boolean
  /** The session may only change the temporary password. */
  password_change_required?: boolean
}

export type AdminLoginStatus = 'mfa_required' | 'mfa_enrollment_required'

/** Outcome of the identity-provider callback. */
export interface AdminIdPCallbackResult {
  /** signed_in: the IdP's MFA was trusted and the console session is open. */
  status: AdminLoginStatus | 'signed_in'
  otpauth_uri?: string
  secret?: string
  admin?: AdminIdentity
}

/** What the console sign-in page may know about the administrators' IdP. */
export interface AdminIdPInfo {
  enabled: boolean
  display_name?: string
}

/** The administrators' identity provider (RFC-022 revision 4). */
export interface PlatformIdP {
  configured: boolean
  enabled: boolean
  display_name?: string
  issuer?: string
  client_id?: string
  /** The secret itself is write-only and never returned. */
  has_client_secret: boolean
  redirect_uri?: string
  scopes?: string[]
  require_idp: boolean
  trusted_acr_values: string[]
  trusted_amr_values: string[]
  authorization_endpoint?: string
  token_endpoint?: string
  jwks_uri?: string
  token_endpoint_auth_method?: string
  updated_at?: string
}

export interface PlatformIdPInput {
  enabled: boolean
  display_name: string
  issuer: string
  client_id: string
  /** Empty keeps the stored secret. */
  client_secret?: string
  redirect_uri: string
  scopes?: string[]
  require_idp: boolean
  trusted_acr_values?: string[]
  trusted_amr_values?: string[]
}

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
  /** May be someone without an account yet: the API creates it. */
  owner_email: string
  /** Name for a newly created owner account. */
  owner_name?: string
}

/**
 * POST /admin/tenants response. `owner_setup` is present when the owner's
 * account was created by this call; its `setup_token` (no email sent) is shown
 * once and never stored.
 */
export interface CreatedOrganization extends AdminOrganization {
  owner_setup?: SetupLinkOutcome
}

/** Membership level an admin can give someone they add to an organization. */
export type AdminOrgUserRole = 'admin' | 'member' | 'viewer'

export interface AdminOrganizationUser {
  user_id: string
  email: string
  name: string
  /** owner | admin | member | viewer */
  role: string
  status: string
  pending_setup: boolean
  joined_at: string
}

export interface AdminOrganizationUserList {
  data: AdminOrganizationUser[]
  total: number
}

export interface AdminCreateOrganizationUserInput {
  email: string
  name: string
  role: AdminOrgUserRole
}

/** Same shape as the tenant-side create-user response. */
export interface AdminCreatedOrganizationUser extends SetupLinkOutcome {
  user: { id: string; email: string; name: string }
  membership_id: string
  role: string
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
  is_break_glass: boolean
  break_glass_tested_at?: string
  break_glass_test_overdue: boolean
  password_change_required: boolean
  idp_bound: boolean
  idp_bound_at?: string
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

/** Scanner target type -> asset type (GET /admin/target-mappings). */
export interface TargetMapping {
  id: string
  target_type: string
  asset_type: string
  /** Lower sorts first; 10 is the primary mapping. */
  priority: number
  is_active: boolean
  is_primary: boolean
  description?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface TargetMappingStats {
  total: number
  by_target_type: Record<string, number>
  by_asset_type: Record<string, number>
  active_count: number
  inactive_count: number
}

export interface CreateTargetMappingInput {
  target_type: string
  asset_type: string
  priority?: number
  is_active?: boolean
  description?: string
}

/** The pair (target type, asset type) cannot change after creation. */
export interface UpdateTargetMappingInput {
  priority?: number
  is_active?: boolean
  description?: string
}
