'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, patch } from '@/lib/api/client'

// Crown jewels = assets with is_crown_jewel=true
// Uses existing asset API with filter param

interface PaginatedAssets {
  data: Record<string, unknown>[]
  total: number
}

export function useCrownJewels() {
  return useSWR<PaginatedAssets>('/api/v1/assets?is_crown_jewel=true&per_page=100', get, {
    revalidateOnFocus: false,
  })
}

export function useToggleCrownJewel(assetId: string) {
  return useSWRMutation(
    `/api/v1/assets/${assetId}/crown-jewel`,
    (
      url: string,
      {
        arg,
      }: {
        arg: {
          is_crown_jewel: boolean
          business_impact_score: number
          business_impact_notes: string
        }
      }
    ) => patch(url, arg)
  )
}
