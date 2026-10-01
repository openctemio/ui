'use client'

import useSWR from 'swr'
import { get } from '@/lib/api/client'
import { usePermissions, Permission } from '@/lib/permissions'
import type { AssetIdentifier } from '../lib/asset-identity'

interface IdentifiersResponse {
  data: AssetIdentifier[] | null
  total: number
}

/** A `renamed` entry of the asset's state history. */
export interface AssetRename {
  id: string
  old_value?: string
  new_value?: string
  source: string
  reason?: string
  changed_at: string
}

interface StateHistoryResponse {
  data: AssetRename[] | null
  total: number
}

/** GET /api/v1/assets/{id}/identifiers — the identifiers the platform matches this asset on. */
export function useAssetIdentifiers(assetId: string | null) {
  const { can } = usePermissions()
  const key = assetId && can(Permission.AssetsRead) ? `/api/v1/assets/${assetId}/identifiers` : null
  const { data, error, isLoading, mutate } = useSWR<IdentifiersResponse>(key, get, {
    revalidateOnFocus: false,
  })
  return { identifiers: data?.data ?? [], error, isLoading, mutate }
}

/** The asset's renames, newest first (state history, change_type=renamed). */
export function useAssetRenames(assetId: string | null, limit = 20) {
  const { can } = usePermissions()
  const key =
    assetId && can(Permission.AssetsRead)
      ? `/api/v1/assets/${assetId}/state-history?change_type=renamed&limit=${limit}`
      : null
  const { data, error, isLoading } = useSWR<StateHistoryResponse>(key, get, {
    revalidateOnFocus: false,
  })
  const renames = [...(data?.data ?? [])].sort(
    (a, b) => (Date.parse(b.changed_at) || 0) - (Date.parse(a.changed_at) || 0)
  )
  return { renames, error, isLoading }
}
