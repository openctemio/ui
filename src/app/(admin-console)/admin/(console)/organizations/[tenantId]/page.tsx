'use client'

import { use } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DetailField,
  DetailFieldGrid,
  ErrorState,
  PageHeader,
  RelativeTime,
} from '@/features/shared'
import { useOrganization } from '@/features/admin-console/api/use-admin-organizations'
import { useAdmin } from '@/features/admin-console/components/admin-console-shell'
import { SSOEnforcementCard } from '@/features/admin-console/components/sso-enforcement-card'
import { SSOPostureBadges } from '@/features/admin-console/components/sso-posture-badges'
import { adminCan } from '@/features/admin-console/types'
import { SamlConfigForm } from '@/features/saml/components/saml-config-form'
import { IdentityProvidersPanel } from '@/features/sso/components/identity-providers-panel'
import {
  AddDomainDialog,
  VerifiedDomainsList,
  useVerifiedDomains,
} from '@/features/verified-domains'

function VerifiedDomainsSection({ tenantId, canManage }: { tenantId: string; canManage: boolean }) {
  const { data, error, isLoading, mutate } = useVerifiedDomains(tenantId)
  const refresh = () => void mutate()
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Verified domains</CardTitle>
          <p className="text-sm text-muted-foreground">
            SSO auto-join only admits people whose email is at a domain the organization has proven
            it owns (DNS TXT record).
          </p>
        </div>
        {canManage && <AddDomainDialog tenantId={tenantId} onAdded={refresh} />}
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState title="verified domains" error={error} onRetry={refresh} />
        ) : isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <VerifiedDomainsList
            tenantId={tenantId}
            domains={data ?? []}
            onChanged={refresh}
            canManage={canManage}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminOrganizationPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = use(params)
  const admin = useAdmin()
  // SSO decides who can sign in to the organization: super admins only.
  const canManageSSO = adminCan(admin.role, 'super_admin')
  const { data: org, error, isLoading, mutate } = useOrganization(tenantId)
  const refresh = () => void mutate()

  return (
    <Main>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ms-2">
        <Link href="/admin/organizations">
          <ChevronLeft className="me-1 size-4" />
          Organizations
        </Link>
      </Button>

      {error ? (
        <ErrorState title="the organization" error={error} onRetry={refresh} />
      ) : isLoading || !org ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          <PageHeader
            title={org.name}
            description={org.description || `Organization ${org.slug}`}
          />
          <Tabs defaultValue="overview" className="mt-5">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sso">Single sign-on</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <DetailFieldGrid>
                    <DetailField label="Slug">
                      <code className="text-sm">{org.slug}</code>
                    </DetailField>
                    <DetailField label="Created">
                      <RelativeTime date={org.created_at} />
                    </DetailField>
                    <DetailField label="Active members">{org.active_members}</DetailField>
                    <DetailField label="Owners">
                      {org.owner_emails.length ? org.owner_emails.join(', ') : 'No owner'}
                    </DetailField>
                    <DetailField label="Single sign-on" full>
                      <SSOPostureBadges org={org} />
                    </DetailField>
                  </DetailFieldGrid>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sso" className="mt-4 space-y-5">
              {!canManageSSO && (
                <p className="text-sm text-muted-foreground">
                  You can view this organization&apos;s SSO setup. Changing it requires a super
                  admin.
                </p>
              )}
              <SSOEnforcementCard org={org} canManage={canManageSSO} onChanged={refresh} />
              {/* A section, not a Card: the SAML form is built from its own cards. */}
              <section className="space-y-1">
                <h2 className="text-base font-semibold">SAML 2.0</h2>
                <p className="text-sm text-muted-foreground">
                  Federate sign-in through a SAML identity provider (Okta, Entra ID, ADFS).
                </p>
                <SamlConfigForm
                  tenantId={org.id}
                  tenantSlug={org.slug}
                  canManage={canManageSSO}
                  onChanged={refresh}
                />
              </section>
              <IdentityProvidersPanel
                tenantId={org.id}
                tenantSlug={org.slug}
                canManage={canManageSSO}
                onChanged={refresh}
              />
              <VerifiedDomainsSection tenantId={org.id} canManage={canManageSSO} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </Main>
  )
}
