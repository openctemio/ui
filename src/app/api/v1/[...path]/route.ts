/**
 * API Proxy Route
 *
 * Proxies all requests to the backend API with authentication headers.
 * This allows the frontend to make requests without CORS issues.
 *
 * Authentication flow:
 * - Reads access token from httpOnly cookie (set by login action)
 * - If access token is missing but refresh token exists, auto-refresh first
 * - If backend returns 401, try to refresh and retry the request
 * - Forwards as Authorization header to backend
 * - Also forwards X-CSRF-Token and X-Tenant-ID headers
 */

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'

// Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues in Node.js
const BACKEND_URL =
  process.env.BACKEND_API_URL?.replace('localhost', '127.0.0.1') || 'http://127.0.0.1:8080'
const ACCESS_TOKEN_COOKIE = env.auth.cookieName
const REFRESH_TOKEN_COOKIE = env.auth.refreshCookieName
const TENANT_COOKIE = env.cookies.tenant

// Simple in-memory lock to prevent concurrent refresh attempts
// Key: tenantId, Value: Promise that resolves when refresh completes
const refreshLocks = new Map<string, Promise<RefreshResult | null>>()

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
      console.error('[Proxy] Failed to parse tenant cookie')
    }
  }
  return undefined
}

/**
 * Attempt to refresh the access token using refresh token
 * Uses locking to prevent concurrent refresh attempts for the same tenant
 * Returns the new access token if successful, null otherwise
 */
async function tryRefreshAccessToken(
  refreshToken: string,
  tenantId: string | undefined
): Promise<RefreshResult | null> {
  if (!tenantId) {
    console.log('[Proxy] Cannot refresh - no tenant ID')
    return null
  }

  // Check if there's already a refresh in progress for this tenant
  const existingPromise = refreshLocks.get(tenantId)
  if (existingPromise) {
    console.log('[Proxy] Refresh already in progress for tenant, waiting...')
    return existingPromise
  }

  // Create a new refresh promise
  const refreshPromise = (async (): Promise<RefreshResult | null> => {
    try {
      console.log('[Proxy] Attempting to refresh access token for tenant:', tenantId)
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

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.log('[Proxy] Token refresh failed:', response.status, errorText)
        return null
      }

      const data = await response.json()
      console.log('[Proxy] Token refresh successful, new token length:', data.access_token?.length)

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in || 900,
      }
    } catch (error) {
      console.error('[Proxy] Token refresh error:', error)
      return null
    } finally {
      // Remove lock after completion
      refreshLocks.delete(tenantId)
    }
  })()

  // Store the promise so concurrent requests can wait on it
  refreshLocks.set(tenantId, refreshPromise)

  return refreshPromise
}

/**
 * Set token cookies on a response
 */
function setTokenCookies(response: NextResponse, tokenData: RefreshResult): void {
  const isProd = process.env.NODE_ENV === 'production'
  console.log('[Proxy] Setting token cookies, expires_in:', tokenData.expiresIn)

  // Set new access token cookie
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokenData.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: tokenData.expiresIn,
    path: '/',
  })

  // Set new refresh token cookie if rotated
  if (tokenData.refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokenData.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })
  }
}

/**
 * Make a request to the backend
 */
async function makeBackendRequest(
  backendUrl: string,
  method: string,
  headers: Headers,
  body: string | undefined
): Promise<Response> {
  return fetch(backendUrl, {
    method,
    headers,
    body,
  })
}

