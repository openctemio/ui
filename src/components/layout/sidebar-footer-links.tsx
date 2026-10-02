'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bug, BookOpen, CircleHelp, ExternalLink, Info, Keyboard, Settings } from 'lucide-react'
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  useSidebarActions,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from '@/context/i18n-provider'
import { isSettingsShellPath } from '@/config/settings-nav'
import { DOCS_URL, REPORT_ISSUE_URL } from '@/config/help-links'
import type { ShortcutShell } from '@/config/keyboard-shortcuts'
import { NAV_BUTTON_CLASS } from './nav-group'
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog'
import { AboutDialog } from './about-dialog'

interface SidebarFooterLinksProps {
  /** Which shell this is: picks the shortcuts the Help dialog lists. */
  shell: ShortcutShell
  /** The tenant app's Settings link. The admin console has no tenant settings. */
  showSettings?: boolean
  /** Rows of the shell's own after Help (the admin console's sign-out). */
  children?: ReactNode
}

/**
 * The sidebar footer: rows pinned to the bottom, under the scrolling nav —
 * Settings (tenant app only) and Help — below a separator spaced like the
 * header's (16px either side). Shared by the app sidebar and the admin console
 * so the two shells stay alike. Rows are the nav's own SidebarMenuButton +
 * NAV_BUTTON_CLASS, so they have the same height, icon, hover/active states
 * and collapsed-rail tooltip as every other row.
 */
export function SidebarFooterLinks({
  shell,
  showSettings = false,
  children,
}: SidebarFooterLinksProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { setOpenMobile } = useSidebarActions()
  const settingsActive = isSettingsShellPath(pathname)
  const settingsLabel = t('nav.item.settings', 'Settings')

  return (
    <SidebarFooter className="gap-4">
      <Separator orientation="horizontal" />
      <SidebarMenu>
        {showSettings && (
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={settingsActive}
              tooltip={settingsLabel}
              className={NAV_BUTTON_CLASS}
            >
              <Link
                href="/settings"
                prefetch={false}
                aria-current={pathname === '/settings' ? 'page' : undefined}
                onClick={() => setOpenMobile(false)}
              >
                <Settings />
                <span>{settingsLabel}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        <SidebarMenuItem>
          <HelpMenu shell={shell} />
        </SidebarMenuItem>
        {children}
      </SidebarMenu>
    </SidebarFooter>
  )
}

/** Help: documentation, keyboard shortcuts, issue tracker and version. */
function HelpMenu({ shell }: { shell: ShortcutShell }) {
  const { t } = useTranslation()
  const { isMobile } = useSidebar()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const label = t('help.menu', 'Help')
  const newTab = t('help.opensInNewTab', '(opens in a new tab)')

  return (
    <>
      {/* modal={false}: an item opens a dialog, and a modal menu would leave
          the page inert behind it (the same choice as the header user menu). */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip={label} className={NAV_BUTTON_CLASS}>
            <CircleHelp />
            <span>{label}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={isMobile ? 'top' : 'right'}
          align="end"
          sideOffset={8}
          className="min-w-56"
        >
          <DropdownMenuItem asChild>
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
              <BookOpen />
              <span>{t('help.documentation', 'Documentation')}</span>
              <ExternalLink className="ms-auto size-3.5 text-muted-foreground" aria-hidden />
              <span className="sr-only">{newTab}</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShortcutsOpen(true)}>
            <Keyboard />
            <span>{t('help.shortcuts', 'Keyboard shortcuts')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={REPORT_ISSUE_URL} target="_blank" rel="noopener noreferrer">
              <Bug />
              <span>{t('help.reportIssue', 'Report an issue')}</span>
              <ExternalLink className="ms-auto size-3.5 text-muted-foreground" aria-hidden />
              <span className="sr-only">{newTab}</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAboutOpen(true)}>
            <Info />
            <span>{t('help.about', 'About OpenCTEM')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} shell={shell} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  )
}
