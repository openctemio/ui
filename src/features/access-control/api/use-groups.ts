'use client';

/**
 * Groups API Hooks
 *
 * SWR hooks for fetching and managing groups.
 */

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher, fetcherWithOptions } from '@/lib/api/client';
import type {
  Group,
  GroupWithDetails,
  GroupFilters,
  CreateGroupInput,
  UpdateGroupInput,
  AddGroupMemberInput,
  UpdateGroupMemberInput,
  AssignAssetInput,
  AssignPermissionSetInput,
  GroupMember,
  GroupAsset,
} from '../types';
import type { PermissionSet } from '../types/permission-set.types';

const API_BASE = '/api/v1/groups';

// Generic API response type - using Record for flexible property access
type ApiResponse<T> = T[] | Record<string, T[] | unknown>;

// ============================================
// FETCH HOOKS
// ============================================

/**
 * Fetch all groups for the current tenant
 */
export function useGroups(filters?: GroupFilters) {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.search) params.set('search', filters.search);

  const queryString = params.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  const { data, error, isLoading, mutate } = useSWR<{ groups: Group[] } | Group[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // Defensive access: support both { groups: [...] } and [...]
  const groups = Array.isArray(data) ? data : data?.groups || [];

  return {
    groups,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetch groups the current user is a member of
 */
export function useMyGroups() {
  const { data, error, isLoading, mutate } = useSWR<{ groups: Group[] } | Group[]>(
    `${API_BASE}/me`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const groups = Array.isArray(data) ? data : data?.groups || [];

  return {
    groups,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export interface UseGroupOptions {
  /** Set to true to skip fetching (for lazy loading) */
  skip?: boolean;
}

/**
 * Fetch a single group with full details
 */
export function useGroup(groupId: string | null, options?: UseGroupOptions) {
  const shouldFetch = !options?.skip && groupId;

  const { data, error, isLoading, mutate } = useSWR<GroupWithDetails>(
    shouldFetch ? `${API_BASE}/${groupId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // Assuming single resource is always returned as the object itself based on recent fix
  // But could also support wrapped if needed, though simpler is better for single resource
  const group = data || null;

  return {
    group,
    isLoading: shouldFetch ? isLoading : false,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetch group members
 */
export function useGroupMembers(groupId: string | null, options?: UseGroupOptions) {
  const shouldFetch = !options?.skip && groupId;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<GroupMember>>(
    shouldFetch ? `${API_BASE}/${groupId}/members` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // Try to find the array in common locations
  let members: GroupMember[] = [];
  if (Array.isArray(data)) {
    members = data;
  } else if (data?.members && Array.isArray(data.members)) {
    members = data.members;
  } else if (data?.users && Array.isArray(data.users)) {
    members = data.users;
  } else if (data?.data && Array.isArray(data.data)) {
    members = data.data;
  }

  return {
    members,
    isLoading: shouldFetch ? isLoading : false,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetch group's assigned permission sets
 */
export function useGroupPermissionSets(groupId: string | null, options?: UseGroupOptions) {
  const shouldFetch = !options?.skip && groupId;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<PermissionSet>>(
    shouldFetch ? `${API_BASE}/${groupId}/permission-sets` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  let permissionSets: PermissionSet[] = [];
  if (Array.isArray(data)) {
    permissionSets = data;
  } else if (data?.permission_sets && Array.isArray(data.permission_sets)) {
    permissionSets = data.permission_sets;
  } else if (data?.data && Array.isArray(data.data)) {
    permissionSets = data.data;
  }

  return {
    permissionSets,
    isLoading: shouldFetch ? isLoading : false,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Fetch group's assets
 */
export function useGroupAssets(groupId: string | null, options?: UseGroupOptions) {
  const shouldFetch = !options?.skip && groupId;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<GroupAsset>>(
    shouldFetch ? `${API_BASE}/${groupId}/assets` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  let assets: GroupAsset[] = [];
  if (Array.isArray(data)) {
    assets = data;
  } else if (data?.assets && Array.isArray(data.assets)) {
    assets = data.assets;
  } else if (data?.data && Array.isArray(data.data)) {
    assets = data.data;
  }

  return {
    assets,
    isLoading: shouldFetch ? isLoading : false,
    isError: !!error,
    error,
    mutate,
  };
}

// ============================================
// MUTATION HOOKS
// ============================================

async function createGroupMutation(url: string, { arg }: { arg: CreateGroupInput }) {
  return fetcherWithOptions<{ group: Group }>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to create a new group
 */
export function useCreateGroup() {
  const { trigger, isMutating, error } = useSWRMutation(
    API_BASE,
    createGroupMutation
  );

  return {
    createGroup: trigger,
    isCreating: isMutating,
    error,
  };
}

async function updateGroupMutation(url: string, { arg }: { arg: UpdateGroupInput }) {
  return fetcherWithOptions<{ group: Group }>(url, {
    method: 'PUT',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to update a group
 */
export function useUpdateGroup(groupId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    groupId ? `${API_BASE}/${groupId}` : null,
    updateGroupMutation
  );

  return {
    updateGroup: trigger,
    isUpdating: isMutating,
    error,
  };
}

async function deleteGroupMutation(url: string) {
  return fetcherWithOptions<void>(url, {
    method: 'DELETE',
  });
}

/**
 * Hook to delete a group
 */
export function useDeleteGroup(groupId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    groupId ? `${API_BASE}/${groupId}` : null,
    deleteGroupMutation
  );

  return {
    deleteGroup: trigger,
    isDeleting: isMutating,
    error,
  };
}

// ============================================
// MEMBER MUTATIONS
// ============================================

async function addMemberMutation(url: string, { arg }: { arg: AddGroupMemberInput }) {
  return fetcherWithOptions<void>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to add a member to a group
 */
export function useAddGroupMember(groupId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    groupId ? `${API_BASE}/${groupId}/members` : null,
    addMemberMutation
  );

  return {
    addMember: trigger,
    isAdding: isMutating,
    error,
  };
}

async function updateMemberMutation(url: string, { arg }: { arg: UpdateGroupMemberInput }) {
  return fetcherWithOptions<void>(url, {
    method: 'PUT',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to update a member's role in a group
 */
export function useUpdateGroupMember(groupId: string | null, userId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    groupId && userId ? `${API_BASE}/${groupId}/members/${userId}` : null,
    updateMemberMutation
  );

  return {
    updateMember: trigger,
    isUpdating: isMutating,
    error,
  };
}

async function removeMemberMutation(url: string) {
  return fetcherWithOptions<void>(url, {
    method: 'DELETE',
  });
}

/**
 * Hook to remove a member from a group
 */
export function useRemoveGroupMember(groupId: string | null, userId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    groupId && userId ? `${API_BASE}/${groupId}/members/${userId}` : null,
    removeMemberMutation
  );

  return {
    removeMember: trigger,
    isRemoving: isMutating,
    error,
  };
}

// ============================================
// ASSET MUTATIONS
// ============================================

async function assignAssetMutation(url: string, { arg }: { arg: AssignAssetInput }) {
  return fetcherWithOptions<void>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to assign an asset to a group
 */
export function useAssignAssetToGroup(groupId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    groupId ? `${API_BASE}/${groupId}/assets` : null,
    assignAssetMutation
  );

  return {
    assignAsset: trigger,
    isAssigning: isMutating,
    error,
  };
}

async function unassignAssetMutation(url: string) {
  return fetcherWithOptions<void>(url, {
    method: 'DELETE',
  });
}

/**
 * Hook to unassign an asset from a group
 */
export function useUnassignAssetFromGroup(groupId: string | null, assetId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    groupId && assetId ? `${API_BASE}/${groupId}/assets/${assetId}` : null,
    unassignAssetMutation
  );

  return {
    unassignAsset: trigger,
    isUnassigning: isMutating,
    error,
  };
}

// ============================================
// PERMISSION SET MUTATIONS
// ============================================

async function assignPermissionSetMutation(url: string, { arg }: { arg: AssignPermissionSetInput }) {
  return fetcherWithOptions<void>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  });
}

/**
 * Hook to assign a permission set to a group
 */
export function useAssignPermissionSetToGroup(groupId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    groupId ? `${API_BASE}/${groupId}/permission-sets` : null,
    assignPermissionSetMutation
  );

  return {
    assignPermissionSet: trigger,
    isAssigning: isMutating,
    error,
  };
}

async function unassignPermissionSetMutation(url: string) {
  return fetcherWithOptions<void>(url, {
    method: 'DELETE',
  });
}

/**
 * Hook to unassign a permission set from a group
 */
export function useUnassignPermissionSetFromGroup(groupId: string | null, permissionSetId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    groupId && permissionSetId ? `${API_BASE}/${groupId}/permission-sets/${permissionSetId}` : null,
    unassignPermissionSetMutation
  );

  return {
    unassignPermissionSet: trigger,
    isUnassigning: isMutating,
    error,
  };
}

// ============================================
// CACHE KEYS
// ============================================

export function getGroupsKey(filters?: GroupFilters) {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.search) params.set('search', filters.search);
  const queryString = params.toString();
  return queryString ? `${API_BASE}?${queryString}` : API_BASE;
}

export function getGroupKey(groupId: string) {
  return `${API_BASE}/${groupId}`;
}

export function getGroupMembersKey(groupId: string) {
  return `${API_BASE}/${groupId}/members`;
}

export function getGroupPermissionSetsKey(groupId: string) {
  return `${API_BASE}/${groupId}/permission-sets`;
}

export function getGroupAssetsKey(groupId: string) {
  return `${API_BASE}/${groupId}/assets`;
}
