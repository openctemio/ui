/**
 * Permission Gate Component
 *
 * Conditionally renders children based on user permissions.
 * Uses the PermissionProvider for permission data.
 *
 * @example
 * ```tsx
 * // Single permission
 * <PermissionGate permission="assets:write">
 *   <EditButton />
 * </PermissionGate>
 *
 * // Any of multiple permissions
 * <PermissionGate anyOf={['assets:write', 'assets:delete']}>
 *   <ActionMenu />
 * </PermissionGate>
 *
 * // All permissions required
 * <PermissionGate allOf={['assets:write', 'assets:delete']}>
 *   <BulkDeleteButton />
 * </PermissionGate>
 *
 * // With fallback
 * <PermissionGate permission="assets:write" fallback={<DisabledButton />}>
 *   <EditButton />
 * </PermissionGate>
 * ```
 */

'use client'

import * as React from 'react'
import { usePermissions } from '@/context/permission-provider'

// ============================================
// TYPES
// ============================================

interface BasePermissionGateProps {
  /** Content to render when permission is denied */
  fallback?: React.ReactNode
  /** Content to render when loading */
  loadingFallback?: React.ReactNode
  /** Children to render when permission is granted */
  children: React.ReactNode
}

interface SinglePermissionProps extends BasePermissionGateProps {
  /** Single permission to check */
  permission: string
  anyOf?: never
  allOf?: never
}

interface AnyOfPermissionsProps extends BasePermissionGateProps {
  /** Check if user has any of these permissions */
  anyOf: string[]
  permission?: never
  allOf?: never
}

interface AllOfPermissionsProps extends BasePermissionGateProps {
  /** Check if user has all of these permissions */
  allOf: string[]
  permission?: never
  anyOf?: never
}

export type PermissionGateProps =
  | SinglePermissionProps
  | AnyOfPermissionsProps
  | AllOfPermissionsProps

// ============================================
// COMPONENT
// ============================================

export function PermissionGate(props: PermissionGateProps) {
  const { children, fallback = null, loadingFallback = null } = props
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions()

  // Show loading fallback while permissions are being fetched
  if (isLoading) {
    return <>{loadingFallback}</>
  }

  // Check permission based on prop type
  let hasAccess = false

  if ('permission' in props && props.permission) {
    hasAccess = hasPermission(props.permission)
  } else if ('anyOf' in props && props.anyOf) {
    hasAccess = hasAnyPermission(props.anyOf)
  } else if ('allOf' in props && props.allOf) {
    hasAccess = hasAllPermissions(props.allOf)
  }

  // Render children or fallback based on access
  return <>{hasAccess ? children : fallback}</>
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to check a single permission
 * @param permission Permission to check
 * @returns Whether the user has the permission
 */
export function useHasPermission(permission: string): boolean {
  const { hasPermission, isLoading } = usePermissions()
  if (isLoading) return false
  return hasPermission(permission)
}

/**
 * Hook to check if user has any of the specified permissions
 * @param permissions Permissions to check
 * @returns Whether the user has any of the permissions
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const { hasAnyPermission, isLoading } = usePermissions()
  if (isLoading) return false
  return hasAnyPermission(permissions)
}

/**
 * Hook to check if user has all of the specified permissions
 * @param permissions Permissions to check
 * @returns Whether the user has all of the permissions
 */
export function useHasAllPermissions(permissions: string[]): boolean {
  const { hasAllPermissions, isLoading } = usePermissions()
  if (isLoading) return false
  return hasAllPermissions(permissions)
}
