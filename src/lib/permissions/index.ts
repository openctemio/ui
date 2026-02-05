/**
 * Permission System
 *
 * Provides granular permission checking for UI components.
 * Permissions are extracted from the JWT token and used to
 * conditionally render UI elements.
 *
 * @example
 * ```tsx
 * const { can, permissions } = usePermissions()
 *
 * // Check single permission
 * {can('assets:read') && <MenuItem>Assets</MenuItem>}
 *
 * // Check with constant
 * {can(Permission.AssetsWrite) && <Button>Create Asset</Button>}
 * ```
 */

// Permission exports
export {
  Permission,
  type PermissionString,
  PermissionGroups,
  AllPermissions,
  isValidPermission,
  PermissionLabels,
  getPermissionLabel,
} from './constants'

// Role exports
export { Role, type RoleString, AllRoles, isValidRole, RoleHierarchy, isRoleAtLeast, RolePermissions } from './constants'

// Hooks
export { usePermissions, useHasPermission, useHasAnyPermission, useHasAllPermissions } from './hooks'

// Components
export { Can, Cannot, type CanProps, type CannotProps, type PermissionMode } from './can'

// Sidebar utilities
export { useFilteredSidebarData } from './use-filtered-sidebar'
