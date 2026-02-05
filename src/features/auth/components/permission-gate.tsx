/**
 * PermissionGate Component
 *
 * Conditionally renders children based on user permissions.
 * Supports two modes:
 * - 'hide' (default): Completely hides content if user lacks permission
 * - 'disable': Shows content but disabled with tooltip explaining why
 *
 * @example
 * // Single permission (hide mode - default)
 * <PermissionGate permission="assets:write">
 *   <Button>Edit Asset</Button>
 * </PermissionGate>
 *
 * @example
 * // Single permission (disable mode)
 * <PermissionGate permission="assets:delete" mode="disable">
 *   <Button>Delete Asset</Button>
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (any)
 * <PermissionGate permissions={['assets:write', 'assets:delete']} requireAll={false}>
 *   <Button>Manage Asset</Button>
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (all)
 * <PermissionGate permissions={['assets:read', 'assets:write']} requireAll>
 *   <Button>Edit Asset</Button>
 * </PermissionGate>
 *
 * @example
 * // With fallback (hide mode only)
 * <PermissionGate permission="admin:access" fallback={<p>Access denied</p>}>
 *   <AdminPanel />
 * </PermissionGate>
 *
 * @example
 * // With custom tooltip (disable mode)
 * <PermissionGate permission="billing:manage" mode="disable" disabledTooltip="Contact your admin">
 *   <BillingButton />
 * </PermissionGate>
 */

'use client'

import {
  type ReactNode,
  type ReactElement,
  cloneElement,
  isValidElement,
  Children,
} from 'react'
import {
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
  useIsTenantAdmin,
} from '../hooks/use-permissions'
import { getPermissionLabel } from '@/lib/permissions/constants'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ============================================
// TYPES
// ============================================

type PermissionMode = 'hide' | 'disable'

interface PermissionGateBaseProps {
  /** Content to render when user has permission */
  children: ReactNode

  /** If true, tenant admins always have access regardless of specific permissions */
  adminOverride?: boolean
}

interface SinglePermissionHideProps extends PermissionGateBaseProps {
  /** Single permission to check */
  permission: string
  permissions?: never
  requireAll?: never
  /** Mode: 'hide' or 'disable' */
  mode?: 'hide'
  /** Content to render when user lacks permission (hide mode only) */
  fallback?: ReactNode
  disabledTooltip?: never
}

interface SinglePermissionDisableProps extends PermissionGateBaseProps {
  /** Single permission to check */
  permission: string
  permissions?: never
  requireAll?: never
  /** Mode: 'hide' or 'disable' */
  mode: 'disable'
  /** Custom tooltip when disabled */
  disabledTooltip?: string
  fallback?: never
}

interface MultiplePermissionsHideProps extends PermissionGateBaseProps {
  /** Multiple permissions to check */
  permissions: string[]
  permission?: never
  /** If true, user must have ALL permissions. If false (default), ANY permission is sufficient */
  requireAll?: boolean
  /** Mode: 'hide' or 'disable' */
  mode?: 'hide'
  /** Content to render when user lacks permission (hide mode only) */
  fallback?: ReactNode
  disabledTooltip?: never
}

interface MultiplePermissionsDisableProps extends PermissionGateBaseProps {
  /** Multiple permissions to check */
  permissions: string[]
  permission?: never
  /** If true, user must have ALL permissions. If false (default), ANY permission is sufficient */
  requireAll?: boolean
  /** Mode: 'hide' or 'disable' */
  mode: 'disable'
  /** Custom tooltip when disabled */
  disabledTooltip?: string
  fallback?: never
}

export type PermissionGateProps =
  | SinglePermissionHideProps
  | SinglePermissionDisableProps
  | MultiplePermissionsHideProps
  | MultiplePermissionsDisableProps

// ============================================
// HELPER: Generate tooltip message
// ============================================

function generateTooltipMessage(
  permission: string | string[],
  requireAll: boolean
): string {
  if (Array.isArray(permission)) {
    const labels = permission.map(getPermissionLabel)
    if (requireAll) {
      return `Required permissions: ${labels.join(', ')}`
    }
    return `Required: one of ${labels.join(', ')}`
  }
  return `Required permission: ${getPermissionLabel(permission)}`
}

// ============================================
// HELPER: Check if element can be disabled
// ============================================

function isDisableableElement(element: ReactElement): boolean {
  if (typeof element.type === 'string') {
    return ['button', 'input', 'select', 'textarea', 'fieldset'].includes(
      element.type
    )
  }
  return true
}

// ============================================
// DISABLED WRAPPER COMPONENT
// ============================================

interface DisabledWrapperProps {
  children: ReactNode
  tooltip: string
}

