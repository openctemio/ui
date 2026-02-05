/**
 * Role Types for Access Control
 *
 * Roles define what actions users can perform within a tenant.
 * Users can have multiple roles, and their effective permissions
 * are the union of all role permissions.
 */

/**
 * Role entity
 */
export interface Role {
  id: string;
  tenant_id?: string;
  slug: string;
  name: string;
  description: string;
  is_system: boolean;
  hierarchy_level: number;
  has_full_data_access: boolean;
  permissions: string[];
  permission_count: number;
  members_count?: number; // Number of users assigned to this role
  created_at: string;
  updated_at: string;
}

/**
 * User role assignment
 */
export interface UserRole {
  id: string;
  user_id: string;
  tenant_id: string;
  role_id: string;
  role: Role;
  assigned_at: string;
  assigned_by?: string;
}

/**
 * Role member - a user assigned to a role
 */
export interface RoleMember {
  id: string;
  user_id: string;
  tenant_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by?: string;
  // User details (populated from join)
  name?: string;
  email?: string;
  avatar_url?: string;
}

/**
 * Permission module - groups related permissions
 */
export interface PermissionModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  permissions: Permission[];
}

/**
 * Individual permission
 */
export interface Permission {
  id: string;
  module_id: string;
  name: string;
  description: string;
  is_active: boolean;
}

/**
 * Input types for API operations
 */
export interface CreateRoleInput {
  slug: string;
  name: string;
  description?: string;
  hierarchy_level?: number;
  has_full_data_access?: boolean;
  permissions?: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  hierarchy_level?: number;
  has_full_data_access?: boolean;
  permissions?: string[];
}

export interface AssignRoleInput {
  role_id: string;
}

export interface SetUserRolesInput {
  role_ids: string[];
}

/**
 * Filter options for listing roles
 */
export interface RoleFilters {
  search?: string;
  is_system?: boolean;
}

/**
 * Role list response from API
 */
export interface RoleListResponse {
  roles: Role[];
  total: number;
}

/**
 * System role slugs (predefined roles)
 */
export const SystemRoleSlugs = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type SystemRoleSlug = (typeof SystemRoleSlugs)[keyof typeof SystemRoleSlugs];

/**
 * Role display configuration
 */
export const RoleTypeConfig: Record<string, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
}> = {
  owner: {
    label: 'Owner',
    description: 'Full access to all features and settings',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  admin: {
    label: 'Admin',
    description: 'Manage team members and most settings',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  member: {
    label: 'Member',
    description: 'Standard access to team resources',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to team resources',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  },
  custom: {
    label: 'Custom',
    description: 'Custom role with specific permissions',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
};

/**
 * Get role display config by slug
 */
export function getRoleConfig(slug: string, isSystem: boolean) {
  if (isSystem && RoleTypeConfig[slug]) {
    return RoleTypeConfig[slug];
  }
  return RoleTypeConfig.custom;
}
