/** SAML 2.0 SP configuration (RFC-009) — mirrors the API samlConfigView. */
export interface SamlConfig {
  idp_entity_id: string
  idp_sso_url: string
  idp_certificate: string
  allowed_domains: string[]
  default_role: string
  auto_provision: boolean
  enabled: boolean
}

/** A blank config for the "not configured yet" form state. */
export const emptySamlConfig: SamlConfig = {
  idp_entity_id: '',
  idp_sso_url: '',
  idp_certificate: '',
  allowed_domains: [],
  default_role: 'member',
  auto_provision: true,
  enabled: false,
}
