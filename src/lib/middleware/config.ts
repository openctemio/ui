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
  // One-time setup link for an account an administrator created (the user has
  // no session yet). Same token mechanism as /reset-password.
  '/set-password',
  // Invitation preview: an invited person without an account must be able to
  // see it and choose "Sign in" or "Create your account". The page only calls
  // the public preview endpoint until they act.
  '/invitations',
  '/verify-email',
  '/auth/callback',
  '/auth/sso/callback',
  '/auth/error',
  // Platform admin console (RFC-022): its own session and login at /admin/login;
  // the console layout redirects there when there is no admin session.
  '/admin',
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
