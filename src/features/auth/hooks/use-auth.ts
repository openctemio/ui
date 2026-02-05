/**
 * useAuth Hook
 *
 * Main authentication hook - abstraction layer over useAuthStore
 * Provides clean API for auth operations
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth()
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { useAuthStore, forceLogin } from '@/stores/auth-store'
import { refreshTokenAction } from '../actions/auth-actions'
import {
  DEFAULT_LOGIN_REDIRECT,
  DEFAULT_LOGOUT_REDIRECT,
  AUTH_SUCCESS_MESSAGES,
  AUTH_INFO_MESSAGES,
} from '../constants'
import type { UseAuthReturn } from '../types/auth.types'

// Refresh token 5 minutes before expiry
const TOKEN_REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000 // 5 minutes in ms

/**
 * Main authentication hook
 *
 * Provides abstraction over Zustand auth store with:
 * - Clean API for auth operations
 * - Toast notifications
 * - Navigation handling
 * - Role-based access control
 */
export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(false)
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRefreshingRef = useRef(false)

  // Get auth state from store
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const expiresAt = useAuthStore((state) => state.expiresAt)
  const storeLogout = useAuthStore((state) => state.logout)
  const updateToken = useAuthStore((state) => state.updateToken)

  // Computed values
  const isAuthenticated = status === 'authenticated' && !!user && !!accessToken

  /**
   * Login user
   * Redirects to login page
   */
  const login = useCallback((redirectTo?: string) => {
    setIsLoading(true)
    toast.loading(AUTH_INFO_MESSAGES.REDIRECTING)

    try {
      forceLogin(redirectTo || DEFAULT_LOGIN_REDIRECT)
    } catch (error) {
      setIsLoading(false)
      console.error('Login redirect error:', error)
      toast.dismiss()
      toast.error(getErrorMessage(error, 'Failed to initiate login. Please try again.'))
    }
  }, [])

  /**
   * Logout user
   * Clears auth state and redirects
   */
  const logout = useCallback(
    (postLogoutRedirectUri?: string) => {
      setIsLoading(true)
      toast.loading(AUTH_INFO_MESSAGES.LOGGING_OUT)

      try {
        // Clear auth state
        storeLogout(postLogoutRedirectUri || DEFAULT_LOGOUT_REDIRECT)

        // Show success message
        toast.dismiss()
        toast.success(AUTH_SUCCESS_MESSAGES.LOGOUT)
      } catch (error) {
        setIsLoading(false)
        console.error('Logout error:', error)
        toast.dismiss()
        toast.error(getErrorMessage(error, 'Failed to logout. Please try again.'))
      }
    },
    [storeLogout]
  )

  /**
   * Refresh authentication token
   *
   * Calls server action to refresh access token using HttpOnly refresh token cookie.
   * Updates auth store with new token on success.
   *
   * @returns true if refresh successful, false otherwise
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent refresh attempts
    if (isRefreshingRef.current) {
      return false
    }

    isRefreshingRef.current = true

    try {
      const result = await refreshTokenAction()

      if (result.success && result.accessToken) {
        // Update auth store with new token
        updateToken(result.accessToken)
        return true
      }

      // Refresh failed - user needs to re-login
      return false
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    } finally {
      isRefreshingRef.current = false
    }
  }, [updateToken])

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user) return false
      return user.roles.includes(role)
    },
    [user]
  )

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!user) return false
      return roles.some((role) => user.roles.includes(role))
    },
    [user]
  )

  /**
   * Check if user has all of the specified roles
   */
  const hasAllRoles = useCallback(
    (roles: string[]): boolean => {
      if (!user) return false
      return roles.every((role) => user.roles.includes(role))
    },
    [user]
  )

  /**
   * Auto-refresh token before expiry
   *
   * Sets up a timeout to refresh the token 5 minutes before it expires.
   * Cleans up timeout on unmount or when auth state changes.
   */
  useEffect(() => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }

    // Only setup refresh if authenticated with valid expiry
    if (!isAuthenticated || !expiresAt) {
      return
    }

    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    const timeUntilRefresh = timeUntilExpiry - TOKEN_REFRESH_BEFORE_EXPIRY

    // If token is already expired or expiring very soon, refresh immediately
    if (timeUntilRefresh <= 0) {
      refreshToken()
      return
    }

    // Schedule refresh before token expires
    refreshTimeoutRef.current = setTimeout(async () => {
      const success = await refreshToken()

      if (!success) {
        // Token refresh failed - notify user
        toast.error('Session expired. Please login again.')
      }
    }, timeUntilRefresh)

    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
    }
  }, [isAuthenticated, expiresAt, refreshToken])

  return {
    // State
    status,
    user,
    isAuthenticated,
    isLoading,

    // Actions
    login,
    logout,
    refreshToken,

    // Role checks
    hasRole,
    hasAnyRole,
    hasAllRoles,
  }
}
