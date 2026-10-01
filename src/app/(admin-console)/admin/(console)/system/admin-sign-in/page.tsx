'use client'

import { ShieldAlert } from 'lucide-react'
import { Main } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState, PageHeader } from '@/features/shared'
import { useAdmin } from '@/features/admin-console/components/admin-console-shell'
import { useAdminUsers } from '@/features/admin-console/api/use-admin-users'
import { usePlatformIdP } from '@/features/admin-console/api/use-platform-idp'
import { PlatformIdPForm } from '@/features/admin-console/components/platform-idp-form'
import { adminCan } from '@/features/admin-console/types'

/**
 * System -> Admin sign-in: the administrators' identity provider and the
 * "require IdP" policy (RFC-022 revision 4). Super admins only.
 */
export default function AdminSignInPage() {
  const me = useAdmin()
  const isSuper = adminCan(me.role, 'super_admin')
  const { data, error, isLoading, mutate } = usePlatformIdP(isSuper)
  const { data: admins } = useAdminUsers(1, isSuper)

  if (!isSuper) {
    return (
      <Main>
        <PageHeader title="Admin sign-in" />
        <EmptyState
          className="mt-5"
          icon={ShieldAlert}
          title="Super admin only"
          description="How administrators sign in is configured by super admins."
        />
      </Main>
    )
  }

  const hasBreakGlass = (admins?.data ?? []).some(
    (a) => a.is_break_glass && a.is_active && a.role === 'super_admin'
  )

  return (
    <Main>
      <PageHeader
        title="Admin sign-in"
        description="How administrators sign in to this console. Separate from organization sign-in."
      />
      <div className="mt-5">
        {error ? (
          <ErrorState title="admin sign-in" error={error} onRetry={() => void mutate()} />
        ) : isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <PlatformIdPForm idp={data} hasBreakGlass={hasBreakGlass} onSaved={() => void mutate()} />
        )}
      </div>
    </Main>
  )
}
