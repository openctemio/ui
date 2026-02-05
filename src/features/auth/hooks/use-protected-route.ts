/**
 * useProtectedRoute Hook
 *
 * Route protection hook - redirects to login if not authenticated
 * Handles role-based access control
 *
 * @example
 * // Protect entire route
 * useProtectedRoute()
 *
 * @example
 * // Protect with role requirement
 * useProtectedRoute({ roles: ['admin'] })
 *
 * @example
 * // Protect with custom authorization
 * useProtectedRoute({
 *   authorize: (user) => user.emailVerified
 * })
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

import { useAuth } from './use-auth'
import { AUTH_ROUTES, getReturnUrl } from '../constants'
import type { RouteProtectionOptions } from '../types/auth.types'

/**
 * Route protection hook
 *
 * Automatically redirects to login if:
 * - User is not authenticated
 * - User doesn't have required roles
 * - Custom authorization check fails
 */
export function useProtectedRoute(options: RouteProtectionOptions = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user, hasAllRoles, hasAnyRole } = useAuth()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const {
    roles = [],
    requireAll = false,
    redirectTo = AUTH_ROUTES.LOGIN,
    authorize,
  } = options

  useEffect(() => {
    async function checkAuthorization() {
      setIsChecking(true)

      // Check authentication
      if (!isAuthenticated || !user) {
        const returnUrl = getReturnUrl(pathname)
        const loginUrl = `${redirectTo}?redirect=${encodeURIComponent(returnUrl)}`
        router.replace(loginUrl)
        return
      }

      // Check role requirements
      if (roles.length > 0) {
        const hasRequiredRoles = requireAll
          ? hasAllRoles(roles)
          : hasAnyRole(roles)

        if (!hasRequiredRoles) {
          console.warn('User does not have required roles:', roles)
          router.replace('/unauthorized')
          return
        }
      }

      // Check custom authorization
      if (authorize) {
        try {
          const result = await authorize(user)
          if (!result) {
            console.warn('Custom authorization check failed')
            router.replace('/unauthorized')
            return
          }
        } catch (error) {
          console.error('Authorization check error:', error)
          router.replace('/unauthorized')
          return
        }
      }

      // All checks passed
      setIsAuthorized(true)
      setIsChecking(false)
    }

    checkAuthorization()
  }, [
    isAuthenticated,
    user,
    roles,
    requireAll,
    redirectTo,
    authorize,
    pathname,
    router,
    hasAllRoles,
    hasAnyRole,
  ])

  return {
    isChecking,
    isAuthorized,
    user,
  }
}

/**
 * Hook to require specific roles
 *
 * @example
 * useRequireRoles(['admin', 'moderator'])
 */
export function useRequireRoles(roles: string[], requireAll = false) {
  return useProtectedRoute({ roles, requireAll })
}

/**
 * Hook to require authentication only (no role check)
 *
 * @example
 * useRequireAuth()
 */
export function useRequireAuth() {
  return useProtectedRoute()
}
