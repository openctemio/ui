'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useState, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  type NavCollapsible,
  type NavItem,
  type NavLink,
  type NavGroup as NavGroupProps,
} from '@/components/types'
import { useDynamicBadges, getBadgeValue, type DynamicBadges } from '@/hooks/use-dynamic-badges'
import {
  useTenantModules,
  type LicensingModule,
} from '@/features/integrations/api/use-tenant-modules'
import { useTranslation } from '@/context/i18n-provider'

/** Maps a sidebar group title to its i18n key, e.g. "Scoping" → "nav.group.scoping". */
function groupTitleKey(title: string): string {
  return `nav.group.${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

/** Maps a sidebar item title to its i18n key, e.g. "Attack Surface" → "nav.item.attack-surface". */
function navItemKey(title: string): string {
  return `nav.item.${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

/**
 * Translated sidebar item label. Centralises the t() call so the many memoized
 * menu sub-components can render a localized label with the English title as the
 * fallback (untranslated items degrade gracefully).
 */
function NavLabel({ title }: { title: string }) {
  const { t } = useTranslation()
  return <>{t(navItemKey(title), title)}</>
}

/** True when any item (or its sub-items) in a section matches the current path. */
function groupContainsActiveRoute(pathname: string, items: NavItem[]): boolean {
  return items.some((item) => checkIsActive(pathname, item))
}

const NAV_SECTION_STORAGE_PREFIX = 'octem:nav-section:'

/**
 * Collapse state for a top-level nav section.
 *
 * Default behaviour keeps the sidebar short on tall viewports (iPad): the
 * section that owns the active route is expanded, the rest stay collapsed. A
 * user's manual toggle is remembered per-section in localStorage and wins until
 * they navigate into a different section (which always reveals itself).
 */
function useNavSectionOpen(title: string, hasActive: boolean) {
  const storageKey = `${NAV_SECTION_STORAGE_PREFIX}${title}`
  // Deterministic initial value avoids a hydration mismatch; the persisted
  // preference is reconciled in the effect below.
  const [open, setOpen] = useState(hasActive)

  // Apply the persisted preference once on mount (runs before the hasActive
  // effect, so navigating into a section still forces it open).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored === '1') setOpen(true)
      else if (stored === '0') setOpen(false)
    } catch {
      /* localStorage unavailable — keep the active-driven default */
    }
  }, [storageKey])

  // Navigating into this section always reveals it.
  useEffect(() => {
    if (hasActive) setOpen(true)
  }, [hasActive])

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      try {
        window.localStorage.setItem(storageKey, next ? '1' : '0')
      } catch {
        /* ignore persistence failures */
      }
    },
    [storageKey]
  )

  return { open, onOpenChange }
}

/**
 * NavGroup Component
 *
 * Renders a group of navigation items in the sidebar.
 *
 * Layout:
 * - The unlabelled section (Dashboard) and the icon-only rail render items flat
 *   so nothing hides behind a collapsed header.
 * - In the expanded sidebar every labelled section is an accordion: its header
 *   is a toggle, and the section owning the active route is open by default
 *   while the others collapse to cut scroll.
 *
 * Re-render notes: NavGroup is memoized against pathname changes from its
 * parent, but reads usePathname() internally to drive the active-section state,
 * so it still updates on navigation (memo only blocks parent-driven renders).
 * Each item component continues to manage its own active state.
 */
function NavGroupComponent({ title, items }: NavGroupProps) {
  const { state, isMobile } = useSidebar()
  const dynamicBadges = useDynamicBadges()
  const { t } = useTranslation()
  const pathname = usePathname()

  const collapsedRail = state === 'collapsed' && !isMobile
  const hasActive = useMemo(() => groupContainsActiveRoute(pathname, items), [pathname, items])
  const { open, onOpenChange } = useNavSectionOpen(title, hasActive)

  const menu = (
    <SidebarMenu>
      {items.map((item) => {
        const key = 'items' in item ? item.title : `${item.title}-${String(item.url)}`

        if (!('items' in item))
          return <SidebarMenuLink key={key} item={item} dynamicBadges={dynamicBadges} />

        if (collapsedRail)
          return (
            <SidebarMenuCollapsedDropdown key={key} item={item} dynamicBadges={dynamicBadges} />
          )

        return <SidebarMenuCollapsible key={key} item={item} dynamicBadges={dynamicBadges} />
      })}
    </SidebarMenu>
  )

  // Dashboard (no label) and the icon-only rail: render flat, never collapsed.
  if (!title || collapsedRail) {
    return (
      <SidebarGroup>
        {title && <SidebarGroupLabel>{t(groupTitleKey(title), title)}</SidebarGroupLabel>}
        {menu}
      </SidebarGroup>
    )
  }

  // Expanded sidebar: section header doubles as an accordion trigger.
  return (
    <SidebarGroup>
      <Collapsible open={open} onOpenChange={onOpenChange} className="group/nav-section">
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel
            asChild
            className="cursor-pointer pe-1 hover:text-sidebar-foreground focus-visible:ring-2"
          >
            <button type="button" aria-label={`Toggle ${title} section`}>
              <span>{t(groupTitleKey(title), title)}</span>
              <ChevronRight className="ms-auto size-3.5 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]/nav-section:rotate-90 rtl:rotate-180" />
            </button>
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent className="CollapsibleContent">{menu}</CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  )
}

