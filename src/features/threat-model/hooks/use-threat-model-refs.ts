'use client'

import useSWR from 'swr'
import { get } from '@/lib/api/client'
import type { AttackerProfileLite } from '../types'

/** Crown-jewel asset picked as a threat-model scope. */
export interface CrownJewelAsset {
  id: string
  name: string
  type?: string
  criticality?: string
}

interface AssetListResponse {
  data: Array<Record<string, unknown>>
  total: number
}

/** Crown jewels = assets flagged is_crown_jewel; scope candidates for a model. */
export function useCrownJewels() {
  const { data, isLoading, error } = useSWR<AssetListResponse>(
    '/api/v1/assets?is_crown_jewel=true&per_page=100',
    get,
    { revalidateOnFocus: false }
  )
  const crownJewels: CrownJewelAsset[] = (data?.data ?? []).map((a) => ({
    id: String(a.id),
    name: String(a.name ?? a.id),
    type: a.type as string | undefined,
    criticality: a.criticality as string | undefined,
  }))
  return { crownJewels, isLoading, error }
}

interface AttackerProfileListResponse {
  data: AttackerProfileLite[]
  total: number
}

/**
 * Map of attacker-profile id → { name, type } for resolving threat rows.
 *
 * The `/attacker-profiles` endpoint belongs to the (Phase-3 gated)
 * attacker_profiles module. This hook is used on the Threat Model page (which
 * lives under a different module), so pass `enabled: false` when the module is
 * disabled to skip the fetch — it would otherwise 403. A null key = no fetch;
 * threat rows fall back to the raw id.
 */
export function useAttackerProfileMap(enabled: boolean = true) {
  const { data, isLoading } = useSWR<AttackerProfileListResponse>(
    enabled ? '/api/v1/attacker-profiles?per_page=100' : null,
    get,
    { revalidateOnFocus: false }
  )
  const map = new Map<string, AttackerProfileLite>()
  for (const p of data?.data ?? []) map.set(p.id, p)
  return { profileMap: map, isLoading }
}

/**
 * Resolve a set of asset ids → display names. Batches individual asset reads
 * and tolerates missing assets (a deleted/merged asset id resolves to a short
 * fallback rather than failing the whole page).
 */
export function useAssetNameMap(assetIds: string[]) {
  const unique = Array.from(new Set(assetIds.filter(Boolean))).sort()
  const key = unique.length ? `asset-names:${unique.join(',')}` : null

  const { data, isLoading } = useSWR<Record<string, string>>(
    key,
    async () => {
      const entries = await Promise.all(
        unique.map(async (id) => {
          try {
            const asset = await get<{ name?: string }>(`/api/v1/assets/${id}`)
            return [id, asset?.name ?? shortId(id)] as const
          } catch {
            return [id, shortId(id)] as const
          }
        })
      )
      return Object.fromEntries(entries)
    },
    { revalidateOnFocus: false }
  )

  const nameFor = (id: string | undefined): string => {
    if (!id) return '—'
    return data?.[id] ?? shortId(id)
  }

  return { nameFor, isLoading }
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}
