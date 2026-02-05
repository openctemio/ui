/**
 * Middleware Utilities
 *
 * Centralized exports for middleware helpers
 *
 * @example
 * ```typescript
 * import { handleAuth, handleI18n, MIDDLEWARE_MATCHER } from '@/lib/middleware'
 * ```
 */

// Configuration
export {
  PUBLIC_ROUTES,
  API_PREFIX,
  MIDDLEWARE_MATCHER_REFERENCE,
  type PublicRoute,
} from './config'

// Authentication
export {
  isPublicRoute,
  isApiRoute,
  requiresAuth,
  isAuthenticated,
  validateRedirectUrl,
  handleAuth,
} from './auth'

// Internationalization
export {
  detectLocale,
  createHeadersWithLocale,
  handleI18n,
} from './i18n'
