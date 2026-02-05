/**
 * CLIENT-SIDE Cookie Utility Functions
 *
 * IMPORTANT SECURITY NOTES:
 * - Client-side JavaScript CANNOT set HttpOnly cookies (browser security restriction)
 * - For sensitive data (access tokens), use server-side cookies (see cookies-server.ts)
 * - These utilities are for NON-SENSITIVE data only (preferences, UI state, etc.)
 *
 * Best Practice for Authentication:
 * - Access Token: Store in memory (Zustand/React state) - short-lived, never in cookies
 * - Refresh Token: Store in HttpOnly cookie via server-side (cookies-server.ts)
 * - User Preferences: OK to use client-side cookies (this file)
 */

import { env, isClient } from './env'

const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

interface CookieOptions {
  maxAge?: number
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

/**
 * Get a cookie value by name (client-side only)
 */
export function getCookie(name: string): string | undefined {
  if (!isClient()) return undefined

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue ? decodeURIComponent(cookieValue) : undefined
  }

  return undefined
}

/**
 * Set a cookie with enhanced security options (client-side)
 *
 * ⚠️ WARNING: Cannot set HttpOnly flag from client-side JavaScript
 * For HttpOnly cookies, use server-side API route (cookies-server.ts)
 */
export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  if (!isClient()) return

  const {
    maxAge = DEFAULT_MAX_AGE,
    path = '/',
    domain,
    secure = env.app.env === 'production', // Auto-enable in production
    sameSite = 'lax', // Default to 'lax' for good security/usability balance
  } = options

  // Build cookie string with security flags
  const cookieParts = [
    `${name}=${encodeURIComponent(value)}`,
    `path=${path}`,
    `max-age=${maxAge}`,
  ]

  // Add optional attributes
  if (domain) {
    cookieParts.push(`domain=${domain}`)
  }

  if (secure) {
    cookieParts.push('secure')
  }

  // SameSite attribute (important for CSRF protection)
  if (sameSite) {
    cookieParts.push(`samesite=${sameSite}`)
  }

  document.cookie = cookieParts.join('; ')
}

/**
 * Remove a cookie by setting its max age to 0
 */
export function removeCookie(name: string, options: Pick<CookieOptions, 'path' | 'domain'> = {}): void {
  if (!isClient()) return

  const { path = '/', domain } = options

  const cookieParts = [
    `${name}=`,
    `path=${path}`,
    `max-age=0`,
  ]

  if (domain) {
    cookieParts.push(`domain=${domain}`)
  }

  document.cookie = cookieParts.join('; ')
}

/**
 * Check if a cookie exists
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== undefined
}

/**
 * Get all cookies as an object
 */
export function getAllCookies(): Record<string, string> {
  if (!isClient()) return {}

  const cookies: Record<string, string> = {}

  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.split('=').map(c => c.trim())
    if (name && value) {
      cookies[name] = decodeURIComponent(value)
    }
  })

  return cookies
}

// ============================================
// SPECIFIC COOKIE HELPERS
// ============================================

/**
 * Get/Set locale preference cookie
 */
export const localeCookie = {
  get: () => getCookie('locale'),
  set: (locale: string) => setCookie('locale', locale, { maxAge: 60 * 60 * 24 * 365 }), // 1 year
  remove: () => removeCookie('locale'),
}

/**
 * Get/Set theme preference cookie
 */
export const themeCookie = {
  get: () => getCookie('theme') as 'light' | 'dark' | 'system' | undefined,
  set: (theme: 'light' | 'dark' | 'system') =>
    setCookie('theme', theme, { maxAge: 60 * 60 * 24 * 365 }), // 1 year
  remove: () => removeCookie('theme'),
}

/**
 * ⚠️ DEPRECATED: Do not use for authentication tokens
 * Use server-side cookies (cookies-server.ts) or in-memory storage instead
 */
export const authTokenCookie = {
  get: () => {
    console.warn(
      '⚠️ WARNING: Getting auth token from client-side cookie is insecure. ' +
      'Use server-side cookies or in-memory storage instead.'
    )
    return getCookie(env.auth.cookieName)
  },
  set: (_token: string) => {
    console.error(
      '[Auth] Setting auth token via client-side cookie is INSECURE and NOT ALLOWED. ' +
      'Use server-side API route (/api/auth/set-token) instead.'
    )
    // Intentionally do nothing - _token is ignored for security
  },
  remove: () => removeCookie(env.auth.cookieName),
}
