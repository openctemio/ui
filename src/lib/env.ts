/**
 * Environment Variables Configuration
 *
 * This file provides type-safe access to environment variables.
 *
 * Variable naming conventions:
 * - NEXT_PUBLIC_* : Accessible in both client and server code
 * - No prefix     : Server-only (API routes, Server Actions, Server Components)
 */

/**
 * Check if we're in Docker build mode (skip validation)
 */
const isDockerBuild = process.env.DOCKER_BUILD === 'true' || process.env.CI === 'true'

/**
 * Gets an environment variable with optional default
 * @param key - Environment variable name
 * @param defaultValue - Optional default value
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key]

  // During Docker build or CI, return default or empty
  if (isDockerBuild) {
    return value || defaultValue || ''
  }

  // Return value or default (no warnings for optional vars)
  return value || defaultValue || ''
}

// ============================================
// PUBLIC ENVIRONMENT VARIABLES
// (Accessible from both client and server)
// ============================================

export const env = {
  // API Configuration - Single source of truth for backend API URL
  api: {
    /** Backend API URL (e.g., http://localhost:8080) - Server-side only */
    url: getEnvVar('BACKEND_API_URL', 'http://localhost:8080'),
    /** Request timeout in milliseconds */
    timeout: parseInt(getEnvVar('API_TIMEOUT', '30000'), 10),
    /**
     * WebSocket base URL for direct backend connection.
     * WebSocket cannot go through Next.js proxy due to HTTP upgrade requirements.
     * In development: Set to backend URL (e.g., http://localhost:8080)
     * In production: Usually same as app URL if nginx routes /api/v1/ws to backend
     *
     * Falls back to NEXT_PUBLIC_SSE_BASE_URL for backward compatibility.
     */
    wsBaseUrl:
      getEnvVar('NEXT_PUBLIC_WS_BASE_URL', '') || getEnvVar('NEXT_PUBLIC_SSE_BASE_URL', ''),
  },

  // Token Storage Configuration
  auth: {
    cookieName: getEnvVar('NEXT_PUBLIC_AUTH_COOKIE_NAME', 'auth_token'),
    // Must match backend RefreshTokenCookieName in cookie.go
    refreshCookieName: getEnvVar('NEXT_PUBLIC_REFRESH_COOKIE_NAME', 'refresh_token'),
  },

  // Cookie Names (configurable to avoid hardcoded prefixes)
  cookies: {
    tenant: getEnvVar('NEXT_PUBLIC_TENANT_COOKIE_NAME', 'app_tenant'),
    userInfo: getEnvVar('NEXT_PUBLIC_USER_INFO_COOKIE_NAME', 'app_user_info'),
    pendingTenants: getEnvVar('NEXT_PUBLIC_PENDING_TENANTS_COOKIE_NAME', 'app_pending_tenants'),
  },

  // Application
  app: {
    url: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    env: getEnvVar('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  },

  // Feature Flags
  features: {
    /**
     * Enable dynamic sidebar badges (shows counts from API)
     * Set to 'true' to enable. Disabled by default to reduce API calls on page load.
     * Affected badges: Findings, Credential Leaks, Asset Groups
     */
    sidebarBadges: getEnvVar('NEXT_PUBLIC_ENABLE_SIDEBAR_BADGES', 'false') === 'true',

    /**
     * Use real API data instead of mock data
     * Default: true (use real API)
     * Set to 'false' to use mock data for development without backend
     */
    useRealApi: getEnvVar('NEXT_PUBLIC_USE_REAL_API', 'true') !== 'false',
  },
} as const

// ============================================
// SERVER-ONLY ENVIRONMENT VARIABLES
// (Only accessible on server side)
// ============================================

export const serverEnv = {
  // Security
  security: {
    secureCookies: getEnvVar('SECURE_COOKIES', 'false') === 'true',
    csrfSecret: getEnvVar('CSRF_SECRET', ''),
  },

  // Token management
  token: {
    cookieMaxAge: parseInt(getEnvVar('COOKIE_MAX_AGE', '604800'), 10),
    enableRefresh: getEnvVar('ENABLE_TOKEN_REFRESH', 'true') === 'true',
    refreshBeforeExpiry: parseInt(getEnvVar('TOKEN_REFRESH_BEFORE_EXPIRY', '300'), 10),
  },
} as const

// ============================================
// VALIDATION
// ============================================

/**
 * Validates environment variables
 * Call this in next.config.ts to fail fast on missing vars
 */
export function validateEnv() {
  // Skip validation during Docker build or CI
  if (isDockerBuild) {
    console.log('⏭️  Skipping env validation (Docker/CI build)')
    return
  }

  const warnings: string[] = []

  // Always required: Backend API URL (server-side only)
  if (!process.env.BACKEND_API_URL) {
    warnings.push('BACKEND_API_URL is not set (using default: http://localhost:8080)')
  }

  // CSRF secret warning (recommended for production)
  const csrfSecret = process.env.CSRF_SECRET
  if (!csrfSecret) {
    warnings.push('CSRF_SECRET is not set (recommended for security)')
  } else if (csrfSecret.length < 32) {
    warnings.push(
      `CSRF_SECRET should be at least 32 characters (current: ${csrfSecret.length})\n` +
        `   Generate with: openssl rand -base64 32`
    )
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn(
      `\n${'─'.repeat(60)}\n` +
        `⚠️  Environment Configuration Warnings\n` +
        `${'─'.repeat(60)}\n\n` +
        warnings.map((w, i) => `${i + 1}. ${w}`).join('\n\n') +
        `\n\n${'─'.repeat(60)}\n`
    )
  } else {
    console.log('✅ Environment variables validated successfully')
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Check if running in production */
export const isProduction = () => env.app.env === 'production'

/** Check if running in development */
export const isDevelopment = () => env.app.env === 'development'

/** Check if running on server side */
export const isServer = () => typeof window === 'undefined'

/** Check if running on client side */
export const isClient = () => typeof window !== 'undefined'

/** Check if local auth is enabled (always true for OSS) */
export const isLocalAuthEnabled = () => true

/** Check if only local auth is enabled (always true for OSS) */
export const isLocalAuthOnly = () => true

// ============================================
// TYPE EXPORTS
// ============================================

export type Env = typeof env
export type ServerEnv = typeof serverEnv
