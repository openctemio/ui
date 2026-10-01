'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/assets/logo'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * The header's context row (organization switcher, or the admin console's
 * fixed label): a 32px row whose 28px chip sits on the same vertical axis as
 * the logo and the nav icons, collapsed and expanded. Use with
 * `SidebarMenuButton` (default size).
 */
export const SIDEBAR_CONTEXT_ROW_CLASS =
  'ps-0.5 group-data-[collapsible=icon]:p-0.5! in-data-[mobile=true]:h-11 in-data-[mobile=true]:text-base'

/**
 * The 28px context chip (organization initials, the admin shield): a soft
 * fill rather than solid primary, so it never outweighs the brand mark above
 * it. The hairline keeps it visible on the row's own hover fill.
 */
export const SIDEBAR_CHIP_CLASS =
  'flex aspect-square size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground ring-1 ring-sidebar-border'

interface SidebarBrandProps {
  /** Where the logo links to when the sidebar is expanded. */
  href?: string
  /** Optional label after the wordmark, e.g. an "Admin" badge in the console. */
  badge?: ReactNode
}

/**
 * Top row of every sidebar shell: product mark + wordmark on the left, the
 * collapse toggle on the right. Kept separate from the context row below it
 * (the tenant switcher, or a fixed label in the admin console), so a shell
 * without a tenant never has to render a tenant control.
 *
 * Collapsed to the icon rail, only the mark shows; clicking it expands the
 * sidebar, so the rail never loses its way back open.
 *
 * The mark is 28px in both states and sits in the same 32px box, on the same
 * axis, as the context chip below it and the nav icons (never smaller or
 * lighter than the chip).
 */
export function SidebarBrand({ href = '/', badge }: SidebarBrandProps) {
  const { state, toggleSidebar, isMobile } = useSidebar()
  const collapsed = state === 'collapsed' && !isMobile

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            aria-label="Expand sidebar"
          >
            <Logo className="size-7" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Expand sidebar</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="flex h-8 items-center gap-2 ps-0.5 in-data-[mobile=true]:h-11">
      <Link
        href={href}
        className="flex min-w-0 items-center gap-2 rounded-md text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
      >
        <Logo className="size-7 shrink-0" />
        <span className="truncate text-lg leading-none font-semibold tracking-tight">OpenCTEM</span>
      </Link>
      {badge}
      {/* On phones the sidebar is a sheet with its own close button. */}
      {!isMobile && <SidebarTrigger className="ms-auto text-muted-foreground" />}
    </div>
  )
}
