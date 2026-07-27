'use client'

import { type ReactNode, type ElementType, useMemo, memo } from 'react'
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
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

/**
 * NavGroup — one CTEM section in the sidebar.
 *
 * Every titled section renders as a collapsible header row (icon + label +
 * rotating chevron) following shadcn's `sidebar-07` pattern, with its items
 * nested underneath a rail. The ungrouped section (empty title, e.g. Dashboard)
 * renders its items as plain top-level links.
 *
 * app-sidebar hosts a single <SidebarGroup><SidebarMenu> and maps every group
 * through here, so the rows share one compact `gap-1` rhythm (no per-section
 * padding / labels that would open big vertical gaps).
 */
function NavGroupComponent({ title, icon, items }: NavGroupProps) {
  const dynamicBadges = useDynamicBadges()
  const { state, isMobile } = useSidebar()
  const { t } = useTranslation()

  // Ungrouped rows (Dashboard) — plain top-level links, no group heading.
  if (!title) {
    return (
      <SidebarMenu>
        {items.map((item) =>
          'items' in item ? null : (
            <SidebarMenuLink
              key={`${item.title}-${String(item.url)}`}
              item={item}
              dynamicBadges={dynamicBadges}
            />
          )
        )}
      </SidebarMenu>
    )
  }

  // Collapsed icon-rail keeps the old behaviour: one icon per section that opens
  // a dropdown of its items. A rail cannot show 60+ icons legibly, and a group
  // heading has nothing to label when the labels are hidden.
  if (state === 'collapsed' && !isMobile) {
    return (
      <SidebarMenu>
        <NavSection title={title} icon={icon} items={items} dynamicBadges={dynamicBadges} />
      </SidebarMenu>
    )
  }

  // Expanded: the section name is a quiet heading, not a control, and every item
  // is visible. Nothing is one click away behind an accordion the user has to
  // discover and re-open, and the shape of the product is readable at a glance.
  return (
    <SidebarGroup className="py-0">
      <SidebarGroupLabel>{t(groupTitleKey(title), title)}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          'items' in item ? (
            <NavSubCollapsible key={item.title} item={item} dynamicBadges={dynamicBadges} />
          ) : (
            <SidebarMenuLink
              key={`${item.title}-${String(item.url)}`}
              item={item}
              dynamicBadges={dynamicBadges}
            />
          )
        )}
      </SidebarMenu>
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
 * SidebarMenuLink - top-level plain link (Dashboard). Memoized so it only
 * re-renders when the pathname changes.
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
 * NavSection - a top-level CTEM section rendered as a collapsible header
 * (icon + label + chevron), sidebar-07 style. Auto-expands when it owns the
 * active route; collapses otherwise. In the collapsed icon-rail it flips to a
 * dropdown flyout so the whole tree stays reachable from the icon.
 */
