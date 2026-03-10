/**
 * usePermissions Hook Tests
 *
 * Tests for the permission checking hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePermissions } from '../use-permissions'
import { useAuthStore } from '@/stores/auth-store'
import type { AuthUser } from '@/stores/auth-store'

// ============================================
// HELPERS
// ============================================

/**
 * Set auth store state with the given user and status
 */
function setAuthState(
  user: AuthUser | null,
  status: 'authenticated' | 'unauthenticated' = 'authenticated'
) {
  useAuthStore.setState({
    status,
    user,
    accessToken: status === 'authenticated' ? 'fake-token' : null,
    expiresAt: status === 'authenticated' ? Date.now() + 3600000 : null,
    error: null,
  })
}

/**
 * Create a mock user with the given options
 */
function createUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
    permissions: ['assets:read', 'assets:write', 'findings:read', 'findings:delete'],
    tenantId: 'tenant-abc',
    tenantRole: 'member',
    ...overrides,
  }
}

// ============================================
// TEST SUITE
// ============================================

describe('usePermissions', () => {
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

  // ============================================
  // HAS PERMISSION
  // ============================================

  describe('hasPermission', () => {
    it('should return true for a matching permission', () => {
      setAuthState(createUser({ permissions: ['assets:read', 'assets:write'] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasPermission('assets:read')).toBe(true)
      expect(result.current.hasPermission('assets:write')).toBe(true)
    })

    it('should return false for a non-matching permission', () => {
      setAuthState(createUser({ permissions: ['assets:read'] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasPermission('assets:delete')).toBe(false)
      expect(result.current.hasPermission('findings:write')).toBe(false)
    })

    it('should return false when user has no permissions', () => {
      setAuthState(createUser({ permissions: [] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasPermission('assets:read')).toBe(false)
    })
  })

  // ============================================
  // HAS ANY PERMISSION
  // ============================================

  describe('hasAnyPermission', () => {
    it('should return true when any permission matches', () => {
      setAuthState(createUser({ permissions: ['assets:read', 'findings:read'] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasAnyPermission(['assets:read', 'scans:write'])).toBe(true)
      expect(result.current.hasAnyPermission(['findings:read', 'unknown:perm'])).toBe(true)
    })

    it('should return false when no permissions match', () => {
      setAuthState(createUser({ permissions: ['assets:read'] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasAnyPermission(['scans:write', 'findings:delete'])).toBe(false)
    })

    it('should return false for an empty array', () => {
      setAuthState(createUser({ permissions: ['assets:read'] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasAnyPermission([])).toBe(false)
    })
  })

  // ============================================
  // HAS ALL PERMISSIONS
  // ============================================

  describe('hasAllPermissions', () => {
    it('should return true when all permissions are present', () => {
      setAuthState(createUser({ permissions: ['assets:read', 'assets:write', 'findings:read'] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasAllPermissions(['assets:read', 'assets:write'])).toBe(true)
    })

    it('should return false when one permission is missing', () => {
      setAuthState(createUser({ permissions: ['assets:read', 'findings:read'] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasAllPermissions(['assets:read', 'assets:write'])).toBe(false)
    })

    it('should return true for an empty array', () => {
      setAuthState(createUser({ permissions: ['assets:read'] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasAllPermissions([])).toBe(true)
    })
  })

  // ============================================
  // CAN READ / CAN WRITE / CAN DELETE
  // ============================================

  describe('canRead', () => {
    it('should check for resource:read permission', () => {
      setAuthState(createUser({ permissions: ['assets:read', 'findings:read'] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.canRead('assets')).toBe(true)
      expect(result.current.canRead('findings')).toBe(true)
      expect(result.current.canRead('scans')).toBe(false)
    })
  })

  describe('canWrite', () => {
    it('should check for resource:write permission', () => {
      setAuthState(createUser({ permissions: ['assets:write'] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.canWrite('assets')).toBe(true)
      expect(result.current.canWrite('findings')).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('should check for resource:delete permission', () => {
      setAuthState(createUser({ permissions: ['findings:delete'] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.canDelete('findings')).toBe(true)
      expect(result.current.canDelete('assets')).toBe(false)
    })
  })

  // ============================================
  // IS TENANT ADMIN
  // ============================================

  describe('isTenantAdmin', () => {
    it('should return true for owner role', () => {
      setAuthState(createUser({ tenantRole: 'owner' }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.isTenantAdmin).toBe(true)
    })

    it('should return true for admin role', () => {
      setAuthState(createUser({ tenantRole: 'admin' }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.isTenantAdmin).toBe(true)
    })

    it('should return false for member role', () => {
      setAuthState(createUser({ tenantRole: 'member' }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.isTenantAdmin).toBe(false)
    })

    it('should return false for viewer role', () => {
      setAuthState(createUser({ tenantRole: 'viewer' }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.isTenantAdmin).toBe(false)
    })
  })

  // ============================================
  // ADMIN BYPASS
  // ============================================

  describe('admin bypass', () => {
    it('should return true for all permissions when user is owner', () => {
      setAuthState(createUser({ tenantRole: 'owner', permissions: [] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasPermission('assets:read')).toBe(true)
      expect(result.current.hasPermission('assets:write')).toBe(true)
      expect(result.current.hasPermission('assets:delete')).toBe(true)
      expect(result.current.hasPermission('any:unknown:permission')).toBe(true)
    })

    it('should return true for all permissions when user is admin', () => {
      setAuthState(createUser({ tenantRole: 'admin', permissions: [] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasPermission('findings:read')).toBe(true)
      expect(result.current.hasPermission('findings:write')).toBe(true)
      expect(result.current.hasPermission('anything:goes')).toBe(true)
    })

    it('should return true for hasAnyPermission when user is admin', () => {
      setAuthState(createUser({ tenantRole: 'admin', permissions: [] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasAnyPermission(['nonexistent:perm'])).toBe(true)
    })

    it('should return true for hasAllPermissions when user is admin', () => {
      setAuthState(createUser({ tenantRole: 'admin', permissions: [] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasAllPermissions(['a:b', 'c:d', 'e:f'])).toBe(true)
    })

    it('should return true for canRead/canWrite/canDelete when user is owner', () => {
      setAuthState(createUser({ tenantRole: 'owner', permissions: [] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.canRead('anything')).toBe(true)
      expect(result.current.canWrite('anything')).toBe(true)
      expect(result.current.canDelete('anything')).toBe(true)
    })

    it('should NOT bypass for member role', () => {
      setAuthState(createUser({ tenantRole: 'member', permissions: [] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.hasPermission('assets:read')).toBe(false)
      expect(result.current.hasAnyPermission(['assets:read'])).toBe(false)
      expect(result.current.hasAllPermissions(['assets:read'])).toBe(false)
    })
  })

  // ============================================
  // IS AUTHENTICATED
  // ============================================

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', () => {
      setAuthState(createUser())

      const { result } = renderHook(() => usePermissions())

      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should return false when user is not authenticated', () => {
      setAuthState(null, 'unauthenticated')

      const { result } = renderHook(() => usePermissions())

      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  // ============================================
  // TENANT ROLE
  // ============================================

  describe('tenantRole', () => {
    it('should return the user tenant role', () => {
      setAuthState(createUser({ tenantRole: 'member' }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.tenantRole).toBe('member')
    })

    it('should return undefined when no user', () => {
      setAuthState(null, 'unauthenticated')

      const { result } = renderHook(() => usePermissions())

      expect(result.current.tenantRole).toBeUndefined()
    })
  })

  // ============================================
  // PERMISSIONS ARRAY
  // ============================================

  describe('permissions', () => {
    it('should return the user permissions array', () => {
      setAuthState(createUser({ permissions: ['assets:read', 'findings:write'] }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.permissions).toEqual(['assets:read', 'findings:write'])
    })

    it('should return empty array when no user', () => {
      setAuthState(null, 'unauthenticated')

      const { result } = renderHook(() => usePermissions())

      expect(result.current.permissions).toEqual([])
    })

    it('should return empty array when user has no permissions', () => {
      setAuthState(createUser({ permissions: undefined }))

      const { result } = renderHook(() => usePermissions())

      expect(result.current.permissions).toEqual([])
    })
  })
})
