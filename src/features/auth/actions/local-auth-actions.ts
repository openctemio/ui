/**
 * Local Auth Server Actions
 *
 * Server-side actions for local authentication (email/password)
 * - Handles registration, login, logout
 * - Manages token storage in HttpOnly cookies
 * - Token refresh and validation
 * - Password reset flow
 */

'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { env } from '@/lib/env'
import { setServerCookie, removeServerCookie } from '@/lib/cookies-server'
import { authEndpoints, userEndpoints } from '@/lib/api/endpoints'

import type { AuthSuccessResponse, AuthErrorResponse } from '../schemas/auth.schema'

// ============================================
// TYPES
// ============================================

export interface LocalUser {
  id: string
  email: string
  name: string
  roles: string[]
  emailVerified: boolean
  authProvider: 'local' | 'google' | 'github' | 'microsoft'
}

export interface LoginInput {
  email: string
  password: string
}

// Tenant info returned from login
export interface LoginTenant {
  id: string
  slug: string
  name: string
  role: string
}

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: LocalUser
}

// Login response from backend (no access_token, only refresh_token + tenants)
export interface LoginBackendResponse {
  refresh_token: string
  token_type: string
  expires_in: number
  user: {
    id: string
    email: string
    name: string
  }
  tenants: Array<{
    id: string
    slug: string
    name: string
    role: string
  }>
}

// Token exchange response (tenant-scoped access token)
export interface TokenExchangeResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  tenant_id: string
  tenant_slug: string
  role: string
}

export interface RefreshTokenResult {
  success: boolean
  accessToken?: string
  user?: LocalUser
  error?: string
}

// Login result with tenant selection support
export interface LoginResult {
  success: boolean
  user?: LocalUser
  error?: string
  message?: string
  // Multi-tenant selection
  requiresTenantSelection?: boolean
  tenants?: LoginTenant[]
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getBackendUrl(): string {
  return process.env.BACKEND_API_URL || 'http://localhost:8080'
}

// NOTE: Permissions are NOT stored in cookies anymore (too large, > 4KB limit)
// Frontend fetches permissions via /api/v1/me/permissions API instead

async function backendFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
// REGISTER
// ============================================

/**
 * Register a new user with email and password
 */
export async function registerAction(
  input: RegisterInput
): Promise<AuthSuccessResponse<LocalUser> | AuthErrorResponse> {
  try {
    // Combine firstName and lastName into name (backend expects single "name" field)
    const name = `${input.firstName} ${input.lastName}`.trim()

    const data = await backendFetch<{ id: string; email: string; name: string; message: string }>(
      authEndpoints.register(),
      {
        method: 'POST',
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          name: name,
        }),
      }
    )

    // Backend returns: { id, email, name, requires_verification, message }
    const user: LocalUser = {
      id: data.id,
      email: data.email,
      name: data.name,
      roles: [],
      emailVerified: false,
      authProvider: 'local',
    }

    return {
      success: true,
      data: user,
      message:
        data.message || 'Registration successful. Please check your email to verify your account.',
    }
  } catch (error) {
    console.error('Registration error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    }
  }
}

// ============================================
// LOGIN
// ============================================

/**
 * Login with email and password
 *
 * Flow:
 * 1. Call /api/v1/auth/login → get refresh_token + tenants list
 * 2. Store refresh_token in httpOnly cookie
 * 3. If user has 1 tenant → auto-select and exchange token
 * 4. If user has > 1 tenant → return tenants list for selection
 * 5. If user has 0 tenants → return success but no tenant
 */
