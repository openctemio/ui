/**
 * Auth Refresh Route
 *
 * Handles token refresh by reading tokens from cookies
 * and sending to backend refresh endpoint.
 *
 * Flow:
 * 1. Read refresh token from cookie
 * 2. Read tenant info from tenant cookie
 * 3. Send to backend `/api/v1/auth/refresh` with tenant_id
 * 4. Update cookies with new tokens
 * 5. Return new access token to client
 */

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080'
// Frontend cookie names (from env config)
const ACCESS_TOKEN_COOKIE = env.auth.cookieName
const REFRESH_TOKEN_COOKIE = env.auth.refreshCookieName
const TENANT_COOKIE = env.cookies.tenant
// NOTE: Permissions are NOT stored in cookies anymore (too large, > 4KB limit)
// Frontend fetches permissions via /api/v1/me/permissions API instead

interface BackendRefreshResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  tenant_id: string
  tenant_slug: string
  role: string
  permissions?: string[]
}

interface TenantInfo {
  id: string
  slug: string
  name?: string
  role: string
}

export async function POST(_request: NextRequest): Promise<NextResponse> {
  console.log('[Refresh] Token refresh request received')
  try {
    const cookieStore = await cookies()

    // Get refresh token from cookie
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value
    console.log('[Refresh] Refresh token cookie:', refreshToken ? 'present' : 'MISSING')
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token found' } },
        { status: 401 }
      )
    }

    // Get tenant info from cookie
    const tenantCookie = cookieStore.get(TENANT_COOKIE)?.value
    console.log('[Refresh] Tenant cookie:', tenantCookie ? 'present' : 'MISSING')
    let tenantId: string | undefined
    let existingTenantName: string | undefined

    if (tenantCookie) {
      try {
        const tenantInfo: TenantInfo = JSON.parse(tenantCookie)
        tenantId = tenantInfo.id
        existingTenantName = tenantInfo.name // Preserve existing name
        console.log('[Refresh] Tenant ID:', tenantId)
      } catch {
        console.error('[Refresh] Failed to parse tenant cookie')
      }
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_TENANT', message: 'No tenant context found' } },
        { status: 400 }
      )
    }

    // Make request to backend refresh endpoint
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        tenant_id: tenantId,
      }),
    })

    // Handle non-OK response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Refresh failed' }))
      console.error('[Refresh] Backend returned error:', response.status, errorData)

      // Create error response
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: {
            code: errorData.code || 'REFRESH_FAILED',
            message: errorData.message || 'Token refresh failed',
          },
        },
        { status: response.status }
      )

      // CRITICAL: Clear ALL cookies when refresh fails with 401
      // This prevents login loops caused by stale cookies
      if (response.status === 401) {
        console.log('[Refresh] Clearing ALL auth cookies due to invalid refresh token')

        // Clear access token cookie
        errorResponse.cookies.set(ACCESS_TOKEN_COOKIE, '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 0,
          path: '/',
        })

        // Clear refresh token cookie
        errorResponse.cookies.set(REFRESH_TOKEN_COOKIE, '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 0,
          path: '/',
        })

        // Clear tenant cookie to prevent login loops
        // When user logs in again, they'll go through proper tenant selection
        errorResponse.cookies.set(TENANT_COOKIE, '', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 0,
          path: '/',
        })
      }

      return errorResponse
    }

    const data: BackendRefreshResponse = await response.json()
    console.log('[Refresh] Backend success, new access_token:', !!data.access_token)
    console.log('[Refresh] Access token LENGTH:', data.access_token?.length, 'bytes')

    // Check token size - warn if approaching browser cookie limit
    if (data.access_token && data.access_token.length > 3500) {
      console.warn(
        `[Refresh] WARNING: Token size (${data.access_token.length} bytes) may approach browser cookie limit (4096 bytes)`
      )
    }

    // Build success response
    // NOTE: Permissions NOT included here - frontend fetches via /api/v1/me/permissions
    const clientResponse = NextResponse.json({
      success: true,
      data: {
        access_token: data.access_token,
        expires_in: data.expires_in,
        tenant_id: data.tenant_id,
        tenant_slug: data.tenant_slug,
        role: data.role,
      },
    })

    // Update access token cookie
    // WARNING: Browser cookie limit is ~4096 bytes. Large JWTs will be silently rejected!
    const tokenLength = data.access_token?.length || 0
    if (tokenLength > 4000) {
      console.warn(
        `[Refresh] WARNING: Token size (${tokenLength} bytes) may exceed browser cookie limit!`
      )
    }
    clientResponse.cookies.set(ACCESS_TOKEN_COOKIE, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in || 900,
      path: '/',
    })

    // Update refresh token cookie if rotated
    if (data.refresh_token) {
      clientResponse.cookies.set(REFRESH_TOKEN_COOKIE, data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      })
    }

    // Update tenant info cookie (preserve existing name if available)
    clientResponse.cookies.set(
      TENANT_COOKIE,
      JSON.stringify({
        id: data.tenant_id,
        slug: data.tenant_slug,
        name: existingTenantName || data.tenant_slug, // Preserve name or fallback to slug
        role: data.role,
      }),
      {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      }
    )
    // NOTE: Permissions NOT stored in cookie - frontend fetches via /api/v1/me/permissions

    return clientResponse
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REFRESH_FAILED',
          message: 'Failed to refresh token',
        },
      },
      { status: 500 }
    )
  }
}
