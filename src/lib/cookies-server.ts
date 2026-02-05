/**
 * SERVER-SIDE Cookie Utility Functions
 *
 * IMPORTANT: These functions can ONLY be used on the server side:
 * - API Routes (app/api/*)
 * - Server Actions ("use server")
 * - Middleware (middleware.ts)
 * - Server Components (async function)
 *
 * Use this for SENSITIVE data like:
 * - Refresh tokens (HttpOnly)
 * - Session IDs (HttpOnly)
 * - CSRF tokens (HttpOnly)
 *
 * For client-side cookies (preferences, UI state), use cookies.ts instead
 */

import { cookies } from 'next/headers'
import { env, serverEnv } from './env'

interface ServerCookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  maxAge?: number
  path?: string
  domain?: string
}

// Default secure options for sensitive data
const SECURE_DEFAULTS: ServerCookieOptions = {
  httpOnly: true, // Prevents JavaScript access (XSS protection)
  secure: serverEnv.security.secureCookies, // HTTPS only in production
  sameSite: 'lax', // CSRF protection
  path: '/',
  maxAge: serverEnv.token.cookieMaxAge,
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Set a secure server-side cookie with HttpOnly flag
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options (defaults to secure settings)
 *
 * @example
 * // In API route or Server Action
 * await setServerCookie('refresh_token', token, {
 *   httpOnly: true,
 *   secure: true,
 *   maxAge: 60 * 60 * 24 * 7 // 7 days
 * })
 */
export async function setServerCookie(
  name: string,
  value: string,
  options: ServerCookieOptions = {}
): Promise<void> {
  const cookieStore = await cookies()

  const finalOptions = {
    ...SECURE_DEFAULTS,
    ...options,
  }

  // Debug: Log cookie setting
  console.log('[setServerCookie] Setting cookie:', name, 'value length:', value.length, 'options:', JSON.stringify(finalOptions))

  cookieStore.set(name, value, finalOptions)

  // Verify the cookie was set
  const verifyValue = cookieStore.get(name)?.value
  console.log('[setServerCookie] Verify cookie after set:', name, verifyValue ? `set (length: ${verifyValue.length})` : 'NOT SET')
}

/**
 * Get a server-side cookie value
 *
 * @param name - Cookie name
 * @returns Cookie value or undefined if not found
 */
export async function getServerCookie(name: string): Promise<string | undefined> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(name)
  return cookie?.value
}

/**
 * Remove a server-side cookie
 *
 * @param name - Cookie name
 */
export async function removeServerCookie(name: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(name)
}

/**
 * Check if a server-side cookie exists
 *
 * @param name - Cookie name
 * @returns true if cookie exists
 */
export async function hasServerCookie(name: string): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.has(name)
}

/**
 * Get all server-side cookies
 *
 * @returns Map of all cookies
 */
export async function getAllServerCookies(): Promise<Map<string, string>> {
  const cookieStore = await cookies()
  const allCookies = new Map<string, string>()

  cookieStore.getAll().forEach(cookie => {
    allCookies.set(cookie.name, cookie.value)
  })

  return allCookies
}

// ============================================
// AUTH TOKEN MANAGEMENT
// ============================================

/**
 * Set access token (in-memory preferred, but can use short-lived cookie)
 */
export async function setAccessToken(token: string): Promise<void> {
  await setServerCookie(env.auth.cookieName, token, {
    httpOnly: true,
    secure: serverEnv.security.secureCookies,
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes (short-lived)
  })
}

/**
 * Set refresh token (HttpOnly, long-lived)
 * This is the SECURE way to store refresh tokens
 */
export async function setRefreshToken(token: string): Promise<void> {
  await setServerCookie(env.auth.refreshCookieName, token, {
    httpOnly: true, // Critical: Prevents XSS
    secure: serverEnv.security.secureCookies, // HTTPS only in production
    sameSite: 'lax', // CSRF protection
    maxAge: serverEnv.token.cookieMaxAge, // 7 days default
  })
}

/**
 * Get access token from cookie
 */
export async function getAccessToken(): Promise<string | undefined> {
  return getServerCookie(env.auth.cookieName)
}

/**
 * Get refresh token from cookie
 */
export async function getRefreshToken(): Promise<string | undefined> {
  return getServerCookie(env.auth.refreshCookieName)
}

/**
 * Remove all authentication tokens
 */
export async function clearAuthTokens(): Promise<void> {
  await removeServerCookie(env.auth.cookieName)
  await removeServerCookie(env.auth.refreshCookieName)
}

// ============================================
// CSRF TOKEN MANAGEMENT
// ============================================

/**
 * Generate a CSRF token
 */
function generateCsrfToken(): string {
  // Simple implementation - in production, use crypto.randomBytes
  return Buffer.from(
    `${Date.now()}-${Math.random().toString(36)}-${serverEnv.security.csrfSecret}`
  ).toString('base64')
}

/**
 * Set CSRF token cookie
 */
export async function setCsrfToken(): Promise<string> {
  const token = generateCsrfToken()

  await setServerCookie('csrf_token', token, {
    httpOnly: true,
    secure: serverEnv.security.secureCookies,
    sameSite: 'strict', // Strict for CSRF tokens
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return token
}

/**
 * Verify CSRF token
 */
export async function verifyCsrfToken(token: string): Promise<boolean> {
  const storedToken = await getServerCookie('csrf_token')
  return storedToken === token
}

/**
 * Remove CSRF token
 */
export async function clearCsrfToken(): Promise<void> {
  await removeServerCookie('csrf_token')
}

// ============================================
// DEBUGGING HELPERS (Development only)
// ============================================

/**
 * Log all cookies (development only)
 */
export async function debugCookies(): Promise<void> {
  if (env.app.env !== 'development') return

  const allCookies = await getAllServerCookies()

  console.log('🍪 Server Cookies Debug:')
  allCookies.forEach((value, name) => {
    // Mask sensitive values
    const maskedValue = name.includes('token')
      ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}`
      : value

    console.log(`   ${name}: ${maskedValue}`)
  })
}

// ============================================
// TYPE EXPORTS
// ============================================

export type { ServerCookieOptions }
