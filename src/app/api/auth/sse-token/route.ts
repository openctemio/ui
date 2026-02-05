/**
 * SSE Token Endpoint
 *
 * Returns the access token from httpOnly cookie for SSE connections.
 * This is needed because:
 * 1. EventSource API cannot send custom headers (like Authorization)
 * 2. Access tokens are stored in httpOnly cookies (not accessible to JavaScript)
 * 3. SSE needs the token to authenticate with the backend
 *
 * Security considerations:
 * - This endpoint returns the token, but it's already accessible via the httpOnly cookie
 * - The token is returned only to authenticated users (who already have it in cookies)
 * - Short-lived access tokens minimize risk if token is intercepted
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { env } from '@/lib/env'

const BACKEND_URL =
  process.env.BACKEND_API_URL?.replace('localhost', '127.0.0.1') || 'http://127.0.0.1:8080'
const ACCESS_TOKEN_COOKIE = env.auth.cookieName
const REFRESH_TOKEN_COOKIE = env.auth.refreshCookieName
const TENANT_COOKIE = env.cookies.tenant

interface RefreshResult {
  accessToken: string
  refreshToken?: string
  expiresIn: number
}

/**
 * Get tenant ID from tenant cookie
 */
async function getTenantId(): Promise<string | undefined> {
  const cookieStore = await cookies()
  const tenantCookie = cookieStore.get(TENANT_COOKIE)?.value
  if (tenantCookie) {
    try {
      const tenantInfo = JSON.parse(tenantCookie)
      return tenantInfo.id
    } catch {
      return undefined
    }
  }
  return undefined
}

/**
 * Try to refresh access token
 */
async function tryRefreshToken(
  refreshToken: string,
  tenantId: string | undefined
): Promise<RefreshResult | null> {
  if (!tenantId) return null

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refreshToken,
        tenant_id: tenantId,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in || 900,
    }
  } catch {
    return null
  }
}

export async function GET() {
  const cookieStore = await cookies()
  let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

  // Try to refresh if no access token
  if (!accessToken && refreshToken) {
    const tenantId = await getTenantId()
    const refreshResult = await tryRefreshToken(refreshToken, tenantId)
    if (refreshResult) {
      accessToken = refreshResult.accessToken

      // Update cookies with new tokens
      const response = NextResponse.json({ token: accessToken })

      response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshResult.expiresIn,
        path: '/',
      })

      if (refreshResult.refreshToken) {
        response.cookies.set(REFRESH_TOKEN_COOKIE, refreshResult.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: '/',
        })
      }

      return response
    }
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized', message: 'No access token' }, { status: 401 })
  }

  return NextResponse.json({ token: accessToken })
}
