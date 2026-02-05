/**
 * Internationalization Middleware Helpers
 *
 * Functions for handling locale detection and injection in middleware
 */

import { NextRequest } from 'next/server'
import { supportedLocales, defaultLocale } from '@/lib/i18n'

// ============================================
// LOCALE DETECTION
// ============================================

/**
 * Detect user's locale from cookie or Accept-Language header
 *
 * Priority:
 * 1. Locale cookie (user preference)
 * 2. Accept-Language header (browser setting)
 * 3. Default locale (fallback)
 */
export function detectLocale(req: NextRequest): string {
  // 1. Check locale cookie
  const cookieLocale = req.cookies.get('locale')?.value
  if (cookieLocale && supportedLocales.includes(cookieLocale as never)) {
    return cookieLocale
  }

  // 2. Check Accept-Language header
  const acceptLanguage = req.headers.get('accept-language') || ''
  const browserLocale = acceptLanguage.split(',')[0]?.split('-')[0]

  if (browserLocale && supportedLocales.includes(browserLocale as never)) {
    return browserLocale
  }

  // 3. Fallback to default
  return defaultLocale
}

// ============================================
// HEADER INJECTION
// ============================================

/**
 * Create new headers with locale injected
 *
 * @param req - Next.js request object
 * @param locale - Detected locale
 * @returns New Headers object with x-locale header
 */
export function createHeadersWithLocale(
  req: NextRequest,
  locale: string
): Headers {
  const headers = new Headers(req.headers)
  headers.set('x-locale', locale)
  return headers
}

// ============================================
// I18N HANDLER
// ============================================

/**
 * Handle i18n in middleware
 * Detects locale and returns headers with locale injected
 *
 * @param req - Next.js request object
 * @returns Object with locale and modified headers
 *
 * @example
 * ```typescript
 * const { locale, headers } = handleI18n(req)
 * return NextResponse.next({ request: { headers } })
 * ```
 */
export function handleI18n(req: NextRequest): {
  locale: string
  headers: Headers
} {
  const locale = detectLocale(req)
  const headers = createHeadersWithLocale(req, locale)

  return { locale, headers }
}
