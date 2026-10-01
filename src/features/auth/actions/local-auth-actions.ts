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

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { env } from '@/lib/env'
import { setServerCookie, removeServerCookie } from '@/lib/cookies-server'
import { devLog } from '@/lib/logger'
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
  // Optional invitation token: when the user reaches /register from
  // an invitation link, the form forwards the token here so the
  // backend can resolve the target tenant and apply that tenant's
  // email-verification rule (instead of the platform default).
  invitationToken?: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: LocalUser
}

// Login response from backend (no access_token, only tenants).
// S-3: refresh_token is delivered via Set-Cookie, not the JSON body — it is
// kept here as optional only for backward compatibility with older backends.
export interface LoginBackendResponse {
  refresh_token?: string
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
  // Suspended memberships — non-empty when this user has tenants where
  // their access has been paused. They are NOT selectable; the field
  // exists so the UI can tell the user "your access to X is suspended"
  // instead of bouncing them into create-team onboarding.
  suspended_tenants?: Array<{
    id: string
    slug: string
    name: string
    role: string
  }>
  // True for a platform administrator (RFC-022). The account belongs to no
  // organization; it goes to the admin console, not onboarding.
  platform_admin?: boolean
  // Present only on the response that completes a forced 2FA enrollment.
  recovery_codes?: string[]
}

// Returned by /auth/login instead of a session when a second factor is
// needed. mfa_token is not an access token; it only works on /auth/mfa/*.
export interface MfaChallengeBackendResponse {
  mfa_required: true
  mfa_token: string
  mfa_purpose: MfaPurpose
  expires_in: number
}

export type MfaPurpose = 'verify' | 'enroll'

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
  // Memberships the user has but cannot use because they're suspended.
  // The login form surfaces this so the user knows why they have no
  // accessible team, instead of being routed to create-team onboarding.
  suspendedTenants?: LoginTenant[]
  // A platform administrator: the client opens the admin console.
  platformAdmin?: boolean
  // The password was right but a second factor is needed. No session exists
  // yet: the form shows the code step (verify) or the setup step (enroll).
  mfaRequired?: boolean
  mfaPurpose?: MfaPurpose
  // Set once, after a forced 2FA enrollment completes the login.
  recoveryCodes?: string[]
}

