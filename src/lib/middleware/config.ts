/**
 * Middleware Configuration
 *
 * Centralized configuration for route protection and access control
 */

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Routes that don't require authentication (whitelist)
 * All other routes are PROTECTED by default
 * Add new public routes here
 */
export const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
  '/auth/error',
] as const

export type PublicRoute = (typeof PUBLIC_ROUTES)[number]

// ============================================
// API ROUTES
// ============================================

/**
 * API route prefix
 * API routes handle their own authentication
 */
export const API_PREFIX = '/api'

// ============================================
// STATIC ASSETS
// ============================================

/**
 * Matcher pattern to exclude static files from middleware
 *
 * NOTE: This constant is for reference only.
 * Next.js requires `config.matcher` to be a static value in middleware.ts
 * It cannot be imported - must be defined inline.
 *
 * @see src/proxy.ts for actual usage
 */
export const MIDDLEWARE_MATCHER_REFERENCE = [
  // Match root path explicitly
  '/',
  // Match all paths except static files
  '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
]