export async function loginAction(input: LoginInput): Promise<LoginResult> {
  try {
    // Step 1: Login - get refresh token and tenant list
    const loginData = await backendFetch<LoginBackendResponse>(authEndpoints.login(), {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        password: input.password,
      }),
    })

    // Store refresh token in httpOnly cookie
    await setServerCookie(env.auth.refreshCookieName, loginData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: loginData.expires_in || 7 * 24 * 60 * 60, // Default 7 days
      path: '/',
    })

    // Build user response
    const user: LocalUser = {
      id: loginData.user.id,
      email: loginData.user.email,
      name: loginData.user.name,
      roles: [],
      emailVerified: true, // Assume verified if can login
      authProvider: 'local',
    }

    // Case 1: No tenants - user needs to create or join a team
    if (!loginData.tenants || loginData.tenants.length === 0) {
      console.log('[Login] No tenants found for user - user needs to create or join a team')

      // Store user info for the Create Team page to use as suggested name
      await setServerCookie(
        env.cookies.userInfo,
        JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
        }),
        {
          httpOnly: false, // Frontend needs to read this
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 5 * 60, // 5 minutes - short lived, only needed for initial team creation
          path: '/',
        }
      )

      return {
        success: true,
        user,
        message: 'Login successful. Please create or join a team.',
        requiresTenantSelection: false,
        tenants: [],
      }
    }

    // Case 2: Multiple tenants - require user to select
    if (loginData.tenants.length > 1) {
      console.log(
        '[Login] Multiple tenants found:',
        loginData.tenants.length,
        '- requiring selection'
      )

      // Store tenants temporarily in cookie for selection page
      await setServerCookie(env.cookies.pendingTenants, JSON.stringify(loginData.tenants), {
        httpOnly: false, // Client needs to read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60, // 5 minutes - short lived
        path: '/',
      })

      return {
        success: true,
        user,
        message: 'Please select a team to continue.',
        requiresTenantSelection: true,
        tenants: loginData.tenants,
      }
    }

    // Case 3: Single tenant - auto-select
    const firstTenant = loginData.tenants[0]
    console.log('[Login] Single tenant found, auto-selecting:', firstTenant.id, firstTenant.slug)

    try {
      const tokenData = await backendFetch<TokenExchangeResponse>(authEndpoints.token(), {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: loginData.refresh_token,
          tenant_id: firstTenant.id,
        }),
      })
      console.log('[Login] Token exchange successful, got access_token:', !!tokenData.access_token)

      // Store access token in httpOnly cookie
      console.log(
        '[Login] Setting access token cookie:',
        env.auth.cookieName,
        'token length:',
        tokenData.access_token.length
      )
      await setServerCookie(env.auth.cookieName, tokenData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokenData.expires_in || 900, // Default 15 minutes
        path: '/',
      })
      console.log('[Login] Access token cookie SET successfully:', env.auth.cookieName)

      // Update refresh token if rotated
      if (tokenData.refresh_token) {
        await setServerCookie(env.auth.refreshCookieName, tokenData.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: '/',
        })
        console.log('[Login] Refresh token cookie updated')
      }

      // Store current tenant info in a separate cookie for reference
      await setServerCookie(
        env.cookies.tenant,
        JSON.stringify({
          id: tokenData.tenant_id,
          slug: tokenData.tenant_slug,
          name: firstTenant.name,
          role: tokenData.role,
        }),
        {
          httpOnly: false, // Can be read by client
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        }
      )
      console.log('[Login] Tenant cookie set:', tokenData.tenant_slug, firstTenant.name)
      // NOTE: Permissions fetched via /api/v1/me/permissions API (not stored in cookie)
    } catch (tokenError) {
      console.error('[Login] Token exchange FAILED:', tokenError)
      throw new Error(
        `Login succeeded but token exchange failed: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`
      )
    }

    return {
      success: true,
      user,
      message: 'Login successful',
      requiresTenantSelection: false,
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    }
  }
}

/**
 * Complete login by selecting a tenant
 * Called after loginAction returns requiresTenantSelection: true
 */
