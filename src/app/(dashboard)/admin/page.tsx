'use client'

import Link from 'next/link'
import { BadgeCheck, ChevronRight, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AdminSection {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

// Single sign-on & identity federation for the current organization. Configured
// only by the application administrator (Tenable-style system configuration).
const sections: AdminSection[] = [
  {
    title: 'SAML single sign-on',
    description: 'Federate login through a SAML 2.0 identity provider (Okta, Entra ID, ADFS).',
    href: '/admin/saml',
    icon: ShieldCheck,
  },
  {
    title: 'SCIM provisioning',
    description: 'Let your identity provider create, update and deprovision users automatically.',
    href: '/admin/scim',
    icon: Users,
  },
  {
    title: 'Verified domains',
    description: 'Prove domain ownership with a DNS TXT record to limit SSO auto-join.',
    href: '/admin/verified-domains',
    icon: BadgeCheck,
  },
]

export default function AdminOverviewPage() {
  return (
    <Main>
      <PageHeader
        title="Administration"
        description="Application-level configuration for this organization. Only the application administrator can see this area."
      />
      <section className="mt-5 space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">Single sign-on</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none"
            >
              <Card className="hover:bg-muted/40 h-full transition-colors">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    <CardDescription>{s.description}</CardDescription>
                  </div>
                  <ChevronRight className="text-muted-foreground mt-1 h-4 w-4 shrink-0" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </Main>
  )
}
