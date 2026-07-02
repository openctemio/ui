/**
 * SAML SP config hooks — SWR over /api/v1/settings/saml (Get/Save/Delete).
 * Tenant is determined from the JWT token. A 404 means "not configured yet"
 * and resolves to null (no error toast).
 */

'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, put, del } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'
import type { SamlConfig } from '../types/saml.types'

const BASE_URL = '/api/v1/settings/saml'

export function useSamlConfig() {
  const { currentTenant } = useTenant()
  return useSWR<SamlConfig | null>(
    currentTenant ? BASE_URL : null,
    async (url: string) => {
      try {
        return await get<SamlConfig>(url)
      } catch (e) {
        if ((e as { statusCode?: number })?.statusCode === 404) return null
        throw e
      }
    },
    { shouldRetryOnError: false, revalidateOnFocus: false }
  )
}

export function useSaveSamlConfig() {
  const { currentTenant } = useTenant()
  return useSWRMutation(
    currentTenant ? BASE_URL : null,
    async (url: string, { arg }: { arg: SamlConfig }) => put<SamlConfig>(url, arg)
  )
}

export function useDeleteSamlConfig() {
  const { currentTenant } = useTenant()
  return useSWRMutation(currentTenant ? BASE_URL : null, async (url: string) => del<void>(url))
}
