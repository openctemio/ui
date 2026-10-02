/**
 * Scanner content hooks (api RFC-031): the tenant's content policy and the
 * refresh_content requests, per sensor and fleet-wide.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'

import { get, post, put } from './client'
import { useTenant } from '@/context/tenant-provider'
import { sensorEndpoints } from './endpoints'
import type {
  ContentPolicyResponse,
  RefreshContentRequest,
  RefreshFleetContentResponse,
  RefreshSensorContentResponse,
  UpdateContentPolicyRequest,
  UpdateContentPolicyResponse,
} from './sensor-types'

/** Ask one sensor to refresh its content (202, or 409 when it cannot). */
export function refreshSensorContent(
  sensorId: string,
  req: RefreshContentRequest = { content: [], force: true }
): Promise<RefreshSensorContentResponse> {
  return post<RefreshSensorContentResponse>(sensorEndpoints.refreshContent(sensorId), req)
}

/** Ask every sensor that manages content to refresh it. */
export function refreshFleetContent(
  req: RefreshContentRequest = { content: [], force: true }
): Promise<RefreshFleetContentResponse> {
  return post<RefreshFleetContentResponse>(sensorEndpoints.refreshFleetContent(), req)
}

/** Save the tenant's content policy; apply_now also sends it to the sensors. */
export function updateContentPolicy(
  req: UpdateContentPolicyRequest
): Promise<UpdateContentPolicyResponse> {
  return put<UpdateContentPolicyResponse>(sensorEndpoints.contentPolicy(), req)
}

/** The tenant's content policy and the platform defaults. */
export function useContentPolicy(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant ? sensorEndpoints.contentPolicy() : null
  return useSWR<ContentPolicyResponse>(key, (url: string) => get<ContentPolicyResponse>(url), {
    revalidateOnFocus: false,
    ...config,
  })
}
