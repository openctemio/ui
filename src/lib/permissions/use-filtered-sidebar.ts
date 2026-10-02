'use client'

/**
 * Hook to filter sidebar navigation based on user permissions, roles, and modules
 *
 * This hook takes the full sidebar data and returns a filtered version
 * that only includes items the current user has permission/role/module to view.
 *
 * Supports four types of access control:
 * 1. module - Licensing-based module access (e.g., 'findings', 'scans')
 * 2. permission - Granular feature-based access (e.g., 'assets:read')
 * 3. role - Exact role match (e.g., 'owner')
 * 4. minRole - Minimum role level (e.g., 'admin' means admin and owner)
 *
 * Module Mapping:
 * - dashboard: Dashboard
 * - assets: Asset Inventory, Asset Groups
 * - findings: Exposures, Findings, Threat Intel, Risk Analysis, Business Impact
 * - scans: Scans, Scan Profiles, Tools, Sensors
 * - reports: Reports
 * - audit: Audit Log
 * - components: Components (SBOM)
 * - pentest: Penetration Testing, Attack Simulation, Control Testing
 * - credentials: Credential Leaks
 * - remediation: Remediation Tasks, Workflows
 */

import { useCallback, useMemo } from 'react'
import { usePermissions } from './hooks'
import { isRoleAtLeast, type RoleString } from './constants'
import { useBootstrapModules } from '@/context/bootstrap-provider'
import type {
  SidebarData,
  NavGroup,
  NavItem,
  NavCollapsible,
  NavLink,
  ReleaseStatus,
} from '@/components/types'

interface AccessCheckFunctions {
  can: (perm: string) => boolean
  canAny: (...perms: string[]) => boolean
  isRole: (role: string) => boolean
  isAnyRole: (...roles: string[]) => boolean
  tenantRole: string | undefined
  hasModule: (moduleId: string) => boolean
  getModuleReleaseStatus: (moduleId: string) => ReleaseStatus | undefined
  isModuleActive: (moduleId: string) => boolean
}

interface FilteredSidebarResult {
  data: SidebarData
  isLoading: boolean
  isModulesLoading: boolean
}

/**
 * Check if user has access to a nav item
 * Supports module, permission, role, and minRole checks
 *
 * Note: Coming soon modules are NOT filtered out - they're shown with releaseStatus
 */
function hasItemAccess(
  item: {
    module?: string
    permission?: string | string[]
    role?: string | string[]
    minRole?: string
  },
  checks: AccessCheckFunctions
): boolean {
  const {
    can,
    canAny,
    isRole,
    isAnyRole,
    tenantRole,
    hasModule,
    getModuleReleaseStatus,
    isModuleActive,
  } = checks

  // Check module access (licensing layer)
  if (item.module) {
    const releaseStatus = getModuleReleaseStatus(item.module)

    // If module is coming_soon or beta, always show it (will be marked in UI)
    if (releaseStatus === 'coming_soon' || releaseStatus === 'beta') {
      return true
    }

    // If module is not active (admin disabled), hide it
    if (!isModuleActive(item.module)) {
      return false
    }

    // If module is not in tenant's plan, hide it
    if (!hasModule(item.module)) {
      return false
    }
  }

  // Check minRole (role hierarchy)
  if (item.minRole && tenantRole) {
    if (!isRoleAtLeast(tenantRole, item.minRole as RoleString)) {
      return false
    }
  } else if (item.minRole && !tenantRole) {
    return false
  }

  // Check exact role match
  if (item.role) {
    if (Array.isArray(item.role)) {
      if (!isAnyRole(...item.role)) {
        return false
      }
    } else {
      if (!isRole(item.role)) {
        return false
      }
    }
  }

  // Check permission
  if (item.permission) {
    if (Array.isArray(item.permission)) {
      if (!canAny(...item.permission)) {
        return false
      }
    } else {
      if (!can(item.permission)) {
        return false
      }
    }
  }

  // All checks passed (or no checks required)
  return true
}

