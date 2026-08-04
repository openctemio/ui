/**
 * Credential-leak API types.
 *
 * The wire shapes are GENERATED from the API's OpenAPI spec — see
 * src/lib/api/generated. Nothing here restates a field the server declares.
 *
 * Two shapes are still hand-written, and the reason is worth recording: the
 * handlers for GET /credentials/stats and GET /credentials/enums return
 * `map[string]any`, so the spec describes them only as "an object". There is
 * nothing to generate. They are marked below; typing them properly means giving
 * those two handlers real response structs on the server.
 */
import type {
  CredentialItem,
  CredentialListResult,
  IdentityExposure,
  IdentityListResult,
} from '@/lib/api/generated'

export type ApiCredential = CredentialItem
export type ApiCredentialListResponse = CredentialListResult
export type ApiIdentityListResponse = IdentityListResult

/**
 * Two things the hand-written version got wrong, both now fixed by generation:
 *
 *  • it declared `exposures?: ApiCredential[]`, which the identity endpoint does
 *    not return — the per-identity credential list comes from
 *    GET /credentials/identities/{identity}/exposures instead;
 *  • it narrowed `identity_type` to 'email' | 'username' | 'identifier', while
 *    the server declares a plain string and documents only "username" or
 *    "email".
 */
export type ApiIdentityExposure = IdentityExposure

/** NOT GENERATED — GET /credentials/stats returns map[string]any. */
export interface ApiCredentialStats {
  total: number
  by_state: Record<string, number>
  by_severity: Record<string, number>
}

/** NOT GENERATED — GET /credentials/enums returns map[string]any. */
export interface ApiCredentialEnums {
  credential_types: string[]
  source_types: string[]
  classifications: string[]
  dedup_strategies: string[]
  severities: string[]
}

/** Query filters — a UI concern, not part of any response body. */
export interface CredentialApiFilters {
  page?: number
  page_size?: number
  severity?: string[]
  state?: string[]
  source?: string[]
  search?: string
  sort?: string
}

/** Request body for the state-change endpoints. */
export interface UpdateCredentialStateInput {
  state: 'active' | 'resolved' | 'accepted' | 'false_positive'
  notes?: string
}
