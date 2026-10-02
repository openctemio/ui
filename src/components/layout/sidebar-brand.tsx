'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { PanelLeftIcon } from 'lucide-react'
import { Logo } from '@/assets/logo'
import { ShortcutKeys } from '@/components/layout/keyboard-shortcuts-dialog'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { KEYBOARD_SHORTCUTS } from '@/config/keyboard-shortcuts'

/** The toggle-sidebar keys, from the one shortcut list (Help > Keyboard shortcuts). */
const TOGGLE_SIDEBAR_KEYS = KEYBOARD_SHORTCUTS.find((s) => s.id === 'toggle-sidebar')?.keys

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
 * sidebar, so the rail never loses its way back open. On hover or keyboard
 * focus the mark turns into the same panel icon the expanded sidebar's toggle
 * uses, so the button says what it does; the tooltip names the action and its
 * shortcut.
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
            className="group/brand relative flex size-8 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            aria-label="Expand sidebar"
          >
            <Logo
              aria-hidden
              data-slot="brand-mark"
              className="size-7 transition-opacity duration-150 group-hover/brand:opacity-0 group-focus-visible/brand:opacity-0 motion-reduce:transition-none"
            />
            <PanelLeftIcon
              aria-hidden
              data-slot="brand-expand"
              className="absolute size-4 opacity-0 transition-opacity duration-150 group-hover/brand:opacity-100 group-focus-visible/brand:opacity-100 motion-reduce:transition-none"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          Expand sidebar
          {TOGGLE_SIDEBAR_KEYS && <ShortcutKeys keys={TOGGLE_SIDEBAR_KEYS} />}
        </TooltipContent>
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
