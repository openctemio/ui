'use client'

import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// Use centralized sidebar data from features
import { sidebarData } from '@/config/sidebar-data'
import { useFilteredSidebarData } from '@/lib/permissions'
import { NavClusterLabel, NavGroup } from './nav-group'
import { useTranslation } from '@/context/i18n-provider'
import { SidebarUser } from './sidebar-user'
import { TeamSwitcher } from './team-switcher'
import { SidebarBrand } from './sidebar-brand'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  // Filter sidebar items based on user permissions and modules
  const { data: filteredSidebarData, isModulesLoading } = useFilteredSidebarData(sidebarData)
  const { t } = useTranslation()

  // Quick links (untitled group) first, then the CTEM stages in cycle order under
  // their own label, then everything else (Insights, Settings) after a divider.
  const groups = filteredSidebarData.navGroups
  const quickLinks = groups.filter((g) => !g.title)
  const cycle = groups.filter((g) => g.title && g.cluster === 'cycle')
  const rest = groups.filter((g) => g.title && g.cluster !== 'cycle')

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      {/* Header: brand row (logo + collapse), then the context row (which
          organization you are in). The brand row is shared with shells that
          have no tenant, such as the admin console. */}
      <SidebarHeader className="gap-3">
        <SidebarBrand href="/" />
        <TeamSwitcher />
        <Separator orientation="horizontal" />
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
        {isModulesLoading ? (
          // Show skeleton while modules are loading
          <div className="space-y-4 px-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : (
          // One padded column for every group: the same 8px inset in both states
          // (so rail icons line up with the expanded ones) and an even gap
          // between sections, which are separate <ul>s.
          <div className="flex flex-col gap-1 px-2 py-2">
            {quickLinks.map((group) => (
              <NavGroup key={group.title || 'quick'} {...group} />
            ))}
            {cycle.length > 0 && <NavClusterLabel label={t('nav.cluster.cycle', 'CTEM cycle')} />}
            {cycle.map((group) => (
              <NavGroup key={group.title} {...group} />
            ))}
            {rest.length > 0 && <NavClusterLabel />}
            {rest.map((group) => (
              <NavGroup key={group.title} {...group} />
            ))}
          </div>
        )}
      </SidebarContent>

      {/* Footer - User profile and logout (separator inset like the header's) */}
      <SidebarFooter>
        <Separator orientation="horizontal" />
        <SidebarUser />
      </SidebarFooter>

      {/* Sidebar toggle rail */}
      <SidebarRail />
    </Sidebar>
  )
}
