/**
 * Auth Store Tests
 *
 * Tests for the Zustand authentication state store
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAuthStore } from '../auth-store'

// Mock external dependencies
vi.mock('@/lib/permission-storage', () => ({
  clearAllStoredPermissions: vi.fn(),
}))

vi.mock('@/lib/logo-storage', () => ({
  clearAllLogoCaches: vi.fn(),
}))

// ============================================
// JWT HELPERS
// ============================================

/**
 * Create a fake JWT token with the given payload.
 * Format: header.payload.signature (base64url encoded)
 */
function createJWT(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  const signature = btoa('fake-signature')
  return `${header}.${body}.${signature}`
}

/**
 * Create a valid (non-expired) JWT with standard user claims.
 * Expires 1 hour from now by default.
 */
function createValidToken(overrides: Record<string, unknown> = {}): string {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return createJWT({
    sub: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    roles: ['user'],
    permissions: ['assets:read', 'findings:read'],
    tenant_id: 'tenant-abc',
    tenant_role: 'member',
    exp: nowSeconds + 3600,
    iat: nowSeconds,
    ...overrides,
  })
}

/**
 * Create an expired JWT token.
 */
function createExpiredToken(): string {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return createJWT({
    sub: 'user-123',
    email: 'test@example.com',
    exp: nowSeconds - 60,
    iat: nowSeconds - 3660,
  })
}

/**
 * Create a JWT that expires within the given number of seconds.
 */
function createExpiringToken(expiresInSeconds: number): string {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return createJWT({
    sub: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
    permissions: ['assets:read'],
    tenant_id: 'tenant-abc',
    tenant_role: 'member',
    exp: nowSeconds + expiresInSeconds,
    iat: nowSeconds,
  })
}

