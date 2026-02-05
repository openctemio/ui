/**
 * Next.js 16 Proxy
 *
 * Replaces middleware.ts in Next.js 16
 * Runs on Node.js runtime (not Edge)
 *
 * Handles:
 * 1. Authentication - Protected route checking
 * 2. Internationalization - Locale detection and injection
 *
 * @see https://nextjs.org/blog/next-16
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleAuth, handleI18n } from '@/lib/middleware'

export function proxy(req: NextRequest) {
  // ============================================
  // 1. AUTHENTICATION CHECK
  // ============================================
  // Redirects to login if accessing protected route without auth
  const authResponse = handleAuth(req)
  if (authResponse) {
    return authResponse
  }

  // ============================================
  // 2. INTERNATIONALIZATION
  // ============================================
  // Detects locale and injects into request headers
  const { headers } = handleI18n(req)

  // ============================================
  // 3. CONTINUE REQUEST
  // ============================================
  return NextResponse.next({
    request: { headers },
  })
}

// ============================================
// PROXY CONFIGURATION
// ============================================
export const config = {
  matcher: [
    // Match root path
    '/',
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