function NavBadge({
  children,
  variant,
}: {
  children: ReactNode
  variant?: 'default' | 'soon' | 'beta'
}) {
  // Special styling for "Soon" badge to indicate Coming Soon pages
  if (variant === 'soon' || children === 'Soon') {
    return (
      <Badge
        variant="outline"
        className="ms-auto shrink-0 rounded-full px-1.5 py-0 text-[10px] text-muted-foreground border-dashed"
      >
        {children}
      </Badge>
    )
  }
  // Beta badge styling
  if (variant === 'beta' || children === 'Beta') {
    return (
      <Badge variant="secondary" className="ms-auto shrink-0 rounded-full px-1.5 py-0 text-[10px]">
        {children}
      </Badge>
    )
  }
  return <Badge className="ms-auto shrink-0 rounded-full px-1 py-0 text-xs">{children}</Badge>
}

/**
 * Get the appropriate badge based on releaseStatus
 */
function getReleaseStatusBadge(
  releaseStatus?: string
): { text: string; variant: 'soon' | 'beta' } | null {
  if (releaseStatus === 'coming_soon') {
    return { text: 'Soon', variant: 'soon' }
  }
  if (releaseStatus === 'beta') {
    return { text: 'Beta', variant: 'beta' }
  }
  return null
}

/**
 * Filter sub-items based on sub-modules from API.
 * - Items without subModuleKey are always shown (like "Overview")
 * - Items with subModuleKey are filtered by sub-module presence in API response
 * - API only returns active modules, so if not in response = hidden
 * - "disabled" release status hides completely
 * - "coming_soon" and "beta" modules get their release status applied
 */
function useFilteredSubItems(
  items: NavLink[],
  parentModuleId: string | undefined,
  subModules: Record<string, LicensingModule[]>
) {
  return useMemo(() => {
    // If no parent module specified, return all items (e.g. Organization)
    if (!parentModuleId) return items

    // If sub-modules not loaded yet (API still fetching), show all items
    // to prevent flash of empty content during initial load
    if (Object.keys(subModules).length === 0) {
      return items
    }

    // Get sub-modules for this parent from API response
    const parentSubModules = subModules[parentModuleId] || []

    return items
      .map((item) => {
        // Items without subModuleKey are always shown (like "Overview")
        if (!item.subModuleKey) return item

        // Find the sub-module that matches this item's key
        const subModule = parentSubModules.find((m) => m.slug === item.subModuleKey)

        // If sub-module not found in API response, hide the item
        // API only returns enabled+active modules, so absence = not available
        if (!subModule) return null

        // If sub-module is disabled, hide completely
        if (subModule.release_status === 'disabled') return null

        // Apply release status from sub-module to the item
        return {
          ...item,
          releaseStatus: subModule.release_status,
        }
      })
      .filter((item): item is NavLink => item !== null)
  }, [items, parentModuleId, subModules])
}

/**
 * SidebarMenuLink - Memoized to prevent re-renders
 * Uses its own usePathname() so it only re-renders when pathname changes
 */
