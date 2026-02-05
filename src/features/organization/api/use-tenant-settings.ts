/**
 * Tenant Settings API Hooks
 *
 * SWR hooks for fetching and updating tenant settings
 */

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { tenantEndpoints } from '@/lib/api/endpoints'
import { fetcher, fetcherWithOptions } from '@/lib/api/client'
import { usePermissions, Permission } from '@/lib/permissions'
import type {
  TenantSettings,
  UpdateGeneralSettingsInput,
  UpdateSecuritySettingsInput,
  UpdateAPISettingsInput,
  UpdateBrandingSettingsInput,
} from '../types/settings.types'

// ============================================
// UPDATE TENANT (Name, Slug)
// ============================================

/**
 * Input for updating tenant basic info
 */
export interface UpdateTenantInput {
  name?: string
  slug?: string
  description?: string
  logo_url?: string
}

/**
 * Tenant response from API
 */
export interface TenantResponse {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  plan: string
  settings?: Record<string, unknown>
  created_at: string
  updated_at: string
}

async function updateTenant(
  url: string,
  { arg }: { arg: UpdateTenantInput }
) {
  return fetcherWithOptions<TenantResponse>(url, {
    method: 'PATCH',
    body: JSON.stringify(arg),
  })
}

/**
 * Hook to update tenant basic info (name, slug)
 */
export function useUpdateTenant(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.update(tenantIdOrSlug) : null,
    updateTenant
  )

  return {
    updateTenant: trigger,
    isUpdating: isMutating,
    error,
  }
}

// ============================================
// FETCH SETTINGS
// ============================================

/**
 * Hook to fetch tenant settings
 * Only fetches if user has team:read permission
 */
export function useTenantSettings(tenantIdOrSlug: string | undefined) {
  const { can } = usePermissions()
  const canReadTeam = can(Permission.TeamRead)

  // Only fetch if user has permission
  const shouldFetch = tenantIdOrSlug && canReadTeam

  const { data, error, isLoading, mutate } = useSWR<TenantSettings>(
    shouldFetch ? tenantEndpoints.settings(tenantIdOrSlug) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  )

  return {
    settings: data,
    isLoading: shouldFetch ? isLoading : false,
    isError: !!error,
    error,
    mutate,
  }
}

// ============================================
// UPDATE GENERAL SETTINGS
// ============================================

async function updateGeneralSettings(
  url: string,
  { arg }: { arg: UpdateGeneralSettingsInput }
) {
  return fetcherWithOptions<TenantSettings>(url, {
    method: 'PATCH',
    body: JSON.stringify(arg),
  })
}

/**
 * Hook to update general settings
 */
export function useUpdateGeneralSettings(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.updateGeneralSettings(tenantIdOrSlug) : null,
    updateGeneralSettings
  )

  return {
    updateGeneralSettings: trigger,
    isUpdating: isMutating,
    error,
  }
}

// ============================================
// UPDATE SECURITY SETTINGS
// ============================================

async function updateSecuritySettings(
  url: string,
  { arg }: { arg: UpdateSecuritySettingsInput }
) {
  return fetcherWithOptions<TenantSettings>(url, {
    method: 'PATCH',
    body: JSON.stringify(arg),
  })
}

/**
 * Hook to update security settings
 */
export function useUpdateSecuritySettings(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.updateSecuritySettings(tenantIdOrSlug) : null,
    updateSecuritySettings
  )

  return {
    updateSecuritySettings: trigger,
    isUpdating: isMutating,
    error,
  }
}

// ============================================
// UPDATE API SETTINGS
// ============================================

async function updateAPISettings(
  url: string,
  { arg }: { arg: UpdateAPISettingsInput }
) {
  return fetcherWithOptions<TenantSettings>(url, {
    method: 'PATCH',
    body: JSON.stringify(arg),
  })
}

/**
 * Hook to update API settings
 */
export function useUpdateAPISettings(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.updateAPISettings(tenantIdOrSlug) : null,
    updateAPISettings
  )

  return {
    updateAPISettings: trigger,
    isUpdating: isMutating,
    error,
  }
}

// ============================================
// UPDATE BRANDING SETTINGS
// ============================================

async function updateBrandingSettings(
  url: string,
  { arg }: { arg: UpdateBrandingSettingsInput }
) {
  return fetcherWithOptions<TenantSettings>(url, {
    method: 'PATCH',
    body: JSON.stringify(arg),
  })
}

/**
 * Hook to update branding settings
 */
export function useUpdateBrandingSettings(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.updateBrandingSettings(tenantIdOrSlug) : null,
    updateBrandingSettings
  )

  return {
    updateBrandingSettings: trigger,
    isUpdating: isMutating,
    error,
  }
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Get the SWR key for tenant settings
 */
export function getTenantSettingsKey(tenantIdOrSlug: string) {
  return tenantEndpoints.settings(tenantIdOrSlug)
}
