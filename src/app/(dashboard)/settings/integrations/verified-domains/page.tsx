'use client'

import { ShieldAlert, ShieldCheck } from 'lucide-react'

import { Main } from '@/components/layout/main'
import { EmptyState } from '@/features/shared/components/empty-state'
import { PageHeader } from '@/features/shared/components/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Can, Permission } from '@/lib/permissions'
import {
  AddDomainDialog,
  VerifiedDomainsList,
  useVerifiedDomains,
} from '@/features/verified-domains'

const DESCRIPTION =
  'Prove you own an email domain (via a DNS TXT record) so SSO auto-join can be safely limited to people at domains you control.'

function VerifiedDomainsContent() {
  const { data, isLoading, mutate } = useVerifiedDomains()
  const refresh = () => void mutate()

  return (
    <>
      <PageHeader title="Verified Domains" description={DESCRIPTION}>
        <AddDomainDialog onAdded={refresh} />
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
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
    </>
  )
}

export default function VerifiedDomainsPage() {
  return (
    <Main>
      <Can
        permission={Permission.TeamUpdate}
        fallback={
          <>
            <PageHeader title="Verified Domains" description={DESCRIPTION} />
            <EmptyState
              icon={ShieldAlert}
              title="Admin access required"
              description="Only tenant admins can manage verified domains."
            />
          </>
        }
      >
        <VerifiedDomainsContent />
      </Can>
    </Main>
  )
}
