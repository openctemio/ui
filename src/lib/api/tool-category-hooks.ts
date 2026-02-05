/**
 * Tool Category API Hooks
 *
 * SWR hooks for Tool Category Management
 */

'use client'

import useSWR, { type SWRConfiguration, mutate } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from './client'
import { handleApiError } from './error-handler'
import { toolCategoryEndpoints, customToolCategoryEndpoints } from './endpoints'
import type {
  ToolCategory,
  ToolCategoryListResponse,
  ToolCategoryListFilters,
  ToolCategoryAllResponse,
  CreateToolCategoryRequest,
  UpdateToolCategoryRequest,
} from './tool-category-types'

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

export const toolCategoryKeys = {
  all: ['tool-categories'] as const,
  lists: () => [...toolCategoryKeys.all, 'list'] as const,
  list: (filters?: ToolCategoryListFilters) => [...toolCategoryKeys.lists(), filters] as const,
  allCategories: () => [...toolCategoryKeys.all, 'all'] as const,
  details: () => [...toolCategoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...toolCategoryKeys.details(), id] as const,
}

// ============================================
// CACHE INVALIDATION
// ============================================

/**
 * Invalidate all tool category caches
 */
export async function invalidateToolCategoriesCache() {
  await mutate((key) => Array.isArray(key) && key[0] === 'tool-categories', undefined, {
    revalidate: true,
  })
}

// ============================================
// READ HOOKS
// ============================================

/**
 * Fetch all tool categories (platform + tenant custom) with pagination
 */
export function useToolCategories(filters?: ToolCategoryListFilters, config?: SWRConfiguration) {
  return useSWR<ToolCategoryListResponse>(
    toolCategoryKeys.list(filters),
    () => get<ToolCategoryListResponse>(toolCategoryEndpoints.list(filters)),
    { ...defaultConfig, ...config }
  )
}

/**
 * Fetch all tool categories for dropdowns (no pagination)
 */
export function useAllToolCategories(config?: SWRConfiguration) {
  return useSWR<ToolCategoryAllResponse>(
    toolCategoryKeys.allCategories(),
    () => get<ToolCategoryAllResponse>(toolCategoryEndpoints.all()),
    { ...defaultConfig, ...config }
  )
}

/**
 * Fetch a single tool category by ID
 */
export function useToolCategory(categoryId: string | null | undefined, config?: SWRConfiguration) {
  return useSWR<ToolCategory>(
    categoryId ? toolCategoryKeys.detail(categoryId) : null,
    () => get<ToolCategory>(toolCategoryEndpoints.get(categoryId!)),
    { ...defaultConfig, ...config }
  )
}

// ============================================
// MUTATION HOOKS (Custom Categories)
// ============================================

/**
 * Create a new custom tool category
 */
export function useCreateToolCategory() {
  return useSWRMutation<ToolCategory, Error, string, CreateToolCategoryRequest>(
    'create-tool-category',
    async (_key, { arg }) => {
      const response = await post<ToolCategory>(customToolCategoryEndpoints.create(), arg)
      await invalidateToolCategoriesCache()
      return response
    }
  )
}

/**
 * Update a custom tool category
 */
export function useUpdateToolCategory(categoryId: string) {
  return useSWRMutation<ToolCategory, Error, string, UpdateToolCategoryRequest>(
    `update-tool-category-${categoryId}`,
    async (_key, { arg }) => {
      const response = await put<ToolCategory>(customToolCategoryEndpoints.update(categoryId), arg)
      await invalidateToolCategoriesCache()
      return response
    }
  )
}

/**
 * Delete a custom tool category
 */
export function useDeleteToolCategory(categoryId: string) {
  return useSWRMutation<void, Error, string>(`delete-tool-category-${categoryId}`, async () => {
    await del(customToolCategoryEndpoints.delete(categoryId))
    await invalidateToolCategoriesCache()
  })
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Find a category by ID from a list of categories
 */
export function findCategoryById(
  categories: ToolCategory[] | undefined,
  categoryId: string | undefined
): ToolCategory | undefined {
  if (!categories || !categoryId) return undefined
  return categories.find((c) => c.id === categoryId)
}

/**
 * Get category name from ID (returns category name for icon/color lookups)
 * Falls back to 'unknown' if category not found
 */
export function getCategoryNameById(
  categories: ToolCategory[] | undefined,
  categoryId: string | undefined
): string {
  const category = findCategoryById(categories, categoryId)
  return category?.name || 'unknown'
}

/**
 * Get category display name from ID
 * Falls back to 'Unknown' if category not found
 */
export function getCategoryDisplayNameById(
  categories: ToolCategory[] | undefined,
  categoryId: string | undefined
): string {
  const category = findCategoryById(categories, categoryId)
  return category?.display_name || 'Unknown'
}
