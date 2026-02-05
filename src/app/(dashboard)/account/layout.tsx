'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { cn } from '@/lib/utils'
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
  const pathname = usePathname()

  // Determine active tab
  const getActiveTab = () => {
    if (pathname === '/account') return '/account'
    const tab = accountTabs.find((t) => t.href !== '/account' && pathname.startsWith(t.href))
    return tab?.href || '/account'
  }

  const activeTab = getActiveTab()

  return (
    <>
      <Main>
        <PageHeader
          title="Account Settings"
          description="Manage your account settings and preferences"
        />

        {/* Tab Navigation */}
        <div className="mt-6 border-b">
          <nav className="-mb-px flex gap-6" aria-label="Account tabs">
            {accountTabs.map((tab) => {
              const isActive = activeTab === tab.href
              const Icon = tab.icon

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'group flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  {tab.title}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="mt-6">{children}</div>
      </Main>
    </>
  )
}