// ============================================
// TEST SUITE
// ============================================

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      expiresAt: null,
      error: null,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================
  // INITIAL STATE
  // ============================================

  describe('initial state', () => {
    it('should have unauthenticated status', () => {
      const state = useAuthStore.getState()
      expect(state.status).toBe('unauthenticated')
    })

    it('should have null user', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
    })

    it('should have null accessToken', () => {
      const state = useAuthStore.getState()
      expect(state.accessToken).toBeNull()
    })

    it('should have null expiresAt', () => {
      const state = useAuthStore.getState()
      expect(state.expiresAt).toBeNull()
    })

    it('should have null error', () => {
      const state = useAuthStore.getState()
      expect(state.error).toBeNull()
    })
  })

  // ============================================
  // LOGIN
  // ============================================

  describe('login', () => {
    it('should set authenticated status with a valid token', () => {
      const token = createValidToken()
      useAuthStore.getState().login(token)

      const state = useAuthStore.getState()
      expect(state.status).toBe('authenticated')
    })

    it('should extract user from JWT claims', () => {
      const token = createValidToken({
        sub: 'user-456',
        email: 'john@example.com',
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        roles: ['admin'],
        permissions: ['assets:read', 'assets:write'],
        tenant_id: 'tenant-xyz',
        tenant_role: 'admin',
      })
      useAuthStore.getState().login(token)

      const state = useAuthStore.getState()
      expect(state.user).not.toBeNull()
      expect(state.user?.id).toBe('user-456')
      expect(state.user?.email).toBe('john@example.com')
      expect(state.user?.name).toBe('John Doe')
      expect(state.user?.firstName).toBe('John')
      expect(state.user?.lastName).toBe('Doe')
      expect(state.user?.roles).toEqual(['admin'])
      expect(state.user?.permissions).toEqual(['assets:read', 'assets:write'])
      expect(state.user?.tenantId).toBe('tenant-xyz')
      expect(state.user?.tenantRole).toBe('admin')
    })

    it('should store the accessToken', () => {
      const token = createValidToken()
      useAuthStore.getState().login(token)

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe(token)
    })

    it('should set expiresAt', () => {
      const token = createValidToken()
      useAuthStore.getState().login(token)

      const state = useAuthStore.getState()
      expect(state.expiresAt).not.toBeNull()
      expect(state.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should clear any previous error', () => {
      // Set an error first
      useAuthStore.setState({ error: 'previous error', status: 'error' })

      const token = createValidToken()
      useAuthStore.getState().login(token)

      const state = useAuthStore.getState()
      expect(state.error).toBeNull()
    })

    it('should set error status when token is expired', () => {
      const token = createExpiredToken()
      useAuthStore.getState().login(token)

      const state = useAuthStore.getState()
      expect(state.status).toBe('error')
      expect(state.error).toBe('Token is expired')
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
    })

    it('should set error status when token is invalid', () => {
      useAuthStore.getState().login('not-a-jwt')

      const state = useAuthStore.getState()
      expect(state.status).toBe('error')
      expect(state.error).toBeTruthy()
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
    })
  })

  // ============================================
  // LOGOUT
  // ============================================

  describe('logout', () => {
    it('should clear all auth state', () => {
      // Login first
      const token = createValidToken()
      useAuthStore.getState().login(token)
      expect(useAuthStore.getState().status).toBe('authenticated')

      // Logout
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.status).toBe('unauthenticated')
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
      expect(state.expiresAt).toBeNull()
      expect(state.error).toBeNull()
    })

    it('should call clearAllStoredPermissions', async () => {
      const { clearAllStoredPermissions } = await import('@/lib/permission-storage')

      const token = createValidToken()
      useAuthStore.getState().login(token)
      useAuthStore.getState().logout()

      expect(clearAllStoredPermissions).toHaveBeenCalled()
    })

    it('should call clearAllLogoCaches', async () => {
      const { clearAllLogoCaches } = await import('@/lib/logo-storage')

      const token = createValidToken()
      useAuthStore.getState().login(token)
      useAuthStore.getState().logout()

      expect(clearAllLogoCaches).toHaveBeenCalled()
    })
  })

  // ============================================
  // UPDATE TOKEN
  // ============================================

  describe('updateToken', () => {
    it('should update the accessToken', () => {
      const token1 = createValidToken({ sub: 'user-1' })
      useAuthStore.getState().login(token1)

      const token2 = createValidToken({ sub: 'user-1', email: 'updated@example.com' })
      useAuthStore.getState().updateToken(token2)

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe(token2)
    })

    it('should refresh user from new JWT', () => {
      const token1 = createValidToken({ email: 'old@example.com', name: 'Old Name' })
      useAuthStore.getState().login(token1)

      const token2 = createValidToken({ email: 'new@example.com', name: 'New Name' })
      useAuthStore.getState().updateToken(token2)

      const state = useAuthStore.getState()
      expect(state.user?.email).toBe('new@example.com')
      expect(state.user?.name).toBe('New Name')
    })

    it('should maintain authenticated status', () => {
      const token1 = createValidToken()
      useAuthStore.getState().login(token1)

      const token2 = createValidToken()
      useAuthStore.getState().updateToken(token2)

      expect(useAuthStore.getState().status).toBe('authenticated')
    })

    it('should set error when new token is expired', () => {
      const token1 = createValidToken()
      useAuthStore.getState().login(token1)

      const expiredToken = createExpiredToken()
      useAuthStore.getState().updateToken(expiredToken)

      const state = useAuthStore.getState()
      expect(state.status).toBe('error')
      expect(state.error).toBe('New token is expired')
    })
  })

  // ============================================
  // CLEAR AUTH
  // ============================================

  describe('clearAuth', () => {
    it('should reset all state to initial values', () => {
      const token = createValidToken()
      useAuthStore.getState().login(token)
      expect(useAuthStore.getState().status).toBe('authenticated')

      useAuthStore.getState().clearAuth()

      const state = useAuthStore.getState()
      expect(state.status).toBe('unauthenticated')
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
      expect(state.expiresAt).toBeNull()
      expect(state.error).toBeNull()
    })

    it('should call clearAllStoredPermissions', async () => {
      const { clearAllStoredPermissions } = await import('@/lib/permission-storage')

      useAuthStore.getState().clearAuth()

      expect(clearAllStoredPermissions).toHaveBeenCalled()
    })

    it('should call clearAllLogoCaches', async () => {
      const { clearAllLogoCaches } = await import('@/lib/logo-storage')

      useAuthStore.getState().clearAuth()

      expect(clearAllLogoCaches).toHaveBeenCalled()
    })
  })

  // ============================================
  // SET ERROR / CLEAR ERROR
  // ============================================

  describe('setError', () => {
    it('should set error message', () => {
      useAuthStore.getState().setError('Something went wrong')

      const state = useAuthStore.getState()
      expect(state.error).toBe('Something went wrong')
      expect(state.status).toBe('error')
    })
  })

  describe('clearError', () => {
    it('should clear error message', () => {
      useAuthStore.getState().setError('Some error')
      expect(useAuthStore.getState().error).toBe('Some error')

      useAuthStore.getState().clearError()

      expect(useAuthStore.getState().error).toBeNull()
    })

    it('should not affect other state', () => {
      const token = createValidToken()
      useAuthStore.getState().login(token)
      useAuthStore.getState().setError('Transient error')

      useAuthStore.getState().clearError()

      const state = useAuthStore.getState()
      expect(state.error).toBeNull()
      // accessToken should still be present from the login
      expect(state.accessToken).toBe(token)
    })
  })

  // ============================================
  // IS AUTHENTICATED
  // ============================================

  describe('isAuthenticated', () => {
    it('should return true when authenticated with valid token', () => {
      const token = createValidToken()
      useAuthStore.getState().login(token)

      expect(useAuthStore.getState().isAuthenticated()).toBe(true)
    })

    it('should return false when not authenticated', () => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false)
    })

    it('should return false after logout', () => {
      const token = createValidToken()
      useAuthStore.getState().login(token)
      useAuthStore.getState().logout()

      expect(useAuthStore.getState().isAuthenticated()).toBe(false)
    })

    it('should return false after clearAuth', () => {
      const token = createValidToken()
      useAuthStore.getState().login(token)
      useAuthStore.getState().clearAuth()

      expect(useAuthStore.getState().isAuthenticated()).toBe(false)
    })
  })

  // ============================================
  // IS TOKEN EXPIRING
  // ============================================

  describe('isTokenExpiring', () => {
    it('should return true when token expires within 5 minutes', () => {
      // Token expires in 4 minutes (240 seconds) - within the 300s threshold
      const token = createExpiringToken(240)
      useAuthStore.getState().login(token)

      expect(useAuthStore.getState().isTokenExpiring()).toBe(true)
    })

    it('should return false when token has more than 5 minutes left', () => {
      // Token expires in 1 hour
      const token = createExpiringToken(3600)
      useAuthStore.getState().login(token)

      expect(useAuthStore.getState().isTokenExpiring()).toBe(false)
    })

    it('should return false when there is no token', () => {
      expect(useAuthStore.getState().isTokenExpiring()).toBe(false)
    })
  })

  // ============================================
  // GET TIME UNTIL EXPIRY
  // ============================================

  describe('getTimeUntilExpiry', () => {
    it('should return positive seconds for a valid token', () => {
      const token = createExpiringToken(3600)
      useAuthStore.getState().login(token)

      const timeLeft = useAuthStore.getState().getTimeUntilExpiry()
      // Should be roughly 3600 seconds, allow some tolerance
      expect(timeLeft).toBeGreaterThan(3590)
      expect(timeLeft).toBeLessThanOrEqual(3600)
    })

    it('should return 0 when there is no token', () => {
      expect(useAuthStore.getState().getTimeUntilExpiry()).toBe(0)
    })
  })
})
