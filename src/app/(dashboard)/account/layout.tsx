'use client'

import { Main } from '@/components/layout'
import { PageHeader, SectionTabs } from '@/features/shared'
import { User, Shield, Settings, History } from 'lucide-react'

const accountTabs = [
  {
    title: 'Profile',
    href: '/account',
    icon: User,
    description: 'Manage your personal information',
  },
  {
    title: 'Security',
    href: '/account/security',
    icon: Shield,
    description: 'Password, 2FA, and sessions',
  },
  {
    title: 'Preferences',
    href: '/account/preferences',
    icon: Settings,
    description: 'Customize your experience',
  },
  {
    title: 'Activity',
    href: '/account/activity',
    icon: History,
    description: 'View your account activity',
  },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Main>
      <PageHeader
        title="Account settings"
        description="Your profile, sign-in security and preferences."
      />
      <SectionTabs
        label="Account sections"
        className="mt-5"
        tabs={accountTabs.map((t) => ({ label: t.title, href: t.href, icon: t.icon }))}
      />
      <div>{children}</div>
    </Main>
  )
}
