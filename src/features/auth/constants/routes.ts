/**
 * Auth Routes Constants
 *
 * Centralized auth-related routes
 * Single source of truth for all auth navigation
 */

export const AUTH_ROUTES = {
  /**
   * Login page
   */
  LOGIN: '/login',

  /**
   * Register page
   */
  REGISTER: '/register',

  /**
   * Forgot password page
   */
  FORGOT_PASSWORD: '/forgot-password',

  /**
   * Reset password page
   */
  RESET_PASSWORD: '/reset-password',

  /**
   * OAuth callback handler
   */
  CALLBACK: '/auth/callback',

  /**
   * Auth error page
   */
  ERROR: '/auth/error',
} as const

/**
 * Protected routes that require authentication
 */
export const PROTECTED_ROUTES = {
  /**
   * Dashboard home
   */
  DASHBOARD: '/',

  /**
   * User profile
   */
  PROFILE: '/profile',

  /**
   * Account settings
   */
  SETTINGS: '/settings',
  SETTINGS_ACCOUNT: '/settings/account',
  SETTINGS_APPEARANCE: '/settings/appearance',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_DISPLAY: '/settings/display',

  /**
   * Help center
   */
  HELP: '/help-center',
} as const

/**
 * Public routes (no auth required)
 */
export const PUBLIC_ROUTES = {
  /**
   * Home/landing page
   */
  HOME: '/',

  /**
   * Terms of service
   */
  TERMS: '/terms',

  /**
   * Privacy policy
   */
  PRIVACY: '/privacy',
} as const

/**
 * Default redirect after successful login
 */
export const DEFAULT_LOGIN_REDIRECT = PROTECTED_ROUTES.DASHBOARD

/**
 * Default redirect after logout
 */
export const DEFAULT_LOGOUT_REDIRECT = AUTH_ROUTES.LOGIN

/**
 * Check if a route is a public route
 */
export function isPublicRoute(path: string): boolean {
  const publicPaths = Object.values({
    ...PUBLIC_ROUTES,
    ...AUTH_ROUTES,
  })

  return publicPaths.some(publicPath =>
    path === publicPath || path.startsWith(`${publicPath}/`)
  )
}

/**
 * Check if a route is a protected route
 */
export function isProtectedRoute(path: string): boolean {
  const protectedPaths = Object.values(PROTECTED_ROUTES)

  return protectedPaths.some(protectedPath =>
    path === protectedPath || path.startsWith(`${protectedPath}/`)
  )
}

/**
 * Get return URL for login redirect
 */
export function getReturnUrl(currentPath: string): string {
  // Don't redirect back to auth pages
  if (Object.values(AUTH_ROUTES).some(route => currentPath.startsWith(route))) {
    return DEFAULT_LOGIN_REDIRECT
  }

  // For protected routes, save current path
  if (isProtectedRoute(currentPath)) {
    return currentPath
  }

  return DEFAULT_LOGIN_REDIRECT
}
