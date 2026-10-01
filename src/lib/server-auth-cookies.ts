/**
 * Server-side helpers for the session cookies the Next routes manage.
 *
 * CSRF (double submit): the UI origin keeps a JS-readable `csrf_token`
 * cookie. Browser code sends it back in `X-CSRF-Token` on state-changing
 * calls (see `csrfFetch` in lib/api/client.ts), the `/api/v1` proxy forwards
 * both to the API, and the browser-facing auth routes (`/api/auth/refresh`,
 * `/api/auth/switch-team`) check the pair themselves. A cross-site page can
 * make the browser attach cookies to a request but cannot read the cookie to
 * set the header.
 *
 * Rotation: the API returns a rotated refresh token only in `Set-Cookie`
 * (S-3), never in the JSON body. A route that keeps the old cookie leaves the
 * browser with a revoked token, and the next refresh signs the user out.
 */
import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'

export const CSRF_COOKIE = 'csrf_token'
export const CSRF_HEADER = 'X-CSRF-Token'

const secure = () => process.env.SECURE_COOKIES !== 'false'

/** A new random double-submit token (256 bits, hex). */
export function newCsrfToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Cookie options for the JS-readable CSRF cookie. */
export function csrfCookieOptions() {
  return {
    httpOnly: false, // read by browser code to fill X-CSRF-Token
    secure: secure(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Checks the double-submit pair on a state-changing request. Returns the 403
 * to send, or null when the request may proceed.
 *
 * A session established before the CSRF cookie existed has none; such a
 * request is let through once and the caller sets the cookie on its response
 * (`ensureCsrfCookie`), so every session carries one after its next refresh.
 */
export function csrfRejection(request: NextRequest): NextResponse | null {
  const cookie = request.cookies.get(CSRF_COOKIE)?.value
  if (!cookie) return null
  const header = request.headers.get(CSRF_HEADER) ?? ''
  if (header && constantTimeEqual(header, cookie)) return null
  return NextResponse.json(
    {
      success: false,
      error: { code: 'CSRF_INVALID', message: 'Missing or invalid CSRF token' },
    },
    { status: 403 }
  )
}

/** Sets a CSRF cookie on the response if the request did not carry one. */
export function ensureCsrfCookie(request: NextRequest, response: NextResponse): void {
  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, newCsrfToken(), csrfCookieOptions())
  }
}

/** The value of cookie `name` in a backend response's Set-Cookie headers. */
export function setCookieValue(response: Response, name: string): string | undefined {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  const all =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : (headers.get('set-cookie')?.split(/,(?=[^;]+?=)/) ?? [])
  for (const raw of all) {
    const pair = raw.split(';', 1)[0] ?? ''
    const eq = pair.indexOf('=')
    if (eq === -1 || pair.slice(0, eq).trim() !== name) continue
    const value = pair.slice(eq + 1).trim()
    if (!value) return undefined
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  return undefined
}

/** The rotated refresh token of a backend refresh/token-exchange response. */
export function rotatedRefreshToken(
  response: Response,
  body?: { refresh_token?: string }
): string | undefined {
  return body?.refresh_token || setCookieValue(response, env.auth.refreshCookieName)
}
