/**
 * WebSocket Token API Route
 *
 * Returns the access token from httpOnly cookie for WebSocket authentication.
 * This is needed because WebSocket connections to cross-origin backends
 * cannot automatically include httpOnly cookies.
 *
 * Security: This endpoint only returns the token to the same browser session
 * that owns the cookie. The token is already accessible via cookie - this
 * just bridges the gap for WebSocket which can't use cookies cross-origin.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { env } from '@/lib/env'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(env.auth.cookieName)?.value

  console.log('[ws-token] Cookie name:', env.auth.cookieName, 'Token exists:', !!token)

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  return NextResponse.json({ token })
}