async function proxyRequest(
  request: NextRequest,
  params: { path: string[] }
): Promise<NextResponse> {
  const path = params.path.join('/')
  const url = new URL(request.url)
  // Route is /api/v1/[...path], so we need to add /api/v1/ prefix for backend
  const backendUrl = `${BACKEND_URL}/api/v1/${path}${url.search}`

  // Get access token from httpOnly cookie
  const cookieStore = await cookies()
  let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

  // Debug: Log cookie status (reduced logging for production)
  console.log('[Proxy]', request.method, path, accessToken ? 'authenticated' : 'NO_TOKEN')

  // Track if we refreshed the token (to set cookie in response)
  let refreshedTokenData: RefreshResult | null = null

  // If access token is missing but refresh token exists, try to refresh BEFORE making request
  if (!accessToken && refreshToken) {
    console.log('[Proxy] Access token missing, attempting pre-request refresh...')
    const tenantId = await getTenantId()
    refreshedTokenData = await tryRefreshAccessToken(refreshToken, tenantId)
    if (refreshedTokenData) {
      accessToken = refreshedTokenData.accessToken
      console.log('[Proxy] Pre-request token refresh successful')
    } else {
      console.warn('[Proxy] Pre-request token refresh failed')
    }
  }

  // Build headers
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')

  // Set Authorization header
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  // Forward refresh token cookie for endpoints that need it
  if (refreshToken) {
    headers.set('Cookie', `${REFRESH_TOKEN_COOKIE}=${refreshToken}`)
  }

  // Forward other relevant headers from client
  const forwardHeaders = ['accept', 'accept-language', 'x-tenant-id', 'x-csrf-token']
  forwardHeaders.forEach((header) => {
    const value = request.headers.get(header)
    if (value) {
      headers.set(header, value)
    }
  })

  // Get request body for non-GET requests (need to read it once since it can only be read once)
  const body =
    request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined

  try {
    // Make request to backend
    let response = await makeBackendRequest(backendUrl, request.method, headers, body)

    // Handle 401 Unauthorized - try to refresh token and retry ONCE
    if (response.status === 401 && refreshToken && !refreshedTokenData) {
      console.log('[Proxy] Got 401, attempting token refresh and retry...')
      const tenantId = await getTenantId()
      refreshedTokenData = await tryRefreshAccessToken(refreshToken, tenantId)

      if (refreshedTokenData) {
        console.log('[Proxy] Token refresh successful, retrying original request...')
        // Update Authorization header with new token
        headers.set('Authorization', `Bearer ${refreshedTokenData.accessToken}`)

        // Retry the original request
        response = await makeBackendRequest(backendUrl, request.method, headers, body)
        console.log('[Proxy] Retry response:', response.status)
      } else {
        console.warn('[Proxy] Token refresh failed, returning original 401')
      }
    }

    // Handle 204 No Content - must return response without body
    if (response.status === 204) {
      const proxyResponse = new NextResponse(null, {
        status: 204,
        statusText: 'No Content',
      })
      // Still set cookies if we refreshed
      if (refreshedTokenData) {
        setTokenCookies(proxyResponse, refreshedTokenData)
      }
      return proxyResponse
    }

    // Get response body
    const responseText = await response.text()
    if (response.status >= 400) {
      console.log('[Proxy] Backend error:', response.status, responseText.substring(0, 200))
    }

    // Create response with same status and headers
    const proxyResponse = new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
    })

    // Copy relevant response headers
    const copyHeaders = ['content-type', 'x-request-id', 'x-total-count', 'x-permission-stale']
    copyHeaders.forEach((header) => {
      const value = response.headers.get(header)
      if (value) {
        proxyResponse.headers.set(header, value)
      }
    })

    // Forward Set-Cookie headers from backend (important for auth endpoints)
    const setCookieHeaders = response.headers.getSetCookie()
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach((cookie) => {
        proxyResponse.headers.append('Set-Cookie', cookie)
      })
    }

    // If we refreshed the token, set the new cookies in response
    if (refreshedTokenData) {
      setTokenCookies(proxyResponse, refreshedTokenData)
    }

    return proxyResponse
  } catch (error) {
    console.error('[Proxy] Connection error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'PROXY_ERROR', message: `Failed to connect to backend: ${errorMessage}` },
      { status: 502 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}