const SidebarMenuLink = memo(function SidebarMenuLink({
  item,
  dynamicBadges,
}: {
  item: NavLink
  dynamicBadges: DynamicBadges
}) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const badge = getBadgeValue(dynamicBadges, item.url as string, item.badge)
  const releaseStatusBadge = getReleaseStatusBadge(item.releaseStatus)
  const isComingSoon = item.releaseStatus === 'coming_soon'

  // If coming soon, render as disabled span instead of link
  if (isComingSoon) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={`${item.title} (Coming Soon)`}
          className="cursor-not-allowed opacity-60"
        >
          {item.icon && <item.icon />}
          <span>
            <NavLabel title={item.title} />
          </span>
          {releaseStatusBadge && (
            <NavBadge variant={releaseStatusBadge.variant}>{releaseStatusBadge.text}</NavBadge>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={checkIsActive(pathname, item)} tooltip={item.title}>
        <Link href={item.url} prefetch={false} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon />}
          <span>
            <NavLabel title={item.title} />
          </span>
          {releaseStatusBadge ? (
            <NavBadge variant={releaseStatusBadge.variant}>{releaseStatusBadge.text}</NavBadge>
          ) : (
            badge && <NavBadge>{badge}</NavBadge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
})

SidebarMenuLink.displayName = 'SidebarMenuLink'

/**
 * SidebarMenuCollapsible - Memoized to prevent re-renders
 * Uses its own usePathname() so it only re-renders when pathname changes
 */
const SidebarMenuCollapsible = memo(function SidebarMenuCollapsible({
  item,
  dynamicBadges: _dynamicBadges,
}: {
  item: NavCollapsible
  dynamicBadges: DynamicBadges
}) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const { subModules } = useTenantModules()
  const releaseStatusBadge = getReleaseStatusBadge(item.releaseStatus)

  // Filter sub-items based on sub-modules from API
  const filteredItems = useFilteredSubItems(item.items, item.module, subModules)

  // Longest-matching sub-item drives the highlight, and seeds the initial open
  // state so a group is expanded when you land on one of its pages. Uncontrolled
  // (defaultOpen) keeps it simple + stable — the user can freely toggle after.
  const activeSubUrl = useMemo(
    () => activeSubItemUrl(pathname, filteredItems),
    [pathname, filteredItems]
  )

  return (
    <Collapsible asChild defaultOpen={activeSubUrl !== undefined} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            {item.icon && <item.icon />}
            <span>
              <NavLabel title={item.title} />
            </span>
            {releaseStatusBadge ? (
              <NavBadge variant={releaseStatusBadge.variant}>{releaseStatusBadge.text}</NavBadge>
            ) : (
              item.badge && <NavBadge>{item.badge}</NavBadge>
            )}
            <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="CollapsibleContent">
          <SidebarMenuSub>
            {filteredItems.map((subItem) => {
              const subReleaseStatusBadge = getReleaseStatusBadge(subItem.releaseStatus)
              const isSubComingSoon = subItem.releaseStatus === 'coming_soon'

              if (isSubComingSoon) {
                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton className="cursor-not-allowed opacity-60">
                      {subItem.icon && <subItem.icon className="shrink-0" />}
                      <span className="flex-1 truncate">
                        <NavLabel title={subItem.title} />
                      </span>
                      {subReleaseStatusBadge && (
                        <NavBadge variant={subReleaseStatusBadge.variant}>
                          {subReleaseStatusBadge.text}
                        </NavBadge>
                      )}
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )
              }

              return (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton asChild isActive={subItem.url === activeSubUrl}>
                    <Link href={subItem.url} prefetch={false} onClick={() => setOpenMobile(false)}>
                      {subItem.icon && <subItem.icon className="shrink-0" />}
                      <span className="flex-1 truncate">
                        <NavLabel title={subItem.title} />
                      </span>
                      {subReleaseStatusBadge ? (
                        <NavBadge variant={subReleaseStatusBadge.variant}>
                          {subReleaseStatusBadge.text}
                        </NavBadge>
                      ) : (
                        subItem.badge && <NavBadge>{subItem.badge}</NavBadge>
                      )}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
})

SidebarMenuCollapsible.displayName = 'SidebarMenuCollapsible'

/**
 * SidebarMenuCollapsedDropdown - Memoized to prevent re-renders
 * Uses its own usePathname() so it only re-renders when pathname changes
 */
const SidebarMenuCollapsedDropdown = memo(function SidebarMenuCollapsedDropdown({
  item,
  dynamicBadges: _dynamicBadges,
}: {
  item: NavCollapsible
  dynamicBadges: DynamicBadges
}) {
  const pathname = usePathname()
  const { subModules } = useTenantModules()
  const releaseStatusBadge = getReleaseStatusBadge(item.releaseStatus)

  // Filter sub-items based on sub-modules from API
  const filteredItems = useFilteredSubItems(item.items, item.module, subModules)
  const activeSubUrl = useMemo(
    () => activeSubItemUrl(pathname, filteredItems),
    [pathname, filteredItems]
  )

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Collapsed (icon-rail) trigger: icon only. The label/badge/chevron
              are dropped here rather than clipped via overflow — WebKit could
              leave the wrapped label visible, breaking the rail. The full
              label + items live in the dropdown content below. */}
          <SidebarMenuButton tooltip={item.title} isActive={checkIsActive(pathname, item)}>
            {item.icon && <item.icon />}
            <span className="sr-only">
              <NavLabel title={item.title} />
            </span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={4}>
          <DropdownMenuLabel>
            <NavLabel title={item.title} />{' '}
            {releaseStatusBadge
              ? `(${releaseStatusBadge.text})`
              : item.badge
                ? `(${item.badge})`
                : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {filteredItems.map((sub) => {
            const subReleaseStatusBadge = getReleaseStatusBadge(sub.releaseStatus)
            const isSubComingSoon = sub.releaseStatus === 'coming_soon'

            if (isSubComingSoon) {
              return (
                <DropdownMenuItem
                  key={`${sub.title}-${sub.url}`}
                  disabled
                  className="cursor-not-allowed opacity-60"
                >
                  {sub.icon && <sub.icon />}
                  <span className="max-w-52 text-wrap">{sub.title}</span>
                  {subReleaseStatusBadge && (
                    <span className="ms-auto text-xs text-muted-foreground">
                      {subReleaseStatusBadge.text}
                    </span>
                  )}
                </DropdownMenuItem>
              )
            }

            return (
              <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
                <Link
                  href={sub.url}
                  prefetch={false}
                  className={`${sub.url === activeSubUrl ? 'bg-secondary' : ''}`}
                >
                  {sub.icon && <sub.icon />}
                  <span className="max-w-52 text-wrap">{sub.title}</span>
                  {subReleaseStatusBadge ? (
                    <span className="ms-auto text-xs">{subReleaseStatusBadge.text}</span>
                  ) : (
                    sub.badge && <span className="ms-auto text-xs">{sub.badge}</span>
                  )}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
})

SidebarMenuCollapsedDropdown.displayName = 'SidebarMenuCollapsedDropdown'

/**
 * A nav url is active for the current path on an exact match OR a child route
 * (`/assets/repositories` is active on `/assets/repositories/<id>`), but never
 * on a mere string prefix (`/scans` is NOT active on `/scan-profiles`).
 */
function isUrlActive(pathname: string, url: unknown): boolean {
  return typeof url === 'string' && (pathname === url || pathname.startsWith(`${url}/`))
}

/**
 * Of a group's sub-items, the url that best matches the current path — the
 * longest one that is active. Prevents a short "Overview" url (`/assets`) from
 * lighting up alongside the deeper item (`/assets/repositories`) on a detail page.
 */
function activeSubItemUrl(
  pathname: string,
  items: readonly { url: NavLink['url'] }[]
): string | undefined {
  return items
    .map((i) => i.url)
    .filter((url): url is string => typeof url === 'string' && isUrlActive(pathname, url))
    .sort((a, b) => b.length - a.length)[0]
}

function checkIsActive(pathname: string, item: NavItem, mainNav = false) {
  // For collapsible items with sub-items, active if any sub-item matches —
  // including child/detail routes — so the group highlights + auto-opens.
  if ('items' in item) {
    return item.items.some((i) => isUrlActive(pathname, i.url))
  }

  // For leaf items with a url
  if ('url' in item && typeof item.url === 'string') {
    // Exact match or a child route (keeps the item active on its detail pages)
    if (isUrlActive(pathname, item.url)) {
      return true
    }

    // For mainNav items only (top-level, not sub-items), also use startsWith
    // This allows top-level items to stay highlighted when on child pages
    if (mainNav && pathname.startsWith(`/${item.url.split('/')[1]}`)) {
      return true
    }

    return false
  }

  return false
}

/**
 * Memoized NavGroup to prevent re-renders when pathname changes
 * Only re-renders when items or title props actually change
 */
export const NavGroup = memo(NavGroupComponent, (prevProps, nextProps) => {
  // Only re-render if title or items array reference changes
  // This prevents re-render when only pathname changes (which is handled internally)
  return prevProps.title === nextProps.title && prevProps.items === nextProps.items
})

NavGroup.displayName = 'NavGroup'
