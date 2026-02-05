/**
 * Scan Profile API Hooks
 *
 * SWR hooks for Scan Profile Management
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from './client'
import { handleApiError } from './error-handler'
import { useTenant } from '@/context/tenant-provider'
import { scanProfileEndpoints } from './endpoints'
import type {
  ScanProfile,
  ScanProfileListResponse,
  ScanProfileListFilters,
  CreateScanProfileRequest,
  UpdateScanProfileRequest,
  CloneScanProfileRequest,
  UpdateQualityGateRequest,
} from './scan-profile-types'

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

export const scanProfileKeys = {
  all: ['scan-profiles'] as const,
  lists: () => [...scanProfileKeys.all, 'list'] as const,
  list: (filters?: ScanProfileListFilters) => [...scanProfileKeys.lists(), filters] as const,
  details: () => [...scanProfileKeys.all, 'detail'] as const,
  detail: (id: string) => [...scanProfileKeys.details(), id] as const,
  default: () => [...scanProfileKeys.all, 'default'] as const,
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchScanProfiles(url: string): Promise<ScanProfileListResponse> {
  return get<ScanProfileListResponse>(url)
}

async function fetchScanProfile(url: string): Promise<ScanProfile> {
  return get<ScanProfile>(url)
}

// ============================================
// SCAN PROFILE HOOKS
// ============================================

/**
 * Fetch scan profiles list
 */
export function useScanProfiles(filters?: ScanProfileListFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? scanProfileEndpoints.list(filters) : null

  return useSWR<ScanProfileListResponse>(key, fetchScanProfiles, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single scan profile by ID
 */
export function useScanProfile(profileId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && profileId ? scanProfileEndpoints.get(profileId) : null

  return useSWR<ScanProfile>(key, fetchScanProfile, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch the default scan profile for the tenant
 */
export function useDefaultScanProfile(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? scanProfileEndpoints.getDefault() : null

  return useSWR<ScanProfile>(key, fetchScanProfile, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new scan profile
 */
export function useCreateScanProfile() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? scanProfileEndpoints.create() : null,
    async (url: string, { arg }: { arg: CreateScanProfileRequest }) => {
      return post<ScanProfile>(url, arg)
    }
  )
}

/**
 * Update a scan profile
 */
export function useUpdateScanProfile(profileId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && profileId ? scanProfileEndpoints.update(profileId) : null,
    async (url: string, { arg }: { arg: UpdateScanProfileRequest }) => {
      return put<ScanProfile>(url, arg)
    }
  )
}

/**
 * Delete a scan profile
 */
export function useDeleteScanProfile(profileId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && profileId ? scanProfileEndpoints.delete(profileId) : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Set a scan profile as the default for the tenant
 */
export function useSetDefaultScanProfile(profileId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && profileId ? scanProfileEndpoints.setDefault(profileId) : null,
    async (url: string) => {
      return post<ScanProfile>(url, {})
    }
  )
}

/**
 * Clone a scan profile
 */
export function useCloneScanProfile(profileId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && profileId ? scanProfileEndpoints.clone(profileId) : null,
    async (url: string, { arg }: { arg: CloneScanProfileRequest }) => {
      return post<ScanProfile>(url, arg)
    }
  )
}

/**
 * Update quality gate configuration for a scan profile
 */
export function useUpdateQualityGate(profileId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && profileId ? scanProfileEndpoints.updateQualityGate(profileId) : null,
    async (url: string, { arg }: { arg: UpdateQualityGateRequest }) => {
      return put<ScanProfile>(url, arg)
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate scan profiles cache
 */
export async function invalidateScanProfilesCache() {
  const { mutate } = await import('swr')
  await mutate(
    (key) => typeof key === 'string' && key.includes('/api/v1/scan-profiles'),
    undefined,
    { revalidate: true }
  )
}
