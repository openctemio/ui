/**
 * SSO Identity Provider Types
 *
 * Types for tenant-scoped SSO identity provider configuration
 */

// ============================================
// PROVIDER TYPES
// ============================================

export type SSOProviderType = 'entra_id' | 'okta' | 'google_workspace'

export const SSO_PROVIDERS: {
  value: SSOProviderType
  label: string
  description: string
}[] = [
  {
    value: 'entra_id',
    label: 'Microsoft Entra ID',
    description: 'Azure Active Directory / Microsoft 365',
  },
  {
    value: 'okta',
    label: 'Okta',
    description: 'Okta Identity Platform',
  },
  {
    value: 'google_workspace',
    label: 'Google Workspace',
    description: 'Google Cloud Identity',
  },
]

export function getProviderLabel(provider: SSOProviderType): string {
  return SSO_PROVIDERS.find((p) => p.value === provider)?.label ?? provider
}

// ============================================
// IDENTITY PROVIDER ENTITY
// ============================================

export interface IdentityProvider {
  id: string
  tenant_id: string
  provider: SSOProviderType
  display_name: string
  client_id: string
  issuer_url: string
  tenant_identifier: string
  scopes: string[]
  allowed_domains: string[]
  auto_provision: boolean
  default_role: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string
}

// ============================================
// PUBLIC SSO PROVIDER INFO (for login page)
// ============================================

export interface SSOProviderInfo {
  id: string
  provider: SSOProviderType
  display_name: string
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateIdentityProviderRequest {
  provider: SSOProviderType
  display_name: string
  client_id: string
  client_secret: string
  issuer_url?: string
  tenant_identifier?: string
  scopes?: string[]
  allowed_domains?: string[]
  auto_provision?: boolean
  default_role?: string
}

export interface UpdateIdentityProviderRequest {
  display_name?: string
  client_id?: string
  client_secret?: string
  issuer_url?: string
  tenant_identifier?: string
  scopes?: string[]
  allowed_domains?: string[]
  auto_provision?: boolean
  default_role?: string
  is_active?: boolean
}

export interface SSOAuthorizeResponse {
  authorization_url: string
  state: string
}

export interface SSOCallbackResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: {
    id: string
    email: string
    name: string
  }
  tenant_id: string
  tenant_slug: string
}

// ============================================
// DEFAULT ROLES
// ============================================

export const SSO_DEFAULT_ROLES = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
] as const
