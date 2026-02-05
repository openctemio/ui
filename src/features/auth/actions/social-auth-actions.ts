/**
 * Social Auth Server Actions
 *
 * Server-side actions for OAuth/Social authentication
 * Supports: Google, GitHub, Microsoft (EntraID)
 *
 * Flow:
 * 1. Frontend calls getOAuthAuthorizationUrl() to get the OAuth URL
 * 2. Frontend redirects user to that URL
 * 3. User authenticates with the provider
 * 4. Provider redirects to backend callback URL
 * 5. Backend exchanges code for tokens, creates/finds user, generates JWT
 * 6. Backend redirects to frontend callback with tokens in cookies
 */

'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { env } from '@/lib/env'
import { setServerCookie } from '@/lib/cookies-server'
import { authEndpoints } from '@/lib/api/endpoints'

import type {
  AuthSuccessResponse,
  AuthErrorResponse,
} from '../schemas/auth.schema'

// ============================================
// TYPES
// ============================================

export type SocialProvider = 'google' | 'github' | 'microsoft'

export interface OAuthUser {
  id: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  avatar?: string
  roles: string[]
  emailVerified: boolean
  authProvider: SocialProvider
}

export interface OAuthAuthorizationResponse {
  authorization_url: string
  state: string
}

export interface OAuthCallbackResult {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: OAuthUser
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getBackendUrl(): string {
  return process.env.BACKEND_API_URL || 'http://localhost:8080'
}

async function backendFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getBackendUrl()
  const url = `${baseUrl}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// ============================================
// GET OAUTH AUTHORIZATION URL
// ============================================

/**
 * Get OAuth authorization URL for a provider
 * This URL will redirect the user to the OAuth provider
 */
export async function getOAuthAuthorizationUrl(
  provider: SocialProvider,
  redirectTo?: string
): Promise<AuthSuccessResponse<{ authorizationUrl: string; state: string }> | AuthErrorResponse> {
  try {
    // Build the callback URL that the OAuth provider will redirect to
    const frontendCallbackUrl = `${env.app.url}/auth/callback/${provider}`

    // Call backend to get the authorization URL
    const data = await backendFetch<OAuthAuthorizationResponse>(
      `${authEndpoints.oauthAuthorize(provider)}?redirect_uri=${encodeURIComponent(frontendCallbackUrl)}&final_redirect=${encodeURIComponent(redirectTo || '/')}`,
      {
        method: 'GET',
      }
    )

    // Store state in cookie for CSRF protection verification
    const cookieStore = await cookies()
    cookieStore.set('oauth_state', data.state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    // Store the final redirect destination
    if (redirectTo) {
      cookieStore.set('oauth_redirect', redirectTo, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      })
    }

    return {
      success: true,
      data: {
        authorizationUrl: data.authorization_url,
        state: data.state,
      },
    }
  } catch (error) {
    console.error(`OAuth authorization error (${provider}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get authorization URL',
    }
  }
}

// ============================================
// HANDLE OAUTH CALLBACK
// ============================================

/**
 * Handle OAuth callback from provider
 * This is called after the user authenticates with the OAuth provider
 */
export async function handleOAuthCallback(
  provider: SocialProvider,
  code: string,
  state: string
): Promise<AuthSuccessResponse<OAuthUser> | AuthErrorResponse> {
  try {
    const cookieStore = await cookies()

    // Verify state to prevent CSRF attacks
    const storedState = cookieStore.get('oauth_state')?.value
    if (!storedState || storedState !== state) {
      return {
        success: false,
        error: 'Invalid OAuth state. Please try again.',
      }
    }

    // Clear the state cookie
    cookieStore.delete('oauth_state')

    // Get the final redirect destination (stored for use after token exchange)
    const _redirectTo = cookieStore.get('oauth_redirect')?.value || '/'
    cookieStore.delete('oauth_redirect')

    // Exchange authorization code for tokens via backend
    const data = await backendFetch<OAuthCallbackResult>(
      authEndpoints.oauthCallback(provider),
      {
        method: 'POST',
        body: JSON.stringify({
          code,
          state,
          redirect_uri: `${env.app.url}/auth/callback/${provider}`,
        }),
      }
    )

    // Store tokens in HttpOnly cookies
    await setServerCookie(env.auth.cookieName, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in || 900, // Default 15 minutes
      path: '/',
    })

    if (data.refresh_token) {
      await setServerCookie(env.auth.refreshCookieName, data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      })
    }

    return {
      success: true,
      data: data.user,
      message: `Successfully signed in with ${provider}`,
    }
  } catch (error) {
    console.error(`OAuth callback error (${provider}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OAuth authentication failed',
    }
  }
}

// ============================================
// INITIATE SOCIAL LOGIN
// ============================================

/**
 * Initiate social login by redirecting to OAuth provider
 * This is a convenience function that combines getting the URL and redirecting
 */
export async function initiateSocialLogin(
  provider: SocialProvider,
  redirectTo?: string
): Promise<never> {
  const result = await getOAuthAuthorizationUrl(provider, redirectTo)

  if (!result.success) {
    // If we can't get the authorization URL, redirect to sign-in with error
    redirect(`/sign-in?error=${encodeURIComponent(result.error)}`)
  }

  redirect(result.data.authorizationUrl)
}

// ============================================
// GET AVAILABLE PROVIDERS
// ============================================

export interface ProviderInfo {
  id: SocialProvider
  name: string
  enabled: boolean
}

/**
 * Get list of available OAuth providers from backend
 */
export async function getAvailableProviders(): Promise<AuthSuccessResponse<ProviderInfo[]> | AuthErrorResponse> {
  try {
    const data = await backendFetch<{ providers: ProviderInfo[] }>(
      `${authEndpoints.info()}`,
      {
        method: 'GET',
      }
    )

    return {
      success: true,
      data: data.providers || [],
    }
  } catch {
    // If backend doesn't support this endpoint, return default providers
    return {
      success: true,
      data: [
        { id: 'google', name: 'Google', enabled: true },
        { id: 'github', name: 'GitHub', enabled: true },
        { id: 'microsoft', name: 'Microsoft', enabled: true },
      ],
    }
  }
}
