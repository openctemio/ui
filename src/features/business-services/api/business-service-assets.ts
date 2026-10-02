'use client'

import useSWR from 'swr'
import { del, get, post } from '@/lib/api/client'

/**
 * Asset links of a business service (`business_service_assets`). These links
 * are what makes a service count: a cycle scoped to a service snapshots its
 * linked assets on Activate, and a service's criticality lifts the effective
 * criticality (and so the priority) of the assets that serve it.
 */

/** Mirrors the business_service_assets.dependency_type CHECK. */
export const DEPENDENCY_TYPES = [
  { value: 'runs_on', label: 'Runs on' },
  { value: 'depends_on', label: 'Depends on' },
  { value: 'stores_data_in', label: 'Stores data in' },
  { value: 'authenticates_via', label: 'Authenticates via' },
  { value: 'monitors', label: 'Monitors' },
] as const

export type DependencyType = (typeof DEPENDENCY_TYPES)[number]['value']

export function dependencyLabel(value: string): string {
  return DEPENDENCY_TYPES.find((d) => d.value === value)?.label ?? value.replace(/_/g, ' ')
}

/** GET /business-services/{id}/assets: a plain array, newest link first. */
export interface BusinessServiceAssetLink {
  asset_id: string
  asset_name: string
  asset_type: string
  dependency_type: string
  created_at: string
}

export interface BusinessServiceOption {
  id: string
  name: string
  criticality?: string
  asset_count?: number
}

export function serviceAssetsKey(serviceId: string): string {
  return `/api/v1/business-services/${serviceId}/assets`
}

/** The assets linked to one service. `null` skips the request. */
export function useBusinessServiceAssets(serviceId: string | null) {
  return useSWR<BusinessServiceAssetLink[]>(
    serviceId ? serviceAssetsKey(serviceId) : null,
    (url: string) => get<BusinessServiceAssetLink[]>(url),
    { revalidateOnFocus: false }
  )
}

/** Services for pickers (the list endpoint is tenant-scoped and small). */
export function useBusinessServiceOptions(enabled = true) {
  return useSWR<{ data?: BusinessServiceOption[] }>(
    enabled ? '/api/v1/business-services?per_page=100' : null,
    (url: string) => get<{ data?: BusinessServiceOption[] }>(url),
    { revalidateOnFocus: false }
  )
}

/** Link one asset (the endpoint takes one per call; 204, idempotent). */
export function linkServiceAsset(
  serviceId: string,
  assetId: string,
  dependencyType: DependencyType = 'runs_on'
): Promise<unknown> {
  return post(serviceAssetsKey(serviceId), { asset_id: assetId, dependency_type: dependencyType })
}

export function unlinkServiceAsset(serviceId: string, assetId: string): Promise<unknown> {
  return del(`${serviceAssetsKey(serviceId)}/${assetId}`)
}