export interface MfaEnrollmentStart {
  success: boolean
  secret?: string
  otpauthUri?: string
  error?: string
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// NOTE: Permissions are NOT stored in cookies anymore (too large, > 4KB limit)
// Frontend fetches permissions via /api/v1/me/permissions API instead

/**
 * Extract the refresh-token value from a backend response's `Set-Cookie`
 * header.
 *
 * The S-3 hardening returns refresh tokens via `Set-Cookie` ONLY (never in the
 * JSON body). Because the UI talks to the backend server-to-server, that
 * Set-Cookie never reaches the browser on its own — the server action must
 * read it here, then (a) re-set it as a browser-scoped cookie and (b) forward
 * the value into the follow-up token-exchange / refresh calls.
 */
function extractRefreshFromSetCookie(response: Response): string | undefined {
  const cookieName = env.auth.refreshCookieName
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  const setCookies =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : // Fallback: a single comma-joined header. Splitting on every comma is
        // unsafe (Expires dates contain commas), so only use it when there is
        // no comma-separated date — good enough for the single refresh cookie.
        (headers.get('set-cookie')?.split(/,(?=[^;]+?=)/) ?? [])

  for (const raw of setCookies) {
    const firstPair = raw.split(';', 1)[0] ?? ''
    const eq = firstPair.indexOf('=')
    if (eq === -1) continue
    if (firstPair.slice(0, eq).trim() !== cookieName) continue
    const value = firstPair.slice(eq + 1).trim()
    if (!value) return undefined // cleared cookie (logout/expiry)
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  return undefined
}

/**
 * The browser's User-Agent and address, forwarded so the session the API
 * creates shows the real device in My account → Sessions (and in the audit
 * log) instead of this server. The API only believes X-Forwarded-For when
 * this server is in its SERVER_TRUSTED_PROXIES.
 */
async function browserContextHeaders(): Promise<Record<string, string>> {
  try {
    const h = await headers()
    const out: Record<string, string> = {}
    const ua = h.get('user-agent')
    if (ua) out['User-Agent'] = ua
    const fwd = h.get('x-forwarded-for') || h.get('x-real-ip')
    if (fwd) out['X-Forwarded-For'] = fwd
    return out
  } catch {
    // Outside a request (should not happen in a server action).
    return {}
  }
}

async function backendFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { data } = await backendFetchWithMeta<T>(endpoint, options)
  return data
}

/**
 * Like {@link backendFetch} but also returns the rotated refresh token read
 * from the response `Set-Cookie` header (S-3: refresh tokens are cookie-only).
 */
async function backendFetchWithMeta<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; refreshToken?: string }> {
  const url = `${env.api.url}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(await browserContextHeaders()),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
  }

  const refreshToken = extractRefreshFromSetCookie(response)
  const data = (await response.json()) as T
  return { data, refreshToken }
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
          // Forward the invitation token if the form picked one up from
          // the URL — backend uses it to apply the inviting tenant's
          // email-verification rule instead of the platform default.
          ...(input.invitationToken ? { invitation_token: input.invitationToken } : {}),
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
    // Step 1: Login - get refresh token and tenant list.
    //
    // S-3: the backend returns the refresh token via Set-Cookie only (not in
    // the JSON body), so read it from the response header. Fall back to the
    // body for backward compatibility with older backends.
    const { data, refreshToken: loginRefreshFromCookie } = await backendFetchWithMeta<
      LoginBackendResponse | MfaChallengeBackendResponse
    >(authEndpoints.login(), {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        password: input.password,
      }),
    })

    // Second factor needed: keep the challenge in an httpOnly cookie (the
    // browser script never sees it) and let the form ask for the code.
    if ('mfa_required' in data && data.mfa_required) {
      await setServerCookie(MFA_CHALLENGE_COOKIE, data.mfa_token, {
        httpOnly: true,
        secure: process.env.SECURE_COOKIES !== 'false',
        sameSite: 'strict',
        maxAge: Math.max(1, data.expires_in || 300),
        path: '/',
      })
      return { success: true, mfaRequired: true, mfaPurpose: data.mfa_purpose }
    }

    return await completeLogin(data as LoginBackendResponse, loginRefreshFromCookie)
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    }
  }
}

/**
 * Finish a login once the backend has issued the session (password only, or
 * password + second factor): store the refresh token and pick the tenant.
 */
async function completeLogin(
  loginData: LoginBackendResponse,
  loginRefreshFromCookie: string | undefined
): Promise<LoginResult> {
  const refreshToken = loginRefreshFromCookie || loginData.refresh_token
  if (!refreshToken) {
    throw new Error('Login response did not include a refresh token')
  }

  // Store refresh token in httpOnly cookie
  await setServerCookie(env.auth.refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: process.env.SECURE_COOKIES !== 'false',
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

  // A platform administrator belongs to no organization: send them to the
  // admin console (which asks for the TOTP code) instead of onboarding.
  if (loginData.platform_admin) {
    return { success: true, user, platformAdmin: true, tenants: [] }
  }

  // Case 1: No tenants - user needs to create or join a team.
  if (!loginData.tenants || loginData.tenants.length === 0) {
    // Sub-case 1a: user has only suspended memberships. Don't bounce
    // them to onboarding — tell them why they have no team. The login
    // form renders the message and stays on /login.
    if (loginData.suspended_tenants && loginData.suspended_tenants.length > 0) {
      devLog.log('[Login] User has only suspended memberships:', loginData.suspended_tenants.length)
      const tenantNames = loginData.suspended_tenants.map((t) => t.name).join(', ')
      return {
        success: false,
        user,
        error: `Your access to ${tenantNames} ${
          loginData.suspended_tenants.length === 1 ? 'is' : 'are'
        } suspended. Please contact a team administrator to be reactivated.`,
        suspendedTenants: loginData.suspended_tenants,
      }
    }

    devLog.log('[Login] No tenants found for user - user needs to create or join a team')

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
        secure: process.env.SECURE_COOKIES !== 'false',
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
    devLog.log('[Login] Multiple tenants found:', loginData.tenants.length, '- requiring selection')

    // Store tenants in cookie for the selection page.
    //
    // TTL: 1 hour. The previous value (5 minutes) was the cause of a UX
    // bug where users who walked away from /select-tenant for a few minutes
    // came back to find themselves bounced through /login → /onboarding/
    // create-team — the system thought they had no tenants because this
    // cookie expired. The cookie carries no secrets (just a list of
    // tenant names/ids the user already belongs to), so a longer TTL has
    // no security cost. /login also falls back to a server-side API call
    // when this cookie is missing as a defence-in-depth.
    await setServerCookie(env.cookies.pendingTenants, JSON.stringify(loginData.tenants), {
      httpOnly: false, // Client needs to read this
      secure: process.env.SECURE_COOKIES !== 'false',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
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
  devLog.log('[Login] Single tenant found, auto-selecting:', firstTenant.id, firstTenant.slug)

  try {
    const { data: tokenData, refreshToken: rotatedRefresh } =
      await backendFetchWithMeta<TokenExchangeResponse>(authEndpoints.token(), {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: refreshToken,
          tenant_id: firstTenant.id,
        }),
      })
    devLog.log('[Login] Token exchange successful, got access_token:', !!tokenData.access_token)

    // Store access token in httpOnly cookie
    devLog.log(
      '[Login] Setting access token cookie:',
      env.auth.cookieName,
      'token length:',
      tokenData.access_token.length
    )
    await setServerCookie(env.auth.cookieName, tokenData.access_token, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES !== 'false',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 900, // Default 15 minutes
      path: '/',
    })
    devLog.log('[Login] Access token cookie SET successfully:', env.auth.cookieName)

    // Update refresh token if rotated. ExchangeToken rotates the refresh
    // token and returns the new one via Set-Cookie (S-3); fall back to the
    // body for older backends.
    const newRefresh = rotatedRefresh || tokenData.refresh_token
    if (newRefresh) {
      await setServerCookie(env.auth.refreshCookieName, newRefresh, {
        httpOnly: true,
        secure: process.env.SECURE_COOKIES !== 'false',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      })
      devLog.log('[Login] Refresh token cookie updated')
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
        secure: process.env.SECURE_COOKIES !== 'false',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      }
    )
    devLog.log('[Login] Tenant cookie set:', tokenData.tenant_slug, firstTenant.name)
    // NOTE: Permissions fetched via /api/v1/me/permissions API (not stored in cookie)
  } catch (tokenError) {
    devLog.error('[Login] Token exchange FAILED:', tokenError)
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
}

// ============================================
// TWO-FACTOR LOGIN STEP
// ============================================

const MFA_CHALLENGE_COOKIE = 'mfa_challenge'

async function readMfaChallenge(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(MFA_CHALLENGE_COOKIE)?.value
}

const MFA_EXPIRED_MESSAGE = 'Your sign-in expired. Please enter your password again.'

/**
 * Second login step: check an authenticator code or a recovery code against
 * the challenge from loginAction, then finish the login.
 */
export async function verifyMfaAction(input: {
  code?: string
  recoveryCode?: string
}): Promise<LoginResult> {
  const token = await readMfaChallenge()
  if (!token) {
    return { success: false, error: MFA_EXPIRED_MESSAGE, mfaRequired: false }
  }
  try {
    const { data, refreshToken } = await backendFetchWithMeta<LoginBackendResponse>(
      authEndpoints.mfaVerify(),
      {
        method: 'POST',
        body: JSON.stringify({
          mfa_token: token,
          ...(input.recoveryCode
            ? { recovery_code: input.recoveryCode.trim() }
            : { code: (input.code ?? '').replace(/\s/g, '') }),
        }),
      }
    )
    await removeServerCookie(MFA_CHALLENGE_COOKIE)
    return await completeLogin(data, refreshToken)
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Verification failed' }
  }
}

/**
 * Forced enrollment (the organization requires 2FA): get a new secret for the
 * authenticator app.
 */
export async function startMfaEnrollmentAction(): Promise<MfaEnrollmentStart> {
  const token = await readMfaChallenge()
  if (!token) {
    return { success: false, error: MFA_EXPIRED_MESSAGE }
  }
  try {
    const data = await backendFetch<{ secret: string; otpauth_uri: string }>(
      authEndpoints.mfaEnrollStart(),
      { method: 'POST', body: JSON.stringify({ mfa_token: token }) }
    )
    return { success: true, secret: data.secret, otpauthUri: data.otpauth_uri }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not start two-factor setup',
    }
  }
}

/**
 * Forced enrollment: confirm the authenticator with a code. Turns 2FA on and
 * returns the recovery codes (shown once).
 *
 * The session the API just issued is NOT installed yet: setting the auth
 * cookies here would make the /login page redirect into the app on its next
 * render, before the user has seen the recovery codes. It is parked in a
 * short-lived httpOnly cookie that /login ignores, and
 * finishMfaEnrollmentAction installs it when the user continues.
 */
export async function confirmMfaEnrollmentAction(code: string): Promise<LoginResult> {
  const token = await readMfaChallenge()
  if (!token) {
    return { success: false, error: MFA_EXPIRED_MESSAGE }
  }
  try {
    const { data, refreshToken } = await backendFetchWithMeta<LoginBackendResponse>(
      authEndpoints.mfaEnrollConfirm(),
      {
        method: 'POST',
        body: JSON.stringify({ mfa_token: token, code: code.replace(/\s/g, '') }),
      }
    )
    await removeServerCookie(MFA_CHALLENGE_COOKIE)
    const recoveryCodes = data.recovery_codes ?? []
    const pending: PendingLogin = {
      rt: refreshToken || data.refresh_token || '',
      login: {
        token_type: data.token_type,
        expires_in: data.expires_in,
        user: data.user,
        tenants: data.tenants,
        suspended_tenants: data.suspended_tenants,
        platform_admin: data.platform_admin,
      },
    }
    const encoded = Buffer.from(JSON.stringify(pending)).toString('base64url')
    if (encoded.length > 3800) {
      // Too many memberships to park in a cookie: finish now. The codes are
      // still returned; the page may move on before showing them.
      const result = await completeLogin(data, refreshToken)
      return { ...result, recoveryCodes }
    }
    await setServerCookie(MFA_PENDING_LOGIN_COOKIE, encoded, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES !== 'false',
      sameSite: 'strict',
      maxAge: 10 * 60,
      path: '/',
    })
    return {
      success: true,
      recoveryCodes,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        roles: [],
        emailVerified: true,
        authProvider: 'local',
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Verification failed' }
  }
}

/**
 * Forced enrollment, last step: the user saved the recovery codes; install
 * the parked session and pick the tenant like any other login.
 */
export async function finishMfaEnrollmentAction(): Promise<LoginResult> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(MFA_PENDING_LOGIN_COOKIE)?.value
  await removeServerCookie(MFA_PENDING_LOGIN_COOKIE)
  if (!raw) {
    return { success: false, error: MFA_EXPIRED_MESSAGE }
  }
  try {
    const pending = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as PendingLogin
    return await completeLogin(pending.login, pending.rt)
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Sign-in failed' }
  }
}

const MFA_PENDING_LOGIN_COOKIE = 'mfa_pending_login'

interface PendingLogin {
  rt: string
  login: LoginBackendResponse
}

/** Abandon a pending second step (the user went back to the password form). */
export async function cancelMfaAction(): Promise<void> {
  await removeServerCookie(MFA_CHALLENGE_COOKIE)
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
        devLog.error('[SelectTenant] Failed to parse pending tenants')
      }
    }

    devLog.log('[SelectTenant] Exchanging token for tenant:', tenantId)

    const { data: tokenData, refreshToken: rotatedRefresh } =
      await backendFetchWithMeta<TokenExchangeResponse>(authEndpoints.token(), {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: refreshToken,
          tenant_id: tenantId,
        }),
      })
    devLog.log('[SelectTenant] Token exchange successful')
    devLog.log('[SelectTenant] access_token length:', tokenData.access_token?.length)
    devLog.log('[SelectTenant] expires_in:', tokenData.expires_in)

    // Store access token in httpOnly cookie
    await setServerCookie(env.auth.cookieName, tokenData.access_token, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES !== 'false',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 900,
      path: '/',
    })

    // Update refresh token if rotated (S-3: via Set-Cookie; body is fallback).
    const newRefresh = rotatedRefresh || tokenData.refresh_token
    if (newRefresh) {
      await setServerCookie(env.auth.refreshCookieName, newRefresh, {
        httpOnly: true,
        secure: process.env.SECURE_COOKIES !== 'false',
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
        secure: process.env.SECURE_COOKIES !== 'false',
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
    devLog.error('[SelectTenant] Error:', error)
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

    const { data, refreshToken: rotatedRefresh } = await backendFetchWithMeta<TokenResponse>(
      authEndpoints.refresh(),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    )

    // Update cookies with new tokens
    await setServerCookie(env.auth.cookieName, data.access_token, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES !== 'false',
      sameSite: 'lax',
      maxAge: data.expires_in || 900,
      path: '/',
    })

    // Persist the rotated refresh token (S-3: via Set-Cookie; body is fallback).
    const newRefresh = rotatedRefresh || data.refresh_token
    if (newRefresh) {
      await setServerCookie(env.auth.refreshCookieName, newRefresh, {
        httpOnly: true,
        secure: process.env.SECURE_COOKIES !== 'false',
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
        devLog.log('[Logout] Backend logout successful')
      } catch (error) {
        devLog.error('[Logout] Backend logout error (continuing with local cleanup):', error)
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

    devLog.log('[Logout] All cookies cleared, redirecting to:', redirectTo || '/login')

    redirect(redirectTo || '/login')
  } catch (error) {
    // Handle redirect error (expected)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    devLog.error('[Logout] Error:', error)
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

    devLog.log('[CreateFirstTeam] Creating team:', input.teamName, input.teamSlug)

    // Call backend API with cookies (refresh token in httpOnly cookie)
    const response = await fetch(`${env.api.url}${authEndpoints.createFirstTeam()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Server-to-server: the refresh token goes in the body. A refresh_token
      // cookie is treated as an ambient browser credential by the API and
      // needs the CSRF pair.
      body: JSON.stringify({
        team_name: input.teamName,
        team_slug: input.teamSlug,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
    }

    const data: CreateFirstTeamResponse = await response.json()
    devLog.log('[CreateFirstTeam] Team created successfully:', data.tenant_name)

    // Store access token in httpOnly cookie
    await setServerCookie(env.auth.cookieName, data.access_token, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES !== 'false',
      sameSite: 'lax',
      maxAge: data.expires_in || 900,
      path: '/',
    })

    // Store new refresh token
    await setServerCookie(env.auth.refreshCookieName, data.refresh_token, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES !== 'false',
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
        secure: process.env.SECURE_COOKIES !== 'false',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      }
    )
    // NOTE: Permissions fetched via /api/v1/me/permissions API (not stored in cookie)

    // Clear user info cookie (no longer needed after team created)
    await removeServerCookie(env.cookies.userInfo)

    devLog.log('[CreateFirstTeam] All cookies set, team creation complete')

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
    devLog.error('[CreateFirstTeam] Error:', error)
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
