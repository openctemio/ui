'use client'

import useSWR from 'swr'
import { get } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'
import { usePermissions, Permission } from '@/lib/permissions'

interface TagsResponse {
  tags: string[]
}

/**
 * Hook to fetch distinct asset tags for autocomplete.
 * Supports prefix filtering via ?prefix= query param.
 */
export function useAssetTags(prefix?: string, enabled = true, types?: string[]) {
  const { currentTenant } = useTenant()
  const { can } = usePermissions()
  const canReadAssets = can(Permission.AssetsRead)

  const shouldFetch = enabled && currentTenant && canReadAssets

  const params = new URLSearchParams()
  if (prefix) params.set('prefix', prefix)
  if (types && types.length > 0) {
    for (const t of types) params.append('type', t)
  }
  const qs = params.toString()
  const url = qs ? `/api/v1/assets/tags?${qs}` : '/api/v1/assets/tags'

  const { data, error, isLoading } = useSWR<TagsResponse>(
    shouldFetch ? ['asset-tags', prefix, ...(types ?? [])] : null,
    () => get<TagsResponse>(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    tags: data?.tags || [],
    isLoading: shouldFetch ? isLoading : false,
    error,
  }
}
