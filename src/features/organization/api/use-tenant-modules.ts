/**
 * Tenant Module Management API Hooks
 *
 * SWR hooks for per-tenant module enable/disable configuration
 */

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { tenantEndpoints } from '@/lib/api/endpoints'
import { fetcher, fetcherWithOptions } from '@/lib/api/client'

// ============================================
// TYPES
// ============================================

export interface TenantSubModule {
  id: string
  name: string
  description?: string
  icon?: string
  release_status: string
  is_enabled: boolean
}

export interface TenantModule {
  id: string
  name: string
  description?: string
  icon?: string
  category: string
  display_order: number
  is_core: boolean
  is_enabled: boolean
  release_status: string
  sub_modules?: TenantSubModule[]
}

export interface TenantModuleSummary {
  total: number
  enabled: number
  disabled: number
  core: number
}

export interface TenantModuleListResponse {
  modules: TenantModule[]
  summary: TenantModuleSummary
}

export interface ModuleToggle {
  module_id: string
  is_enabled: boolean
}

// ============================================
// FETCH TENANT MODULES
// ============================================

export function useTenantModules(tenantIdOrSlug: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<TenantModuleListResponse>(
    tenantIdOrSlug ? tenantEndpoints.modules(tenantIdOrSlug) : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  return {
    data,
    modules: data?.modules ?? [],
    summary: data?.summary,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

// ============================================
// UPDATE TENANT MODULES
// ============================================

async function updateModules(url: string, { arg }: { arg: { modules: ModuleToggle[] } }) {
  return fetcherWithOptions<TenantModuleListResponse>(url, {
    method: 'PATCH',
    body: JSON.stringify(arg),
  })
}

export function useUpdateTenantModules(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.modules(tenantIdOrSlug) : null,
    updateModules
  )

  return {
    updateModules: trigger,
    isUpdating: isMutating,
    error,
  }
}

// ============================================
// RESET TENANT MODULES
// ============================================

async function resetModules(url: string) {
  return fetcherWithOptions<TenantModuleListResponse>(url, {
    method: 'POST',
  })
}

export function useResetTenantModules(tenantIdOrSlug: string | undefined) {
  const { trigger, isMutating, error } = useSWRMutation(
    tenantIdOrSlug ? tenantEndpoints.modulesReset(tenantIdOrSlug) : null,
    resetModules
  )

  return {
    resetModules: trigger,
    isResetting: isMutating,
    error,
  }
}
