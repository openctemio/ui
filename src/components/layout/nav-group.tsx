'use client'

import { type ReactNode, type ElementType, useId, useMemo, useState, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import {
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
import { cn } from '@/lib/utils'

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
 * Geometry shared by every top-level nav row so the leading icon sits at one size
 * and one position whether the sidebar is expanded or collapsed to the icon rail:
 * a 20px glyph with a 6px inset inside a 32px row. The collapsed button is 32px
 * wide, so 6 + 20 + 6 fills it exactly and the icon is centred on the rail; the
 * expanded row keeps the same inset, so toggling only hides the labels and the
 * icons do not move or resize.
 *
 * The menus deliberately do NOT centre their buttons in the rail (`items-center`):
 * the column padding already makes the collapsed menu exactly 32px wide, and
 * centring inside a menu that is still shrinking made the icons slide during the
 * collapse animation (and the rail's freshly-mounted section triggers start from
 * the middle of the wide menu).
 */
const NAV_BUTTON_CLASS = cn(
  'px-1.5 group-data-[collapsible=icon]:p-1.5! [&>svg:first-child]:size-5 [&>svg]:stroke-[1.75]',
  // Quiet at rest, full ink on hover and for the current page / the section
  // that owns it (`data-current`), so where you are reads at a glance even with
  // the section folded.
  'text-sidebar-foreground/80 [&>svg:first-child]:text-muted-foreground',
  'hover:[&>svg:first-child]:text-sidebar-accent-foreground',
  'data-[active=true]:[&>svg:first-child]:text-sidebar-accent-foreground',
  'data-[current=true]:font-medium data-[current=true]:text-sidebar-foreground data-[current=true]:[&>svg:first-child]:text-sidebar-foreground',
  // Rail: everything but the icon (label, badge, chevron) goes at once, so a
  // label is never half-clipped while the sidebar animates.
  'group-data-[collapsible=icon]:[&>:not(svg:first-child)]:opacity-0'
)

/** Second-level rows: smaller and lighter than their section header. */
const SUB_BUTTON_CLASS = cn(
  'h-auto min-h-7 w-full py-1 text-[13px] text-sidebar-foreground/80 [&>svg]:stroke-[1.75]',
  '[&>svg:first-child]:text-muted-foreground hover:[&>svg:first-child]:text-sidebar-accent-foreground',
  'data-[active=true]:font-medium data-[active=true]:[&>svg:first-child]:text-sidebar-accent-foreground',
  // Stay laid out while the parent collapse animates shut on the rail.
  'group-data-[collapsible=icon]:flex'
)

/**
 * The guide rail under a section: its 1px line sits under the parent icon's
 * centre (6px inset + 10px half-icon), and its rows start where the parent's
 * label starts. No end margin or padding, so every level runs to the same right
 * edge instead of losing ~24px of label room per level of nesting.
 */
const SUB_MENU_CLASS =
  'ms-[15px] me-0 pe-0 translate-x-0 gap-0.5 py-1 group-data-[collapsible=icon]:flex'

/**
 * Sub-row label: wraps to a second line rather than truncating, so a long name
 * ("Assignment Rules", "SCIM Provisioning") stays readable in the narrow rail.
 * `!` beats the sub-button's own `[&>span:last-child]:truncate`.
 */
const SUB_LABEL_CLASS = 'flex-1 whitespace-normal! text-start leading-snug text-pretty'

/**
 * Height-animated disclosure (grid-rows 0fr↔1fr). The content stays mounted so
 * the same element animates both an accordion toggle and the rail collapse,
 * instead of popping in or out; it is `inert` while closed.
 */
function AnimatedCollapse({
  open,
  id,
  children,
}: {
  open: boolean
  id?: string
  children: ReactNode
}) {
  return (
    <div
      id={id}
      inert={!open}
      className={cn(
        // Linear 200ms: the same curve as the sidebar's own width animation, so a
        // rail collapse reads as one motion rather than two competing ones.
        'grid transition-[grid-template-rows,opacity] duration-200 ease-linear motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

/**
 * A quiet label (or a plain divider when unlabelled) between clusters of nav
 * rows. It keeps the same height in both sidebar states — on the rail the text
 * fades out and a hairline shows instead — so nothing below it moves.
 */
export function NavClusterLabel({ label }: { label?: string }) {
  return (
    <div
      role={label ? undefined : 'separator'}
      className="relative flex h-7 shrink-0 items-end px-1.5 pb-1"
    >
      {label ? (
        <span className="truncate text-[11px] font-medium tracking-wider text-muted-foreground uppercase transition-opacity group-data-[collapsible=icon]:opacity-0">
          {label}
        </span>
      ) : null}
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-1.5 top-1/2 h-px bg-sidebar-border transition-opacity',
          label && 'opacity-0 group-data-[collapsible=icon]:opacity-100'
        )}
      />
    </div>
  )
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

  // Every titled CTEM section renders as a collapsible header (icon + label +
  // chevron) that auto-opens when it owns the active route and stays collapsed
  // otherwise — so the sidebar shows the product's shape at the top level and
  // only the relevant section's items expand, instead of one long always-open
  // list. In the collapsed icon-rail NavSection flips to a dropdown flyout so
  // the whole tree is still reachable from the icon.
  return (
    <SidebarMenu>
      <NavSection title={title} icon={icon} items={items} dynamicBadges={dynamicBadges} />
    </SidebarMenu>
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
          className={cn(NAV_BUTTON_CLASS, 'cursor-not-allowed opacity-60')}
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
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(pathname, item)}
        tooltip={item.title}
        className={NAV_BUTTON_CLASS}
      >
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
  const rail = state === 'collapsed' && !isMobile
  const pathname = usePathname()
  const { t } = useTranslation()
  const contentId = useId()
  const label = t(groupTitleKey(title), title)

  const sectionActive = useMemo(() => sectionHasActiveRoute(pathname, items), [pathname, items])
  const activeLeafUrl = useMemo(
    () =>
      activeSubItemUrl(
        pathname,
        items.filter((i): i is NavLink => !('items' in i))
      ),
    [pathname, items]
  )

  // Open by default when the section owns the current page, and re-open when the
  // user navigates into it; leaving a section never forces it shut.
  const [open, setOpen] = useState(sectionActive)
  const [prevActive, setPrevActive] = useState(sectionActive)
  if (sectionActive !== prevActive) {
    setPrevActive(sectionActive)
    if (sectionActive) setOpen(true)
  }

  return (
    <SidebarMenuItem>
      {rail ? (
        <NavSectionRailMenu
          label={label}
          icon={SectionIcon}
          items={items}
          sectionActive={sectionActive}
          dynamicBadges={dynamicBadges}
        />
      ) : (
        <SidebarMenuButton
          tooltip={label}
          aria-expanded={open}
          aria-controls={contentId}
          data-current={sectionActive}
          onClick={() => setOpen((o) => !o)}
          className={NAV_BUTTON_CLASS}
        >
          {SectionIcon && <SectionIcon />}
          <span>{label}</span>
          <ChevronRight
            className={cn(
              'ms-auto size-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none rtl:rotate-180',
              open && 'rotate-90 rtl:rotate-90'
            )}
          />
        </SidebarMenuButton>
      )}
      {/* Same element in both states, so collapsing the rail animates the open
          section shut instead of dropping it (and jumping the rows below). */}
      <AnimatedCollapse id={contentId} open={open && !rail}>
        <SidebarMenuSub className={SUB_MENU_CLASS}>
          {items.map((item) =>
            'items' in item ? (
              <NavSubCollapsible key={item.title} item={item} dynamicBadges={dynamicBadges} />
            ) : (
              <NavSubLeaf
                key={`${item.title}-${String(item.url)}`}
                item={item}
                dynamicBadges={dynamicBadges}
                active={item.url === activeLeafUrl}
              />
            )
          )}
        </SidebarMenuSub>
      </AnimatedCollapse>
    </SidebarMenuItem>
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
  nested = false,
  active,
}: {
  item: NavLink
  dynamicBadges: DynamicBadges
  /**
   * Third level (inside a subsection). These rows are text-only: their icons
   * mostly repeat the parent's, and dropping them gives the label back ~24px.
   */
  nested?: boolean
  /**
   * Whether this row is the current page. Siblings are resolved together by the
   * parent (longest matching url wins), so an "Overview" at `/exposures` does not
   * light up alongside `/exposures/misconfigurations`.
   */
  active?: boolean
}) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const badge = getBadgeValue(dynamicBadges, item.url as string, item.badge)
  const releaseStatusBadge = getReleaseStatusBadge(item.releaseStatus)
  const isComingSoon = item.releaseStatus === 'coming_soon'

  if (isComingSoon) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton className={cn(SUB_BUTTON_CLASS, 'cursor-not-allowed opacity-60')}>
          {!nested && item.icon && <item.icon className="shrink-0" />}
          <span className={SUB_LABEL_CLASS}>
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
      <SidebarMenuSubButton
        asChild
        isActive={active ?? checkIsActive(pathname, item)}
        className={SUB_BUTTON_CLASS}
      >
        <Link href={item.url} prefetch={false} onClick={() => setOpenMobile(false)}>
          {!nested && item.icon && <item.icon className="shrink-0" />}
          <span className={SUB_LABEL_CLASS}>
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
  const contentId = useId()

  const filteredItems = useFilteredSubItems(item.items, item.module, subModules)
  const activeSubUrl = useMemo(
    () => activeSubItemUrl(pathname, filteredItems),
    [pathname, filteredItems]
  )
  const hasActive = activeSubUrl !== undefined

  const [open, setOpen] = useState(hasActive)
  const [prevActive, setPrevActive] = useState(hasActive)
  if (hasActive !== prevActive) {
    setPrevActive(hasActive)
    if (hasActive) setOpen(true)
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild className={cn(SUB_BUTTON_CLASS, 'cursor-pointer')}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          data-active={hasActive && !open}
          onClick={() => setOpen((o) => !o)}
        >
          {item.icon && <item.icon className="shrink-0" />}
          <span className={SUB_LABEL_CLASS}>
            <NavLabel title={item.title} />
          </span>
          {releaseStatusBadge && (
            <NavBadge variant={releaseStatusBadge.variant}>{releaseStatusBadge.text}</NavBadge>
          )}
          <ChevronRight
            className={cn(
              'ms-auto size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none rtl:rotate-180',
              open && 'rotate-90 rtl:rotate-90'
            )}
          />
        </button>
      </SidebarMenuSubButton>
      <AnimatedCollapse id={contentId} open={open}>
        <SidebarMenuSub className={SUB_MENU_CLASS}>
          {filteredItems.map((sub) => (
            <NavSubLeaf
              key={sub.title}
              item={sub}
              dynamicBadges={dynamicBadges}
              nested
              active={sub.url === activeSubUrl}
            />
          ))}
        </SidebarMenuSub>
      </AnimatedCollapse>
    </SidebarMenuSubItem>
  )
})

NavSubCollapsible.displayName = 'NavSubCollapsible'

/**
 * NavSectionRailMenu - the icon-rail representation of a section.
 * The section header becomes an icon button; its whole tree lives in a
 * dropdown (nested subsections become dropdown sub-menus) so nothing is lost
 * when the sidebar is collapsed.
 */
const NavSectionRailMenu = memo(function NavSectionRailMenu({
  label,
  icon: SectionIcon,
  items,
  sectionActive,
  dynamicBadges,
}: {
  label: string
  icon?: ElementType
  items: NavItem[]
  sectionActive: boolean
  dynamicBadges: DynamicBadges
}) {
  const pathname = usePathname()
  const activeLeafUrl = activeSubItemUrl(
    pathname,
    items.filter((i): i is NavLink => !('items' in i))
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          tooltip={label}
          aria-label={label}
          isActive={sectionActive}
          className={NAV_BUTTON_CLASS}
        >
          {SectionIcon && <SectionIcon />}
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={8} className="min-w-52">
        <DropdownMenuLabel className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {label}
        </DropdownMenuLabel>
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
              dynamicBadges={dynamicBadges}
              active={item.url === activeLeafUrl}
            />
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

NavSectionRailMenu.displayName = 'NavSectionRailMenu'

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
  const activeUrl = activeSubItemUrl(pathname, filteredItems)

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
              dynamicBadges={dynamicBadges}
              active={sub.url === activeUrl}
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
  dynamicBadges,
  active,
}: {
  item: NavLink
  dynamicBadges: DynamicBadges
  active: boolean
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
      <Link href={item.url} prefetch={false} className={cn(active && 'bg-accent font-medium')}>
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
