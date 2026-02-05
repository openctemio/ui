/**
 * usePermissions Hook
 *
 * Hook for checking user permissions in the UI.
 * Permissions are extracted from the JWT token and stored in the auth store.
 *
 * @example
 * // Check a single permission
 * const { hasPermission } = usePermissions()
 * if (hasPermission('assets:read')) { ... }
 *
 * @example
 * // Check multiple permissions (any)
 * const { hasAnyPermission } = usePermissions()
 * if (hasAnyPermission(['assets:read', 'assets:write'])) { ... }
 *
 * @example
 * // Check multiple permissions (all)
 * const { hasAllPermissions } = usePermissions()
 * if (hasAllPermissions(['assets:read', 'assets:write'])) { ... }
 *
 * @example
 * // Get all permissions
 * const { permissions } = usePermissions()
 * console.log(permissions) // ['assets:read', 'assets:write', ...]
 */

'use client'

import { useCallback, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'

// ============================================
// TYPES
// ============================================

export interface UsePermissionsReturn {
  /** Array of all user permissions */
  permissions: string[]

  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean

  /** Check if user has any of the specified permissions */
  hasAnyPermission: (permissions: string[]) => boolean

  /** Check if user has all of the specified permissions */
  hasAllPermissions: (permissions: string[]) => boolean

  /** Check if user can read a resource */
  canRead: (resource: string) => boolean

  /** Check if user can write to a resource */
  canWrite: (resource: string) => boolean

  /** Check if user can delete a resource */
  canDelete: (resource: string) => boolean

  /** Whether the user is authenticated (has permissions loaded) */
  isAuthenticated: boolean

  /** User's tenant role (owner, admin, member, viewer) */
  tenantRole: string | undefined

  /** Check if user is tenant admin (owner or admin role) */
  isTenantAdmin: boolean
}

// ============================================
// HOOK
// ============================================

/**
 * Main permissions hook
 *
 * Provides permission checking utilities based on user's JWT token claims.
 * Permissions are stored in the auth store and extracted from the access token.
 */
export function usePermissions(): UsePermissionsReturn {
  // Get user from auth store
  const user = useAuthStore((state) => state.user)
  const status = useAuthStore((state) => state.status)

  // Memoize permissions array
  const permissions = useMemo(() => {
    return user?.permissions || []
  }, [user?.permissions])

  // Check if user is authenticated
  const isAuthenticated = status === 'authenticated' && !!user

  // Get tenant role
  const tenantRole = user?.tenantRole

  // Check if user is tenant admin
  const isTenantAdmin = tenantRole === 'owner' || tenantRole === 'admin'

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      // Tenant admins (owner/admin) have all permissions
      if (isTenantAdmin) {
        return true
      }
      return permissions.includes(permission)
    },
    [permissions, isTenantAdmin]
  )

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (permsToCheck: string[]): boolean => {
      // Tenant admins have all permissions
      if (isTenantAdmin) {
        return true
      }
      return permsToCheck.some((perm) => permissions.includes(perm))
    },
    [permissions, isTenantAdmin]
  )

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permsToCheck: string[]): boolean => {
      // Tenant admins have all permissions
      if (isTenantAdmin) {
        return true
      }
      return permsToCheck.every((perm) => permissions.includes(perm))
    },
    [permissions, isTenantAdmin]
  )

  /**
   * Check if user can read a resource
   * Checks for both `{resource}:read` permission
   */
  const canRead = useCallback(
    (resource: string): boolean => {
      return hasPermission(`${resource}:read`)
    },
    [hasPermission]
  )

  /**
   * Check if user can write to a resource
   * Checks for `{resource}:write` permission
   */
  const canWrite = useCallback(
    (resource: string): boolean => {
      return hasPermission(`${resource}:write`)
    },
    [hasPermission]
  )

  /**
   * Check if user can delete a resource
   * Checks for `{resource}:delete` permission
   */
  const canDelete = useCallback(
    (resource: string): boolean => {
      return hasPermission(`${resource}:delete`)
    },
    [hasPermission]
  )

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canRead,
    canWrite,
    canDelete,
    isAuthenticated,
    tenantRole,
    isTenantAdmin,
  }
}

// ============================================
// SELECTORS (for performance)
// ============================================

/**
 * Select only permissions array from store
 * Use for components that only need the permissions list
 */
export const useUserPermissions = () =>
  useAuthStore((state) => state.user?.permissions || [])

/**
 * Check if user has specific permission (selector)
 * More performant than usePermissions for single permission checks
 *
 * @example
 * const canReadAssets = useHasPermission('assets:read')
 */
export const useHasPermission = (permission: string): boolean => {
  return useAuthStore((state) => {
    const user = state.user
    // Tenant admins have all permissions
    if (user?.tenantRole === 'owner' || user?.tenantRole === 'admin') {
      return true
    }
    return user?.permissions?.includes(permission) || false
  })
}

/**
 * Check if user has any of the specified permissions (selector)
 *
 * @example
 * const canManageAssets = useHasAnyPermission(['assets:write', 'assets:delete'])
 */
export const useHasAnyPermission = (permissions: string[]): boolean => {
  return useAuthStore((state) => {
    const user = state.user
    // Tenant admins have all permissions
    if (user?.tenantRole === 'owner' || user?.tenantRole === 'admin') {
      return true
    }
    return permissions.some((perm) => user?.permissions?.includes(perm) || false)
  })
}

/**
 * Check if user has all of the specified permissions (selector)
 *
 * @example
 * const canFullyManageAssets = useHasAllPermissions(['assets:read', 'assets:write', 'assets:delete'])
 */
export const useHasAllPermissions = (permissions: string[]): boolean => {
  return useAuthStore((state) => {
    const user = state.user
    // Tenant admins have all permissions
    if (user?.tenantRole === 'owner' || user?.tenantRole === 'admin') {
      return true
    }
    return permissions.every((perm) => user?.permissions?.includes(perm) || false)
  })
}

/**
 * Check if user is tenant admin (owner or admin)
 */
export const useIsTenantAdmin = (): boolean => {
  return useAuthStore((state) => {
    const tenantRole = state.user?.tenantRole
    return tenantRole === 'owner' || tenantRole === 'admin'
  })
}

/**
 * Get user's tenant role
 */
export const useTenantRole = (): string | undefined => {
  return useAuthStore((state) => state.user?.tenantRole)
}
