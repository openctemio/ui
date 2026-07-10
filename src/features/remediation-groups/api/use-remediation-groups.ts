'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post } from '@/lib/api/client'
import type { RemediationGroupsResponse, ResolveGroupRequest, ResolveGroupResult } from '../types'

const GROUPS_URL = '/api/v1/findings/remediation-groups'

/** Lists the tenant's remediation groups over its open findings. */
export function useRemediationGroups() {
  return useSWR<RemediationGroupsResponse>(
    GROUPS_URL,
    (u: string) => get<RemediationGroupsResponse>(u),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )
}

/**
 * Resolves a whole remediation group in one action. Bind to a group key;
 * `trigger(body)` POSTs the resolve and returns the bulk result.
 */
export function useResolveRemediationGroup(key: string) {
  return useSWRMutation<ResolveGroupResult, Error, string, ResolveGroupRequest>(
    `${GROUPS_URL}/${encodeURIComponent(key)}/resolve`,
    (url: string, { arg }: { arg: ResolveGroupRequest }) => post<ResolveGroupResult>(url, arg)
  )
}
