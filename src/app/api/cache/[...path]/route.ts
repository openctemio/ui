/**
 * Cache Proxy API Route
 *
 * Implements a cache-aside pattern for GET requests to the backend API.
 * Only caches successful GET responses; all other methods are rejected.
 *
 * Flow:
 * 1. Client sends GET request to /api/cache/{backend-path}
 * 2. Check if path is in the never-cache list -> proxy directly if so
 * 3. Build tenant-isolated cache key from auth context + path + query
 * 4. Check cache for existing entry -> return with X-Cache: HIT if found
 * 5. On cache miss, proxy to backend via /api/v1/{path}
 * 6. Cache successful (2xx) responses with path-specific TTL
 * 7. Return response with X-Cache: MISS header
 *
 * Cache isolation:
 * - Each tenant gets its own cache namespace via hashed auth cookie
 * - Cache keys include full path + query string for uniqueness
 *
 * Error handling:
 * - Cache failures (read/write) are logged but never block requests
 * - Backend errors are returned as-is without caching
 * - Non-GET methods return 405 Method Not Allowed
 *
 * TODO: Future enhancement - the existing API client at src/lib/api/client.ts
 * could optionally route cacheable GET requests through /api/cache/ instead of
 * /api/v1/ for automatic caching. This would require adding a `cache` option
 * to ApiRequestOptions and modifying the client to use the cache proxy URL
 * for eligible GET requests. However, this should be done carefully to avoid
 * breaking existing SWR caching and revalidation patterns.
 */

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { cacheStore } from '@/lib/cache-proxy/cache-store'
import { getTTL, shouldNeverCache } from '@/lib/cache-proxy/cache-config'
import { env } from '@/lib/env'

// Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues in Node.js
const BACKEND_URL =
  process.env.BACKEND_API_URL?.replace('localhost', '127.0.0.1') || 'http://127.0.0.1:8080'
const ACCESS_TOKEN_COOKIE = env.auth.cookieName

// ============================================
// ROUTE HANDLERS
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  const path = '/api/v1/' + resolvedParams.path.join('/')

  // Check if path should never be cached
  if (shouldNeverCache(path)) {
    return proxyToBackend(request, path)
  }

  // Build tenant-isolated cache key from JWT
  const tenantKey = await getTenantKey()
  if (!tenantKey) {
    // No tenant context from JWT — proxy directly without caching
    return proxyToBackend(request, path)
  }
  const cacheKey = `cache:${tenantKey}:${path}:${request.nextUrl.search}`

  // Try cache first
  try {
    const cached = await cacheStore.get(cacheKey)
    if (cached) {
      const remainingTTL = Math.max(0, Math.floor((cached.expiresAt - Date.now()) / 1000))
      return new NextResponse(cached.body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-TTL': String(remainingTTL),
          'X-Cache-Key': cacheKey,
        },
      })
    }
  } catch (error) {
    // Cache read failure should never block the request
    console.warn('[CacheProxy] Cache read error:', error)
  }

  // Cache miss -- proxy to backend
  const response = await proxyToBackend(request, path)

  // Only cache successful JSON responses
  if (response.ok) {
    const ttl = getTTL(path)
    // Clone response body since it can only be read once
    const body = await response.text()

    try {
      await cacheStore.set(cacheKey, body, ttl)
    } catch (error) {
      console.warn('[CacheProxy] Cache write error:', error)
    }

    // Re-create response with the body we already consumed
    return new NextResponse(body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'X-Cache': 'MISS',
        'X-Cache-TTL': String(ttl),
        // Forward important headers from backend
        ...(response.headers.get('x-total-count')
          ? { 'X-Total-Count': response.headers.get('x-total-count')! }
          : {}),
        ...(response.headers.get('x-permission-stale')
          ? { 'X-Permission-Stale': response.headers.get('x-permission-stale')! }
          : {}),
        ...(response.headers.get('x-request-id')
          ? { 'X-Request-Id': response.headers.get('x-request-id')! }
          : {}),
      },
    })
  }

  // Return non-2xx responses as-is (do not cache errors)
  return response
}

// Only GET is cacheable. Return 405 for all other methods.
export async function POST() {
  return methodNotAllowed()
}

export async function PUT() {
  return methodNotAllowed()
}

export async function PATCH() {
  return methodNotAllowed()
}

export async function DELETE() {
  return methodNotAllowed()
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Proxy a request to the backend API.
 * Reads auth token from httpOnly cookie and forwards it as Bearer token.
 */
async function proxyToBackend(request: NextRequest, path: string): Promise<Response> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  const url = new URL(request.url)
  const backendUrl = `${BACKEND_URL}${path}${url.search}`

  // Build headers
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  // Forward relevant headers from client
  const forwardHeaders = ['accept', 'accept-language', 'x-tenant-id', 'x-csrf-token']
  forwardHeaders.forEach((header) => {
    const value = request.headers.get(header)
    if (value) {
      headers.set(header, value)
    }
  })

  try {
    return await fetch(backendUrl, {
      method: 'GET',
      headers,
    })
  } catch (error) {
    console.error('[CacheProxy] Backend connection error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({
        error: 'PROXY_ERROR',
        message: `Failed to connect to backend: ${errorMessage}`,
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * Get a tenant-specific cache key component.
 * Decodes the JWT payload to extract tenant_id and perm_version for cache isolation.
 * Including perm_version ensures automatic cache invalidation on permission changes.
 * Returns null if tenant context cannot be determined (skip caching).
 */
async function getTenantKey(): Promise<string | null> {
  const cookieStore = await cookies()

  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  if (!accessToken) {
    return null // No auth context — skip caching
  }

  // Decode JWT payload (no verification needed — backend validates the token)
  try {
    const parts = accessToken.split('.')
    if (parts.length !== 3) {
      return null
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
    const tenantId = payload.tenant_id || payload.tid
    if (!tenantId) {
      return null // No tenant in JWT — skip caching
    }
    const permVersion = payload.perm_version || payload.pv || '0'
    return `${tenantId}:pv${permVersion}`
  } catch {
    return null // Malformed JWT — skip caching
  }
}

/**
 * Return 405 Method Not Allowed for non-GET requests.
 */
function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'Cache proxy only supports GET requests. Use /api/v1/ for mutations.',
    },
    { status: 405, headers: { Allow: 'GET' } }
  )
}
