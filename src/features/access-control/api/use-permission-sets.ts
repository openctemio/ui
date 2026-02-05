'use client';

/**
 * Permission Sets API Hooks
 *
 * SWR hooks for fetching and managing permission sets.
 */

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher, fetcherWithOptions } from '@/lib/api/client';
import type {
  PermissionSet,
  PermissionSetWithDetails,
  PermissionSetFilters,
  CreatePermissionSetInput,
  UpdatePermissionSetInput,
} from '../types';

const API_BASE = '/api/v1/permission-sets';

// ============================================
// FETCH HOOKS
// ============================================

/**
 * Fetch all permission sets (custom + system)
 */
export function usePermissionSets(filters?: PermissionSetFilters) {
  const params = new URLSearchParams();
  if (filters?.is_system !== undefined) params.set('include_system', String(filters.is_system));
  if (filters?.search) params.set('search', filters.search);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));

  const queryString = params.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  const { data, error, isLoading, mutate } = useSWR<{ permission_sets: PermissionSet[] }>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    permissionSets: data?.permission_sets || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetch only system permission sets
 */
export function useSystemPermissionSets() {
  const { data, error, isLoading, mutate } = useSWR<{ permission_sets: PermissionSet[] }>(
    `${API_BASE}/system`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache longer for system permission sets
    }
  );

  return {
    permissionSets: data?.permission_sets || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetch a single permission set with full details
 */
export function usePermissionSet(permissionSetId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ permission_set: PermissionSetWithDetails }>(
    permissionSetId ? `${API_BASE}/${permissionSetId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    permissionSet: data?.permission_set || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

// ============================================
// MUTATION HOOKS
// ============================================

async function createPermissionSetMutation(url: string, { arg }: { arg: CreatePermissionSetInput }) {
  return fetcherWithOptions<{ permission_set: PermissionSet }>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to create a new permission set
 */
export function useCreatePermissionSet() {
  const { trigger, isMutating, error } = useSWRMutation(
    API_BASE,
    createPermissionSetMutation
  );

  return {
    createPermissionSet: trigger,
    isCreating: isMutating,
    error,
  };
}

async function updatePermissionSetMutation(url: string, { arg }: { arg: UpdatePermissionSetInput }) {
  return fetcherWithOptions<{ permission_set: PermissionSet }>(url, {
    method: 'PUT',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to update a permission set
 */
export function useUpdatePermissionSet(permissionSetId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    permissionSetId ? `${API_BASE}/${permissionSetId}` : null,
    updatePermissionSetMutation
  );

  return {
    updatePermissionSet: trigger,
    isUpdating: isMutating,
    error,
  };
}

async function deletePermissionSetMutation(url: string) {
  return fetcherWithOptions<void>(url, {
    method: 'DELETE',
  });
}

/**
 * Hook to delete a permission set (custom only)
 */
export function useDeletePermissionSet(permissionSetId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    permissionSetId ? `${API_BASE}/${permissionSetId}` : null,
    deletePermissionSetMutation
  );

  return {
    deletePermissionSet: trigger,
    isDeleting: isMutating,
    error,
  };
}

// ============================================
// PERMISSION MUTATIONS
// ============================================

async function addPermissionMutation(url: string, { arg }: { arg: { permission: string } }) {
  return fetcherWithOptions<void>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to add a permission to a permission set
 */
export function useAddPermissionToSet(permissionSetId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    permissionSetId ? `${API_BASE}/${permissionSetId}/permissions` : null,
    addPermissionMutation
  );

  return {
    addPermission: trigger,
    isAdding: isMutating,
    error,
  };
}

async function removePermissionMutation(url: string) {
  return fetcherWithOptions<void>(url, {
    method: 'DELETE',
  });
}

/**
 * Hook to remove a permission from a permission set
 */
export function useRemovePermissionFromSet(permissionSetId: string | null, permissionId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    permissionSetId && permissionId
      ? `${API_BASE}/${permissionSetId}/permissions/${permissionId}`
      : null,
    removePermissionMutation
  );

  return {
    removePermission: trigger,
    isRemoving: isMutating,
    error,
  };
}

// ============================================
// CACHE KEYS
// ============================================

export function getPermissionSetsKey(filters?: PermissionSetFilters) {
  const params = new URLSearchParams();
  if (filters?.is_system !== undefined) params.set('is_system', String(filters.is_system));
  if (filters?.search) params.set('search', filters.search);
  const queryString = params.toString();
  return queryString ? `${API_BASE}?${queryString}` : API_BASE;
}

export function getSystemPermissionSetsKey() {
  return `${API_BASE}/system`;
}

export function getPermissionSetKey(permissionSetId: string) {
  return `${API_BASE}/${permissionSetId}`;
}
