/**
 * Route Guard Component
 *
 * Protects routes based on tenant's module access and user permissions.
 * Shows "Access Denied" page when user doesn't have required access.
 *
 * Access Control Layers (checked in order):
 * 1. Module (Licensing) - Does tenant's plan include this module?
 * 2. Permission (RBAC) - Does user have the required permission?
 *
 * IMPORTANT: This component uses the same access control logic as the sidebar
 * filtering (useFilteredSidebarData) to ensure consistency:
 * - Owner/Admin bypass both module and permission checks
 * - Module check uses fail-open for Owner/Admin when API fails
 * - Permission check uses `can()` from hooks which includes Owner/Admin bypass
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <RouteGuard>
 *   {children}
 * </RouteGuard>
 * ```
 */

'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { ShieldX, ArrowLeft, Home, Package } from 'lucide-react'
import { usePermissions } from '@/lib/permissions/hooks'
import { useBootstrapModules } from '@/context/bootstrap-provider'
import { matchRoutePermission } from '@/config/route-permissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface RouteGuardProps {
  children: React.ReactNode
}

type AccessDeniedReason = 'module' | 'permission'

/**
 * RouteGuard Component
 *
 * Wraps children and checks if user has access to current route.
 * Checks both module access (licensing) and permission (RBAC).
 *
 * IMPORTANT: No Owner/Admin bypass! Permissions from API are the source of truth.
 * Owner role has 215 permissions, Admin has 213 - all defined in database.
 * This ensures RBAC is properly enforced for all users.
 *
 * If not, shows an "Access Denied" page.
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname()
  // Use the same permission hook as sidebar for consistency
  const { can } = usePermissions()
  const { moduleIds } = useBootstrapModules()

  // Find the route permission config for current pathname
  const routeConfig = React.useMemo(() => {
    return matchRoutePermission(pathname)
  }, [pathname])

  /**
   * Check module access
   * Returns true if module is in tenant's plan or no module required
   */
  const hasModuleAccess = React.useCallback(
    (moduleId: string): boolean => {
      // If moduleIds has data, use it (source of truth from API)
      if (moduleIds.length > 0) {
        return moduleIds.includes(moduleId)
      }

      // moduleIds is empty - could be:
      // 1. Bootstrap not finished yet (handled by isLoading check above)
      // 2. API returned empty - fail-closed for security
      // Backend will still enforce authorization
      return false
    },
    [moduleIds]
  )

  // Check access - returns { hasAccess, deniedReason }
  const accessCheck = React.useMemo(() => {
    // If no route config, allow access (public route within dashboard)
    if (!routeConfig) {
      return { hasAccess: true, deniedReason: null }
    }

    // Layer 1: Check module access (Licensing)
    if (routeConfig.module) {
      if (!hasModuleAccess(routeConfig.module)) {
        return { hasAccess: false, deniedReason: 'module' as AccessDeniedReason }
      }
    }

    // Layer 2: Check permission (RBAC)
    // Permissions are source of truth from API - no bypass
    if (!can(routeConfig.permission)) {
      return { hasAccess: false, deniedReason: 'permission' as AccessDeniedReason }
    }

    return { hasAccess: true, deniedReason: null }
  }, [routeConfig, can, hasModuleAccess])

  // TenantGate already waits for bootstrap + permissions
  // So when RouteGuard renders, data is ready - just check access
  if (!accessCheck.hasAccess && routeConfig) {
    return (
      <AccessDenied
        reason={accessCheck.deniedReason!}
        permission={routeConfig.permission}
        module={routeConfig.module}
        message={routeConfig.message}
      />
    )
  }

  // User has access - render children
  return <>{children}</>
}

/**
 * Loading state while checking permissions
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RouteGuardLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto mt-4 h-6 w-48" />
          <Skeleton className="mx-auto mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent className="flex justify-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Access Denied Page
 *
 * Shown when user doesn't have access to a route.
 * Handles both module (licensing) and permission (RBAC) denied reasons.
 */
interface AccessDeniedProps {
  reason: AccessDeniedReason
  permission: string
  module?: string
  message?: string
}

function AccessDenied({ reason, permission, module, message }: AccessDeniedProps) {
  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  // Determine icon and title based on reason
  const isModuleDenied = reason === 'module'
  const Icon = isModuleDenied ? Package : ShieldX
  const title = isModuleDenied ? 'Feature Not Available' : 'Access Denied'
  const defaultMessage = isModuleDenied
    ? 'This feature is not included in your current plan.'
    : "You don't have permission to access this page."

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isModuleDenied ? 'bg-warning/10' : 'bg-destructive/10'}`}
          >
            <Icon className={`h-8 w-8 ${isModuleDenied ? 'text-warning' : 'text-destructive'}`} />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="mt-2">{message || defaultMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Access info (for debugging) */}
          <div className="rounded-md bg-muted p-3 text-center space-y-1">
            {isModuleDenied && module && (
              <p className="text-xs text-muted-foreground">
                Required module: <code className="font-mono text-foreground">{module}</code>
              </p>
            )}
            {!isModuleDenied && (
              <p className="text-xs text-muted-foreground">
                Required permission: <code className="font-mono text-foreground">{permission}</code>
              </p>
            )}
          </div>

          {/* Help text */}
          <p className="text-center text-sm text-muted-foreground">
            {isModuleDenied
              ? 'Please contact your administrator to upgrade your plan.'
              : 'If you believe you should have access, please contact your administrator.'}
          </p>

          {/* Actions */}
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button onClick={handleGoHome}>
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RouteGuard
