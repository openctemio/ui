'use client'

import { usePathname } from 'next/navigation'
import { LogOut, ShieldCheck } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  SidebarBrand,
  SIDEBAR_CHIP_CLASS,
  SIDEBAR_CONTEXT_ROW_CLASS,
} from '@/components/layout/sidebar-brand'
import { cn } from '@/lib/utils'
import { GroupedNav, type GroupedNavSection } from '@/components/layout/grouped-nav'
import { NAV_COLUMN_CLASS } from '@/components/layout/nav-group'
import { adminNav } from '../config/admin-nav'
import { adminCan, type AdminIdentity } from '../types'

const ROLE_LABELS: Record<AdminIdentity['role'], string> = {
  super_admin: 'Super admin',
  ops_admin: 'Operations admin',
  readonly: 'Read-only admin',
}

function isActive(pathname: string, url: string): boolean {
  if (url === '/admin') return pathname === '/admin'
  return pathname === url || pathname.startsWith(`${url}/`)
}

interface AdminConsoleSidebarProps {
  admin: AdminIdentity
  onSignOut: () => void
}

/**
 * Console sidebar: the shared brand row, then a fixed "Platform admin" context
 * row where the tenant shell has its organization switcher (an admin has no
 * tenant), then the console navigation and the signed-in admin.
 */
export function AdminConsoleSidebar({ admin, onSignOut }: AdminConsoleSidebarProps) {
  const pathname = usePathname()
  const sections: GroupedNavSection[] = adminNav.map((section, i) => ({
    key: section.title ?? String(i),
    label: section.title,
    items: section.items
      .filter((item) => !item.minRole || adminCan(admin.role, item.minRole))
      .map((item) => ({ key: item.url, title: item.title, url: item.url, icon: item.icon })),
  }))
  // The deepest entry that owns the current path is the one marked current.
  const activeUrl = sections
    .flatMap((s) => s.items.map((i) => i.url))
    .filter((url) => isActive(pathname, url))
    .sort((x, y) => y.length - x.length)[0]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3">
        <SidebarBrand href="/admin" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className={cn(SIDEBAR_CONTEXT_ROW_CLASS, 'pointer-events-none h-10')}
              tooltip="Platform admin"
            >
              <div className={SIDEBAR_CHIP_CLASS}>
                <ShieldCheck className="size-4" />
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">Platform admin</span>
                <span className="truncate text-xs text-muted-foreground">
                  {ROLE_LABELS[admin.role]}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Separator orientation="horizontal" className="mt-1" />
      </SidebarHeader>

      <SidebarContent>
        <div className={NAV_COLUMN_CLASS}>
          <GroupedNav sections={sections} activeUrl={activeUrl} />
        </div>
      </SidebarContent>

      <SidebarFooter>
        <Separator orientation="horizontal" />
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="grid px-2 py-1 text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{admin.name}</span>
              <span className="truncate text-xs text-muted-foreground">{admin.email}</span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSignOut} tooltip="Sign out">
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
