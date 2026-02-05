/**
 * Auth Configuration Constants
 *
 * Centralized auth-related configuration
 * Single source of truth for auth settings
 */

// ============================================
// TOKEN SETTINGS
// ============================================

export const TOKEN_CONFIG = {
  /**
   * Access token storage key (in-memory/Zustand)
   */
  ACCESS_TOKEN_KEY: 'access_token',

  /**
   * Refresh token cookie name (HttpOnly)
   */
  REFRESH_TOKEN_COOKIE: 'kc_refresh_token',

  /**
   * Auth cookie name
   */
  AUTH_COOKIE: 'kc_auth_token',

  /**
   * OAuth state cookie name
   */
  STATE_COOKIE: 'oauth_state',

  /**
   * Token refresh threshold (in seconds before expiry)
   * Refresh token when it's within this time of expiring
   */
  REFRESH_THRESHOLD: 60, // 1 minute

  /**
   * Max token age for cookies (in seconds)
   */
  COOKIE_MAX_AGE: 7 * 24 * 60 * 60, // 7 days
} as const

// ============================================
// SESSION SETTINGS
// ============================================

export const SESSION_CONFIG = {
  /**
   * Session timeout (in milliseconds)
   */
  TIMEOUT: 30 * 60 * 1000, // 30 minutes

  /**
   * Enable automatic token refresh
   */
  AUTO_REFRESH: true,

  /**
   * Token refresh interval (in milliseconds)
   * Check token expiry every X minutes
   */
  REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes

  /**
   * Enable session persistence
   */
  PERSIST: true,
} as const

// ============================================
// PASSWORD SETTINGS
// ============================================

export const PASSWORD_CONFIG = {
  /**
   * Minimum password length
   */
  MIN_LENGTH: 8,

  /**
   * Maximum password length
   */
  MAX_LENGTH: 128,

  /**
   * Require uppercase letter
   */
  REQUIRE_UPPERCASE: false,

  /**
   * Require lowercase letter
   */
  REQUIRE_LOWERCASE: false,

  /**
   * Require number
   */
  REQUIRE_NUMBER: false,

  /**
   * Require special character
   */
  REQUIRE_SPECIAL: false,

  /**
   * Password strength levels
   */
  STRENGTH_LEVELS: {
    VERY_WEAK: 0,
    WEAK: 1,
    FAIR: 2,
    GOOD: 3,
    STRONG: 4,
  },
} as const

// ============================================
// OAUTH SETTINGS
// ============================================

export const OAUTH_CONFIG = {
  /**
   * OAuth response type
   */
  RESPONSE_TYPE: 'code',

  /**
   * OAuth scope
   */
  SCOPE: 'openid profile email',

  /**
   * OAuth prompt
   */
  PROMPT: 'login',

  /**
   * State parameter length (random string)
   */
  STATE_LENGTH: 32,

  /**
   * Nonce parameter length (random string)
   */
  NONCE_LENGTH: 32,
} as const

// ============================================
// SECURITY SETTINGS
// ============================================

export const SECURITY_CONFIG = {
  /**
   * Enable CSRF protection
   */
  CSRF_PROTECTION: true,

  /**
   * Secure cookies (HTTPS only)
   */
  SECURE_COOKIES: process.env.NODE_ENV === 'production',

  /**
   * SameSite cookie setting
   */
  SAME_SITE: 'lax' as const,

  /**
   * Cookie domain
   */
  COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,

  /**
   * Enable HttpOnly cookies
   */
  HTTP_ONLY: true,

  /**
   * Max login attempts before lockout
   */
  MAX_LOGIN_ATTEMPTS: 5,

  /**
   * Lockout duration (in milliseconds)
   */
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
} as const

// ============================================
// UI SETTINGS
// ============================================

export const UI_CONFIG = {
  /**
   * Show social login buttons
   */
  SHOW_SOCIAL_LOGIN: true,

  /**
   * Show "Remember me" checkbox
   */
  SHOW_REMEMBER_ME: false,

  /**
   * Show password strength indicator
   */
  SHOW_PASSWORD_STRENGTH: true,

  /**
   * Auto focus email input on login page
   */
  AUTO_FOCUS_EMAIL: true,

  /**
   * Toast notification duration (in milliseconds)
   */
  TOAST_DURATION: 5000,

  /**
   * Loading spinner delay (in milliseconds)
   */
  LOADING_DELAY: 300,
} as const

// ============================================
// REDIRECT SETTINGS
// ============================================

export const REDIRECT_CONFIG = {
  /**
   * Enable redirect after login
   */
  REDIRECT_AFTER_LOGIN: true,

  /**
   * Enable redirect after logout
   */
  REDIRECT_AFTER_LOGOUT: true,

  /**
   * Enable redirect after registration
   */
  REDIRECT_AFTER_REGISTER: true,

  /**
   * Preserve query params on redirect
   */
  PRESERVE_QUERY_PARAMS: true,

  /**
   * Allowed redirect domains (for security)
   */
  ALLOWED_REDIRECT_DOMAINS: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ],
} as const

// ============================================
// FEATURE FLAGS
// ============================================

export const FEATURE_FLAGS = {
  /**
   * Enable email verification
   */
  EMAIL_VERIFICATION: false,

  /**
   * Enable two-factor authentication
   */
  TWO_FACTOR_AUTH: false,

  /**
   * Enable social login
   */
  SOCIAL_LOGIN: true,

  /**
   * Enable password reset
   */
  PASSWORD_RESET: true,

  /**
   * Enable user registration
   */
  USER_REGISTRATION: true,

  /**
   * Enable automatic logout on tab close
   */
  AUTO_LOGOUT_ON_CLOSE: false,
} as const

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a domain is allowed for redirect
 */
export function isAllowedRedirectDomain(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return REDIRECT_CONFIG.ALLOWED_REDIRECT_DOMAINS.some(domain => {
      const domainObj = new URL(domain)
      return urlObj.origin === domainObj.origin
    })
  } catch {
    return false
  }
}

/**
 * Get full auth configuration
 */
export function getAuthConfig() {
  return {
    token: TOKEN_CONFIG,
    session: SESSION_CONFIG,
    password: PASSWORD_CONFIG,
    oauth: OAUTH_CONFIG,
    security: SECURITY_CONFIG,
    ui: UI_CONFIG,
    redirect: REDIRECT_CONFIG,
    features: FEATURE_FLAGS,
  }
}
