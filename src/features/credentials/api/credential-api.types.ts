/**
 * Credential Leak API Types
 *
 * Types for credential leak data from the backend API
 */

// API Response Types
export interface ApiCredential {
  id: string
  identifier: string
  credential_type: string
  secret_value?: string
  source: string
  severity: string
  state: string
  first_seen_at: string
  last_seen_at: string
  is_verified: boolean
  is_revoked: boolean
  details?: Record<string, unknown>
}

export interface ApiCredentialListResponse {
  items: ApiCredential[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApiCredentialStats {
  total: number
  by_state: Record<string, number>
  by_severity: Record<string, number>
}

// Filter Types
export interface CredentialApiFilters {
  page?: number
  page_size?: number
  severity?: string[]
  state?: string[]
  source?: string[]
  search?: string
  sort?: string
}

// Enum Types
export interface ApiCredentialEnums {
  credential_types: string[]
  source_types: string[]
  classifications: string[]
  dedup_strategies: string[]
  severities: string[]
}

// Update State Input
export interface UpdateCredentialStateInput {
  state: 'active' | 'resolved' | 'accepted' | 'false_positive'
  notes?: string
}

// Identity Exposure (grouped credentials by identity)
export interface ApiIdentityExposure {
  identity: string
  identity_type: 'email' | 'username' | 'identifier'
  exposure_count: number
  sources: string[]
  credential_types: string[]
  highest_severity: string
  states: Record<string, number>
  first_seen_at: string
  last_seen_at: string
  exposures?: ApiCredential[]
}

export interface ApiIdentityListResponse {
  items: ApiIdentityExposure[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
