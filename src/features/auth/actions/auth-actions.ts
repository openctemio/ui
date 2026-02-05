/**
 * Auth Server Actions
 *
 * Server-side actions for authentication
 * - Handles OAuth2 callback and token exchange
 * - Manages HttpOnly cookie storage
 * - Token refresh and validation
 * - Logout and session cleanup
 */

'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { env } from '@/lib/env'
import { setServerCookie, removeServerCookie } from '@/lib/cookies-server'
import { validateRedirectUrl } from '@/lib/redirect'

import type { AuthSuccessResponse, AuthErrorResponse } from '../schemas/auth.schema'
import type { AuthUser } from '@/stores/auth-store'

// ============================================
// TYPES
// ============================================

/**
 * OAuth callback action input
 */
export interface HandleCallbackInput {
  code?: string
  state?: string
  error?: string
  error_description?: string
  session_state?: string
  redirectTo?: string
}

/**
 * Token response from API
 */
interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  refresh_expires_in?: number
}

/**
 * Refresh token action result
 */
export interface RefreshTokenResult {
  success: boolean
  accessToken?: string
  user?: AuthUser
  error?: string
}

// ============================================
// JWT UTILITIES
// ============================================

function decodeJWT<T = Record<string, unknown>>(token: string): T {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }
  const payload = parts[1]
  const decoded = Buffer.from(payload, 'base64').toString('utf-8')
  return JSON.parse(decoded) as T
}

function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeJWT<{ exp?: number }>(token)
    if (!decoded.exp) return true
    return decoded.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

function extractUser(token: string): AuthUser | null {
  try {
    const decoded = decodeJWT<{
      sub?: string
      id?: string
      email?: string
      name?: string
      given_name?: string
      family_name?: string
      picture?: string
      roles?: string[]
      realm_access?: { roles?: string[] }
      permissions?: string[]
      tenant_id?: string
      tenant_role?: string
      role?: string
    }>(token)

    return {
      id: decoded.id || decoded.sub || '',
      email: decoded.email || '',
      name: decoded.name,
      firstName: decoded.given_name,
      lastName: decoded.family_name,
      avatar: decoded.picture,
      roles: decoded.roles || decoded.realm_access?.roles || [],
      permissions: decoded.permissions || [],
      tenantId: decoded.tenant_id,
      tenantRole: decoded.tenant_role || decoded.role,
    }
  } catch {
    return null
  }
}

// ============================================
// OAUTH CALLBACK HANDLER
// ============================================

/**
 * Handle OAuth2 callback
 *
 * This action:
 * 1. Validates state parameter (CSRF protection)
 * 2. Exchanges authorization code for tokens
 * 3. Stores tokens in HttpOnly cookies
 * 4. Extracts user from access token
 * 5. Redirects to success URL
 *
 * @param input - OAuth callback parameters
 * @returns Success response with user data or error response
 */