const NavSection = memo(function NavSection({
  title,
  icon: SectionIcon,
  items,
  dynamicBadges,
}: {
  title: string
  icon?: ElementType
  items: NavItem[]
  dynamicBadges: DynamicBadges
}) {
  const { state, isMobile } = useSidebar()
  const pathname = usePathname()
  const { t } = useTranslation()

  const sectionActive = useMemo(() => sectionHasActiveRoute(pathname, items), [pathname, items])

  // Collapsed icon-rail (desktop): render as an icon that opens a dropdown of
  // the section's items (with sub-menus for nested subsections).
  if (state === 'collapsed' && !isMobile) {
    return (
      <NavSectionCollapsedDropdown
        title={title}
        icon={SectionIcon}
        items={items}
        sectionActive={sectionActive}
        dynamicBadges={dynamicBadges}
      />
    )
  }

  return (
    <Collapsible asChild defaultOpen={sectionActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={title}>
            {SectionIcon && <SectionIcon />}
            <span>{t(groupTitleKey(title), title)}</span>
            <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="CollapsibleContent">
          <SidebarMenuSub>
            {items.map((item) =>
              'items' in item ? (
                <NavSubCollapsible key={item.title} item={item} dynamicBadges={dynamicBadges} />
              ) : (
                <NavSubLeaf
                  key={`${item.title}-${String(item.url)}`}
                  item={item}
                  dynamicBadges={dynamicBadges}
                />
              )
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
})

NavSection.displayName = 'NavSection'

/**
 * NavSubLeaf - a leaf link inside a section's sub-menu. Shared by both a
 * section's direct children and a nested subsection's children.
 */
const NavSubLeaf = memo(function NavSubLeaf({
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

  if (isComingSoon) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton className="cursor-not-allowed opacity-60">
          {item.icon && <item.icon className="shrink-0" />}
          <span className="flex-1 truncate">
            <NavLabel title={item.title} />
          </span>
          {releaseStatusBadge && (
            <NavBadge variant={releaseStatusBadge.variant}>{releaseStatusBadge.text}</NavBadge>
          )}
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={checkIsActive(pathname, item)}>
        <Link href={item.url} prefetch={false} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon className="shrink-0" />}
          <span className="flex-1 truncate">
            <NavLabel title={item.title} />
          </span>
          {releaseStatusBadge ? (
            <NavBadge variant={releaseStatusBadge.variant}>{releaseStatusBadge.text}</NavBadge>
          ) : (
            badge && <NavBadge>{badge}</NavBadge>
          )}
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
})

NavSubLeaf.displayName = 'NavSubLeaf'

/**
 * NavSubCollapsible - a nested subsection inside a section (e.g. Penetration
 * Testing under Validation, or Scanning/Organization/Integrations under
 * Settings). Renders as a second-level collapsible on its own rail so a large
 * settings tree stays organised without flattening into a 20-row wall.
 */
const NavSubCollapsible = memo(function NavSubCollapsible({
  item,
  dynamicBadges,
}: {
  item: NavCollapsible
  dynamicBadges: DynamicBadges
}) {
  const pathname = usePathname()
  const { subModules } = useTenantModules()
  const releaseStatusBadge = getReleaseStatusBadge(item.releaseStatus)

  const filteredItems = useFilteredSubItems(item.items, item.module, subModules)
  const activeSubUrl = useMemo(
    () => activeSubItemUrl(pathname, filteredItems),
    [pathname, filteredItems]
  )

  return (
    <Collapsible asChild defaultOpen={activeSubUrl !== undefined} className="group/subcollapsible">
      <SidebarMenuSubItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton asChild className="cursor-pointer">
            <button type="button">
              {item.icon && <item.icon className="shrink-0" />}
              <span className="flex-1 truncate">
                <NavLabel title={item.title} />
              </span>
              {releaseStatusBadge && (
                <NavBadge variant={releaseStatusBadge.variant}>{releaseStatusBadge.text}</NavBadge>
              )}
              <ChevronRight className="ms-auto size-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/subcollapsible:rotate-90 rtl:rotate-180" />
            </button>
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {filteredItems.map((sub) => (
              <NavSubLeaf key={sub.title} item={sub} dynamicBadges={dynamicBadges} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuSubItem>
    </Collapsible>
  )
})

NavSubCollapsible.displayName = 'NavSubCollapsible'

/**
 * NavSectionCollapsedDropdown - the icon-rail representation of a section.
 * The section header becomes an icon button; its whole tree lives in a
 * dropdown (nested subsections become dropdown sub-menus) so nothing is lost
 * when the sidebar is collapsed.
 */
const NavSectionCollapsedDropdown = memo(function NavSectionCollapsedDropdown({
  title,
  icon: SectionIcon,
  items,
  sectionActive,
  dynamicBadges,
}: {
  title: string
  icon?: ElementType
  items: NavItem[]
  sectionActive: boolean
  dynamicBadges: DynamicBadges
}) {
  const pathname = usePathname()
  const { t } = useTranslation()

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip={title} isActive={sectionActive}>
            {SectionIcon && <SectionIcon />}
            <span className="sr-only">{t(groupTitleKey(title), title)}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={4} className="min-w-48">
          <DropdownMenuLabel>{t(groupTitleKey(title), title)}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map((item) =>
            'items' in item ? (
              <CollapsedDropdownSubsection
                key={item.title}
                item={item}
                pathname={pathname}
                dynamicBadges={dynamicBadges}
              />
            ) : (
              <CollapsedDropdownLeaf
                key={`${item.title}-${String(item.url)}`}
                item={item}
                pathname={pathname}
                dynamicBadges={dynamicBadges}
              />
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
})

NavSectionCollapsedDropdown.displayName = 'NavSectionCollapsedDropdown'

/** A section's nested subsection rendered as a dropdown sub-menu (rail mode). */
function CollapsedDropdownSubsection({
  item,
  pathname,
  dynamicBadges,
}: {
  item: NavCollapsible
  pathname: string
  dynamicBadges: DynamicBadges
}) {
  const { subModules } = useTenantModules()
  const filteredItems = useFilteredSubItems(item.items, item.module, subModules)

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {item.icon && <item.icon />}
        <span className="max-w-52 text-wrap">{item.title}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="min-w-44">
          {filteredItems.map((sub) => (
            <CollapsedDropdownLeaf
              key={`${sub.title}-${String(sub.url)}`}
              item={sub}
              pathname={pathname}
              dynamicBadges={dynamicBadges}
            />
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}

/** A leaf link rendered as a dropdown item (rail mode). */
function CollapsedDropdownLeaf({
  item,
  pathname,
  dynamicBadges,
}: {
  item: NavLink
  pathname: string
  dynamicBadges: DynamicBadges
}) {
  const badge = getBadgeValue(dynamicBadges, item.url as string, item.badge)
  const releaseStatusBadge = getReleaseStatusBadge(item.releaseStatus)
  const isComingSoon = item.releaseStatus === 'coming_soon'

  if (isComingSoon) {
    return (
      <DropdownMenuItem disabled className="cursor-not-allowed opacity-60">
        {item.icon && <item.icon />}
        <span className="max-w-52 text-wrap">{item.title}</span>
        {releaseStatusBadge && (
          <span className="ms-auto text-xs text-muted-foreground">{releaseStatusBadge.text}</span>
        )}
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem asChild>
      <Link
        href={item.url}
        prefetch={false}
        className={checkIsActive(pathname, item) ? 'bg-secondary' : ''}
      >
        {item.icon && <item.icon />}
        <span className="max-w-52 text-wrap">{item.title}</span>
        {releaseStatusBadge ? (
          <span className="ms-auto text-xs">{releaseStatusBadge.text}</span>
        ) : (
          badge && <span className="ms-auto text-xs">{badge}</span>
        )}
      </Link>
    </DropdownMenuItem>
  )
}

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

/**
 * Whether any leaf route within a section (including nested subsections) matches
 * the current path. Drives the section's active highlight + auto-expand.
 */
function sectionHasActiveRoute(pathname: string, items: NavItem[]): boolean {
  return items.some((item) => {
    if ('items' in item) {
      return item.items.some((child) => isUrlActive(pathname, child.url))
    }
    return isUrlActive(pathname, (item as NavLink).url)
  })
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
  return (
    prevProps.title === nextProps.title &&
    prevProps.items === nextProps.items &&
    prevProps.icon === nextProps.icon
  )
})

NavGroup.displayName = 'NavGroup'