function DisabledWrapper({ children, tooltip }: DisabledWrapperProps) {
  const disabledChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child

    const childElement = child as ReactElement<{
      disabled?: boolean
      'aria-disabled'?: boolean
      className?: string
    }>

    if (isDisableableElement(childElement)) {
      return cloneElement(childElement, {
        disabled: true,
        'aria-disabled': true,
        className: `${childElement.props.className || ''} opacity-50 cursor-not-allowed`.trim(),
      })
    }

    return cloneElement(childElement, {
      'aria-disabled': true,
      className: `${childElement.props.className || ''} opacity-50 cursor-not-allowed pointer-events-none`.trim(),
    })
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{disabledChildren}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================
// COMPONENT
// ============================================

/**
 * PermissionGate - Conditionally render content based on permissions
 */
export function PermissionGate(props: PermissionGateProps): ReactNode {
  const { children, adminOverride = true, mode = 'hide' } = props

  // Check if user is tenant admin
  const isTenantAdmin = useIsTenantAdmin()

  // Admin override - tenant admins can access everything
  if (adminOverride && isTenantAdmin) {
    return children
  }

  // Single permission check
  if ('permission' in props && props.permission) {
    return (
      <SinglePermissionGate
        permission={props.permission}
        mode={mode}
        fallback={'fallback' in props ? props.fallback : null}
        disabledTooltip={'disabledTooltip' in props ? props.disabledTooltip : undefined}
      >
        {children}
      </SinglePermissionGate>
    )
  }

  // Multiple permissions check
  if ('permissions' in props && props.permissions) {
    return (
      <MultiplePermissionsGate
        permissions={props.permissions}
        requireAll={props.requireAll || false}
        mode={mode}
        fallback={'fallback' in props ? props.fallback : null}
        disabledTooltip={'disabledTooltip' in props ? props.disabledTooltip : undefined}
      >
        {children}
      </MultiplePermissionsGate>
    )
  }

  // No permissions specified - render fallback or nothing
  if (mode === 'hide') {
    return 'fallback' in props ? props.fallback : null
  }
  return null
}

// ============================================
// INTERNAL COMPONENTS
// ============================================

interface SinglePermissionGateProps {
  permission: string
  children: ReactNode
  mode: PermissionMode
  fallback: ReactNode
  disabledTooltip?: string
}

function SinglePermissionGate({
  permission,
  children,
  mode,
  fallback,
  disabledTooltip,
}: SinglePermissionGateProps): ReactNode {
  const hasPermission = useHasPermission(permission)

  if (hasPermission) {
    return children
  }

  if (mode === 'disable') {
    const tooltip = disabledTooltip || generateTooltipMessage(permission, false)
    return <DisabledWrapper tooltip={tooltip}>{children}</DisabledWrapper>
  }

  return fallback
}

interface MultiplePermissionsGateProps {
  permissions: string[]
  requireAll: boolean
  children: ReactNode
  mode: PermissionMode
  fallback: ReactNode
  disabledTooltip?: string
}

function MultiplePermissionsGate({
  permissions,
  requireAll,
  children,
  mode,
  fallback,
  disabledTooltip,
}: MultiplePermissionsGateProps): ReactNode {
  const hasAny = useHasAnyPermission(permissions)
  const hasAll = useHasAllPermissions(permissions)

  const hasPermission = requireAll ? hasAll : hasAny

  if (hasPermission) {
    return children
  }

  if (mode === 'disable') {
    const tooltip = disabledTooltip || generateTooltipMessage(permissions, requireAll)
    return <DisabledWrapper tooltip={tooltip}>{children}</DisabledWrapper>
  }

  return fallback
}

// ============================================
// CONVENIENCE COMPONENTS
// ============================================

interface ResourceGateProps {
  /** Resource name (e.g., 'assets', 'findings') */
  resource: string
  /** Action type: 'read', 'write', or 'delete' */
  action: 'read' | 'write' | 'delete'
  /** Content to render when user has permission */
  children: ReactNode
  /** Content to render when user lacks permission (hide mode) */
  fallback?: ReactNode
  /** Mode: 'hide' or 'disable' */
  mode?: PermissionMode
  /** Custom tooltip when disabled */
  disabledTooltip?: string
}

/**
 * ResourceGate - Check permission for a specific resource action
 *
 * @example
 * <ResourceGate resource="assets" action="write">
 *   <Button>Edit</Button>
 * </ResourceGate>
 *
 * @example
 * <ResourceGate resource="assets" action="delete" mode="disable">
 *   <Button>Delete</Button>
 * </ResourceGate>
 */
export function ResourceGate({
  resource,
  action,
  children,
  fallback = null,
  mode = 'hide',
  disabledTooltip,
}: ResourceGateProps): ReactNode {
  const permission = `${resource}:${action}`

  if (mode === 'disable') {
    return (
      <PermissionGate permission={permission} mode="disable" disabledTooltip={disabledTooltip}>
        {children}
      </PermissionGate>
    )
  }

  return (
    <PermissionGate permission={permission} fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

interface AdminGateProps {
  /** Content to render for tenant admins */
  children: ReactNode
  /** Content to render for non-admins */
  fallback?: ReactNode
}

/**
 * AdminGate - Only render for tenant admins (owner or admin role)
 *
 * @example
 * <AdminGate>
 *   <AdminSettingsPanel />
 * </AdminGate>
 */
export function AdminGate({ children, fallback = null }: AdminGateProps): ReactNode {
  const isTenantAdmin = useIsTenantAdmin()
  return isTenantAdmin ? children : fallback
}

// ============================================
// EXPORTS
// ============================================

export default PermissionGate
export type { PermissionMode }
