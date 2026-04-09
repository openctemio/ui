/**
 * SSO Auth Server Actions
 *
 * Server-side actions for per-tenant SSO authentication
 * Follows the same pattern as social-auth-actions.ts
 *
 * Flow:
 * 1. Login page detects ?org= parameter
 * 2. Frontend fetches active SSO providers for the org
 * 3. User clicks SSO button → getSSOAuthorizeUrl()
 * 4. User authenticates with the identity provider
 * 5. Provider redirects back → handleSSOCallback()
 * 6. Backend creates/finds user, generates JWT
 * 7. Frontend stores tokens in cookies and redirects
 */

'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { env } from '@/lib/env'
import { setServerCookie } from '@/lib/cookies-server'
import { validateRedirectUrl } from '@/lib/redirect'

import type { AuthSuccessResponse, AuthErrorResponse } from '@/features/auth/schemas/auth.schema'
import type { SSOAuthorizeResponse, SSOCallbackResponse, SSOProviderType } from '../types/sso.types'

// ============================================
// HELPERS
// ============================================

async function backendFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${env.api.url}${endpoint}`

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
// GET SSO AUTHORIZATION URL
// ============================================

/**
 * Get SSO authorization URL for a tenant's identity provider
 */
export async function getSSOAuthorizeUrl(
  provider: SSOProviderType,
  orgSlug: string,
  redirectTo?: string
): Promise<AuthSuccessResponse<{ authorizationUrl: string; state: string }> | AuthErrorResponse> {
  try {
    const frontendCallbackUrl = `${env.app.url}/auth/sso/callback/${provider}`

    const params = new URLSearchParams({
      org: orgSlug,
      redirect_uri: frontendCallbackUrl,
    })
    if (redirectTo) {
      params.set('final_redirect', redirectTo)
    }

    const data = await backendFetch<SSOAuthorizeResponse>(
      `/api/v1/auth/sso/${provider}/authorize?${params.toString()}`,
      { method: 'GET' }
    )

    // Store state in cookie for CSRF verification
    const cookieStore = await cookies()
    cookieStore.set('sso_state', data.state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    // Store org slug for callback
    cookieStore.set('sso_org', orgSlug, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    // Store redirect destination (validated to prevent open redirect)
    if (redirectTo) {
      cookieStore.set('sso_redirect', validateRedirectUrl(redirectTo, '/'), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
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
    console.error(`SSO authorization error (${provider}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get SSO authorization URL',
    }
  }
}

// ============================================
// HANDLE SSO CALLBACK
// ============================================

/**
 * Handle SSO callback after user authenticates with identity provider
 */
export async function handleSSOCallback(
  provider: SSOProviderType,
  code: string,
  state: string
): Promise<AuthSuccessResponse<SSOCallbackResponse> | AuthErrorResponse> {
  try {
    const cookieStore = await cookies()

    // Verify state to prevent CSRF attacks
    const storedState = cookieStore.get('sso_state')?.value
    if (!storedState || storedState !== state) {
      return {
        success: false,
        error: 'Invalid SSO state. Please try again.',
      }
    }

    // Clear state cookie
    cookieStore.delete('sso_state')

    // Get stored redirect
    const _redirectTo = cookieStore.get('sso_redirect')?.value || '/'
    cookieStore.delete('sso_redirect')

    // Exchange code for tokens via backend
    const frontendCallbackUrl = `${env.app.url}/auth/sso/callback/${provider}`

    const data = await backendFetch<SSOCallbackResponse>(`/api/v1/auth/sso/${provider}/callback`, {
      method: 'POST',
      body: JSON.stringify({
        code,
        state,
        redirect_uri: frontendCallbackUrl,
      }),
    })

    // Store tokens in HttpOnly cookies
    await setServerCookie(env.auth.cookieName, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in || 900,
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

    // Store tenant info for auto-selection
    if (data.tenant_slug) {
      cookieStore.set(env.cookies.tenant, data.tenant_slug, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      })
    }

    return {
      success: true,
      data,
      message: `Successfully signed in with SSO`,
    }
  } catch (error) {
    console.error('SSO callback error (' + String(provider) + '):', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SSO authentication failed',
    }
  }
}

// ============================================
// INITIATE SSO LOGIN
// ============================================

/**
 * Initiate SSO login by redirecting to identity provider
 */
export async function initiateSSOLogin(
  provider: SSOProviderType,
  orgSlug: string,
  redirectTo?: string
): Promise<never> {
  const result = await getSSOAuthorizeUrl(provider, orgSlug, redirectTo)

  if (!result.success) {
    redirect(`/login?error=${encodeURIComponent(result.error)}&org=${encodeURIComponent(orgSlug)}`)
  }

  redirect(result.data.authorizationUrl)
}
