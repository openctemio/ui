'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, ShieldCheck } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { SidebarBrand } from '@/components/layout/sidebar-brand'
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3">
        <SidebarBrand href="/admin" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="pointer-events-none ps-0"
              tooltip="Platform admin"
            >
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
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
        <Separator orientation="horizontal" />
      </SidebarHeader>

      <SidebarContent>
        {adminNav.map((section, i) => {
          const items = section.items.filter(
            (item) => !item.minRole || adminCan(admin.role, item.minRole)
          )
          if (items.length === 0) return null
          return (
            <SidebarGroup key={section.title ?? i}>
              {section.title && <SidebarGroupLabel>{section.title}</SidebarGroupLabel>}
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(pathname, item.url)}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
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
