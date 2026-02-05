/**
 * User Tenant Types
 *
 * Type definitions for user's tenant membership API
 */

/**
 * Tenant plan types
 */
export type TenantPlan = 'free' | 'paid'

/**
 * User's role in a tenant
 */
export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer'

/**
 * Role permission helpers
 */
export const RolePermissions = {
  canRead: (role: TenantRole): boolean => {
    return ['owner', 'admin', 'member', 'viewer'].includes(role)
  },
  canWrite: (role: TenantRole): boolean => {
    return ['owner', 'admin', 'member'].includes(role)
  },
  canInvite: (role: TenantRole): boolean => {
    return ['owner', 'admin'].includes(role)
  },
  canManageMembers: (role: TenantRole): boolean => {
    return ['owner', 'admin'].includes(role)
  },
  canDelete: (role: TenantRole): boolean => {
    return role === 'owner'
  },
  canManageBilling: (role: TenantRole): boolean => {
    return role === 'owner'
  },
  /**
   * Get role priority (higher = more permissions)
   */
  priority: (role: TenantRole): number => {
    const priorities: Record<TenantRole, number> = {
      owner: 4,
      admin: 3,
      member: 2,
      viewer: 1,
    }
    return priorities[role] || 0
  },
  /**
   * Check if role can assign target role
   */
  canAssignRole: (role: TenantRole, target: TenantRole): boolean => {
    if (role === 'owner') return target !== 'owner'
    if (role === 'admin') return target === 'member' || target === 'viewer'
    return false
  },
} as const

/**
 * Tenant with user's role and membership info
 */
export interface TenantMembership {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  plan: TenantPlan
  role: TenantRole
  joined_at: string
  created_at: string
}

/**
 * Role display helpers
 */
export const RoleLabels: Record<TenantRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

export const RoleColors: Record<TenantRole, string> = {
  owner: 'text-purple-600 bg-purple-100',
  admin: 'text-blue-600 bg-blue-100',
  member: 'text-green-600 bg-green-100',
  viewer: 'text-gray-600 bg-gray-100',
}
