/**
 * Verified Domains types.
 *
 * A verified domain is a DNS-TXT proof that a tenant owns an email domain.
 * Once verified, email-domain SSO auto-join can be safely gated to people
 * whose address is at a domain the tenant controls.
 *
 * Backend: /api/v1/settings/verified-domains (RequireAdmin, tenant-scoped).
 */

export type VerifiedDomainStatus = 'pending' | 'verified' | 'failed'

/** The DNS TXT record the admin must publish to prove ownership. */
export interface VerifiedDomainInstructions {
  /** FQDN the TXT record lives at, e.g. `_openctem-verify.acme.com`. */
  host: string
  /** Record type — always `TXT` today. */
  type: string
  /** The TXT value, e.g. `openctem-domain-verification=<token>`. */
  value: string
}

export interface VerifiedDomain {
  id: string
  domain: string
  status: VerifiedDomainStatus
  /** Present while the domain is unverified so the record can be (re)copied. */
  instructions?: VerifiedDomainInstructions
  verified_at?: string | null
  last_checked_at?: string | null
  created_at: string
  updated_at?: string
}

/** GET list response is wrapped in a `verified_domains` envelope. */
export interface VerifiedDomainListResponse {
  verified_domains: VerifiedDomain[]
}

export interface CreateVerifiedDomainRequest {
  domain: string
}
