'use client'

import { ShieldCheck } from 'lucide-react'

import { Main } from '@/components/layout/main'
import { EmptyState } from '@/features/shared/components/empty-state'
import { ErrorState } from '@/features/shared/components/error-state'
import { PageHeader } from '@/features/shared/components/page-header'
import { PlatformAdminGate } from '@/features/shared/components/platform-admin-gate'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AddDomainDialog,
  VerifiedDomainsList,
  useVerifiedDomains,
} from '@/features/verified-domains'

const DESCRIPTION =
  'Prove you own an email domain with a DNS TXT record, so SSO auto-join is limited to domains you control.'

function VerifiedDomainsContent() {
  const { data, error, isLoading, mutate } = useVerifiedDomains()
  const refresh = () => void mutate()

  return (
    <>
      <PageHeader title="Verified domains" description={DESCRIPTION}>
        <AddDomainDialog onAdded={refresh} />
      </PageHeader>

      <div className="mt-5">
        {error ? (
          // Verified domains gate SSO auto-join, so a false "none verified" invites a
          // wrong conclusion about who can join this tenant. Show the failure instead.
          <ErrorState title="verified domains" error={error} onRetry={refresh} />
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No verified domains yet"
            description="Verified domains gate SSO auto-join to people whose email is at a domain you own. Add a domain and publish the DNS TXT record to prove ownership."
            action={<AddDomainDialog onAdded={refresh} />}
          />
        ) : (
          <VerifiedDomainsList domains={data} onChanged={refresh} />
        )}
      </div>
    </>
  )
}

export default function VerifiedDomainsPage() {
  return (
    <PlatformAdminGate title="Verified domains" description={DESCRIPTION}>
      <Main>
        <VerifiedDomainsContent />
      </Main>
    </PlatformAdminGate>
  )
}
