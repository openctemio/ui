/**
 * App Configuration Barrel Export
 *
 * Centralized exports for application-level configuration
 * This folder contains shared config used across multiple features
 */

export { sidebarData } from './sidebar-data'

// Route permissions configuration.
// isProtectedRoute was moved to features/auth/constants/routes.ts
// during the module-catalog refactor; import it from '@/features/auth'
// if you need the auth-gating predicate.
export {
  routePermissions,
  matchRoutePermission,
  getRoutesForPermission,
  type RoutePermissionConfig,
} from './route-permissions'

// Re-export types for convenience
export type { SidebarData, NavGroup, NavItem, Team, User } from '@/components/types'
