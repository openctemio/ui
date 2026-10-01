import { Badge } from '@/components/ui/badge'

import type { MemberMfaStatus } from '../types/member.types'

/** Two-factor status of a member, as shown to owners and admins. */
export function MemberMfaBadge({ status }: { status?: MemberMfaStatus }) {
  switch (status) {
    case 'enabled':
      return (
        <Badge variant="outline" className="border-success/40 text-success">
          On
        </Badge>
      )
    case 'disabled':
      return <Badge variant="outline">Off</Badge>
    case 'idp':
      return (
        <span className="text-sm text-muted-foreground" title="Handled by the identity provider">
          Via SSO
        </span>
      )
    default:
      return <span className="text-sm text-muted-foreground">—</span>
  }
}
