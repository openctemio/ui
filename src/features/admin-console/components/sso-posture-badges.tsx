import { Badge } from '@/components/ui/badge'
import type { AdminOrganization } from '../types'

/** Compact SSO posture of an organization: what is configured and enforced. */
export function SSOPostureBadges({ org }: { org: AdminOrganization }) {
  const parts = [
    org.saml_enabled && 'SAML',
    org.active_identity_providers > 0 &&
      `${org.active_identity_providers} OIDC provider${org.active_identity_providers === 1 ? '' : 's'}`,
  ].filter(Boolean) as string[]

  if (parts.length === 0) {
    return <span className="text-sm text-muted-foreground">Not configured</span>
  }
  return (
    <span className="flex flex-wrap gap-1">
      {parts.map((p) => (
        <Badge key={p} variant="secondary" className="font-normal">
          {p}
        </Badge>
      ))}
      {org.sso_enforced && <Badge className="font-normal">Enforced</Badge>}
    </span>
  )
}
