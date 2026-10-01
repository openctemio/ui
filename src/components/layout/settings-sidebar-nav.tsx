'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import {
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebarActions,
} from '@/components/ui/sidebar'
import { useTranslation } from '@/context/i18n-provider'
import { useSettingsNav } from '@/hooks/use-settings-nav'
import {
  activeSettingsItem,
  isSettingsShellPath,
  matchesSettingsQuery,
} from '@/config/settings-nav'
import { GroupedNav, type GroupedNavSection } from './grouped-nav'
import { NAV_BUTTON_CLASS } from './nav-group'

const RETURN_KEY = 'openctem:settings-return-to'

/**
 * Remember the last app page (outside the settings shell), so "Back to app"
 * returns there instead of always to the dashboard. Per tab, best effort:
 * storage can be unavailable, and then the link goes to "/".
 */
export function useRememberAppPath() {
  const pathname = usePathname()
  useEffect(() => {
    if (isSettingsShellPath(pathname)) return
    try {
      sessionStorage.setItem(RETURN_KEY, pathname + window.location.search)
    } catch {
      // Storage blocked (private mode, sandbox): fall back to "/".
    }
  }, [pathname])
}

function readReturnPath(): string {
  try {
    const p = sessionStorage.getItem(RETURN_KEY)
    // Only same-app absolute paths; never a protocol-relative or external URL.
    if (p && p.startsWith('/') && !p.startsWith('//')) return p
  } catch {
    // ignore
  }
  return '/'
}

/**
 * The settings rail: rendered in the left sidebar on every settings route
 * (see isSettingsShellPath), in place of the CTEM navigation.
 *
 * "Back to app", a filter box that matches titles, descriptions and keywords
 * (so it doubles as search in settings), then the groups from
 * src/config/settings-nav.ts, hidden per permission and module.
 */
export function SettingsSidebarNav() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const groups = useSettingsNav()
  const [query, setQuery] = useState('')
  const [backHref, setBackHref] = useState('/')
  const { setOpenMobile } = useSidebarActions()

  // Read after mount: sessionStorage does not exist during server rendering.
  useEffect(() => {
    setBackHref(readReturnPath())
  }, [])

  const activeUrl = useMemo(
    () =>
      activeSettingsItem(
        pathname,
        groups.flatMap((g) => g.items)
      )?.url,
    [pathname, groups]
  )

  const sections: GroupedNavSection[] = useMemo(
    () =>
      groups.map((group) => ({
        key: group.id,
        label: group.label,
        items: group.items
          .filter((item) =>
            matchesSettingsQuery(item, query, {
              title: item.label,
              description: item.desc,
              group: item.groupLabel,
            })
          )
          .map((item) => ({
            key: item.id,
            title: item.label,
            url: item.url,
            icon: item.icon,
            badge: item.badge ? t('settings.badge.soon', 'Soon') : undefined,
          })),
      })),
    [groups, query, t]
  )
  const noMatch = query.trim() !== '' && sections.every((s) => s.items.length === 0)
  const backLabel = t('settings.backToApp', 'Back to app')
  const filterLabel = t('settings.filter', 'Filter settings')

  return (
    <nav aria-label={t('nav.item.settings', 'Settings')} className="flex flex-col gap-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={backLabel} className={NAV_BUTTON_CLASS}>
            <Link href={backHref} prefetch={false} onClick={() => setOpenMobile(false)}>
              <ArrowLeft className="rtl:rotate-180" />
              <span>{backLabel}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      {/* The filter needs room to type; on the icon rail it is hidden. */}
      <div className="relative mt-1 group-data-[collapsible=icon]:hidden">
        {/* The icon sits on the nav icons' axis and the text starts where the
            item labels start, so the filter lines up with the rows below. */}
        <Search
          aria-hidden
          className="pointer-events-none absolute start-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <SidebarInput
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query) {
              e.stopPropagation()
              setQuery('')
            }
          }}
          placeholder={`${filterLabel}…`}
          aria-label={filterLabel}
          className="ps-[34px] text-sm in-data-[mobile=true]:h-11 in-data-[mobile=true]:text-base"
        />
      </div>
      <GroupedNav sections={sections} activeUrl={activeUrl} />
      {noMatch && (
        <p
          role="status"
          className="px-1.5 py-2 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden"
        >
          {t('settings.noMatch', 'No settings match your filter.')}
        </p>
      )}
    </nav>
  )
}