export async function handleOAuthCallback(
  input: HandleCallbackInput
): Promise<AuthSuccessResponse<AuthUser> | AuthErrorResponse> {
  try {
    // Check for OAuth errors
    if (input.error) {
      console.error('OAuth error:', input.error, input.error_description)
      return {
        success: false,
        error: input.error_description || input.error || 'Authentication failed',
      }
    }

    // Validate required parameters
    if (!input.code || !input.state) {
      return {
        success: false,
        error: 'Missing authorization code or state parameter',
      }
    }

    // Validate state parameter (CSRF protection)
    const cookieStore = await cookies()
    const savedState = cookieStore.get('oauth_state')?.value

    if (!savedState || !input.state || savedState !== input.state) {
      return {
        success: false,
        error: 'Invalid state parameter. Possible CSRF attack.',
      }
    }

    // Exchange authorization code for tokens via backend API
    const response = await fetch(`${env.api.url}/api/v1/auth/oauth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: input.code, state: input.state }),
    })

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to exchange authorization code for tokens',
      }
    }

    const tokens: TokenResponse = await response.json()

    // Extract user from access token
    const user = extractUser(tokens.access_token)
    if (!user) {
      return {
        success: false,
        error: 'Failed to extract user from token',
      }
    }

    // Store tokens in HttpOnly cookies (server-side only)
    await setServerCookie(env.auth.cookieName, tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in || 300, // Default 5 minutes
    })

    if (tokens.refresh_token) {
      await setServerCookie(env.auth.refreshCookieName, tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokens.refresh_expires_in || 1800, // Default 30 minutes
      })
    }

    // Clean up OAuth state cookie
    await removeServerCookie('oauth_state')

    // Validate redirect URL (validation side-effect, result used client-side)
    validateRedirectUrl(input.redirectTo || '/')

    return {
      success: true,
      data: user,
      message: 'Authentication successful',
    }
  } catch (error) {
    console.error('OAuth callback error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    }
  }
}

// ============================================
// TOKEN REFRESH
// ============================================

/**
 * Refresh access token using refresh token
 *
 * This action:
 * 1. Gets refresh token from HttpOnly cookie
 * 2. Calls backend token refresh endpoint
 * 3. Updates cookies with new tokens
 * 4. Returns new access token and user
 *
 * @returns Refresh token result with new token or error
 */
export async function refreshTokenAction(): Promise<RefreshTokenResult> {
  try {
    // Get refresh token from cookie
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(env.auth.refreshCookieName)?.value

    if (!refreshToken) {
      return {
        success: false,
        error: 'No refresh token available',
      }
    }

    // Check if refresh token is expired
    if (isTokenExpired(refreshToken)) {
      // Clean up ALL cookies to prevent login loops
      await removeServerCookie(env.auth.cookieName)
      await removeServerCookie(env.auth.refreshCookieName)
      await removeServerCookie(env.cookies.tenant)
      await removeServerCookie(env.cookies.pendingTenants)

      return {
        success: false,
        error: 'Refresh token expired',
      }
    }

    // Refresh the access token via backend API
    const response = await fetch(`${env.api.url}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${env.auth.refreshCookieName}=${refreshToken}`,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      // Clean up ALL cookies on refresh failure to prevent login loops
      await removeServerCookie(env.auth.cookieName)
      await removeServerCookie(env.auth.refreshCookieName)
      await removeServerCookie(env.cookies.tenant)
      await removeServerCookie(env.cookies.pendingTenants)

      return {
        success: false,
        error: 'Failed to refresh token',
      }
    }

    const tokens: TokenResponse = await response.json()

    // Extract user from new access token
    const user = extractUser(tokens.access_token)
    if (!user) {
      return {
        success: false,
        error: 'Failed to extract user from new token',
      }
    }

    // Update cookies with new tokens
    await setServerCookie(env.auth.cookieName, tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in || 300,
    })

    if (tokens.refresh_token) {
      await setServerCookie(env.auth.refreshCookieName, tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokens.refresh_expires_in || 1800,
      })
    }

    return {
      success: true,
      accessToken: tokens.access_token,
      user,
    }
  } catch (error) {
    console.error('Refresh token action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
    }
  }
}

// ============================================
// GET CURRENT USER
// ============================================

/**
 * Get current authenticated user from access token
 *
 * This action:
 * 1. Gets access token from HttpOnly cookie
 * 2. Validates token expiry
 * 3. Extracts user from token
 *
 * @returns Success response with user or error response
 */
export async function getCurrentUser(): Promise<AuthSuccessResponse<AuthUser> | AuthErrorResponse> {
  try {
    // Get access token from cookie
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(env.auth.cookieName)?.value

    if (!accessToken) {
      return {
        success: false,
        error: 'Not authenticated',
      }
    }

    // Check if token is expired
    if (isTokenExpired(accessToken)) {
      // Try to refresh
      const refreshResult = await refreshTokenAction()

      if (!refreshResult.success || !refreshResult.accessToken) {
        return {
          success: false,
          error: 'Session expired',
        }
      }

      // Use refreshed token
      const user = refreshResult.user!
      return {
        success: true,
        data: user,
      }
    }

    // Extract user from token
    const user = extractUser(accessToken)
    if (!user) {
      return {
        success: false,
        error: 'Failed to extract user from token',
      }
    }

    return {
      success: true,
      data: user,
    }
  } catch (error) {
    console.error('Get current user error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user',
    }
  }
}

// ============================================
// LOGOUT
// ============================================

/**
 * Logout user and clean up session
 *
 * This action:
 * 1. Clears HttpOnly cookies
 * 2. Redirects to login page
 *
 * @param postLogoutRedirectUri - URL to redirect to after logout
 */
export async function logoutAction(postLogoutRedirectUri?: string): Promise<never> {
  try {
    // Clear all auth cookies
    await removeServerCookie(env.auth.cookieName)
    await removeServerCookie(env.auth.refreshCookieName)
    await removeServerCookie('oauth_state')
    await removeServerCookie(env.cookies.tenant)
    await removeServerCookie(env.cookies.pendingTenants)

    // Redirect to login page
    redirect(postLogoutRedirectUri || '/login')
  } catch (error) {
    console.error('Logout action error:', error)
    // Fallback: redirect to login even if cleanup fails
    redirect('/login')
  }
}

// ============================================
// TOKEN VALIDATION
// ============================================

/**
 * Validate if user has valid authentication
 *
 * @returns true if user is authenticated with valid token
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(env.auth.cookieName)?.value

    if (!accessToken) {
      return false
    }

    // Check if token is expired
    if (isTokenExpired(accessToken)) {
      // Try to refresh
      const refreshResult = await refreshTokenAction()
      return refreshResult.success
    }

    return true
  } catch (error) {
    console.error('Authentication check error:', error)
    return false
  }
}

// ============================================
// GET ACCESS TOKEN (for API calls)
// ============================================

/**
 * Get valid access token for API calls
 * Automatically refreshes if token is expired
 *
 * @returns Access token or null if not authenticated
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    let accessToken = cookieStore.get(env.auth.cookieName)?.value

    if (!accessToken) {
      return null
    }

    // Check if token is expired
    if (isTokenExpired(accessToken)) {
      // Try to refresh
      const refreshResult = await refreshTokenAction()

      if (!refreshResult.success || !refreshResult.accessToken) {
        return null
      }

      accessToken = refreshResult.accessToken
    }

    return accessToken
  } catch (error) {
    console.error('Get access token error:', error)
    return null
  }
}
