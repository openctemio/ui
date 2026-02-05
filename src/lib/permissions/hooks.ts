'use client'

/**
 * Permission & Role Hooks
 *
 * React hooks for checking user permissions and roles in components.
 * Permissions are now fetched from the PermissionProvider (real-time sync).
 *
 * Use permissions for granular feature access (e.g., "can write assets")
 * Use roles for high-level access checks (e.g., "is owner or admin")
 */

import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useTenant } from '@/context/tenant-provider'
import { usePermissionsSafe } from '@/context/permission-provider'
import { type PermissionString, type RoleString, Role, isRoleAtLeast } from './constants'

// Cookie-based permissions removed - now using PermissionProvider for real-time sync

/**
 * Hook to access permissions, roles, and check functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { can, canAny, isRole, isAtLeast, permissions } = usePermissions()
 *
 *   return (
 *     <div>
 *       {can('assets:read') && <AssetList />}
 *       {can('assets:write') && <CreateAssetButton />}
 *       {isRole('owner') && <DeleteTenantButton />}
 *       {isAtLeast('admin') && <AdminPanel />}
 *     </div>
 *   )
 * }
 * ```
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user)
  const { currentTenant } = useTenant()

  // Get permissions from the new PermissionProvider (real-time sync)
  // usePermissionsSafe returns empty array when outside PermissionProvider
  const { permissions: providerPermissions, isLoading: permissionsLoading } = usePermissionsSafe()

  // Get tenant role from auth store first, then fall back to tenant context
  // This is needed because the auth store may be empty when the page first loads
  // (access token is in httpOnly cookie, not directly accessible by JS)
  const tenantRole = user?.tenantRole || currentTenant?.role

  // Get permissions - priority order:
  // 1. From PermissionProvider (real-time sync from API) - THE SOURCE OF TRUTH
  // 2. From JWT token (user.permissions) - only if PermissionProvider not available
  // 3. Empty array - no fallback to RolePermissions to avoid showing stale UI
  //
  // IMPORTANT: We removed the RolePermissions fallback because:
  // - It caused stale UI when user's RBAC permissions were revoked
  // - The predefined RolePermissions for 'member' had many permissions by default
  // - PermissionProvider should be the only source of truth for RBAC
  const permissions = useMemo(() => {
    // Priority 1: Use permissions from PermissionProvider (real-time sync)
    // This is the source of truth for RBAC - synced from Redis cache
    // Even if empty, trust it (user might have no permissions assigned)
    if (providerPermissions.length > 0) {
      return providerPermissions
    }

    // If PermissionProvider is done loading but returned empty,
    // that means user truly has no permissions - don't fallback
    if (!permissionsLoading && providerPermissions.length === 0) {
      // Check if we're inside PermissionProvider context
      // If permissionsLoading was ever set, we're inside the provider
      // Return empty to respect the API response
      return []
    }

    // Priority 2: Use permissions from JWT token (auth store)
    // Only used when PermissionProvider is still loading or not available
    if (user?.permissions && user.permissions.length > 0) {
      return user.permissions
    }

    // Priority 3: No permissions available
    // This happens when:
    // - User hasn't logged in yet
    // - PermissionProvider is still loading
    // - No permissions in JWT token
    // We intentionally do NOT fallback to RolePermissions anymore
    return []
  }, [providerPermissions, user, permissionsLoading])

  // ============================================
  // PERMISSION CHECKS
  // ============================================

  /**
   * Check if user has a specific permission
   *
   * IMPORTANT: No longer bypasses for Owner/Admin!
   * Permissions are now the source of truth from the API.
   * Owner role has 215 permissions, Admin has 213 - they don't need bypass.
   * This ensures RBAC is properly enforced and custom roles work correctly.
   *
   * For owner-only operations (team delete, billing), check isOwner() separately.
   */
  const can = (permission: PermissionString | string): boolean => {
    return permissions.includes(permission)
  }

  /**
   * Check if user has any of the specified permissions
   */
  const canAny = (...perms: (PermissionString | string)[]): boolean => {
    return perms.some((p) => permissions.includes(p))
  }

  /**
   * Check if user has all of the specified permissions
   */
  const canAll = (...perms: (PermissionString | string)[]): boolean => {
    return perms.every((p) => permissions.includes(p))
  }

  /**
   * Check if user cannot perform an action (inverse of can)
   */
  const cannot = (permission: PermissionString | string): boolean => {
    return !can(permission)
  }

  // ============================================
  // ROLE CHECKS
  // ============================================

  /**
   * Check if user has a specific role
   * Use this for owner-only or admin-only operations
   *
   * @example
   * ```tsx
   * {isRole('owner') && <DeleteTenantButton />}
   * {isRole(Role.Owner) && <DeleteTenantButton />}
   * ```
   */
  const isRole = (role: RoleString | string): boolean => {
    return tenantRole === role
  }

  /**
   * Check if user has any of the specified roles
   *
   * @example
   * ```tsx
   * {isAnyRole('owner', 'admin') && <ManageMembers />}
   * ```
   */
  const isAnyRole = (...roles: (RoleString | string)[]): boolean => {
    return tenantRole ? roles.includes(tenantRole) : false
  }

  /**
   * Check if user's role is at least the specified level
   * Based on role hierarchy: viewer < member < admin < owner
   *
   * @example
   * ```tsx
   * {isAtLeast('admin') && <AdminPanel />}
   * {isAtLeast(Role.Member) && <WriteFeatures />}
   * ```
   */
  const isAtLeast = (role: RoleString): boolean => {
    return tenantRole ? isRoleAtLeast(tenantRole, role) : false
  }

  /**
   * Check if user is owner
   * Shortcut for isRole('owner')
   */
  const isOwner = (): boolean => {
    return tenantRole === Role.Owner
  }

  /**
   * Check if user is admin or higher (owner)
   * Shortcut for isAtLeast('admin')
   */
  const isAdmin = (): boolean => {
    return isAtLeast(Role.Admin)
  }

  return {
    // User info
    permissions,
    tenantId: user?.tenantId || currentTenant?.id,
    tenantRole,

    // Loading state - true when permissions are still being fetched
    isLoading: permissionsLoading,

    // Permission checks
    can,
    canAny,
    canAll,
    cannot,

    // Role checks
    isRole,
    isAnyRole,
    isAtLeast,
    isOwner,
    isAdmin,
  }
}

/**
 * Hook to check a single permission
 * Optimized for components that only need one permission check
 *
 * @example
 * ```tsx
 * function DeleteButton() {
 *   const canDelete = useHasPermission('assets:delete')
 *   if (!canDelete) return null
 *   return <Button>Delete</Button>
 * }
 * ```
 */
export function useHasPermission(permission: PermissionString | string): boolean {
  const { can } = usePermissions()
  return can(permission)
}

/**
 * Hook to check if user has any of the specified permissions
 *
 * @example
 * ```tsx
 * function WriteActions() {
 *   const canWrite = useHasAnyPermission('assets:write', 'projects:write')
 *   if (!canWrite) return null
 *   return <WriteToolbar />
 * }
 * ```
 */
export function useHasAnyPermission(...perms: (PermissionString | string)[]): boolean {
  const { canAny } = usePermissions()
  return canAny(...perms)
}

/**
 * Hook to check if user has all of the specified permissions
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const isAdmin = useHasAllPermissions('members:manage', 'team:update')
 *   if (!isAdmin) return null
 *   return <AdminTools />
 * }
 * ```
 */
export function useHasAllPermissions(...perms: (PermissionString | string)[]): boolean {
  const { canAll } = usePermissions()
  return canAll(...perms)
}
