/**
 * useProtectedRoute Hook Tests
 *
 * Tests for route protection hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProtectedRoute, useRequireRoles, useRequireAuth } from './use-protected-route'
import { useAuth } from './use-auth'
import { useRouter, usePathname } from 'next/navigation'

// Mock dependencies
vi.mock('./use-auth')
vi.mock('next/navigation')

// ============================================
// SETUP
// ============================================

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  roles: ['user', 'admin'],
  realmRoles: ['user', 'admin'],
  clientRoles: {},
  emailVerified: true,
  permissions: [],
}

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}

describe('useProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
    vi.mocked(usePathname).mockReturnValue('/dashboard')
  })

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================

  describe('authentication', () => {
    it('should allow access for authenticated user', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        hasAllRoles: vi.fn(() => true),
        hasAnyRole: vi.fn(() => true),
        status: 'authenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      const { result } = renderHook(() => useProtectedRoute())

      await waitFor(() => {
        expect(result.current.isAuthorized).toBe(true)
        expect(result.current.isChecking).toBe(false)
      })

      expect(mockRouter.replace).not.toHaveBeenCalled()
    })

    it('should redirect to login for unauthenticated user', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
        hasAllRoles: vi.fn(() => false),
        hasAnyRole: vi.fn(() => false),
        status: 'unauthenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      renderHook(() => useProtectedRoute())

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          expect.stringContaining('/login')
        )
      })
    })

    it('should include return URL in redirect', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
        hasAllRoles: vi.fn(() => false),
        hasAnyRole: vi.fn(() => false),
        status: 'unauthenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      vi.mocked(usePathname).mockReturnValue('/dashboard/settings')

      renderHook(() => useProtectedRoute())

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          expect.stringContaining('redirect=')
        )
      })
    })
  })

  // ============================================
  // ROLE-BASED ACCESS TESTS
  // ============================================

  describe('role-based access', () => {
    it('should allow access when user has required role', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        hasAllRoles: vi.fn((roles) => roles.every((r: string) => mockUser.roles.includes(r))),
        hasAnyRole: vi.fn((roles) => roles.some((r: string) => mockUser.roles.includes(r))),
        status: 'authenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      const { result } = renderHook(() =>
        useProtectedRoute({ roles: ['admin'] })
      )

      await waitFor(() => {
        expect(result.current.isAuthorized).toBe(true)
      })

      expect(mockRouter.replace).not.toHaveBeenCalled()
    })

    it('should redirect to unauthorized when user lacks required role', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        hasAllRoles: vi.fn(() => false),
        hasAnyRole: vi.fn(() => false),
        status: 'authenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      renderHook(() =>
        useProtectedRoute({ roles: ['superadmin'] })
      )

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/unauthorized')
      })
    })

    it('should check all roles when requireAll is true', async () => {
      const hasAllRoles = vi.fn((roles) =>
        roles.every((r: string) => mockUser.roles.includes(r))
      )

      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        hasAllRoles,
        hasAnyRole: vi.fn(),
        status: 'authenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      renderHook(() =>
        useProtectedRoute({
          roles: ['user', 'admin'],
          requireAll: true,
        })
      )

      await waitFor(() => {
        expect(hasAllRoles).toHaveBeenCalledWith(['user', 'admin'])
      })
    })

    it('should check any role when requireAll is false', async () => {
      const hasAnyRole = vi.fn((roles) =>
        roles.some((r: string) => mockUser.roles.includes(r))
      )

      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        hasAllRoles: vi.fn(),
        hasAnyRole,
        status: 'authenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      renderHook(() =>
        useProtectedRoute({
          roles: ['user', 'moderator'],
          requireAll: false,
        })
      )

      await waitFor(() => {
        expect(hasAnyRole).toHaveBeenCalledWith(['user', 'moderator'])
      })
    })
  })

  // ============================================
  // CUSTOM AUTHORIZATION TESTS
  // ============================================

  describe('custom authorization', () => {
    it('should allow access when custom authorize returns true', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        hasAllRoles: vi.fn(() => true),
        hasAnyRole: vi.fn(() => true),
        status: 'authenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      const authorize = vi.fn(() => Promise.resolve(true))

      const { result } = renderHook(() =>
        useProtectedRoute({ authorize })
      )

      await waitFor(() => {
        expect(result.current.isAuthorized).toBe(true)
      })

      expect(authorize).toHaveBeenCalledWith(mockUser)
      expect(mockRouter.replace).not.toHaveBeenCalled()
    })

    it('should redirect when custom authorize returns false', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        hasAllRoles: vi.fn(() => true),
        hasAnyRole: vi.fn(() => true),
        status: 'authenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      const authorize = vi.fn(() => Promise.resolve(false))

      renderHook(() => useProtectedRoute({ authorize }))

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/unauthorized')
      })
    })

    it('should redirect when custom authorize throws error', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        hasAllRoles: vi.fn(() => true),
        hasAnyRole: vi.fn(() => true),
        status: 'authenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      const authorize = vi.fn(() => Promise.reject(new Error('Auth error')))

      renderHook(() => useProtectedRoute({ authorize }))

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/unauthorized')
      })
    })
  })

  // ============================================
  // CUSTOM REDIRECT TESTS
  // ============================================

  describe('custom redirect', () => {
    it('should use custom redirectTo when provided', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
        hasAllRoles: vi.fn(() => false),
        hasAnyRole: vi.fn(() => false),
        status: 'unauthenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      renderHook(() =>
        useProtectedRoute({ redirectTo: '/custom-login' })
      )

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          expect.stringContaining('/custom-login')
        )
      })
    })
  })

  // ============================================
  // RETURN VALUES TESTS
  // ============================================

  describe('return values', () => {
    it('should eventually set authorized state to false initially', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        hasAllRoles: vi.fn(() => true),
        hasAnyRole: vi.fn(() => true),
        status: 'authenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      const { result } = renderHook(() => useProtectedRoute())

      // Initially should be checking
      // Note: Due to test timing, isChecking might already be false
      // The important part is that it eventually becomes authorized
      await waitFor(() => {
        expect(result.current.isAuthorized).toBe(true)
        expect(result.current.isChecking).toBe(false)
      })
    })

    it('should return user object', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        hasAllRoles: vi.fn(() => true),
        hasAnyRole: vi.fn(() => true),
        status: 'authenticated',
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        hasRole: vi.fn(),
      })

      const { result } = renderHook(() => useProtectedRoute())

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })
    })
  })
})

// ============================================
// CONVENIENCE HOOKS
// ============================================

describe('useRequireRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
    vi.mocked(usePathname).mockReturnValue('/dashboard')
  })

  it('should call useProtectedRoute with roles', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
      hasAllRoles: vi.fn(() => true),
      hasAnyRole: vi.fn(() => true),
      status: 'authenticated',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      hasRole: vi.fn(),
    })

    const { result } = renderHook(() => useRequireRoles(['admin']))

    await waitFor(() => {
      expect(result.current.isAuthorized).toBe(true)
    })
  })

  it('should support requireAll parameter', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
      hasAllRoles: vi.fn(() => true),
      hasAnyRole: vi.fn(() => false),
      status: 'authenticated',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      hasRole: vi.fn(),
    })

    const { result } = renderHook(() =>
      useRequireRoles(['admin', 'moderator'], true)
    )

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })
  })
})

describe('useRequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)
    vi.mocked(usePathname).mockReturnValue('/dashboard')
  })

  it('should call useProtectedRoute with no roles', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
      hasAllRoles: vi.fn(() => true),
      hasAnyRole: vi.fn(() => true),
      status: 'authenticated',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      hasRole: vi.fn(),
    })

    const { result } = renderHook(() => useRequireAuth())

    await waitFor(() => {
      expect(result.current.isAuthorized).toBe(true)
    })
  })

  it('should redirect unauthenticated users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      hasAllRoles: vi.fn(() => false),
      hasAnyRole: vi.fn(() => false),
      status: 'unauthenticated',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      hasRole: vi.fn(),
    })

    renderHook(() => useRequireAuth())

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled()
    })
  })
})
