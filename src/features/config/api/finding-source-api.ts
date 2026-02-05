/**
 * Finding Source API Hooks
 *
 * SWR hooks for fetching finding source configuration from backend
 * Finding sources are read-only system configuration (SAST, DAST, pentest, etc.)
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import { get } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiFindingSourceCategory {
  id: string
  code: string
  name: string
  description?: string
  icon?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiFindingSource {
  id: string
  category_id?: string
  category?: ApiFindingSourceCategory
  code: string
  name: string
  description?: string
  icon?: string
  color?: string
  display_order: number
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiFindingSourceListResponse {
  data: ApiFindingSource[]
  total: number
  page?: number
  per_page?: number
  total_pages?: number
}

export interface ApiFindingSourceCategoryListResponse {
  data: ApiFindingSourceCategory[]
  total: number
  page?: number
  per_page?: number
  total_pages?: number
}

// ============================================
// SWR CONFIGURATION
// ============================================

// Finding sources are read-only system configuration that rarely changes.
// We use aggressive caching to minimize API calls.
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't refetch on window focus
  revalidateOnReconnect: false, // Don't refetch on reconnect
  revalidateIfStale: false, // Don't refetch stale data automatically
  shouldRetryOnError: (error) => {
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      return false
    }
    return true
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 60000, // Dedupe for 60 seconds (config data rarely changes)
  onError: (error) => {
    handleApiError(error, {
      showToast: false, // Don't show toast for config data
      logError: true,
    })
  },
}

// ============================================
// FETCHERS
// ============================================

async function fetchFindingSources(url: string): Promise<ApiFindingSourceListResponse> {
  return get<ApiFindingSourceListResponse>(url)
}

async function fetchFindingSourceCategories(
  url: string
): Promise<ApiFindingSourceCategoryListResponse> {
  return get<ApiFindingSourceCategoryListResponse>(url)
}

async function fetchFindingSource(url: string): Promise<ApiFindingSource> {
  return get<ApiFindingSource>(url)
}

// ============================================
// HOOKS
// ============================================

/**
 * Fetch all active finding sources with their categories
 * Use this for dropdown/select options in forms
 */
export function useFindingSourcesApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant
    ? '/api/v1/config/finding-sources?active_only=true&include_category=true'
    : null

  return useSWR<ApiFindingSourceListResponse>(key, fetchFindingSources, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch all active finding source categories
 */
export function useFindingSourceCategoriesApi(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? '/api/v1/config/finding-sources/categories?active_only=true' : null

  return useSWR<ApiFindingSourceCategoryListResponse>(key, fetchFindingSourceCategories, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single finding source by code
 */
export function useFindingSourceByCodeApi(code: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && code ? `/api/v1/config/finding-sources/code/${code}` : null

  return useSWR<ApiFindingSource>(key, fetchFindingSource, { ...defaultConfig, ...config })
}

/**
 * Fetch a single finding source by ID
 */
export function useFindingSourceByIdApi(id: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && id ? `/api/v1/config/finding-sources/${id}` : null

  return useSWR<ApiFindingSource>(key, fetchFindingSource, { ...defaultConfig, ...config })
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Finding source option for use in select/combobox components
 */
export interface FindingSourceOption {
  value: string // code
  label: string // name
  description?: string
  icon?: string
  category?: string // category name
  categoryCode?: string // category code for grouping
}

/**
 * Transform API response to options for select/combobox
 */
export function transformToFindingSourceOptions(
  sources: ApiFindingSource[]
): FindingSourceOption[] {
  return sources.map((source) => ({
    value: source.code,
    label: source.name,
    description: source.description,
    icon: source.icon,
    category: source.category?.name,
    categoryCode: source.category?.code,
  }))
}

/**
 * Group finding source options by category
 */
export function groupFindingSourcesByCategory(
  sources: ApiFindingSource[]
): Map<string, { label: string; options: FindingSourceOption[] }> {
  const groups = new Map<string, { label: string; options: FindingSourceOption[] }>()

  for (const source of sources) {
    const categoryCode = source.category?.code || 'other'
    const categoryName = source.category?.name || 'Other'

    if (!groups.has(categoryCode)) {
      groups.set(categoryCode, { label: categoryName, options: [] })
    }

    groups.get(categoryCode)!.options.push({
      value: source.code,
      label: source.name,
      description: source.description,
      icon: source.icon,
      category: categoryName,
      categoryCode,
    })
  }

  return groups
}
