'use client'

import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Main } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfile } from '@/features/account/api/use-profile'
import { PageHeader } from './page-header'
import { EmptyState } from './empty-state'

interface PlatformAdminGateProps {
  /** Page title shown in the access-denied header (matches the gated page). */
  title: string
  /** Page description shown in the access-denied header. */
  description?: string
  children: ReactNode
}

/**
 * Restricts a page to application (platform) administrators.
 *
 * SSO setup (SAML, identity providers, verified domains, SCIM) is an
 * application-administrator operation — modeled on Tenable Security Center's
 * system-level Configuration — so it is hidden from tenant owners/admins. This
 * is a UX guard only; the API is the authority (RequirePlatformAdmin) and the
 * gated routes 403 regardless of what the UI shows.
 *
 * The `is_platform_admin` flag comes from `GET /users/me` (shared, warm SWR
 * key), so this adds no extra request in practice.
 */
export function PlatformAdminGate({ title, description, children }: PlatformAdminGateProps) {
  const { profile, isLoading } = useProfile()

  if (isLoading) {
    return (
      <Main>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Main>
    )
  }

  if (!profile?.is_platform_admin) {
    return (
      <Main>
        <PageHeader title={title} description={description} />
        <div className="mt-5">
          <EmptyState
            card
            icon={ShieldAlert}
            title="Application administrator only"
            description="Single sign-on is configured by your application administrator. Contact them to set up or change SSO for this organization."
          />
        </div>
      </Main>
    )
  }

  return <>{children}</>
}