export async function selectTenantAction(tenantId: string): Promise<LoginResult> {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(env.auth.refreshCookieName)?.value

    if (!refreshToken) {
      return {
        success: false,
        error: 'Session expired. Please login again.',
      }
    }

    // Get pending tenants to find the selected one
    const pendingTenantsStr = cookieStore.get(env.cookies.pendingTenants)?.value
    let selectedTenant: LoginTenant | undefined

    if (pendingTenantsStr) {
      try {
        const pendingTenants: LoginTenant[] = JSON.parse(pendingTenantsStr)
        selectedTenant = pendingTenants.find((t) => t.id === tenantId)
      } catch {
        console.error('[SelectTenant] Failed to parse pending tenants')
      }
    }

    console.log('[SelectTenant] Exchanging token for tenant:', tenantId)

    const tokenData = await backendFetch<TokenExchangeResponse>(authEndpoints.token(), {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: refreshToken,
        tenant_id: tenantId,
      }),
    })
    console.log('[SelectTenant] Token exchange successful')
    console.log('[SelectTenant] access_token length:', tokenData.access_token?.length)
    console.log('[SelectTenant] expires_in:', tokenData.expires_in)

    // Store access token in httpOnly cookie
    await setServerCookie(env.auth.cookieName, tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 900,
      path: '/',
    })

    // Update refresh token if rotated
    if (tokenData.refresh_token) {
      await setServerCookie(env.auth.refreshCookieName, tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
    }

    // Store current tenant info
    await setServerCookie(
      env.cookies.tenant,
      JSON.stringify({
        id: tokenData.tenant_id,
        slug: tokenData.tenant_slug,
        name: selectedTenant?.name || tokenData.tenant_slug,
        role: tokenData.role,
      }),
      {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      }
    )
    // NOTE: Permissions fetched via /api/v1/me/permissions API (not stored in cookie)

    // Clear pending tenants cookie
    await removeServerCookie(env.cookies.pendingTenants)

    return {
      success: true,
      message: 'Team selected successfully',
    }
  } catch (error) {
    console.error('[SelectTenant] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to select team',
    }
  }
}

// ============================================
// TOKEN REFRESH
// ============================================

/**
 * Refresh access token using refresh token
 */
export async function refreshLocalTokenAction(): Promise<RefreshTokenResult> {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(env.auth.refreshCookieName)?.value

    if (!refreshToken) {
      return {
        success: false,
        error: 'No refresh token available',
      }
    }

    const data = await backendFetch<TokenResponse>(authEndpoints.refresh(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    })

    // Update cookies with new tokens
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
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
    }

    return {
      success: true,
      accessToken: data.access_token,
      user: data.user,
    }
  } catch (error) {
    console.error('Token refresh error:', error)

    // Clean up ALL cookies on refresh failure to prevent login loops
    await removeServerCookie(env.auth.cookieName)
    await removeServerCookie(env.auth.refreshCookieName)
    await removeServerCookie(env.cookies.tenant)
    await removeServerCookie(env.cookies.pendingTenants)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
    }
  }
}

// ============================================
// LOGOUT
// ============================================

/**
 * Logout user and clean up session
 *
 * IMPORTANT: This clears ALL auth-related cookies including:
 * - access_token (auth_token)
 * - refresh_token (set by both backend and frontend)
 * - tenant cookie (current tenant info)
 * - user_info cookie (user info for Create Team page)
 * - pending_tenants cookie (for tenant selection)
 */
export async function localLogoutAction(redirectTo?: string): Promise<never> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(env.auth.cookieName)?.value

    // Call backend logout to invalidate session and clear backend-set cookies
    // Backend will clear: refresh_token (path: /api/v1/auth), csrf_token
    if (accessToken) {
      try {
        await backendFetch(authEndpoints.logout(), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        console.log('[Logout] Backend logout successful')
      } catch (error) {
        console.error('[Logout] Backend logout error (continuing with local cleanup):', error)
      }
    }

    // Clear all auth cookies (frontend-set)
    // Using env.auth.refreshCookieName which should be 'refresh_token' to match backend
    await removeServerCookie(env.auth.cookieName) // Access token
    await removeServerCookie(env.auth.refreshCookieName) // Refresh token (matches backend)
    await removeServerCookie(env.cookies.tenant) // Current tenant info
    await removeServerCookie(env.cookies.userInfo) // User info for Create Team
    await removeServerCookie(env.cookies.pendingTenants) // Pending tenant selection
    await removeServerCookie('app_permissions') // Legacy permissions cookie (cleanup)

    console.log('[Logout] All cookies cleared, redirecting to:', redirectTo || '/login')

    redirect(redirectTo || '/login')
  } catch (error) {
    // Handle redirect error (expected)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    console.error('[Logout] Error:', error)
    redirect('/login')
  }
}

// ============================================
// GET CURRENT USER
// ============================================

/**
 * Get current authenticated user
 */
export async function getLocalCurrentUser(): Promise<
  AuthSuccessResponse<LocalUser> | AuthErrorResponse
> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(env.auth.cookieName)?.value

    if (!accessToken) {
      return {
        success: false,
        error: 'Not authenticated',
      }
    }

    const data = await backendFetch<LocalUser>(userEndpoints.me(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return {
      success: true,
      data,
    }
  } catch (error) {
    // Try to refresh token
    const refreshResult = await refreshLocalTokenAction()
    if (refreshResult.success && refreshResult.user) {
      return {
        success: true,
        data: refreshResult.user,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user',
    }
  }
}

// ============================================
// EMAIL VERIFICATION
// ============================================

/**
 * Verify email with token
 */
export async function verifyEmailAction(
  token: string
): Promise<AuthSuccessResponse<null> | AuthErrorResponse> {
  try {
    await backendFetch<{ message: string }>(authEndpoints.verifyEmail(token), {
      method: 'POST',
    })

    return {
      success: true,
      data: null,
      message: 'Email verified successfully',
    }
  } catch (error) {
    console.error('Email verification error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Email verification failed',
    }
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationAction(
  email: string
): Promise<AuthSuccessResponse<null> | AuthErrorResponse> {
  try {
    await backendFetch<{ message: string }>(authEndpoints.resendVerification(), {
      method: 'POST',
      body: JSON.stringify({ email }),
    })

    return {
      success: true,
      data: null,
      message: 'Verification email sent',
    }
  } catch (error) {
    console.error('Resend verification error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send verification email',
    }
  }
}

// ============================================
// CREATE FIRST TEAM
// ============================================

// Response from create-first-team endpoint
interface CreateFirstTeamResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  tenant_id: string
  tenant_slug: string
  tenant_name: string
  role: string
}

export interface CreateFirstTeamInput {
  teamName: string
  teamSlug: string
}

export interface CreateFirstTeamResult {
  success: boolean
  error?: string
  tenant?: {
    id: string
    slug: string
    name: string
    role: string
  }
}

/**
 * Create the first team for a new user who has no tenants.
 * This uses the refresh token stored in httpOnly cookie.
 *
 * Flow:
 * 1. Call /api/v1/auth/create-first-team with team name and slug
 * 2. Backend validates refresh token from cookie
 * 3. Backend creates tenant + membership
 * 4. Backend returns access token + refresh token + tenant info
 * 5. Frontend stores tokens and tenant cookie
 */
export async function createFirstTeamAction(
  input: CreateFirstTeamInput
): Promise<CreateFirstTeamResult> {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(env.auth.refreshCookieName)?.value

    if (!refreshToken) {
      return {
        success: false,
        error: 'Session expired. Please login again.',
      }
    }

    console.log('[CreateFirstTeam] Creating team:', input.teamName, input.teamSlug)

    // Call backend API with cookies (refresh token in httpOnly cookie)
    const baseUrl = getBackendUrl()
    const response = await fetch(`${baseUrl}${authEndpoints.createFirstTeam()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refresh_token=${refreshToken}`, // Send refresh token in cookie
      },
      body: JSON.stringify({
        team_name: input.teamName,
        team_slug: input.teamSlug,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
    }

    const data: CreateFirstTeamResponse = await response.json()
    console.log('[CreateFirstTeam] Team created successfully:', data.tenant_name)

    // Store access token in httpOnly cookie
    await setServerCookie(env.auth.cookieName, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in || 900,
      path: '/',
    })

    // Store new refresh token
    await setServerCookie(env.auth.refreshCookieName, data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    // Store tenant info cookie
    await setServerCookie(
      env.cookies.tenant,
      JSON.stringify({
        id: data.tenant_id,
        slug: data.tenant_slug,
        name: data.tenant_name,
        role: data.role,
      }),
      {
        httpOnly: false, // Frontend needs to read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      }
    )
    // NOTE: Permissions fetched via /api/v1/me/permissions API (not stored in cookie)

    // Clear user info cookie (no longer needed after team created)
    await removeServerCookie(env.cookies.userInfo)

    console.log('[CreateFirstTeam] All cookies set, team creation complete')

    return {
      success: true,
      tenant: {
        id: data.tenant_id,
        slug: data.tenant_slug,
        name: data.tenant_name,
        role: data.role,
      },
    }
  } catch (error) {
    console.error('[CreateFirstTeam] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create team',
    }
  }
}

// ============================================
// PASSWORD RESET
// ============================================

/**
 * Request password reset email
 */
export async function forgotPasswordAction(
  email: string
): Promise<AuthSuccessResponse<null> | AuthErrorResponse> {
  try {
    await backendFetch<{ message: string }>(authEndpoints.forgotPassword(), {
      method: 'POST',
      body: JSON.stringify({ email }),
    })

    return {
      success: true,
      data: null,
      message: 'If an account exists with this email, a password reset link has been sent.',
    }
  } catch (error) {
    // Don't expose whether email exists or not
    console.error('Forgot password error:', error)
    return {
      success: true, // Always return success to prevent email enumeration
      data: null,
      message: 'If an account exists with this email, a password reset link has been sent.',
    }
  }
}

/**
 * Reset password with token
 */
export async function resetPasswordAction(
  token: string,
  newPassword: string
): Promise<AuthSuccessResponse<null> | AuthErrorResponse> {
  try {
    await backendFetch<{ message: string }>(authEndpoints.resetPassword(), {
      method: 'POST',
      body: JSON.stringify({
        token,
        new_password: newPassword,
      }),
    })

    return {
      success: true,
      data: null,
      message: 'Password reset successful. You can now login with your new password.',
    }
  } catch (error) {
    console.error('Reset password error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Password reset failed',
    }
  }
}

// ============================================
// CHANGE PASSWORD
// ============================================

/**
 * Change password for authenticated user
 */
export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<AuthSuccessResponse<null> | AuthErrorResponse> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(env.auth.cookieName)?.value

    if (!accessToken) {
      return {
        success: false,
        error: 'Not authenticated',
      }
    }

    await backendFetch<{ message: string }>(userEndpoints.changePassword(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    })

    return {
      success: true,
      data: null,
      message: 'Password changed successfully',
    }
  } catch (error) {
    console.error('Change password error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change password',
    }
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export interface UserSession {
  id: string
  ipAddress: string
  userAgent: string
  lastActivityAt: string
  createdAt: string
  isCurrent: boolean
}

/**
 * List active sessions
 */
export async function listSessionsAction(): Promise<
  AuthSuccessResponse<UserSession[]> | AuthErrorResponse
> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(env.auth.cookieName)?.value

    if (!accessToken) {
      return {
        success: false,
        error: 'Not authenticated',
      }
    }

    const data = await backendFetch<{ sessions: UserSession[] }>(userEndpoints.sessions(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return {
      success: true,
      data: data.sessions,
    }
  } catch (error) {
    console.error('List sessions error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list sessions',
    }
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSessionAction(
  sessionId: string
): Promise<AuthSuccessResponse<null> | AuthErrorResponse> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(env.auth.cookieName)?.value

    if (!accessToken) {
      return {
        success: false,
        error: 'Not authenticated',
      }
    }

    await backendFetch<{ message: string }>(userEndpoints.revokeSession(sessionId), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return {
      success: true,
      data: null,
      message: 'Session revoked successfully',
    }
  } catch (error) {
    console.error('Revoke session error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke session',
    }
  }
}

/**
 * Revoke all sessions except current
 */
export async function revokeAllSessionsAction(): Promise<
  AuthSuccessResponse<null> | AuthErrorResponse
> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(env.auth.cookieName)?.value

    if (!accessToken) {
      return {
        success: false,
        error: 'Not authenticated',
      }
    }

    await backendFetch<{ message: string }>(userEndpoints.revokeAllSessions(), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return {
      success: true,
      data: null,
      message: 'All other sessions revoked successfully',
    }
  } catch (error) {
    console.error('Revoke all sessions error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke sessions',
    }
  }
}

// ============================================
// CHECK AUTHENTICATION
// ============================================

/**
 * Check if user is authenticated
 */
export async function isLocalAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(env.auth.cookieName)?.value

    if (!accessToken) {
      return false
    }

    // Verify token is valid by calling the backend
    const result = await getLocalCurrentUser()
    return result.success
  } catch {
    return false
  }
}

/**
 * Get access token for API calls
 */
export async function getLocalAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(env.auth.cookieName)?.value

    if (!accessToken) {
      return null
    }

    return accessToken
  } catch {
    return null
  }
}
