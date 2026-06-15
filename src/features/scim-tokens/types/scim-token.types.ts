/**
 * SCIM token types — mirror the backend /api/v1/scim-tokens contract (RFC-009).
 */

export interface ScimToken {
  id: string
  name: string
  prefix: string
  status: string // active | revoked
  created_at: string
  last_used_at?: string
}

export interface CreateScimTokenRequest {
  name: string
}

/** Create returns the plaintext token exactly once. */
export interface CreateScimTokenResponse {
  id: string
  name: string
  prefix: string
  token: string
  created_at: string
  endpoint: string
}

export interface ScimTokenListResponse {
  tokens: ScimToken[]
}
