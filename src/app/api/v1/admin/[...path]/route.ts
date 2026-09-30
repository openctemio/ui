/**
 * Platform admin console API proxy (RFC-022).
 *
 * Takes precedence over the generic /api/v1/[...path] proxy for everything
 * under /api/v1/admin. It must stay separate from it:
 * - The generic proxy attaches the TENANT access token as `Authorization:
 *   Bearer`. The admin API treats a bearer value as an admin API key, so a
 *   tenant token would fail as a bad key and hide the admin session. This proxy
 *   never forwards tenant credentials.
 * - Admin auth is a server-side session in the `admin_session` cookie (plus
 *   `admin_mfa` during login and the readable `admin_csrf`). Only those cookies
 *   are forwarded, and the backend's Set-Cookie headers are passed back so the
 *   browser stores them under the same paths.
 * - The exceptions are POST /auth/session, which starts the console from the
 *   normal /login session, and POST /auth/logout, which ends both: only those
 *   two requests also carry the refresh-token cookie, which names the
 *   signed-in account.
 */

import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'

/** Backend cookie name the admin API reads the /login refresh token from. */
const BACKEND_REFRESH_COOKIE = 'refresh_token'
/** The only admin API calls that receive the /login refresh token. */
const REFRESH_PATHS = new Set(['auth/session', 'auth/logout'])

export const dynamic = 'force-dynamic'

const ADMIN_COOKIES = ['admin_session', 'admin_mfa', 'admin_csrf'] as const
const FORWARD_HEADERS = ['x-csrf-token', 'x-request-id', 'user-agent'] as const
const MAX_BODY_BYTES = 1024 * 1024

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const url = new URL(request.url)
  const backendUrl = `${env.api.url}/api/v1/admin/${path.map(encodeURIComponent).join('/')}${url.search}`

  const headers = new Headers()
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  // X-Forwarded-For is deliberately NOT passed through: it is client-supplied
  // here, and forwarding it would let a caller write any IP into the admin
  // audit log. The generic proxy does not forward it either.

  const cookieParts = ADMIN_COOKIES.flatMap((name) => {
    const value = request.cookies.get(name)?.value
    return value ? [`${name}=${value}`] : []
  })
  if (request.method === 'POST' && REFRESH_PATHS.has(path.join('/'))) {
    const refresh = request.cookies.get(env.auth.refreshCookieName)?.value
    if (refresh) cookieParts.push(`${BACKEND_REFRESH_COOKIE}=${refresh}`)
  }
  if (cookieParts.length > 0) headers.set('Cookie', cookieParts.join('; '))

  let body: BodyInit | undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const length = Number(request.headers.get('content-length') ?? '0')
    if (length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
    }
    body = await request.text()
  }

  let upstream: Response
  try {
    upstream = await fetch(backendUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'PROXY_ERROR', message: `Failed to connect to backend: ${message}` },
      { status: 502 }
    )
  }

  const response =
    upstream.status === 204
      ? new NextResponse(null, { status: 204 })
      : new NextResponse(await upstream.text(), {
          status: upstream.status,
          headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
        })

  // Pass session/CSRF cookies through unchanged (paths, flags and expiry are
  // decided by the API).
  for (const cookie of upstream.headers.getSetCookie()) {
    response.headers.append('Set-Cookie', cookie)
  }
  response.headers.set('Cache-Control', 'no-store')
  return response
}

type Params = { params: Promise<{ path: string[] }> }

export async function GET(request: NextRequest, { params }: Params) {
  return proxy(request, (await params).path)
}
export async function POST(request: NextRequest, { params }: Params) {
  return proxy(request, (await params).path)
}
export async function PUT(request: NextRequest, { params }: Params) {
  return proxy(request, (await params).path)
}
export async function PATCH(request: NextRequest, { params }: Params) {
  return proxy(request, (await params).path)
}
export async function DELETE(request: NextRequest, { params }: Params) {
  return proxy(request, (await params).path)
}
