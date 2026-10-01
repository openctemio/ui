'use client'

import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { EmptyState, PageHeader } from '@/features/shared'

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
          title="SSO is configured by your platform administrator"
          description={`${what} is set up for your organization in the platform administration console. To add or change it, contact your platform administrator.`}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/integrations">Back to integrations</Link>
            </Button>
          }
        />
      </div>
    </Main>
  )
}
