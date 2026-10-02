'use client'

import type { ElementType, ReactNode } from 'react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebarActions,
} from '@/components/ui/sidebar'
import { NAV_BUTTON_CLASS, NavBadge, NavClusterLabel } from './nav-group'
import { NavPendingHint, SidebarLink } from './sidebar-link'

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
 * Built from the main sidebar's own pieces so the two look and behave alike in
 * both states: rows are `SidebarMenuButton` with the main nav's
 * NAV_BUTTON_CLASS (20px icons, same stroke, colours, active and hover
 * states), and sections are separated by NavClusterLabel, which shows the
 * label when expanded and a hairline on the icon rail. Collapsed, every row
 * keeps its tooltip. On phones (sheet), following a link closes the sheet.
 *
 * Not SidebarGroupLabel: collapsed, it slides up by its own height while
 * fading out, and the invisible label then sat on top of the row above it
 * (the settings rail's "Back to app" could not be clicked).
 */
export function GroupedNav({ sections, activeUrl }: GroupedNavProps) {
  const { setOpenMobile } = useSidebarActions()

  return (
    <>
      {sections.map((section) =>
        section.items.length === 0 ? null : (
          <div key={section.key} className="flex flex-col gap-1">
            {section.label && <NavClusterLabel label={section.label} />}
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.url === activeUrl}
                    tooltip={item.title}
                    className={NAV_BUTTON_CLASS}
                  >
                    <SidebarLink
                      href={item.url}
                      aria-current={item.url === activeUrl ? 'page' : undefined}
                      onClick={() => setOpenMobile(false)}
                    >
                      <item.icon />
                      <span>
                        {item.title}
                        <NavPendingHint />
                      </span>
                      {item.badge && <NavBadge variant="soon">{item.badge}</NavBadge>}
                    </SidebarLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        )
      )}
    </>
  )
}
