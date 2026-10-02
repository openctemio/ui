'use client'

import { useLayout } from '@/context/layout-provider'
import { Sidebar, SidebarContent, SidebarHeader, SidebarRail } from '@/components/ui/sidebar'
// Use centralized sidebar data from features
import { sidebarData } from '@/config/sidebar-data'
import { useFilteredSidebarData } from '@/lib/permissions'
import { NAV_COLUMN_CLASS, NavClusterLabel, NavGroup } from './nav-group'
import { useTranslation } from '@/context/i18n-provider'
import { TeamSwitcher } from './team-switcher'
import { SidebarBrand } from './sidebar-brand'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { usePathname } from 'next/navigation'
import { isSettingsShellPath } from '@/config/settings-nav'
import { SettingsSidebarNav, useRememberAppPath } from './settings-sidebar-nav'
import { SidebarFooterLinks } from './sidebar-footer-links'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  // Filter sidebar items based on user permissions and modules
  const { data: filteredSidebarData, isModulesLoading } = useFilteredSidebarData(sidebarData)
  const { t } = useTranslation()
  const pathname = usePathname()
  // On settings routes the sidebar becomes the settings rail (same frame:
  // collapse, keyboard shortcut and mobile sheet are unchanged).
  const settingsShell = isSettingsShellPath(pathname)
  useRememberAppPath()

  // Quick links (untitled group) first, then the CTEM stages in cycle order under
  // their own label, then everything else (Insights) after a divider. Settings
  // and Help are pinned in the footer, below the scrolling nav.
  const groups = filteredSidebarData.navGroups
  const quickLinks = groups.filter((g) => !g.title)
  const cycle = groups.filter((g) => g.title && g.cluster === 'cycle')
  const rest = groups.filter((g) => g.title && !g.cluster)

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      {/* Header: brand row (logo + collapse), then the context row (which
          organization you are in). The brand row is shared with shells that
          have no tenant, such as the admin console. */}
      <SidebarHeader className="gap-3">
        <SidebarBrand href="/" />
        <TeamSwitcher />
        {/* mt-1: 16px above the line, as below it (header gap 12 + 4). */}
        <Separator orientation="horizontal" className="mt-1" />
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
        {settingsShell ? (
          <div className={NAV_COLUMN_CLASS}>
            <SettingsSidebarNav />
          </div>
        ) : isModulesLoading ? (
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
          <div className={NAV_COLUMN_CLASS}>
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

      {/* Pinned under the nav, which scrolls on its own: Settings and Help.
          Not a user menu: the header avatar menu is the one user menu. */}
      <SidebarFooterLinks shell="app" showSettings />
      {/* Sidebar toggle rail */}
      <SidebarRail />
    </Sidebar>
  )
}
