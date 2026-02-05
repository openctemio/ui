/**
 * Member Management API Hooks
 *
 * SWR hooks for managing team members and invitations
 */

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { tenantEndpoints } from '@/lib/api/endpoints'
import { fetcher, fetcherWithOptions } from '@/lib/api/client'
import { usePermissions, Permission } from '@/lib/permissions'
import type {
  MemberListResponse,
  MemberStats,
  InvitationListResponse,
  Invitation,
  CreateInvitationInput,
  UpdateMemberRoleInput,
  MemberWithUser,
} from '../types/member.types'

// ============================================
// FETCH MEMBERS
// ============================================

export interface UseMembersOptions {
  /** Include RBAC roles for each member (reduces N+1 calls on Users page) */
  includeRoles?: boolean
  /** Search term for name or email (case-insensitive) */
  search?: string
  /** Max results (default 10, max 100) */
  limit?: number
  /** Pagination offset */
  offset?: number
}

/**
 * Hook to fetch team members with user details
 * Only fetches if user has members:read permission
 *
 * @param tenantIdOrSlug - Tenant ID or slug
 * @param options - Options for fetching members
 * @param options.includeRoles - Include RBAC roles for each member
 * @param options.search - Search term for name or email
 * @param options.limit - Max results (default 10, max 100)
 * @param options.offset - Pagination offset
 */
export function useMembers(tenantIdOrSlug: string | undefined, options?: UseMembersOptions) {
  const { can } = usePermissions()
  const canReadMembers = can(Permission.MembersRead)

  // Only fetch if user has permission
  const shouldFetch = tenantIdOrSlug && canReadMembers

  // Build query parameters
  const params = new URLSearchParams()

  // Include parameter
  const includes = ['user']
  if (options?.includeRoles) {
    includes.push('roles')
  }
  params.set('include', includes.join(','))

  // Search and pagination parameters
  if (options?.search) {
    params.set('search', options.search)
  }
  if (options?.limit && options.limit > 0) {
    params.set('limit', String(options.limit))
  }
  if (options?.offset && options.offset > 0) {
    params.set('offset', String(options.offset))
  }

  const { data, error, isLoading, mutate } = useSWR<MemberListResponse>(
    shouldFetch ? `${tenantEndpoints.members(tenantIdOrSlug)}?${params.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    members: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading: shouldFetch ? isLoading : false,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Hook to fetch member statistics
 * Only fetches if user has members:read permission
 */
export function useMemberStats(tenantIdOrSlug: string | undefined) {
  const { can } = usePermissions()
  const canReadMembers = can(Permission.MembersRead)

  // Only fetch if user has permission
  const shouldFetch = tenantIdOrSlug && canReadMembers

  const { data, error, isLoading, mutate } = useSWR<MemberStats>(
    shouldFetch ? tenantEndpoints.memberStats(tenantIdOrSlug) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    stats: data,
    isLoading: shouldFetch ? isLoading : false,
    isError: !!error,
    error,
    mutate,
  }
}

// ============================================
// MEMBER MUTATIONS
// ============================================

async function updateMemberRole(url: string, { arg }: { arg: UpdateMemberRoleInput }) {
  return fetcherWithOptions<MemberWithUser>(url, {
    method: 'PATCH',
    body: JSON.stringify(arg),
  })
}

/**
 * Hook to update a member's role
 */
export function useUpdateMemberRole(
  tenantIdOrSlug: string | undefined,
  memberId: string | undefined
) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug && memberId ? tenantEndpoints.updateMember(tenantIdOrSlug, memberId) : null,
    updateMemberRole
  )

  return {
    updateRole: trigger,
    isUpdating: isMutating,
    error,
  }
}

async function removeMember(url: string) {
  return fetcherWithOptions<void>(url, {
    method: 'DELETE',
  })
}

/**
 * Hook to remove a member
 */
export function useRemoveMember(tenantIdOrSlug: string | undefined, memberId: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug && memberId ? tenantEndpoints.removeMember(tenantIdOrSlug, memberId) : null,
    removeMember
  )

  return {
    removeMember: trigger,
    isRemoving: isMutating,
    error,
  }
}

// ============================================
// FETCH INVITATIONS
// ============================================

/**
 * Hook to fetch pending invitations
 * Only fetches if user has members:invite or members:manage permission
 */
export function useInvitations(tenantIdOrSlug: string | undefined) {
  const { canAny } = usePermissions()
  const canManageInvitations = canAny(Permission.MembersInvite, Permission.MembersManage)

  // Only fetch if user has permission
  const shouldFetch = tenantIdOrSlug && canManageInvitations

  const { data, error, isLoading, mutate } = useSWR<InvitationListResponse>(
    shouldFetch ? tenantEndpoints.invitations(tenantIdOrSlug) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    invitations: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading: shouldFetch ? isLoading : false,
    isError: !!error,
    error,
    mutate,
  }
}

// ============================================
// INVITATION MUTATIONS
// ============================================

async function createInvitation(url: string, { arg }: { arg: CreateInvitationInput }) {
  return fetcherWithOptions<Invitation>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  })
}

/**
 * Hook to create an invitation
 */
export function useCreateInvitation(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.createInvitation(tenantIdOrSlug) : null,
    createInvitation
  )

  return {
    createInvitation: trigger,
    isCreating: isMutating,
    error,
  }
}

async function deleteInvitation(url: string) {
  return fetcherWithOptions<void>(url, {
    method: 'DELETE',
  })
}

/**
 * Hook to delete/cancel an invitation
 */
export function useDeleteInvitation(
  tenantIdOrSlug: string | undefined,
  invitationId: string | undefined
) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug && invitationId
      ? tenantEndpoints.deleteInvitation(tenantIdOrSlug, invitationId)
      : null,
    deleteInvitation
  )

  return {
    deleteInvitation: trigger,
    isDeleting: isMutating,
    error,
  }
}

// ============================================
// CACHE KEYS
// ============================================

/**
 * Get the SWR key for members list
 */
export function getMembersKey(tenantIdOrSlug: string, options?: UseMembersOptions) {
  const params = new URLSearchParams()

  const includes = ['user']
  if (options?.includeRoles) {
    includes.push('roles')
  }
  params.set('include', includes.join(','))

  if (options?.search) {
    params.set('search', options.search)
  }
  if (options?.limit && options.limit > 0) {
    params.set('limit', String(options.limit))
  }
  if (options?.offset && options.offset > 0) {
    params.set('offset', String(options.offset))
  }

  return `${tenantEndpoints.members(tenantIdOrSlug)}?${params.toString()}`
}

/**
 * Get the SWR key for member stats
 */
export function getMemberStatsKey(tenantIdOrSlug: string) {
  return tenantEndpoints.memberStats(tenantIdOrSlug)
}

/**
 * Get the SWR key for invitations
 */
export function getInvitationsKey(tenantIdOrSlug: string) {
  return tenantEndpoints.invitations(tenantIdOrSlug)
}