/**
 * Filter a single nav item based on access rules
 * Returns null if item should be hidden
 * Sets releaseStatus based on module status from backend
 */
function filterNavItem(item: NavItem, checks: AccessCheckFunctions): NavItem | null {
  // Check if user has access to this item
  if (!hasItemAccess(item, checks)) {
    return null
  }

  // Get release status for this item's module
  const releaseStatus = item.module ? checks.getModuleReleaseStatus(item.module) : undefined

  // If it's a collapsible item with sub-items, filter those too
  if ('items' in item) {
    const filteredSubItems = item.items
      .filter((subItem) => hasItemAccess(subItem, checks))
      .map((subItem) => ({
        ...subItem,
        // Inherit parent's releaseStatus if sub-item doesn't have its own module
        releaseStatus: subItem.module
          ? checks.getModuleReleaseStatus(subItem.module)
          : releaseStatus,
      }))

    // If no sub-items remain after filtering, hide the parent
    if (filteredSubItems.length === 0) {
      return null
    }

    return {
      ...item,
      releaseStatus,
      items: filteredSubItems,
    } as NavCollapsible
  }

  // A row whose section tabs carry their own gates (Business context: Crown
  // jewels | Services | Units are three modules) shows the tabs the user may
  // open, links to the first of them when its own page is gated off, and hides
  // when none is left.
  if (item.sections?.some(isGatedSection)) {
    const sections = visibleSections(item.sections, (s) => hasItemAccess(s, checks))
    if (sections.length === 0) return null
    return {
      ...item,
      releaseStatus,
      url: rowUrlForSections(item.url, item.sections, sections),
      sections,
    } as NavLink
  }

  // It's a regular link item
  return {
    ...item,
    releaseStatus,
  } as NavLink
}

type GatedSection = { href: string; module?: string; permission?: string | string[] }

function isGatedSection(section: GatedSection): boolean {
  return section.module !== undefined || section.permission !== undefined
}

/** The section tabs `allowed` lets through, in order. Pure, for the tests. */
export function visibleSections<T extends GatedSection>(
  sections: readonly T[],
  allowed: (section: T) => boolean
): T[] {
  return sections.filter((s) => !isGatedSection(s) || allowed(s))
}

/**
 * Where a sectioned row links once some of its tabs are hidden: its own url
 * while that tab is visible (or the url is not one of the tabs), else the first
 * visible tab, so the row never opens a "Feature not available" page.
 */
export function rowUrlForSections(
  url: NavLink['url'],
  all: readonly GatedSection[],
  visible: readonly GatedSection[]
): NavLink['url'] {
  if (typeof url !== 'string') return url
  const ownTab = all.some((s) => s.href === url)
  if (!ownTab || visible.some((s) => s.href === url)) return url
  return visible[0]?.href ?? url
}

/**
 * Filter a nav group based on access rules
 * Returns null if group should be hidden (no visible items)
 */
function filterNavGroup(group: NavGroup, checks: AccessCheckFunctions): NavGroup | null {
  const filteredItems = group.items
    .map((item) => filterNavItem(item, checks))
    .filter((item): item is NavItem => item !== null)

  // If no items remain after filtering, hide the group
  if (filteredItems.length === 0) {
    return null
  }

  return {
    ...group,
    items: filteredItems,
  }
}

/**
 * Hook to get sidebar data filtered by user permissions and roles
 *
 * Returns filtered sidebar data along with loading states.
 * When modules are loading, returns only Dashboard to prevent flash of all content.
 *
 * @example
 * ```tsx
 * function AppSidebar() {
 *   const { data: filteredData, isLoading } = useFilteredSidebarData(sidebarData)
 *
 *   if (isLoading) return <SidebarSkeleton />
 *
 *   return (
 *     <Sidebar>
 *       {filteredData.navGroups.map((group) => (
 *         <NavGroup key={group.title} {...group} />
 *       ))}
 *     </Sidebar>
 *   )
 * }
 * ```
 */
