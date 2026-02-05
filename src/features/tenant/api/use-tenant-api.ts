/**
 * Tenant API Hooks
 *
 * SWR mutation hooks for tenant/team management
 */

'use client'

import useSWRMutation from 'swr/mutation'
import { post } from '@/lib/api/client'
import { invalidateMyTenantsCache } from '@/lib/api/user-tenant-hooks'
import type {
  CreateTenantRequest,
  CreateTenantResponse,
} from './tenant-api.types'

// ============================================
// ENDPOINTS
// ============================================

const tenantEndpoints = {
  create: '/api/v1/tenants',
} as const

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new tenant/team
 *
 * @example
 * ```typescript
 * function CreateTeamForm() {
 *   const { trigger, isMutating, error } = useCreateTenant()
 *
 *   const handleSubmit = async (data) => {
 *     const result = await trigger(data)
 *     if (result) {
 *       // Success - redirect to new team
 *     }
 *   }
 * }
 * ```
 */
export function useCreateTenant() {
  return useSWRMutation(
    tenantEndpoints.create,
    async (url: string, { arg }: { arg: CreateTenantRequest }) => {
      const result = await post<CreateTenantResponse>(url, arg)
      // Invalidate tenants cache to refresh team list
      await invalidateMyTenantsCache()
      return result
    }
  )
}
