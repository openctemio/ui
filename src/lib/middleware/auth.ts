/**
 * Authentication Middleware Helpers
 *
 * Functions for handling authentication in middleware
 */

import { NextRequest, NextResponse } from 'next/server'
import { PUBLIC_ROUTES, API_PREFIX } from './config'

// ============================================
// ROUTE CHECKING
// ============================================

/**
 * Check if route is public (doesn't require auth)
 */
export function isPublicRoute(pathname: string): boolean {
  // Exact match for public routes
  if (PUBLIC_ROUTES.includes(pathname as (typeof PUBLIC_ROUTES)[number])) {
    return true
  }

  // Check if pathname starts with any public route
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

/**
 * Check if route is an API route
 */
export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith(API_PREFIX)
}

/**
 * Check if route requires authentication
 * Default: ALL routes require auth except PUBLIC_ROUTES
 */
export function requiresAuth(pathname: string): boolean {
  // API routes handle their own auth
  if (isApiRoute(pathname)) {
    return false
  }

  // Public routes don't require auth (whitelist)
  if (isPublicRoute(pathname)) {
    return false
  }

  // Everything else requires authentication
  return true
}

// ============================================
// AUTHENTICATION CHECK
// ============================================

/**
 * Check if user is authenticated
 * Looks for auth tokens in HttpOnly cookies
 */
export function isAuthenticated(req: NextRequest): boolean {
  // Check for auth token
  const authCookieName = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || 'auth_token'
  const authToken = req.cookies.get(authCookieName)

  if (authToken?.value) {
    return true
  }

  // Check for refresh token
  const refreshCookieName = process.env.NEXT_PUBLIC_REFRESH_COOKIE_NAME || 'refresh_token'
  const refreshToken = req.cookies.get(refreshCookieName)

  if (refreshToken?.value) {
    return true
  }

  // Check for dev auth cookie (development only)
  if (process.env.NODE_ENV === 'development') {
    const devAuthToken = req.cookies.get('dev_auth_token')
    if (devAuthToken?.value) {
      return true
    }
  }

  return false
}

// ============================================
// REDIRECT VALIDATION
// ============================================

/**
 * Validate redirect URL to prevent open redirect attacks
 * Only allows internal redirects
 */
export function validateRedirectUrl(url: string): string {
  try {
    // If it starts with /, it's internal - safe
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url
    }

    // Try to parse as URL
    const parsed = new URL(url)

    // Only allow same origin
    if (parsed.origin === process.env.NEXT_PUBLIC_APP_URL) {
      return parsed.pathname + parsed.search
    }

    // Invalid - return default
    return '/dashboard'
  } catch {
    // Invalid URL - return default
    return '/dashboard'
  }
}

// ============================================
// AUTH HANDLER
// ============================================

/**
 * Auth pages that authenticated users should be redirected away from
 */
const AUTH_PAGES = ['/login', '/register']

/**
 * Handle authentication check in middleware
 *
 * @param req - Next.js request object
 * @returns Redirect response if auth state doesn't match route requirements, null otherwise
 *
 * @example
 * ```typescript
 * const authResponse = handleAuth(req)
 * if (authResponse) return authResponse
 * ```
 */
export function handleAuth(req: NextRequest): NextResponse | null {
  const { pathname, search } = req.nextUrl
  const authenticated = isAuthenticated(req)

  // If authenticated and trying to access auth pages, redirect to dashboard
  if (authenticated && AUTH_PAGES.some((page) => pathname.startsWith(page))) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Check if route requires auth and user is not authenticated
  if (requiresAuth(pathname) && !authenticated) {
    const loginUrl = new URL('/login', req.url)

    // Add return URL as query parameter (validated)
    const returnUrl = pathname + search
    const safeReturnUrl = validateRedirectUrl(returnUrl)
    loginUrl.searchParams.set('redirect', safeReturnUrl)

    const response = NextResponse.redirect(loginUrl)

    // Clear cookies that might cause issues (e.g. tenant selection loop)
    // IMPORTANT: Must use .set() with maxAge: 0 and specify path to properly clear
    // Using .delete() alone doesn't work because the cookie was set with path: '/'
    const tenantCookieName = process.env.NEXT_PUBLIC_TENANT_COOKIE_NAME || 'app_tenant'
    response.cookies.set(tenantCookieName, '', {
      maxAge: 0,
      path: '/',
    })

    // Also clear pending tenants cookie to prevent stale state
    const pendingTenantsCookieName =
      process.env.NEXT_PUBLIC_PENDING_TENANTS_COOKIE_NAME || 'app_pending_tenants'
    response.cookies.set(pendingTenantsCookieName, '', {
      maxAge: 0,
      path: '/',
    })

    return response
  }

  return null
}
