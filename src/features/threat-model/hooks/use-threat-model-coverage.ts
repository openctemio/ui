'use client'

import useSWR from 'swr'
import { get } from '@/lib/api/client'
import type { ThreatModelCoverage } from '../types'

/**
 * ATT&CK coverage matrix for a threat model. Tactics arrive pre-ordered
 * (kill-chain) and each technique carries its worst-case status + rollup
 * counts. Pass null to skip (SWR no-ops on a null key).
 */
export function useThreatModelCoverage(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ThreatModelCoverage>(
    id ? `/api/v1/threat-models/${id}/coverage` : null,
    get,
    { revalidateOnFocus: false }
  )
  return { coverage: data, isLoading: id ? isLoading : false, error, mutate }
}
