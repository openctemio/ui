/**
 * Switch Team Route
 *
 * Exchanges the current refresh token for a new access token
 * scoped to a different tenant.
 *
 * Flow:
 * 1. Read refresh token from cookie
 * 2. Call backend /api/v1/auth/token with new tenant_id
 * 3. Update access token cookie
 * 4. Update tenant info cookie
 */

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080'
const ACCESS_TOKEN_COOKIE = env.auth.cookieName
const REFRESH_TOKEN_COOKIE = env.auth.refreshCookieName
const TENANT_COOKIE = env.cookies.tenant

// NOTE: Permissions are no longer stored in JWT or cookies.
// They are fetched via PermissionProvider from /api/v1/me/permissions/sync

interface SwitchTeamRequest {
  tenant_id: string
  tenant_name?: string // Optional: for storing in cookie
}

interface TokenExchangeResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  tenant_id: string
  tenant_slug: string
  role: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[SwitchTeam] Request received')

  try {
    // Parse request body
    const body: SwitchTeamRequest = await request.json()

    if (!body.tenant_id) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'tenant_id is required' } },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()

    // Get refresh token from cookie
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value
    console.log('[SwitchTeam] Refresh token:', refreshToken ? 'present' : 'MISSING')

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token found' } },
        { status: 401 }
      )
    }

    // Exchange token for new tenant
    console.log('[SwitchTeam] Exchanging token for tenant:', body.tenant_id)
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        tenant_id: body.tenant_id,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Token exchange failed' }))
      console.error('[SwitchTeam] Backend error:', response.status, errorData)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: errorData.code || 'SWITCH_FAILED',
            message: errorData.message || 'Failed to switch team',
          },
        },
        { status: response.status }
      )
    }

    const data: TokenExchangeResponse = await response.json()
    console.log('[SwitchTeam] Token exchange successful for tenant:', data.tenant_slug)

    // Build success response
    // NOTE: Permissions are fetched via PermissionProvider, not from JWT
    const clientResponse = NextResponse.json({
      success: true,
      data: {
        tenant_id: data.tenant_id,
        tenant_slug: data.tenant_slug,
        role: data.role,
        expires_in: data.expires_in,
      },
    })

    // Update access token cookie
    clientResponse.cookies.set(ACCESS_TOKEN_COOKIE, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in || 900,
      path: '/',
    })

    // Update refresh token if rotated
    if (data.refresh_token) {
      clientResponse.cookies.set(REFRESH_TOKEN_COOKIE, data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
    }

    // Update tenant info cookie (non-httpOnly for client read)
    clientResponse.cookies.set(
      TENANT_COOKIE,
      JSON.stringify({
        id: data.tenant_id,
        slug: data.tenant_slug,
        name: body.tenant_name || data.tenant_slug, // Use provided name or fallback to slug
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

    // NOTE: Permissions are no longer stored in cookies
    // PermissionProvider fetches from /api/v1/me/permissions/sync

    console.log('[SwitchTeam] Successfully switched to tenant:', data.tenant_slug)
    return clientResponse
  } catch (error) {
    console.error('[SwitchTeam] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SWITCH_FAILED',
          message: 'Failed to switch team',
        },
      },
      { status: 500 }
    )
  }
}
