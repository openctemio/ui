/**
 * Redirect URL Validation Utilities
 *
 * Prevents open redirect vulnerabilities by validating redirect URLs
 * Only allows internal redirects within the same application
 */

import { env } from './env'

/**
 * Validates a redirect URL to prevent open redirect attacks
 *
 * Security Rules:
 * 1. Only allows internal redirects (same origin)
 * 2. Blocks external URLs
 * 3. Blocks protocol-relative URLs (//)
 * 4. Returns safe default if invalid
 *
 * @param url - URL to validate
 * @param defaultUrl - Default URL to return if validation fails (default: '/dashboard')
 * @returns Safe internal URL
 *
 * @example
 * // Valid internal redirects
 * validateRedirectUrl('/dashboard')           // ✅ '/dashboard'
 * validateRedirectUrl('/profile?tab=settings') // ✅ '/profile?tab=settings'
 *
 * // Invalid external redirects
 * validateRedirectUrl('https://evil.com')     // ❌ '/dashboard'
 * validateRedirectUrl('//evil.com')           // ❌ '/dashboard'
 * validateRedirectUrl('javascript:alert(1)')  // ❌ '/dashboard'
 */
export function validateRedirectUrl(
  url: string | null | undefined,
  defaultUrl: string = '/dashboard'
): string {
  // No URL provided
  if (!url) {
    return defaultUrl
  }

  // Trim whitespace
  const trimmedUrl = url.trim()

  if (!trimmedUrl) {
    return defaultUrl
  }

  try {
    // Rule 1: Simple internal path (starts with / but not //)
    if (trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('//')) {
      // Additional check: block javascript: and data: pseudo-URLs
      if (
        trimmedUrl.toLowerCase().startsWith('/javascript:') ||
        trimmedUrl.toLowerCase().startsWith('/data:')
      ) {
        return defaultUrl
      }

      return trimmedUrl
    }

    // Rule 2: Try to parse as absolute URL
    const parsed = new URL(trimmedUrl, env.app.url)

    // Rule 3: Only allow same origin
    const appOrigin = new URL(env.app.url).origin

    if (parsed.origin === appOrigin) {
      // Return pathname + search + hash (no origin)
      return parsed.pathname + parsed.search + parsed.hash
    }

    // Different origin - not allowed
    console.warn(`[Security] Blocked external redirect attempt: ${trimmedUrl}`)
    return defaultUrl
  } catch {
    // Invalid URL format
    console.warn(`[Security] Invalid redirect URL format: ${trimmedUrl}`)
    return defaultUrl
  }
}

/**
 * Validates and creates a safe login redirect URL
 *
 * @param returnUrl - Desired return URL after login
 * @param includeQueryParam - Whether to add ?redirect= query param
 * @returns Safe login URL
 *
 * @example
 * getSafeLoginUrl('/profile')
 * // '/login?redirect=%2Fprofile'
 */
export function getSafeLoginUrl(
  returnUrl?: string | null,
  includeQueryParam: boolean = true
): string {
  const baseUrl = '/login'

  if (!includeQueryParam || !returnUrl) {
    return baseUrl
  }

  const safeReturnUrl = validateRedirectUrl(returnUrl)
  const params = new URLSearchParams({ redirect: safeReturnUrl })

  return `${baseUrl}?${params.toString()}`
}

/**
 * Validates and creates a safe logout redirect URL
 *
 * @param returnUrl - Desired return URL after logout
 * @returns Safe logout URL
 */
export function getSafeLogoutUrl(returnUrl?: string | null): string {
  const safeReturnUrl = returnUrl
    ? validateRedirectUrl(returnUrl, '/')
    : '/'

  return safeReturnUrl
}

/**
 * Checks if a URL is an internal URL (same origin)
 *
 * @param url - URL to check
 * @returns true if internal, false if external
 */
export function isInternalUrl(url: string): boolean {
  try {
    // Internal paths always start with /
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true
    }

    // Parse as absolute URL
    const parsed = new URL(url, env.app.url)
    const appOrigin = new URL(env.app.url).origin

    return parsed.origin === appOrigin
  } catch {
    return false
  }
}

/**
 * Sanitizes URL for display purposes
 * Removes sensitive information like tokens from URL
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL safe for display
 */
export function sanitizeUrlForDisplay(url: string): string {
  try {
    const parsed = new URL(url, env.app.url)

    // Remove sensitive query parameters
    const sensitiveParams = ['token', 'access_token', 'refresh_token', 'code', 'session']
    sensitiveParams.forEach(param => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '***')
      }
    })

    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * Gets the current URL path for use as return URL
 *
 * @returns Current pathname + search + hash
 */
export function getCurrentReturnUrl(): string {
  if (typeof window === 'undefined') {
    return '/dashboard'
  }

  const { pathname, search, hash } = window.location
  return pathname + search + hash
}
