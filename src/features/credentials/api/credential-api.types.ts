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

/**
 * NOT YET GENERATED — openctemio/api#591 changes CredentialItem: it drops
 * `secret_value` (reads never carry the plaintext) and adds the three fields
 * below. The vendored spec is re-vendored from api's develop by the Sync API
 * spec workflow once #591 merges; this intersection then adds nothing and can
 * go, and `secret_value` disappears from the generated type.
 */
export type ApiCredential = CredentialItem & {
  /** A secret was stored for this credential. */
  has_secret?: boolean
  /** Display-safe mask of the secret. */
  secret_masked?: string
  /** HMAC of the secret keyed from the platform key: equal = same secret. */
  secret_fingerprint?: string
}

/**
 * NOT YET GENERATED — POST /credentials/{id}/reveal (openctemio/api#591):
 * the plaintext secret, returned only to holders of
 * findings:credentials:reveal and audited server-side.
 */
export interface ApiRevealCredentialResponse {
  id: string
  secret_value: string
}
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
