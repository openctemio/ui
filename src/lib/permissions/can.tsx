'use client'

/**
 * Can Component
 *
 * Declarative component for permission-based rendering.
 * Supports two modes:
 * - 'hide' (default): Completely hides content if user lacks permission
 * - 'disable': Shows content but disabled with tooltip explaining why
 *
 * @example
 * ```tsx
 * // Hide mode (default) - completely hides if no permission
 * <Can permission="assets:write">
 *   <CreateAssetButton />
 * </Can>
 *
 * // Disable mode - shows disabled button with tooltip
 * <Can permission="assets:delete" mode="disable">
 *   <DeleteButton />
 * </Can>
 *
 * // Custom tooltip message
 * <Can permission="billing:manage" mode="disable" disabledTooltip="Contact admin for billing access">
 *   <BillingSettings />
 * </Can>
 *
 * // Multiple permissions (any)
 * <Can permission={['assets:write', 'projects:write']}>
 *   <WriteToolbar />
 * </Can>
 *
 * // With fallback (hide mode only)
 * <Can permission="assets:delete" fallback={<DisabledButton />}>
 *   <DeleteButton />
 * </Can>
 * ```
 */

import { type ReactNode, type ReactElement, cloneElement, isValidElement, Children } from 'react'
import { usePermissions } from './hooks'
import { type PermissionString, getPermissionLabel } from './constants'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// ============================================
// TYPES
// ============================================

type PermissionMode = 'hide' | 'disable'

interface CanBaseProps {
  /**
   * Permission(s) required to render children.
   * If array, user needs ANY of the permissions (OR logic).
   */
  permission: PermissionString | string | (PermissionString | string)[]

  /**
   * If true, user needs ALL permissions (AND logic).
   * Only applies when permission is an array.
   * @default false
   */
  requireAll?: boolean

  /**
   * Content to render when user has permission
   */
  children: ReactNode
}

interface CanHideModeProps extends CanBaseProps {
  /**
   * Mode: 'hide' completely removes content, 'disable' shows disabled with tooltip
   * @default 'hide'
   */
  mode?: 'hide'

  /**
   * Content to render when user lacks permission (only for hide mode)
   * @default null
   */
  fallback?: ReactNode

  /** Not used in hide mode */
  disabledTooltip?: never
}

interface CanDisableModeProps extends CanBaseProps {
  /**
   * Mode: 'hide' completely removes content, 'disable' shows disabled with tooltip
   */
  mode: 'disable'

  /**
   * Custom tooltip message when disabled.
   * If not provided, auto-generates from permission name.
   */
  disabledTooltip?: string

  /** Not used in disable mode */
  fallback?: never
}

type CanProps = CanHideModeProps | CanDisableModeProps

// ============================================
// HELPER: Check if element can be disabled
// ============================================

function isDisableableElement(element: ReactElement): boolean {
  // Check if it's a native HTML element that supports disabled
  if (typeof element.type === 'string') {
    return ['button', 'input', 'select', 'textarea', 'fieldset'].includes(element.type)
  }
  // For custom components, we assume they accept disabled prop
  return true
}

// ============================================
// HELPER: Generate tooltip message
// ============================================

function generateTooltipMessage(
  permission: PermissionString | string | (PermissionString | string)[],
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
// DISABLED WRAPPER COMPONENT
// ============================================

interface DisabledWrapperProps {
  children: ReactNode
  tooltip: string
}

function DisabledWrapper({ children, tooltip }: DisabledWrapperProps) {
  // Block all click events to prevent navigation on disabled Links
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Clone children and add disabled props
  const disabledChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child

    const childElement = child as ReactElement<{
      disabled?: boolean
      'aria-disabled'?: boolean
      className?: string
      style?: React.CSSProperties
      onClick?: (e: React.MouseEvent) => void
    }>

    if (isDisableableElement(childElement)) {
      return cloneElement(childElement, {
        disabled: true,
        'aria-disabled': true,
        onClick: handleClick, // Block click on the element itself
        className: `${childElement.props.className || ''} opacity-50 cursor-not-allowed`.trim(),
      })
    }

    // For non-disableable elements, just add visual styling and block clicks
    return cloneElement(childElement, {
      'aria-disabled': true,
      onClick: handleClick, // Block click on the element itself
      className: `${childElement.props.className || ''} opacity-50 cursor-not-allowed`.trim(),
    })
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Wrapper div blocks clicks and shows tooltip */}
        {/* Using w-full to maintain full-width buttons layout when disabled */}
        <div
          className="w-full"
          onClick={handleClick}
          onMouseDown={handleClick}
          role="button"
          aria-disabled="true"
          tabIndex={-1}
        >
          {disabledChildren}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * Permission-based conditional rendering component
 */
export function Can(props: CanProps): ReactNode {
  const { permission, requireAll = false, children, mode = 'hide' } = props
  const { can, canAny, canAll, isLoading, tenantRole } = usePermissions()

  // While permissions are loading, hide content by default
  // Exception: owner/admin bypass (they always have access)
  const isOwnerOrAdmin = tenantRole === 'owner' || tenantRole === 'admin'
  if (isLoading && !isOwnerOrAdmin) {
    // For disable mode, show disabled state while loading
    if (mode === 'disable') {
      const tooltip = 'Loading permissions...'
      return <DisabledWrapper tooltip={tooltip}>{children}</DisabledWrapper>
    }
    // For hide mode, don't render anything while loading
    return (props as CanHideModeProps).fallback ?? null
  }

  // Check permission
  let hasPermission: boolean
  if (Array.isArray(permission)) {
    hasPermission = requireAll ? canAll(...permission) : canAny(...permission)
  } else {
    hasPermission = can(permission)
  }

  // Has permission - render children normally
  if (hasPermission) {
    return children
  }

  // No permission - handle based on mode
  if (mode === 'disable') {
    const tooltip =
      (props as CanDisableModeProps).disabledTooltip ||
      generateTooltipMessage(permission, requireAll)
    return <DisabledWrapper tooltip={tooltip}>{children}</DisabledWrapper>
  }

  // Hide mode - render fallback or null
  return (props as CanHideModeProps).fallback ?? null
}

// ============================================
// CANNOT COMPONENT
// ============================================

/**
 * Cannot Component - Inverse of Can
 * Renders children only if user does NOT have the permission
 *
 * @example
 * ```tsx
 * <Cannot permission="assets:write">
 *   <ReadOnlyBanner />
 * </Cannot>
 * ```
 */
interface CannotProps {
  permission: PermissionString | string | (PermissionString | string)[]
  requireAll?: boolean
  children: ReactNode
  fallback?: ReactNode
}

export function Cannot({
  permission,
  requireAll = false,
  children,
  fallback = null,
}: CannotProps): ReactNode {
  const { can, canAny, canAll } = usePermissions()

  let hasPermission: boolean

  if (Array.isArray(permission)) {
    hasPermission = requireAll ? canAll(...permission) : canAny(...permission)
  } else {
    hasPermission = can(permission)
  }

  return hasPermission ? fallback : children
}

// ============================================
// EXPORTS
// ============================================

export type { CanProps, CannotProps, PermissionMode }