/**
 * The access checks every nav surface shares (main sidebar, settings rail,
 * command palette): permissions, roles, and the tenant's modules (fail-open
 * when the API sent no module list, i.e. the OSS edition).
 */
function useAccessChecks(): AccessCheckFunctions {
  const { can, canAny, isRole, isAnyRole, tenantRole } = usePermissions()
  const { moduleIds, modules } = useBootstrapModules()

  // Create helper functions for module access
  const moduleHelpers = useMemo(() => {
    // Get module by ID from the modules array
    const getModule = (moduleId: string) =>
      modules.find((m) => m.id === moduleId || m.slug === moduleId)

    // Get release status for a module
    const getModuleReleaseStatus = (moduleId: string): ReleaseStatus | undefined => {
      const mod = getModule(moduleId)
      return mod?.release_status
    }

    // Check if module is active (admin toggle)
    const isModuleActive = (moduleId: string): boolean => {
      const mod = getModule(moduleId)
      // If module not found, assume active (fail-open)
      return mod?.is_active ?? true
    }

    // Check if tenant has access to module
    // OSS edition: When no module data from API, all modules are available
    const hasModule = (moduleId: string): boolean => {
      // If moduleIds has data from API, use it to filter
      if (moduleIds.length > 0) {
        return moduleIds.includes(moduleId)
      }

      // OSS edition: No module restrictions - all features available
      // Backend will still enforce authorization via permissions
      return true
    }

    return { hasModule, getModuleReleaseStatus, isModuleActive }
  }, [modules, moduleIds])

  return useMemo(
    () => ({
      can,
      canAny,
      isRole,
      isAnyRole,
      tenantRole,
      hasModule: moduleHelpers.hasModule,
      getModuleReleaseStatus: moduleHelpers.getModuleReleaseStatus,
      isModuleActive: moduleHelpers.isModuleActive,
    }),
    [can, canAny, isRole, isAnyRole, tenantRole, moduleHelpers]
  )
}

/**
 * Whether the current user may see a nav entry with these access rules. The
 * same decision the main sidebar makes, for nav surfaces that are not built
 * from `SidebarData` (the settings rail).
 */
export function useNavItemAccess(): (item: {
  module?: string
  permission?: string | string[]
  role?: string | string[]
  minRole?: string
}) => boolean {
  const checks = useAccessChecks()
  return useCallback((item) => hasItemAccess(item, checks), [checks])
}

/**
 * The section tabs the current user may open: the same module + permission
 * decision as the sidebar row that carries them. Ungated tabs always pass.
 */
export function useVisibleSectionTabs<T extends GatedSection>(tabs: readonly T[]): T[] {
  const checks = useAccessChecks()
  return useMemo(() => visibleSections(tabs, (s) => hasItemAccess(s, checks)), [tabs, checks])
}

export function useFilteredSidebarData(sidebarData: SidebarData): FilteredSidebarResult {
  const checks = useAccessChecks()

  const result = useMemo(() => {
    // TenantGate already waits for bootstrap + permissions
    // So when Sidebar renders, data is ready - just filter
    const filteredNavGroups = sidebarData.navGroups
      .map((group) => filterNavGroup(group, checks))
      .filter((group): group is NavGroup => group !== null)

    return {
      ...sidebarData,
      navGroups: filteredNavGroups,
    }
  }, [sidebarData, checks])

  // TenantGate handles loading - these are always false when Sidebar renders
  return {
    data: result,
    isLoading: false,
    isModulesLoading: false,
  }
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useFilteredSidebarData and destructure { data } instead
 */
export function useFilteredSidebarDataLegacy(sidebarData: SidebarData): SidebarData {
  const { data } = useFilteredSidebarData(sidebarData)
  return data
}
