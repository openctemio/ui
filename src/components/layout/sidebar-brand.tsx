'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/assets/logo'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
            className="mx-auto flex size-8 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            aria-label="Expand sidebar"
          >
            <Logo className="size-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Expand sidebar</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="flex h-8 items-center gap-2 ps-2">
      <Link
        href={href}
        className="flex min-w-0 items-center gap-2 rounded-md text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
      >
        <Logo className="size-6 shrink-0" />
        <span className="truncate text-base font-semibold tracking-tight">OpenCTEM</span>
      </Link>
      {badge}
      {/* On phones the sidebar is a sheet with its own close button. */}
      {!isMobile && <SidebarTrigger className="ms-auto text-muted-foreground" />}
    </div>
  )
}
