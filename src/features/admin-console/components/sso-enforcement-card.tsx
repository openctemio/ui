'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { setSSOEnforcement } from '../api/use-admin-organizations'
import { AdminApiError } from '../api/admin-client'
import type { AdminOrganization } from '../types'

interface SSOEnforcementCardProps {
  org: AdminOrganization
  canManage: boolean
  onChanged: () => void
}

/**
 * Require members of the organization to sign in with SSO. The API refuses
 * to enable it without a usable SSO path, and the owner can always sign in
 * with a password (break-glass), so this can never lock everyone out.
 */
export function SSOEnforcementCard({ org, canManage, onChanged }: SSOEnforcementCardProps) {
  const [busy, setBusy] = useState(false)
  const hasSSO = org.saml_enabled || org.active_identity_providers > 0

  const toggle = async (enforced: boolean) => {
    setBusy(true)
    try {
      await setSSOEnforcement(org.id, enforced)
      toast.success(enforced ? 'SSO sign-in is now required' : 'Password sign-in is allowed again')
      onChanged()
    } catch (e) {
      toast.error(e instanceof AdminApiError ? e.message : 'Could not change SSO enforcement')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Require single sign-on</CardTitle>
        <CardDescription>
          Members must sign in through the organization&apos;s identity provider. The owner can
          still use a password, so the organization is never locked out.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <div className="text-sm">
            <p className="font-medium">{org.sso_enforced ? 'Required' : 'Not required'}</p>
            {!hasSSO && !org.sso_enforced && (
              <p className="text-muted-foreground">Configure SAML or an OIDC provider first.</p>
            )}
          </div>
          <Switch
            checked={org.sso_enforced}
            disabled={!canManage || busy || (!hasSSO && !org.sso_enforced)}
            onCheckedChange={(v) => void toggle(v)}
            aria-label="Require single sign-on"
          />
        </div>
      </CardContent>
    </Card>
  )
}
