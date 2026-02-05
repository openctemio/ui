'use client';

/**
 * Roles API Hooks
 *
 * SWR hooks for fetching and managing roles.
 */

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher, fetcherWithOptions } from '@/lib/api/client';
import type {
  Role,
  RoleListResponse,
  RoleFilters,
  CreateRoleInput,
  UpdateRoleInput,
  AssignRoleInput,
  SetUserRolesInput,
  RoleMember,
  PermissionModule,
  Permission,
} from '../types';

const API_BASE = '/api/v1/roles';
const PERMISSIONS_BASE = '/api/v1/permissions';

// ============================================
// FETCH HOOKS
// ============================================

/**
 * Fetch all roles for the current tenant (includes system roles)
 */
export interface RoleFiltersWithOptions extends RoleFilters {
  /** Set to true to skip fetching (for lazy loading) */
  skip?: boolean;
}

export function useRoles(filters?: RoleFiltersWithOptions) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.is_system !== undefined) params.set('is_system', String(filters.is_system));

  const queryString = params.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  // Support conditional fetching - pass null key to skip
  const shouldFetch = !filters?.skip;

  const { data, error, isLoading, mutate } = useSWR<RoleListResponse | Role[]>(
    shouldFetch ? url : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // Defensive access: support both { roles: [...], total: N } and [...]
  let roles: Role[] = [];
  if (Array.isArray(data)) {
    roles = data;
  } else if (data?.roles) {
    roles = data.roles;
  }

  return {
    roles,
    total: Array.isArray(data) ? data.length : data?.total || 0,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetch a single role by ID
 */
export function useRole(roleId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Role>(
    roleId ? `${API_BASE}/${roleId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    role: data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetch members of a role
 */
export function useRoleMembers(roleId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RoleMember[] | { members: RoleMember[] }>(
    roleId ? `${API_BASE}/${roleId}/members` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // Defensive access
  let members: RoleMember[] = [];
  if (Array.isArray(data)) {
    members = data;
  } else if (data?.members) {
    members = data.members;
  }

  return {
    members,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetch current user's roles
 */
export function useMyRoles() {
  const { data, error, isLoading, mutate } = useSWR<Role[] | { roles: Role[] }>(
    '/api/v1/me/roles',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  let roles: Role[] = [];
  if (Array.isArray(data)) {
    roles = data;
  } else if (data?.roles) {
    roles = data.roles;
  }

  return {
    roles,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetch current user's effective permissions
 */
export function useMyPermissions() {
  const { data, error, isLoading, mutate } = useSWR<{ permissions: string[]; count: number }>(
    '/api/v1/me/permissions',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    permissions: data?.permissions || [],
    count: data?.count || 0,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetch a user's roles
 */
export function useUserRoles(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Role[]>(
    userId ? `/api/v1/users/${userId}/roles` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    roles: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

// ============================================
// PERMISSION FETCH HOOKS
// ============================================

/**
 * Fetch all permission modules with their permissions
 * Used for building permission picker UI
 */
export function usePermissionModules() {
  const { data, error, isLoading, mutate } = useSWR<PermissionModule[]>(
    `${PERMISSIONS_BASE}/modules`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  return {
    modules: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetch all permissions (flat list)
 */
export function usePermissions() {
  const { data, error, isLoading, mutate } = useSWR<Permission[]>(
    PERMISSIONS_BASE,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    permissions: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

// ============================================
// MUTATION HOOKS
// ============================================

async function createRoleMutation(url: string, { arg }: { arg: CreateRoleInput }) {
  return fetcherWithOptions<Role>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to create a new role
 */
export function useCreateRole() {
  const { trigger, isMutating, error } = useSWRMutation(
    API_BASE,
    createRoleMutation
  );

  return {
    createRole: trigger,
    isCreating: isMutating,
    error,
  };
}

async function updateRoleMutation(url: string, { arg }: { arg: UpdateRoleInput }) {
  return fetcherWithOptions<Role>(url, {
    method: 'PUT',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to update a role
 */
export function useUpdateRole(roleId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    roleId ? `${API_BASE}/${roleId}` : null,
    updateRoleMutation
  );

  return {
    updateRole: trigger,
    isUpdating: isMutating,
    error,
  };
}

async function deleteRoleMutation(url: string) {
  return fetcherWithOptions<void>(url, {
    method: 'DELETE',
  });
}

/**
 * Hook to delete a role
 */
export function useDeleteRole(roleId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    roleId ? `${API_BASE}/${roleId}` : null,
    deleteRoleMutation
  );

  return {
    deleteRole: trigger,
    isDeleting: isMutating,
    error,
  };
}

// ============================================
// USER ROLE ASSIGNMENT MUTATIONS
// ============================================

async function assignRoleMutation(url: string, { arg }: { arg: AssignRoleInput }) {
  return fetcherWithOptions<void>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to assign a role to a user
 */
export function useAssignRole(userId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    userId ? `/api/v1/users/${userId}/roles` : null,
    assignRoleMutation
  );

  return {
    assignRole: trigger,
    isAssigning: isMutating,
    error,
  };
}

async function removeRoleMutation(url: string) {
  return fetcherWithOptions<void>(url, {
    method: 'DELETE',
  });
}

/**
 * Hook to remove a role from a user
 */
export function useRemoveRole(userId: string | null, roleId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    userId && roleId ? `/api/v1/users/${userId}/roles/${roleId}` : null,
    removeRoleMutation
  );

  return {
    removeRole: trigger,
    isRemoving: isMutating,
    error,
  };
}

async function setUserRolesMutation(url: string, { arg }: { arg: SetUserRolesInput }) {
  return fetcherWithOptions<Role[]>(url, {
    method: 'PUT',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to set all roles for a user (replaces existing roles)
 */
export function useSetUserRoles(userId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    userId ? `/api/v1/users/${userId}/roles` : null,
    setUserRolesMutation
  );

  return {
    setUserRoles: trigger,
    isSetting: isMutating,
    error,
  };
}

// ============================================
// BULK ROLE ASSIGNMENT
// ============================================

export interface BulkAssignRoleMembersInput {
  user_ids: string[];
}

export interface BulkAssignRoleMembersResult {
  success_count: number;
  failed_count: number;
  failed_users?: string[];
}

async function bulkAssignRoleMembersMutation(
  url: string,
  { arg }: { arg: BulkAssignRoleMembersInput }
) {
  return fetcherWithOptions<BulkAssignRoleMembersResult>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to assign a role to multiple users at once
 * Uses POST /api/v1/roles/{roleId}/members/bulk
 */
export function useBulkAssignRoleMembers(roleId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    roleId ? `${API_BASE}/${roleId}/members/bulk` : null,
    bulkAssignRoleMembersMutation
  );

  return {
    bulkAssignMembers: trigger,
    isAssigning: isMutating,
    error,
  };
}

// ============================================
// CACHE KEYS
// ============================================

export function getRolesKey(filters?: RoleFilters) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.is_system !== undefined) params.set('is_system', String(filters.is_system));
  const queryString = params.toString();
  return queryString ? `${API_BASE}?${queryString}` : API_BASE;
}

export function getRoleKey(roleId: string) {
  return `${API_BASE}/${roleId}`;
}

export function getRoleMembersKey(roleId: string) {
  return `${API_BASE}/${roleId}/members`;
}

export function getUserRolesKey(userId: string) {
  return `/api/v1/users/${userId}/roles`;
}

export function getMyRolesKey() {
  return '/api/v1/me/roles';
}

export function getMyPermissionsKey() {
  return '/api/v1/me/permissions';
}

export function getPermissionModulesKey() {
  return `${PERMISSIONS_BASE}/modules`;
}

export function getPermissionsKey() {
  return PERMISSIONS_BASE;
}
