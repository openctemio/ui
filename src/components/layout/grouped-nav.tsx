'use client'

import type { ElementType, ReactNode } from 'react'
import Link from 'next/link'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebarActions,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'

export interface GroupedNavLink {
  key: string
  title: string
  url: string
  icon: ElementType
  badge?: ReactNode
}

export interface GroupedNavSection {
  key: string
  /** Section heading; omitted for an untitled top section. */
  label?: string
  items: GroupedNavLink[]
}

interface GroupedNavProps {
  sections: GroupedNavSection[]
  /** Url of the current page's entry; exactly one row is marked current. */
  activeUrl?: string
}

/**
 * A flat, grouped sidebar rail: section heading, then links, two levels at
 * most. Used by the shells whose nav is a list of destinations rather than the
 * CTEM tree: the settings rail and the platform admin console.
 *
 * Collapsed to the icon rail, headings hide and each link keeps its icon with a
 * tooltip. On phones (sheet), following a link closes the sheet.
 */
export function GroupedNav({ sections, activeUrl }: GroupedNavProps) {
  const { setOpenMobile } = useSidebarActions()

  return (
    <>
      {sections.map((section) =>
        section.items.length === 0 ? null : (
          <SidebarGroup key={section.key} className="py-1">
            {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.url === activeUrl}
                    tooltip={item.title}
                    className="[&>svg]:stroke-[1.75]"
                  >
                    <Link
                      href={item.url}
                      prefetch={false}
                      aria-current={item.url === activeUrl ? 'page' : undefined}
                      onClick={() => setOpenMobile(false)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                      {item.badge && <GroupedNavBadge>{item.badge}</GroupedNavBadge>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )
      )}
    </>
  )
}

/** The dashed "Soon" pill the main sidebar uses, for rails built on GroupedNav. */
export function GroupedNavBadge({ children }: { children: ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="ms-auto shrink-0 rounded-full border-dashed px-1.5 py-0 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden"
    >
      {children}
    </Badge>
  )
}
