'use client'

import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, PageHeader } from '@/features/shared'

/** One wording for every place that explains where SSO is configured. */
export const SSO_MANAGED_TITLE = 'SSO is configured by your platform administrator'
const ssoManagedText = (what: string) =>
  `${what} is set up for your organization in the platform administration console. To add or change it, contact your platform administrator.`

interface SsoManagedByPlatformProps {
  /** Page title, e.g. "SAML single sign-on". */
  title: string
  /** What the page used to configure, in one sentence. */
  what: string
}

/**
 * Shown on the tenant settings pages whose configuration moved to the
 * platform admin console (RFC-022): SSO and verified domains are set per
 * organization by a platform administrator. These routes used to redirect
 * into the admin console, which put a tenant owner on a sign-in page for an
 * account they do not have.
 */
export function SsoManagedByPlatform({ title, what }: SsoManagedByPlatformProps) {
  return (
    <Main>
      <PageHeader title={title} />
      <div className="mt-5">
        <EmptyState
          icon={ShieldCheck}
          title={SSO_MANAGED_TITLE}
          description={ssoManagedText(what)}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/authentication">Authentication settings</Link>
            </Button>
          }
        />
      </div>
    </Main>
  )
}

/**
 * The same explanation as a card, for Settings › Access › Authentication:
 * that page holds the tenant's own sign-in rules, and this says where SSO
 * (SAML/OIDC providers, verified domains, enforcement) is set instead.
 */
export function SsoManagedNotice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          Single sign-on
        </CardTitle>
        <CardDescription>
          {SSO_MANAGED_TITLE}.{' '}
          {ssoManagedText('Single sign-on (SAML or OIDC), with verified domains,')}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
