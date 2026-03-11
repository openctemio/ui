/**
 * PermissionGate Component & Permission Hooks Tests
 *
 * Tests for:
 * - PermissionGate component (single, anyOf, allOf, fallback, loading)
 * - useHasPermission hook
 * - useHasAnyPermission hook
 * - useHasAllPermissions hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import {
  PermissionGate,
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
} from '../permission-gate'

// ============================================
// MOCKS
// ============================================

let mockPermissions: string[] = []
let mockIsLoading = false

vi.mock('@/context/permission-provider', () => ({
  usePermissions: vi.fn(() => ({
    hasPermission: vi.fn((p: string) => mockPermissions.includes(p)),
    hasAnyPermission: vi.fn((ps: string[]) => ps.some((p) => mockPermissions.includes(p))),
    hasAllPermissions: vi.fn((ps: string[]) => ps.every((p) => mockPermissions.includes(p))),
    isLoading: mockIsLoading,
  })),
}))

// ============================================
// SETUP
// ============================================

describe('PermissionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPermissions = []
    mockIsLoading = false
  })

  // ============================================
  // SINGLE PERMISSION
  // ============================================

  describe('single permission', () => {
    it('renders children when user has the permission', () => {
      mockPermissions = ['assets:write']

      render(
        <PermissionGate permission="assets:write">
          <div>Edit Button</div>
        </PermissionGate>
      )

      expect(screen.getByText('Edit Button')).toBeInTheDocument()
    })

    it('hides children when user lacks the permission', () => {
      mockPermissions = ['assets:read']

      render(
        <PermissionGate permission="assets:write">
          <div>Edit Button</div>
        </PermissionGate>
      )

      expect(screen.queryByText('Edit Button')).not.toBeInTheDocument()
    })

    it('shows fallback when user lacks the permission', () => {
      mockPermissions = ['assets:read']

      render(
        <PermissionGate permission="assets:write" fallback={<div>No Access</div>}>
          <div>Edit Button</div>
        </PermissionGate>
      )

      expect(screen.queryByText('Edit Button')).not.toBeInTheDocument()
      expect(screen.getByText('No Access')).toBeInTheDocument()
    })
  })

  // ============================================
  // LOADING STATE
  // ============================================

  describe('loading state', () => {
    it('shows loading fallback when loading', () => {
      mockIsLoading = true
      mockPermissions = ['assets:write']

      render(
        <PermissionGate permission="assets:write" loadingFallback={<div>Loading...</div>}>
          <div>Edit Button</div>
        </PermissionGate>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByText('Edit Button')).not.toBeInTheDocument()
    })

    it('renders nothing when loading and no loading fallback provided', () => {
      mockIsLoading = true
      mockPermissions = ['assets:write']

      const { container } = render(
        <PermissionGate permission="assets:write">
          <div>Edit Button</div>
        </PermissionGate>
      )

      expect(screen.queryByText('Edit Button')).not.toBeInTheDocument()
      expect(container.textContent).toBe('')
    })
  })

  // ============================================
  // ANY OF PERMISSIONS
  // ============================================

  describe('anyOf permissions', () => {
    it('renders children when user has any matching permission', () => {
      mockPermissions = ['assets:delete']

      render(
        <PermissionGate anyOf={['assets:write', 'assets:delete']}>
          <div>Action Menu</div>
        </PermissionGate>
      )

      expect(screen.getByText('Action Menu')).toBeInTheDocument()
    })

    it('hides children when user has no matching permissions', () => {
      mockPermissions = ['assets:read']

      render(
        <PermissionGate anyOf={['assets:write', 'assets:delete']}>
          <div>Action Menu</div>
        </PermissionGate>
      )

      expect(screen.queryByText('Action Menu')).not.toBeInTheDocument()
    })

    it('shows fallback when user has no matching permissions', () => {
      mockPermissions = []

      render(
        <PermissionGate anyOf={['assets:write', 'assets:delete']} fallback={<div>Read Only</div>}>
          <div>Action Menu</div>
        </PermissionGate>
      )

      expect(screen.queryByText('Action Menu')).not.toBeInTheDocument()
      expect(screen.getByText('Read Only')).toBeInTheDocument()
    })
  })

  // ============================================
  // ALL OF PERMISSIONS
  // ============================================

  describe('allOf permissions', () => {
    it('renders children when user has all permissions', () => {
      mockPermissions = ['assets:write', 'assets:delete']

      render(
        <PermissionGate allOf={['assets:write', 'assets:delete']}>
          <div>Bulk Delete</div>
        </PermissionGate>
      )

      expect(screen.getByText('Bulk Delete')).toBeInTheDocument()
    })

    it('hides children when user is missing one permission', () => {
      mockPermissions = ['assets:write']

      render(
        <PermissionGate allOf={['assets:write', 'assets:delete']}>
          <div>Bulk Delete</div>
        </PermissionGate>
      )

      expect(screen.queryByText('Bulk Delete')).not.toBeInTheDocument()
    })

    it('shows fallback when user is missing permissions', () => {
      mockPermissions = ['assets:write']

      render(
        <PermissionGate
          allOf={['assets:write', 'assets:delete']}
          fallback={<div>Insufficient Permissions</div>}
        >
          <div>Bulk Delete</div>
        </PermissionGate>
      )

      expect(screen.queryByText('Bulk Delete')).not.toBeInTheDocument()
      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument()
    })
  })
})

// ============================================
// useHasPermission HOOK
// ============================================

describe('useHasPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPermissions = []
    mockIsLoading = false
  })

  it('returns true when permission exists', () => {
    mockPermissions = ['assets:write', 'assets:read']

    const { result } = renderHook(() => useHasPermission('assets:write'))

    expect(result.current).toBe(true)
  })

  it('returns false when permission does not exist', () => {
    mockPermissions = ['assets:read']

    const { result } = renderHook(() => useHasPermission('assets:write'))

    expect(result.current).toBe(false)
  })

  it('returns false when loading', () => {
    mockIsLoading = true
    mockPermissions = ['assets:write']

    const { result } = renderHook(() => useHasPermission('assets:write'))

    expect(result.current).toBe(false)
  })
})

// ============================================
// useHasAnyPermission HOOK
// ============================================

describe('useHasAnyPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPermissions = []
    mockIsLoading = false
  })

  it('returns true when any permission matches', () => {
    mockPermissions = ['assets:delete']

    const { result } = renderHook(() => useHasAnyPermission(['assets:write', 'assets:delete']))

    expect(result.current).toBe(true)
  })

  it('returns false when no permissions match', () => {
    mockPermissions = ['assets:read']

    const { result } = renderHook(() => useHasAnyPermission(['assets:write', 'assets:delete']))

    expect(result.current).toBe(false)
  })

  it('returns false when loading', () => {
    mockIsLoading = true
    mockPermissions = ['assets:write']

    const { result } = renderHook(() => useHasAnyPermission(['assets:write', 'assets:delete']))

    expect(result.current).toBe(false)
  })
})

// ============================================
// useHasAllPermissions HOOK
// ============================================

describe('useHasAllPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPermissions = []
    mockIsLoading = false
  })

  it('returns true when all permissions are present', () => {
    mockPermissions = ['assets:write', 'assets:delete', 'assets:read']

    const { result } = renderHook(() => useHasAllPermissions(['assets:write', 'assets:delete']))

    expect(result.current).toBe(true)
  })

  it('returns false when one permission is missing', () => {
    mockPermissions = ['assets:write']

    const { result } = renderHook(() => useHasAllPermissions(['assets:write', 'assets:delete']))

    expect(result.current).toBe(false)
  })

  it('returns false when loading', () => {
    mockIsLoading = true
    mockPermissions = ['assets:write', 'assets:delete']

    const { result } = renderHook(() => useHasAllPermissions(['assets:write', 'assets:delete']))

    expect(result.current).toBe(false)
  })
})
