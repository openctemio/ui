/**
 * Finding API Hooks
 *
 * SWR hooks for Finding Management (Security Findings)
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, patch, del } from './client'
import { handleApiError } from './error-handler'
import { useTenant } from '@/context/tenant-provider'
import { findingEndpoints } from './endpoints'
import type {
  Finding,
  FindingListResponse,
  FindingListFilters,
  CreateFindingRequest,
  UpdateFindingStatusRequest,
  FindingComment,
  AddCommentRequest,
} from './finding-types'

// ============================================
// SWR CONFIGURATION
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  // Don't retry on client errors (4xx) - only retry on server/network errors
  shouldRetryOnError: (error) => {
    // Don't retry on 4xx errors (client errors like 403, 404, etc.)
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      return false
    }
    // Retry on 5xx or network errors
    return true
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
  onError: (error) => {
    handleApiError(error, {
      showToast: true,
      logError: true,
    })
  },
}

// ============================================
// CACHE KEYS
// ============================================

export const findingKeys = {
  all: ['findings'] as const,
  lists: () => [...findingKeys.all, 'list'] as const,
  list: (filters?: FindingListFilters) => [...findingKeys.lists(), filters] as const,
  details: () => [...findingKeys.all, 'detail'] as const,
  detail: (id: string) => [...findingKeys.details(), id] as const,
  comments: (findingId: string) => [...findingKeys.all, 'comments', findingId] as const,
  byAsset: (assetId: string, filters?: FindingListFilters) =>
    [...findingKeys.all, 'asset', assetId, filters] as const,
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchFindings(url: string): Promise<FindingListResponse> {
  return get<FindingListResponse>(url)
}

async function fetchFinding(url: string): Promise<Finding> {
  return get<Finding>(url)
}

async function fetchComments(url: string): Promise<FindingComment[]> {
  return get<FindingComment[]>(url)
}

// ============================================
// FINDING HOOKS
// ============================================

/**
 * Fetch findings list
 */
export function useFindings(filters?: FindingListFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? findingEndpoints.list(filters) : null

  return useSWR<FindingListResponse>(key, fetchFindings, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch findings for a specific asset
 */
export function useAssetFindings(
  assetId: string | null,
  filters?: FindingListFilters,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key = currentTenant && assetId ? findingEndpoints.listByAsset(assetId, filters) : null

  return useSWR<FindingListResponse>(key, fetchFindings, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single finding by ID
 */
export function useFinding(findingId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && findingId ? findingEndpoints.get(findingId) : null

  return useSWR<Finding>(key, fetchFinding, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch comments for a finding
 */
export function useFindingComments(findingId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && findingId ? findingEndpoints.comments(findingId) : null

  return useSWR<FindingComment[]>(key, fetchComments, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new finding
 */
export function useCreateFinding() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? findingEndpoints.create() : null,
    async (url: string, { arg }: { arg: CreateFindingRequest }) => {
      return post<Finding>(url, arg)
    }
  )
}

/**
 * Update finding status
 */
export function useUpdateFindingStatus(findingId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? findingEndpoints.updateStatus(findingId) : null,
    async (url: string, { arg }: { arg: UpdateFindingStatusRequest }) => {
      return patch<Finding>(url, arg)
    }
  )
}

/**
 * Delete a finding
 */
export function useDeleteFinding(findingId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? findingEndpoints.delete(findingId) : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Add comment to a finding
 */
export function useAddFindingComment(findingId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId ? findingEndpoints.addComment(findingId) : null,
    async (url: string, { arg }: { arg: AddCommentRequest }) => {
      return post<FindingComment>(url, arg)
    }
  )
}

/**
 * Delete a comment
 */
export function useDeleteFindingComment(findingId: string, commentId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && findingId && commentId
      ? findingEndpoints.deleteComment(findingId, commentId)
      : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate findings cache
 */
export async function invalidateFindingsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/api/v1/findings'), undefined, {
    revalidate: true,
  })
}

/**
 * Invalidate findings for a specific asset
 */
export async function invalidateAssetFindingsCache(assetId: string) {
  const { mutate } = await import('swr')
  await mutate(
    (key) => typeof key === 'string' && key.includes(`/api/v1/assets/${assetId}/findings`),
    undefined,
    { revalidate: true }
  )
}
