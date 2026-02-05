/**
 * Authentication State Store (Zustand)
 *
 * Manages authentication state for local auth
 *
 * Security Best Practices:
 * - Access tokens stored in MEMORY ONLY (this store), never in cookies
 * - Refresh tokens stored in HttpOnly cookies (server-side only)
 * - User info extracted from access token JWT
 * - Token expiration checked automatically
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { clearAllStoredPermissions } from '@/lib/permission-storage'
import { clearAllLogoCaches } from '@/lib/logo-storage'

// ============================================
// TYPES
// ============================================

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export interface AuthUser {
  id: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  avatar?: string
  roles: string[]
  permissions?: string[]
  tenantId?: string
  tenantRole?: string
}

interface AuthState {
  // State
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
  expiresAt: number | null
  error: string | null

  // Actions
  login: (accessToken: string) => void
  logout: (postLogoutRedirectUri?: string) => void
  updateToken: (accessToken: string) => void
  clearAuth: () => void
  setError: (error: string) => void
  clearError: () => void

  // Computed
  isAuthenticated: () => boolean
  isTokenExpiring: () => boolean
  getTimeUntilExpiry: () => number
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
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
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

function getTimeUntilExpiry(token: string): number {
  try {
    const decoded = decodeJWT<{ exp?: number }>(token)
    if (!decoded.exp) return 0
    return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
  } catch {
    return 0
  }
}

function extractUser(token: string): AuthUser {
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
}

function redirectToLogin(returnUrl?: string): void {
  const url = new URL('/auth/login', window.location.origin)
  if (returnUrl) {
    url.searchParams.set('returnUrl', returnUrl)
  }
  window.location.href = url.toString()
}

function redirectToLogout(options?: { post_logout_redirect_uri?: string }): void {
  const url = new URL('/auth/logout', window.location.origin)
  if (options?.post_logout_redirect_uri) {
    url.searchParams.set('redirect', options.post_logout_redirect_uri)
  }
  window.location.href = url.toString()
}

// ============================================
// STORE
// ============================================

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      // Initial State
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      expiresAt: null,
      error: null,

      // Actions
      login: (accessToken: string) => {
        try {
          if (isTokenExpired(accessToken)) {
            throw new Error('Token is expired')
          }

          const user = extractUser(accessToken)
          const expiresIn = getTimeUntilExpiry(accessToken)
          const expiresAt = Date.now() + expiresIn * 1000

          authPermanentlyFailed = false

          set({
            status: 'authenticated',
            user,
            accessToken,
            expiresAt,
            error: null,
          })

          setupTokenRefresh(expiresIn)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to process token'

          set({
            status: 'error',
            user: null,
            accessToken: null,
            expiresAt: null,
            error: errorMessage,
          })

          console.error('Login failed:', errorMessage)
        }
      },

      logout: (postLogoutRedirectUri?: string) => {
        set({
          status: 'unauthenticated',
          user: null,
          accessToken: null,
          expiresAt: null,
          error: null,
        })

        clearAllStoredPermissions()
        clearAllLogoCaches()

        redirectToLogout({
          post_logout_redirect_uri: postLogoutRedirectUri,
        })
      },

      updateToken: (accessToken: string) => {
        try {
          if (isTokenExpired(accessToken)) {
            throw new Error('New token is expired')
          }

          const user = extractUser(accessToken)
          const expiresIn = getTimeUntilExpiry(accessToken)
          const expiresAt = Date.now() + expiresIn * 1000

          set({
            status: 'authenticated',
            user,
            accessToken,
            expiresAt,
            error: null,
          })

          setupTokenRefresh(expiresIn)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update token'

          set({
            status: 'error',
            error: errorMessage,
          })

          console.error('Token update failed:', errorMessage)
        }
      },

      clearAuth: () => {
        set({
          status: 'unauthenticated',
          user: null,
          accessToken: null,
          expiresAt: null,
          error: null,
        })

        clearAllStoredPermissions()
        clearAllLogoCaches()
      },

      setError: (error: string) => {
        set({ status: 'error', error })
      },

      clearError: () => {
        set({ error: null })
      },

      // Computed
      isAuthenticated: () => {
        const state = get()
        return (
          state.status === 'authenticated' &&
          state.accessToken !== null &&
          state.user !== null &&
          !isTokenExpired(state.accessToken)
        )
      },

      isTokenExpiring: () => {
        const state = get()
        if (!state.accessToken) return false
        const expiresIn = getTimeUntilExpiry(state.accessToken)
        return expiresIn > 0 && expiresIn < 300
      },

      getTimeUntilExpiry: () => {
        const state = get()
        if (!state.accessToken) return 0
        return getTimeUntilExpiry(state.accessToken)
      },
    }),
    {
      name: 'auth-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

// ============================================
// HELPER FUNCTIONS
// ============================================

let authRefreshTimeout: ReturnType<typeof setTimeout> | null = null
let isRefreshingToken = false
let authPermanentlyFailed = false

function setupTokenRefresh(expiresIn: number): void {
  if (authRefreshTimeout) {
    clearTimeout(authRefreshTimeout)
    authRefreshTimeout = null
  }

  if (authPermanentlyFailed) return
  if (expiresIn < 60 || expiresIn > 86400) return

  const refreshIn = Math.max(0, (expiresIn - 300) * 1000)

  if (typeof window !== 'undefined') {
    authRefreshTimeout = setTimeout(async () => {
      if (authPermanentlyFailed || isRefreshingToken) return

      console.log('[Auth] Token expiring soon, refreshing...')
      isRefreshingToken = true

      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })

        const data = await response.json()

        if (response.ok && data.success && data.data?.access_token) {
          console.log('[Auth] Token refreshed successfully')
          useAuthStore.getState().updateToken(data.data.access_token)
        } else {
          console.warn('[Auth] Token refresh failed:', data.error?.message || 'Unknown error')
          authPermanentlyFailed = true
          useAuthStore.getState().clearAuth()
          redirectToLogin()
        }
      } catch (error) {
        console.error('[Auth] Token refresh error:', error)
        useAuthStore.getState().clearAuth()
        redirectToLogin()
      } finally {
        setTimeout(() => {
          isRefreshingToken = false
        }, 1000)
      }
    }, refreshIn)
  }
}

export function resetAuthFailureFlag(): void {
  authPermanentlyFailed = false
}

// ============================================
// SELECTORS
// ============================================

export const useUser = () => useAuthStore((state) => state.user)
export const useAuthStatus = () => useAuthStore((state) => state.status)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated())
export const useUserRoles = () => useAuthStore((state) => state.user?.roles || [])
export const useHasRole = (role: string) =>
  useAuthStore((state) => state.user?.roles.includes(role) || false)

// ============================================
// ACTIONS
// ============================================

export const loginWithToken = (accessToken: string) => {
  useAuthStore.getState().login(accessToken)
}

export const logoutUser = (postLogoutRedirectUri?: string) => {
  useAuthStore.getState().logout(postLogoutRedirectUri)
}

export const forceLogin = (returnUrl?: string) => {
  useAuthStore.getState().clearAuth()
  redirectToLogin(returnUrl)
}
