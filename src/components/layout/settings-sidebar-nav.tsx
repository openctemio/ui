'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  SidebarGroup,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useTranslation } from '@/context/i18n-provider'
import { useSettingsNav } from '@/hooks/use-settings-nav'
import {
  activeSettingsItem,
  isSettingsShellPath,
  matchesSettingsQuery,
} from '@/config/settings-nav'
import { GroupedNav, type GroupedNavSection } from './grouped-nav'

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
    <nav aria-label={t('nav.item.settings', 'Settings')} className="flex flex-col">
      <SidebarGroup className="gap-2 py-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={backLabel} className="text-muted-foreground">
              <Link href={backHref} prefetch={false}>
                <ArrowLeft className="rtl:rotate-180" />
                <span>{backLabel}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
          className="group-data-[collapsible=icon]:hidden"
        />
      </SidebarGroup>
      <GroupedNav sections={sections} activeUrl={activeUrl} />
      {noMatch && (
        <p role="status" className="px-4 py-2 text-sm text-muted-foreground">
          {t('settings.noMatch', 'No settings match your filter.')}
        </p>
      )}
    </nav>
  )
}
