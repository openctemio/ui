/**
 * API Key types — mirror the backend /api/v1/api-keys contract.
 */

export interface APIKey {
  id: string
  name: string
  description?: string
  key_prefix: string
  scopes: string[]
  rate_limit: number
  status: string // active | revoked | expired
  expires_at?: string
  last_used_at?: string
  last_used_ip?: string
  use_count: number
  created_at: string
  updated_at: string
  revoked_at?: string
}

export interface CreateAPIKeyRequest {
  name: string
  description?: string
  scopes: string[]
  rate_limit?: number
  expires_in_days?: number
}

/** Create returns the plaintext key exactly once. */
export interface CreateAPIKeyResponse extends APIKey {
  key: string
}
